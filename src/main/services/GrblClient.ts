/**
 * GrblClient — protocolo GRBL: fila de envio confiável com **janela por bytes**
 * (contagem de caracteres), status em tempo real, overrides e comandos de
 * controle.
 *
 * Invariantes (AGENTS.md):
 *  - Comandos de tempo real = byte único, sem `\n`.
 *  - Nunca mais bytes sem `ok` que o buffer RX da máquina (`[OPT:…]`, padrão
 *    128): o GRBL continua no controle do fluxo e o buffer nunca estoura.
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
import { hasKey, t } from '../../shared/i18n';
import {
  classifyLine,
  isStatusReport,
  parseStatusReport,
  splitLines,
} from '../../shared/protocol';
import type {
  ConnectOptions,
  ConnectionState,
  ErrorPayload,
  GrblStatus,
  JogCommand,
  JobInfo,
  JobProgress,
  MachineSnapshot,
} from '../../shared/types';
import { SerialTransport } from './SerialTransport';
import { TcpTransport } from './TcpTransport';

/**
 * Descrição de alarme/erro GRBL no idioma ativo (RF-APP-2).
 * `classifyLine` continua puro e em pt-BR (fonte/fallback); a tradução
 * acontece aqui, no ponto em que a mensagem vira texto para o usuário.
 */
function describeGrbl(
  kind: 'alarm' | 'error',
  code: number | undefined,
  fallback: string,
): string {
  if (code === undefined) return fallback;
  const key = `${kind}.${code}`;
  if (hasKey(key)) return t(key);
  // Código fora do catálogo (firmware mais novo): rótulo genérico localizado.
  const generic = `${kind}.unknown`;
  return hasKey(generic) ? t(generic, { code }) : fallback;
}

/**
 * Ação recomendada para um alarme conhecido (RF-STA-4), no idioma ativo.
 * `undefined` quando o código não tem recomendação catalogada.
 */
function alarmSolution(code: number | undefined): string | undefined {
  if (code === undefined) return undefined;
  const key = `alarmfix.${code}`;
  return hasKey(key) ? t(key) : undefined;
}

/** Bytes de comando de tempo real do GRBL. */
export const REALTIME = {
  softReset: 0x18, // Ctrl-X
  statusReport: 0x3f, // '?'
  feedHold: 0x21, // '!'
  cycleStart: 0x7e, // '~'
  jogCancel: 0x85, // cancela o jog em andamento (RF-JOG-2)
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
  /**
   * Silêncio máximo do status (`?`) antes de considerar o **enlace caído**.
   * O GRBL responde **todo** `?`, então silêncio prolongado em repouso é porta
   * morta — não máquina ocupada (`PLANO_MAQUINA` §11.6.4). Padrão: 10 ×
   * `statusPollMs`, mínimo de 5 s.
   */
  statusSilenceMs?: number;
  transportFactory?: TransportFactory;
}

const DEFAULT_STALL_MS = 8000;

/**
 * Intervalo mínimo entre eventos de progresso durante o job. `ok` chega uma vez
 * por linha (centenas por segundo): emitir tudo saturava o IPC do renderer e
 * atrasava o `pump()` seguinte — a máquina ficava sem movimentos na fila.
 */
const PROGRESS_INTERVAL_MS = 100;

export class GrblClient extends EventEmitter {
  private transport: TransportLike | null = null;
  private connection: ConnectionState = 'disconnected';

  private rxBuffer = '';
  private queue: QueueItem[] = [];
  /**
   * **Janela de envio**: linhas já escritas e ainda sem `ok` (as respostas do
   * GRBL chegam sempre na ordem). Esperar cada `ok` antes de mandar a linha
   * seguinte — send-response puro — deixava a máquina sem movimentos quando o
   * PC estava ocupado: a latência do USB-serial somada ao agendamento do SO
   * custa mais que o tempo de um trecho curto, e o buffer do GRBL esvazia.
   *
   * A janela é limitada em **bytes** (contagem de caracteres do GRBL), nunca
   * mais que o buffer RX da própria máquina — então o buffer nunca estoura.
   */
  private inFlight: Array<{ bytes: number; item: QueueItem }> = [];
  private inFlightBytes = 0;
  /** Buffer RX do GRBL em bytes (vem de `[OPT:…]`; padrão do GRBL 1.1: 128). */
  private rxBufferSize = 128;
  /** Blocos do planner do GRBL (2º campo de `[OPT:…]`; padrão 16). */
  private plannerBlocks = 16;
  /** Linhas do job confirmadas por `ok` (≠ `sent`, que conta as enviadas). */
  private jobDone = 0;
  private stalled = false;
  /**
   * O firmware aceita o modo de jog dedicado (`$J=`)? O `$J` é **opcional** no
   * GRBL 1.1: se o firmware recusar, caímos para `G91`/`G0`/`G90` (três linhas,
   * nunca uma) **pelo resto da conexão** — sem repetir o erro a cada jog.
   */
  private dollarJogSupported = true;
  /**
   * Já "acordamos" a máquina nesta conexão? A **primeira leitura** depois de
   * abrir a porta pode cair no lixo que ficou no parser do firmware (coleta
   * real, 18/10: em 9 de 9 sessões o `$I` virou `error:3` e o painel saía sem
   * firmware). Uma linha de leitura é idempotente: repetimos **uma vez**.
   */
  private awokeMachine = false;
  private watchdog: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;

  private readonly statusPollMs: number;
  private readonly statusSilenceMs: number;
  private readonly stallMs: number;
  private readonly transportFactory: TransportFactory;
  private lastStatus: GrblStatus | null = null;
  /**
   * Quando chegou o último status (`?`). É o que distingue "máquina ocupada"
   * de **porta morta**: o GRBL responde todo `?`, então em repouso o silêncio
   * denuncia o enlace caído (§11.6.4).
   */
  private lastStatusAt = 0;

  private job: JobInfo = { state: 'idle', sent: 0, total: 0 };
  /** Última emissão de progresso (limita o IPC a ~10 Hz — RF-GC-2). */
  private lastProgressAt = 0;
  private pendingQuery: PendingQuery | null = null;

  constructor(options: GrblClientOptions = {}) {
    super();
    this.statusPollMs = options.statusPollMs ?? 200;
    this.statusSilenceMs =
      options.statusSilenceMs ?? Math.max(5000, this.statusPollMs * 10);
    this.stallMs = options.stallMs ?? DEFAULT_STALL_MS;
    this.transportFactory = options.transportFactory ?? defaultTransportFactory;
    // O evento 'error' do EventEmitter lança se não houver listener. Garantimos
    // um listener padrão; a camada IPC sempre registra o seu.
    this.on('error', () => undefined);
  }

  // ---------------------------------------------------------------- conexão

  async connect(opts: ConnectOptions): Promise<void> {
    if (this.transport) await this.disconnect();

    // Capacidades do firmware valem por conexão (a máquina pode ser trocada).
    this.dollarJogSupported = true;
    this.awokeMachine = false;
    this.setConnection('connecting');
    const transport = this.transportFactory(opts);
    transport.on('data', (chunk: string) => this.onData(chunk));
    transport.on('error', (err: Error) => this.emitError(err.message));
    transport.on('close', (err?: Error) => {
      // Fechamento iniciado por nós (disconnect()): não tratar como erro.
      const intentional = this.transport === null;
      if (this.connection !== 'disconnected') {
        this.setConnection('disconnected');
        if (!intentional) {
          this.emitError(
            err
              ? t('client.connClosedWith', { msg: err.message })
              : t('client.connClosed'),
          );
        }
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

  /**
   * Retrato completo da máquina para o painel "Máquina" (P0.7).
   *
   * As consultas são **seriais** (o GRBL aceita uma por vez) e só entram com a
   * janela de envio vazia — `query()` garante as duas coisas. `$N` é opcional:
   * firmware sem blocos de inicialização responde `error:` e devolvemos `[]`.
   */
  async snapshot(): Promise<MachineSnapshot> {
    const build = await this.query('$I');
    const settings = await this.query('$$');
    const offsets = await this.query('$#');
    const modal = await this.query('$G');
    let startup: string[] = [];
    try {
      startup = await this.query('$N');
    } catch {
      startup = [];
    }
    return {
      build,
      settings,
      offsets,
      modal,
      startup,
      status: this.lastStatus ?? null,
    };
  }

  /**
   * Enlace caído em uso: a porta parou de responder ao `?`. Avisa e fecha o que
   * houver — a UI volta para "desconectado" (e o botão reconecta) em vez de
   * mostrar um DRO congelado como se a máquina estivesse viva (§11.6.4).
   */
  private async onLinkLost(): Promise<void> {
    this.emitError(t('client.linkLost', { ms: this.statusSilenceMs }));
    await this.disconnect();
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this.clearWatchdog();
    this.failQuery(new Error(t('client.queryClosed')));
    this.queue = [];
    this.clearInFlight();
    this.jobDone = 0;
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

  /** Enfileira uma linha avulsa (console). Só vai com a janela vazia. */
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
        reject(new Error(t('client.queryNotConnected')));
        return;
      }
      if (this.pendingQuery) {
        reject(new Error(t('client.queryBusy')));
        return;
      }
      const timer = setTimeout(() => {
        if (this.pendingQuery) {
          this.pendingQuery = null;
          reject(
            new Error(
              t('client.queryTimeout', { line: clean, ms: this.stallMs }),
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
      this.emitError(t('client.notConnected'));
      return;
    }
    if (this.job.state === 'running') {
      this.emitError(t('client.jobRunning'));
      return;
    }
    const items = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((line) => ({ line, job: true }));

    // A fila é substituída: uma consulta enfileirada mas ainda não despachada
    // sumiria e só falharia no timeout (8 s de espera espúria). Falha agora,
    // com motivo claro. Se ela já está em voo, o `ok` da resposta continua
    // atribuído em ordem (FIFO) — não se mexe nela.
    if (this.pendingQuery && !this.pendingQuery.active) {
      this.failQuery(new Error(t('client.queryJobStarted')));
    }
    this.queue = items;
    this.jobDone = 0;
    this.job = { state: 'running', name, sent: 0, total: items.length };
    this.emitJob(this.job);
    this.emitProgress({ sent: 0, total: items.length }, true);
    this.pump();
  }

  pauseJob(): void {
    if (this.job.state !== 'running') return;
    this.emitRealtime(REALTIME.feedHold);
    this.job = { ...this.job, state: 'paused' };
    // Em pausa o GRBL pode parar de confirmar: o vigia fica desligado até o
    // retomar (senão um `Feed Hold` longo viraria erro de "stall").
    this.armWatchdog();
    this.emitJob(this.job);
  }

  resumeJob(): void {
    if (this.job.state !== 'paused') return;
    this.emitRealtime(REALTIME.cycleStart);
    this.job = { ...this.job, state: 'running' };
    this.emitJob(this.job);
    // Se a pausa pegou o fim do job (todos os `ok` já chegaram), conclui agora.
    this.checkJobFinished();
    this.armWatchdog();
    this.pump();
  }

  /** Para o job atual: soft reset (aborta) e limpa a fila. */
  stopJob(): void {
    // Só um job **em curso** para com soft reset: depois de `finished`/
    // `aborted` (ou sem job) o 0x18 só faria a máquina reiniciar e perder a
    // origem sem motivo.
    if (!this.jobStreaming()) return;
    this.abortJob(t('client.stopped'));
    // O soft reset descarta o buffer da máquina: nada mais será confirmado.
    this.clearInFlight();
    this.emitRealtime(REALTIME.softReset);
  }

  // Realtime
  softReset(): void {
    this.abortJob(t('client.reset'));
    this.clearInFlight();
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

  /**
   * Jog. Prefere o modo dedicado (`$J=`), que o GRBL cancela sozinho no
   * `0x85`; se o firmware não o implementar (ou o chamador pedir
   * `useDollarJog: false`), cai para o modo relativo em **três linhas
   * separadas** — `G91`, o `G0` e `G90` —, cada uma com o seu `ok`. Nunca
   * empilhar os três num só envio (o GRBL não garante a ordem modal).
   */
  jog(cmd: JogCommand): void {
    const feed = cmd.feed ?? 1000;
    const parts: string[] = [];
    if (cmd.x) parts.push(`X${cmd.x}`);
    if (cmd.y) parts.push(`Y${cmd.y}`);
    if (cmd.z) parts.push(`Z${cmd.z}`);
    if (parts.length === 0) return;
    if (this.dollarJogSupported && cmd.useDollarJog !== false) {
      this.sendLine(`$J=G91 ${parts.join(' ')} F${feed}`);
      return;
    }
    this.sendLine('G91');
    this.sendLine(`G0 ${parts.join(' ')} F${feed}`);
    this.sendLine('G90');
  }

  /** Cancela um jog em andamento (0x85) — usado pelo jog contínuo (RF-JOG-2). */
  cancelJog(): void {
    this.emitRealtime(REALTIME.jogCancel);
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
    this.emit('error', { message, code, kind: 'error' });
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

  private emitProgress(progress: JobProgress, force = false): void {
    // Um `ok` por linha: emitir um evento de progresso por linha inundava o
    // renderer com IPC durante a gravação (e o renderer precisa responder ao
    // `ok` seguinte). O painel é para humanos — 10 Hz é mais que suficiente.
    // `force` é usado no início e no fim do job (a barra precisa dos extremos).
    const now = Date.now();
    if (!force && now - this.lastProgressAt < PROGRESS_INTERVAL_MS) return;
    this.lastProgressAt = now;
    this.emit('progress', progress);
  }

  private startPolling(): void {
    this.stopPolling();
    this.lastStatusAt = Date.now();
    this.pollTimer = setInterval(() => {
      // Vigia de silêncio: com a porta morta (CDC re-enumerado depois de um
      // reset) o `?` sai para o vazio e o app continuava **"conectado"** — na
      // coleta foram 46 s mentindo, até um write devolver `bad file descriptor`
      // (`PLANO_MAQUINA` §11.6.4). O GRBL responde todo `?`; silêncio só é
      // esperado com job **em curso** (stall/pausa), e aí o vigia de `ok` cuida.
      // Depois de um job o estado fica `finished`/`aborted` — e aí o silêncio
      // volta a ser anomalia: foi exatamente esse o caso da coleta (o alarme
      // abortou o job e a porta morreu em seguida).
      if (!this.jobStreaming() && this.inFlight.length === 0) {
        if (Date.now() - this.lastStatusAt > this.statusSilenceMs) {
          void this.onLinkLost();
          return;
        }
      }
      this.emitRealtime(REALTIME.statusReport);
    }, this.statusPollMs);
  }

  /** Há job sendo transmitido? (idle/finished/aborted não contam.) */
  private jobStreaming(): boolean {
    return this.job.state === 'running' || this.job.state === 'paused';
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

  /**
   * (Re)arma o vigia de resposta: **um único** timer, reiniciado a cada
   * atividade (envio ou `ok`) e desligado quando não há nada em voo. Sem isso,
   * com a janela cheia haveria um timer por linha — e os antigos disparariam no
   * meio de um job longo, marcando "stall" e parando o envio.
   */
  private armWatchdog(): void {
    this.clearWatchdog();
    if (!this.transport || this.inFlight.length === 0) return;
    // Em pausa (feed hold) o GRBL deixa de confirmar — não é "stall": as linhas
    // em voo são confirmadas quando o operador retomar. O vigia volta no resume.
    if (this.job.state === 'paused') return;
    this.watchdog = setTimeout(() => {
      this.stalled = true;
      this.emitError(t('client.stall', { ms: this.stallMs }));
    }, this.stallMs);
  }

  private onData(chunk: string): void {
    // Remove caracteres de controle espúrios (ex.: 0x01) que alguns firmwares
    // inserem entre o status report e o 'ok', o que travava o reconhecimento.
    const clean = Array.from(chunk)
      .filter((ch) => {
        const code = ch.charCodeAt(0);
        return !(
          code <= 0x08 ||
          code === 0x0b ||
          code === 0x0c ||
          (code >= 0x0e && code <= 0x1f) ||
          code === 0x7f
        );
      })
      .join('');
    this.rxBuffer += clean;
    const { lines, rest } = splitLines(this.rxBuffer);
    this.rxBuffer = rest;
    for (const line of lines) this.handleLine(line);
  }

  private handleLine(rawLine: string): void {
    const line = rawLine.replace(/\r$/, '');
    if (line.trim() === '') return;

    // `[OPT:…]` (resposta de `$I`) traz o tamanho do **buffer RX** do GRBL e os
    // blocos do planner — ex.: `[OPT:V,15,128]`. É o buffer RX que define a
    // janela de envio (contagem de caracteres); sem a informação, valem os
    // padrões do GRBL 1.1.
    if (line.startsWith('[OPT:')) {
      const fields = line
        .replace(/^\[OPT:([^\]]*)\].*$/, '$1')
        .split(',')
        .map((v) => Number(v));
      if (Number.isFinite(fields[1]) && fields[1] >= 2 && fields[1] <= 256) {
        this.plannerBlocks = fields[1];
      }
      if (Number.isFinite(fields[2]) && fields[2] >= 32 && fields[2] <= 4096) {
        this.rxBufferSize = fields[2];
      }
    }

    if (isStatusReport(line)) {
      const status = parseStatusReport(line);
      if (status) {
        this.lastStatus = status;
        this.lastStatusAt = Date.now();
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
        this.onNack(
          describeGrbl(
            'error',
            classified.code,
            classified.message ?? classified.text,
          ),
          classified.code,
        );
        break;
      case 'alarm':
        this.onAlarm(
          classified.code,
          describeGrbl(
            'alarm',
            classified.code,
            classified.message ?? classified.text,
          ),
        );
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
    // O `ok` corresponde sempre à linha mais antiga em voo (o GRBL responde em
    // ordem, mesmo com a janela cheia).
    const acked = this.inFlight.shift();
    if (acked)
      this.inFlightBytes = Math.max(0, this.inFlightBytes - acked.bytes);
    if (acked?.item.query) this.resolveQuery();
    // Reinicia o vigia conforme o que continua em voo (se a janela ainda estiver
    // cheia, `pump()` não envia nada e o vigia precisa seguir de pé).
    this.armWatchdog();

    if (acked?.item.job) {
      this.jobDone++;
      this.emitProgress({ sent: this.job.sent, total: this.job.total });
      this.checkJobFinished();
    }
    if (!this.stalled) this.pump();
  }

  /**
   * Conclui o job quando **todos** os `ok` chegaram. Enviar ≠ executar: com a
   * janela, `sent` chega ao total antes do fim (e o `gotoZero` da UI entraria na
   * frente dos últimos movimentos). Em pausa (feed hold) também não conclui: a
   * máquina ainda tem movimento no buffer e o operador precisa do **Retomar**.
   */
  private checkJobFinished(): void {
    if (this.jobDone < this.job.total) return;
    if (this.job.state !== 'running') return;
    this.emitProgress({ sent: this.job.sent, total: this.job.total }, true);
    this.emitJob({ ...this.job, state: 'finished' });
  }

  private onNack(message: string, code?: number): void {
    // Drible do lixo na primeira leitura depois de conectar (`PLANO_MAQUINA` §11.7):
    // em 9 de 9 sessões reais o `$I` voltou `error:3` — o painel Máquina saía
    // **sem firmware** (nenhum `[VER:]`/`[OPT:]`) e o histórico ganhava um
    // `code 3` que não dizia o que falhou. Como é leitura idempotente,
    // repetimos **uma vez** por conexão, e sem alarme: é ruído do enlace na
    // primeira troca, não ação do operador. Nada mais é repetido — uma recusa
    // de outro comando continua sendo erro na hora, como sempre foi.
    const refused = this.inFlight[0]?.item;
    if (
      !this.awokeMachine &&
      code === 3 &&
      refused?.query === true &&
      refused.line === '$I' &&
      this.pendingQuery
    ) {
      this.awokeMachine = true;
      const item = this.inFlight.shift();
      if (item)
        this.inFlightBytes = Math.max(0, this.inFlightBytes - item.bytes);
      // Resposta parcial da tentativa recusada não vale: começa limpo.
      this.pendingQuery.lines = [];
      this.queue.unshift(refused);
      this.emit('console', {
        direction: 'in' as const,
        kind: 'message' as const,
        text: t('client.queryRetry', { line: refused.line }),
        ts: Date.now(),
      });
      this.armWatchdog();
      if (!this.stalled) this.pump();
      return;
    }
    this.failQuery(new Error(message));
    // Só aborta quando a linha rejeitada faz parte do job. Um `error:` de um
    // comando avulso/consulta (ex.: `$$` durante a gravação) **não** pode
    // interromper o corte — o operador mantém o controle do job.
    const acked = this.inFlight.shift();
    if (acked)
      this.inFlightBytes = Math.max(0, this.inFlightBytes - acked.bytes);
    this.armWatchdog();
    const failedWasJobLine = acked?.item.job === true;
    if (
      failedWasJobLine &&
      (this.job.state === 'running' || this.job.state === 'paused')
    ) {
      this.abortJob(message);
    }
    this.emit('error', this.describeFailure(message, code, acked?.item.line));
    // As linhas seguintes da janela ainda serão executadas (o GRBL descarta só
    // a linha com erro); os `ok` delas continuam alimentando o envio.
    if (!this.stalled) this.pump();
  }

  /**
   * Traduz a recusa da máquina para o evento da UI: **qual** linha falhou
   * (`error:3` sozinho não diz nada) e — quando o `$J=` é o culpado — a queda
   * para o jog relativo, avisando uma única vez em vez de repetir a cada jog.
   */
  private describeFailure(
    message: string,
    code: number | undefined,
    line: string | undefined,
  ): ErrorPayload {
    const base: ErrorPayload = {
      message,
      code,
      command: line,
      kind: 'error',
    };
    if (code === 3 && line !== undefined && line.startsWith('$J=')) {
      this.dollarJogSupported = false;
      return {
        ...base,
        message: t('client.jogDollarUnsupported', { line }),
      };
    }
    return base;
  }

  private onAlarm(code: number | undefined, message: string): void {
    this.failQuery(new Error(message));
    this.clearWatchdog();
    // O alarme para a máquina e descarta o que estava na fila dela.
    this.clearInFlight();
    this.queue = [];
    if (this.jobStreaming()) this.abortJob(message);
    this.emit('error', {
      message,
      code,
      solution: alarmSolution(code),
      kind: 'alarm',
    });
  }

  private abortJob(reason: string): void {
    this.queue = this.queue.filter((item) => !item.job);
    this.jobDone = 0;
    this.clearWatchdog();
    this.emitJob({ ...this.job, state: 'aborted', error: reason });
  }

  /** Esquece as linhas em voo (a máquina descartou o buffer: reset/alarme). */
  private clearInFlight(): void {
    this.inFlight = [];
    this.inFlightBytes = 0;
    this.clearWatchdog();
  }

  /**
   * Trecho curto de uma linha para a mensagem de erro (não despeja 300 B no
   * console).
   */
  private static shortLine(line: string): string {
    return line.length > 48 ? `${line.slice(0, 47)}…` : line;
  }

  /**
   * Orçamento da janela em bytes: o buffer RX do GRBL com uma pequena margem
   * (o GRBL conta a linha inteira, incluindo o `\n`).
   */
  private sendWindow(): number {
    return Math.max(16, this.rxBufferSize - 8);
  }

  /**
   * Teto de linhas em voo: nunca mais que a profundidade do planner da máquina
   * (menos uma folga). Comum no G-code do gerador, mas arquivos com linhas muito
   * curtas (`M5`, `G0`) caberiam dezenas numa janela de 120 B — e aí um
   * `Feed Hold` teria de esperar a fila inteira do planner drenar.
   */
  private lineWindow(): number {
    return Math.max(2, Math.min(this.plannerBlocks, 16) - 1);
  }

  private pump(): void {
    if (!this.transport || this.stalled) return;

    // Reabastece a janela sem esperar cada `ok`: é isso que mantém o buffer do
    // GRBL cheio enquanto o PC faz outra coisa. Consultas/comandos avulsos só
    // vão com a janela vazia, para o corpo da resposta (`$$`, `$I`…) não se
    // misturar com os `ok` do job.
    const window = this.sendWindow();
    const maxLines = this.lineWindow();
    // Em pausa (feed hold) não adianta empurrar o job: o GRBL para de consumir
    // e a fila só cresceria. `resumeJob()` reabre o envio. Comandos avulsos
    // (jog, `$X`) continuam podendo passar.
    const paused = this.job.state === 'paused';
    while (this.queue.length > 0) {
      const item = this.queue[0] as QueueItem;
      if (item.job && paused) return;
      if (!item.job && this.inFlight.length > 0) return;
      const bytes = Buffer.byteLength(item.line, 'utf8') + 1; // + '\n'
      // Linha que não cabe no buffer RX do GRBL (128 B típicos): enviar
      // estouraria o buffer e o GRBL perderia caracteres no meio — falha alto
      // em vez de corromper. O '\n' conta: o GRBL precisa da linha inteira.
      if (bytes > this.rxBufferSize) {
        this.queue.shift();
        const msg = t('client.lineTooLong', {
          bytes,
          max: this.rxBufferSize,
          line: GrblClient.shortLine(item.line),
        });
        if (item.query) this.failQuery(new Error(msg));
        if (item.job) this.abortJob(msg);
        this.emit('error', { message: msg });
        continue;
      }
      // Sempre permite a primeira linha em voo (mesmo se for maior que a
      // janela): senão uma linha longa travaria o envio para sempre.
      if (item.job && this.inFlight.length > 0) {
        if (this.inFlightBytes + bytes > window) return;
        if (this.inFlight.length >= maxLines) return;
      }
      this.queue.shift();
      this.dispatch(item, bytes);
    }
  }

  /** Escreve uma linha e a registra na janela (o `ok` a remove). */
  private dispatch(item: QueueItem, bytes: number): void {
    this.inFlight.push({ bytes, item });
    this.inFlightBytes += bytes;
    // A partir daqui as respostas da consulta começam a chegar.
    if (item.query && this.pendingQuery) this.pendingQuery.active = true;

    this.emit('console', {
      direction: 'out' as const,
      kind: 'other' as const,
      text: item.line,
      ts: Date.now(),
    });

    if (item.job) this.job = { ...this.job, sent: this.job.sent + 1 };

    this.transport?.writeLine(item.line).catch((err: Error) => {
      // Falha de escrita: a linha saiu da janela (a máquina não a recebeu).
      const idx = this.inFlight.findIndex((entry) => entry.item === item);
      if (idx >= 0) {
        this.inFlight.splice(idx, 1);
        this.inFlightBytes = Math.max(0, this.inFlightBytes - bytes);
      }
      this.armWatchdog();
      this.emitError(t('client.writeFail', { msg: err.message }));
    });

    this.armWatchdog();
  }
}
