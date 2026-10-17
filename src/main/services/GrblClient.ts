/**
 * GrblClient — protocolo GRBL: fila de envio confiável (send-response),
 * status em tempo real, overrides e comandos de controle.
 *
 * Invariantes (AGENTS.md):
 *  - Comandos de tempo real = byte único, sem `\n`.
 *  - Só envia a próxima linha após receber `ok`.
 *
 * Emite eventos (consumidos pela camada IPC):
 *  - `console`   (ConsoleLine)     linha enviada/recebida
 *  - `status`    (GrblStatus)      status report parseado
 *  - `progress`  (JobProgress)     progresso do job
 *  - `job`       (JobInfo)         mudança de estado do job
 *  - `connection`(ConnectionState) estado da conexão
 *  - `error`     ({ message, code? })  erro/aviso para o usuário
 */

import { EventEmitter } from 'node:events';
import {
  classifyLine,
  isStatusReport,
  parseStatusReport,
  splitLines,
} from '../../shared/protocol';
import type {
  ConnectOptions,
  ConnectionState,
  GrblStatus,
  JogCommand,
  JobInfo,
  JobProgress,
} from '../../shared/types';
import { SerialTransport } from './SerialTransport';
import { TcpTransport } from './TcpTransport';

/** Bytes de comando de tempo real do GRBL. */
export const REALTIME = {
  softReset: 0x18, // Ctrl-X
  statusReport: 0x3f, // '?'
  feedHold: 0x21, // '!'
  cycleStart: 0x7e, // '~'
  overrideFeedDefault: 0x90,
  overrideFeedPlus10: 0x91,
  overrideFeedMinus10: 0x92,
  overrideFeedPlus1: 0x93,
  overrideFeedMinus1: 0x94,
  overrideRapidDefault: 0x95,
  overrideRapidMedium: 0x96,
  overrideRapidLow: 0x97,
  overrideSpindleDefault: 0x99,
  overrideSpindlePlus10: 0x9a,
  overrideSpindleMinus10: 0x9b,
  overrideSpindlePlus1: 0x9c,
  overrideSpindleMinus1: 0x9d,
} as const;

interface QueueItem {
  line: string;
  /** true se a linha faz parte do job (conta no progresso). */
  job: boolean;
  /** true se a linha é uma consulta cujo corpo é capturado (`$$`, `$#`…). */
  query?: boolean;
}

/** Consulta em andamento: acumula linhas até o `ok`/`error`. */
interface PendingQuery {
  lines: string[];
  /** Só captura depois que o comando foi efetivamente enviado. */
  active: boolean;
  resolve: (lines: string[]) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

/** Contrato mínimo de transporte, para permitir um *fake* nos testes. */
export interface TransportLike {
  readonly isOpen: boolean;
  on(event: 'data', listener: (chunk: string) => void): unknown;
  on(event: 'open', listener: () => void): unknown;
  on(event: 'close', listener: (err?: Error) => void): unknown;
  on(event: 'error', listener: (err: Error) => void): unknown;
  open(): Promise<void>;
  writeLine(line: string): Promise<void>;
  writeRealtime(byte: number): Promise<void>;
  close(): Promise<void>;
}

export type TransportFactory = (opts: ConnectOptions) => TransportLike;

/**
 * Transporte padrão conforme o tipo pedido (RF-CON-7). Serial usa `path`/`baud`;
 * WiFi usa `host`/`tcpPort`. Valores ausentes caem em padrões seguros.
 */
export function defaultTransportFactory(opts: ConnectOptions): TransportLike {
  if (opts.kind === 'tcp') {
    return new TcpTransport(opts.host ?? '192.168.4.1', opts.tcpPort ?? 23);
  }
  return new SerialTransport(opts.path ?? '', opts.baudRate ?? 115200);
}

export interface GrblClientOptions {
  statusPollMs?: number;
  stallMs?: number;
  transportFactory?: TransportFactory;
}

const DEFAULT_STALL_MS = 8000;

export class GrblClient extends EventEmitter {
  private transport: TransportLike | null = null;
  private connection: ConnectionState = 'disconnected';

  private rxBuffer = '';
  private queue: QueueItem[] = [];
  private awaitingAck = false;
  private stalled = false;
  private watchdog: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;

  private readonly statusPollMs: number;
  private readonly stallMs: number;
  private readonly transportFactory: TransportFactory;
  private lastStatus: GrblStatus | null = null;

  private job: JobInfo = { state: 'idle', sent: 0, total: 0 };
  private currentItem: QueueItem | null = null;
  private pendingQuery: PendingQuery | null = null;

  constructor(options: GrblClientOptions = {}) {
    super();
    this.statusPollMs = options.statusPollMs ?? 200;
    this.stallMs = options.stallMs ?? DEFAULT_STALL_MS;
    this.transportFactory = options.transportFactory ?? defaultTransportFactory;
    // O evento 'error' do EventEmitter lança se não houver listener. Garantimos
    // um listener padrão; a camada IPC sempre registra o seu.
    this.on('error', () => undefined);
  }

  // ---------------------------------------------------------------- conexão

  async connect(opts: ConnectOptions): Promise<void> {
    if (this.transport) await this.disconnect();

    this.setConnection('connecting');
    const transport = this.transportFactory(opts);
    transport.on('data', (chunk: string) => this.onData(chunk));
    transport.on('error', (err: Error) => this.emitError(err.message));
    transport.on('close', (err?: Error) => {
      if (this.connection !== 'disconnected') {
        this.setConnection('disconnected');
        this.emitError(
          err ? `Conexão encerrada: ${err.message}` : 'Conexão encerrada.',
        );
      }
      this.stopPolling();
    });

    try {
      await transport.open();
    } catch (err) {
      this.transport = null;
      this.setConnection('error');
      const message = err instanceof Error ? err.message : String(err);
      this.emitError(message);
      throw new Error(message);
    }

    this.transport = transport;
    this.setConnection('connected');
    this.startPolling();
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this.clearWatchdog();
    this.failQuery(new Error('Conexão encerrada antes da resposta.'));
    this.queue = [];
    this.awaitingAck = false;
    this.stalled = false;
    this.rxBuffer = '';
    const transport = this.transport;
    this.transport = null;
    if (transport) await transport.close();
    this.setConnection('disconnected');
    this.emitJob({ ...this.job, state: 'idle' });
  }

  isConnected(): boolean {
    return this.connection === 'connected';
  }

  getLastStatus(): GrblStatus | null {
    return this.lastStatus;
  }

  // ------------------------------------------------------------- comandos

  /** Enfileira uma linha avulsa (console). Respeita send-response. */
  sendLine(line: string): void {
    const clean = line.trim();
    if (!clean) return;
    this.queue.push({ line: clean, job: false });
    this.pump();
  }

  /**
   * Envia uma linha e devolve o corpo da resposta (linhas até o `ok`),
   * sem incluí-las. Usado para `$$`, `$#`, `$I`, `$G` e para aplicar
   * `$n=valor`. Rejeita se a máquina não responder dentro de `stallMs`.
   */
  query(line: string): Promise<string[]> {
    const clean = line.trim();
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Conecte-se à máquina para consultar.'));
        return;
      }
      if (this.pendingQuery) {
        reject(new Error('Já existe uma consulta em andamento.'));
        return;
      }
      const timer = setTimeout(() => {
        if (this.pendingQuery) {
          this.pendingQuery = null;
          reject(
            new Error(
              `A máquina não respondeu a "${clean}" em ${this.stallMs} ms.`,
            ),
          );
        }
      }, this.stallMs);
      this.pendingQuery = { lines: [], active: false, resolve, reject, timer };
      this.queue.push({ line: clean, job: false, query: true });
      this.pump();
    });
  }

  /** Inicia um job com as linhas fornecidas (streaming confiável). */
  startJob(lines: string[], name?: string): void {
    if (!this.isConnected()) {
      this.emitError('Não conectado.');
      return;
    }
    if (this.job.state === 'running') {
      this.emitError('Já existe um job em execução.');
      return;
    }
    const items = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((line) => ({ line, job: true }));

    this.queue = items;
    this.job = { state: 'running', name, sent: 0, total: items.length };
    this.emitJob(this.job);
    this.emitProgress({ sent: 0, total: items.length });
    this.pump();
  }

  pauseJob(): void {
    if (this.job.state !== 'running') return;
    this.emitRealtime(REALTIME.feedHold);
    this.job = { ...this.job, state: 'paused' };
    this.emitJob(this.job);
  }

  resumeJob(): void {
    if (this.job.state !== 'paused') return;
    this.emitRealtime(REALTIME.cycleStart);
    this.job = { ...this.job, state: 'running' };
    this.emitJob(this.job);
  }

  /** Para o job atual: soft reset (aborta) e limpa a fila. */
  stopJob(): void {
    if (this.job.state === 'idle') return;
    this.abortJob('Interrompido pelo usuário.');
    this.emitRealtime(REALTIME.softReset);
  }

  // Realtime
  softReset(): void {
    this.abortJob('Reset pelo usuário.');
    this.emitRealtime(REALTIME.softReset);
  }

  unlock(): void {
    this.sendLine('$X');
  }

  home(): void {
    this.sendLine('$H');
  }

  setOrigin(x = 0, y = 0, z = 0): void {
    this.sendLine(`G92 X${x} Y${y} Z${z}`);
  }

  gotoZero(): void {
    this.sendLine('G90 G0 X0 Y0');
  }

  /** Jog via modo dedicado do GRBL ($J=) — recomendado. */
  jog(cmd: JogCommand): void {
    const feed = cmd.feed ?? 1000;
    const parts: string[] = [];
    if (cmd.x) parts.push(`X${cmd.x}`);
    if (cmd.y) parts.push(`Y${cmd.y}`);
    if (cmd.z) parts.push(`Z${cmd.z}`);
    if (parts.length === 0) return;
    this.sendLine(`$J=G91 ${parts.join(' ')} F${feed}`);
  }

  overrideFeed(
    action: 'reset' | 'plus10' | 'minus10' | 'plus1' | 'minus1',
  ): void {
    const map = {
      reset: REALTIME.overrideFeedDefault,
      plus10: REALTIME.overrideFeedPlus10,
      minus10: REALTIME.overrideFeedMinus10,
      plus1: REALTIME.overrideFeedPlus1,
      minus1: REALTIME.overrideFeedMinus1,
    } as const;
    this.emitRealtime(map[action]);
  }

  /** Override de potência do laser (spindle) em tempo real (0x99–0x9d). */
  overrideSpindle(
    action: 'reset' | 'plus10' | 'minus10' | 'plus1' | 'minus1',
  ): void {
    const map = {
      reset: REALTIME.overrideSpindleDefault,
      plus10: REALTIME.overrideSpindlePlus10,
      minus10: REALTIME.overrideSpindleMinus10,
      plus1: REALTIME.overrideSpindlePlus1,
      minus1: REALTIME.overrideSpindleMinus1,
    } as const;
    this.emitRealtime(map[action]);
  }

  /** Override de deslocamento rápido (G0) — 3 níveis do GRBL (0x95–0x97). */
  overrideRapid(level: 'default' | 'medium' | 'low'): void {
    const map = {
      default: REALTIME.overrideRapidDefault,
      medium: REALTIME.overrideRapidMedium,
      low: REALTIME.overrideRapidLow,
    } as const;
    this.emitRealtime(map[level]);
  }

  // ---------------------------------------------------------------- interno

  private setConnection(state: ConnectionState): void {
    if (this.connection === state) return;
    this.connection = state;
    this.emit('connection', state);
  }

  private emitRealtime(byte: number): void {
    if (!this.transport) return;
    this.transport
      .writeRealtime(byte)
      .catch((err: Error) => this.emitError(err.message));
  }

  private emitError(message: string, code?: number): void {
    this.emit('error', { message, code });
    this.emit('console', {
      direction: 'in' as const,
      kind: 'error' as const,
      text: message,
      ts: Date.now(),
    });
  }

  private emitJob(info: JobInfo): void {
    this.job = info;
    this.emit('job', info);
  }

  private emitProgress(progress: JobProgress): void {
    this.emit('progress', progress);
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(
      () => this.emitRealtime(REALTIME.statusReport),
      this.statusPollMs,
    );
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private clearWatchdog(): void {
    if (this.watchdog) {
      clearTimeout(this.watchdog);
      this.watchdog = null;
    }
  }

  private onData(chunk: string): void {
    // Remove caracteres de controle espúrios (ex.: 0x01) que alguns firmwares
    // inserem entre o status report e o 'ok', o que travava o reconhecimento.
    const clean = chunk.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    this.rxBuffer += clean;
    const { lines, rest } = splitLines(this.rxBuffer);
    this.rxBuffer = rest;
    for (const line of lines) this.handleLine(line);
  }

  private handleLine(rawLine: string): void {
    const line = rawLine.replace(/\r$/, '');
    if (line.trim() === '') return;

    if (isStatusReport(line)) {
      const status = parseStatusReport(line);
      if (status) {
        this.lastStatus = status;
        this.emit('status', status);
      }
      return;
    }

    const classified = classifyLine(line);

    // Corpo de uma consulta (`$n=valor`, `[G54:…]`, `[VER:…]`…): acumula.
    if (
      this.pendingQuery?.active &&
      classified.kind !== 'ok' &&
      classified.kind !== 'error'
    ) {
      this.pendingQuery.lines.push(line.trim());
    }

    this.emit('console', {
      direction: 'in' as const,
      kind: classified.kind,
      text: line.trim(),
      ts: Date.now(),
    });

    switch (classified.kind) {
      case 'ok':
        this.onAck();
        break;
      case 'error':
        this.onNack(classified.message ?? classified.text, classified.code);
        break;
      case 'alarm':
        this.onAlarm(classified.message ?? classified.text);
        break;
      default:
        break;
    }
  }

  /** Conclui (sucesso) a consulta pendente, se o `ok` for dela. */
  private resolveQuery(): void {
    const query = this.pendingQuery;
    if (!query?.active) return;
    clearTimeout(query.timer);
    this.pendingQuery = null;
    query.resolve(query.lines);
  }

  /** Rejeita a consulta pendente (erro/desconexão). */
  private failQuery(err: Error): void {
    const query = this.pendingQuery;
    if (!query) return;
    clearTimeout(query.timer);
    this.pendingQuery = null;
    query.reject(err);
  }

  private onAck(): void {
    this.resolveQuery();
    this.clearWatchdog();
    this.awaitingAck = false;

    const current = this.currentItem;
    if (current?.job) {
      this.emitProgress({ sent: this.job.sent, total: this.job.total });
      if (this.job.sent >= this.job.total) {
        this.emitJob({ ...this.job, state: 'finished' });
      }
    }
    if (!this.stalled) this.pump();
  }

  private onNack(message: string, code?: number): void {
    this.failQuery(new Error(message));
    this.clearWatchdog();
    this.awaitingAck = false;
    if (this.job.state === 'running' || this.job.state === 'paused') {
      this.abortJob(message);
    }
    this.emit('error', { message, code });
  }

  private onAlarm(message: string): void {
    this.failQuery(new Error(message));
    this.clearWatchdog();
    this.awaitingAck = false;
    this.queue = [];
    if (this.job.state !== 'idle') this.abortJob(message);
    this.emit('error', { message });
  }

  private abortJob(reason: string): void {
    this.queue = this.queue.filter((item) => !item.job);
    this.awaitingAck = false;
    this.clearWatchdog();
    this.emitJob({ ...this.job, state: 'aborted', error: reason });
  }

  private pump(): void {
    if (!this.transport || this.awaitingAck || this.stalled) return;
    const item = this.queue.shift();
    if (!item) return;

    this.currentItem = item;
    this.awaitingAck = true;
    // A partir daqui as respostas da consulta começam a chegar.
    if (item.query && this.pendingQuery) this.pendingQuery.active = true;

    this.emit('console', {
      direction: 'out' as const,
      kind: 'other' as const,
      text: item.line,
      ts: Date.now(),
    });

    if (item.job) {
      this.job = { ...this.job, sent: this.job.sent + 1 };
    }

    this.transport.writeLine(item.line).catch((err: Error) => {
      this.awaitingAck = false;
      this.currentItem = null;
      this.emitError(`Falha ao escrever na serial: ${err.message}`);
    });

    this.watchdog = setTimeout(() => {
      this.stalled = true;
      this.emitError(
        `A máquina não respondeu em ${this.stallMs} ms aguardando "ok". Envio pausado — verifique a conexão.`,
      );
    }, this.stallMs);
  }
}
