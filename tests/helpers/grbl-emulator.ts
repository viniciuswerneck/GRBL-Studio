/**
 * Emulador mínimo de GRBL 1.1 do outro lado de um PTY, para testes E2E.
 *
 * Reproduz o comportamento relevante ao streaming do `GrblClient`:
 *  - `ok` por linha, em **ordem estrita**, com atraso configurável (a janela de
 *    RX fica cheia e o cliente precisa esperar os acks);
 *  - a janela de RX (contagem de caracteres) e a profundidade do planner são
 *    observadas: qualquer excesso é contabilizado em `windowViolations`;
 *  - `error:N` para as linhas marcadas por `rejectLine` (ex.: `error:9`);
 *  - comandos de tempo real de **byte único**: `?` (status), `!` (feed hold),
 *    `~` (cycle start) e `0x18` (soft reset) — sem `\n`;
 *  - `Hold` congela os acks; `~` os libera (o GRBL para de confirmar em pausa);
 *  - `ALARM:N` + status `<Alarm|…>` injetados no meio do job;
 *  - soft reset volta a `Idle` e descarta o buffer (nenhum `ok` pendente).
 *
 * O stream cru recebido é preservado (`raw`) para que o teste possa afirmar
 * que nenhum comando de tempo real veio acompanhado de newline.
 */

import * as fs from 'node:fs';

export type EmulatorState = 'Idle' | 'Run' | 'Hold' | 'Alarm';

export interface GrblEmulatorOptions {
  /**
   * Atraso antes de cada resposta (`ok`/`error`). Mantém a janela cheia e
   * permite pausar/cancelar no meio do job com folga.
   */
  ackDelayMs?: number;
  /** Profundidade do planner do GRBL (padrão 16, como o cliente assume). */
  plannerBlocks?: number;
  /** Buffer RX do GRBL em bytes (padrão 128, GRBL 1.1). */
  rxBufferSize?: number;
  /** Linhas que devem ser rejeitadas com `error:9`. */
  rejectLine?: (line: string) => boolean;
}

interface PendingResponse {
  kind: 'ok' | 'error';
  line: string;
  bytes: number;
  code?: number;
}

export interface RealtimeFrame {
  byte: number;
  offset: number;
  /** O byte seguinte no stream é `\n`? (violação do protocolo). */
  followedByNewline: boolean;
}

const NEWLINE = 0x0a;
const CR = 0x0d;
const STATUS = 0x3f;
const FEED_HOLD = 0x21;
const CYCLE_START = 0x7e;
const SOFT_RESET = 0x18;
const JOG_CANCEL = 0x85;

export class GrblEmulator {
  /** Linhas completas recebidas, na ordem (equivalente ao que a máquina viu). */
  readonly receivedLines: string[] = [];
  /** Linhas confirmadas com `ok`, na ordem. */
  readonly ackedLines: string[] = [];
  /** Linhas rejeitadas (`error:N`), na ordem. */
  readonly errorLines: string[] = [];
  /** Contagem dos comandos de tempo real observados no lado falso. */
  readonly realtime = {
    status: 0,
    hold: 0,
    resume: 0,
    reset: 0,
    jogCancel: 0,
    overrides: 0,
  };

  state: EmulatorState = 'Idle';
  /** Maior quantidade de bytes recebidos e ainda sem resposta. */
  maxOutstandingBytes = 0;
  /** Maior quantidade de linhas recebidas e ainda sem resposta. */
  maxOutstandingLines = 0;
  /** Quantas vezes o cliente estourou a janela de RX/planner. */
  windowViolations = 0;

  private readonly rx: fs.ReadStream;
  private readonly tx: fs.WriteStream;
  private readonly rawChunks: Buffer[] = [];
  private readonly responses: PendingResponse[] = [];
  private readonly ackDelayMs: number;
  private readonly plannerBlocks: number;
  private readonly rxBufferSize: number;
  private readonly rejectLine?: (line: string) => boolean;

  private lineBuffer = '';
  private outstandingBytes = 0;
  private outstandingLines = 0;
  private draining = false;
  private epoch = 0;
  private closed = false;

  constructor(
    readonly path: string,
    options: GrblEmulatorOptions = {},
  ) {
    this.ackDelayMs = options.ackDelayMs ?? 8;
    this.plannerBlocks = options.plannerBlocks ?? 16;
    this.rxBufferSize = options.rxBufferSize ?? 128;
    this.rejectLine = options.rejectLine;
    this.rx = fs.createReadStream(path);
    this.tx = fs.createWriteStream(path);
    // EIO é esperado ao fechar o PTY de qualquer lado.
    this.rx.on('error', () => undefined);
    this.tx.on('error', () => undefined);
    this.rx.on('data', (chunk: Buffer) => this.onChunk(chunk));
  }

  /** Aguarda os streams abrirem antes de o teste conectar o cliente. */
  async open(): Promise<void> {
    await Promise.all([waitOpen(this.rx), waitOpen(this.tx)]);
  }

  close(): void {
    this.closed = true;
    this.epoch++;
    this.responses.length = 0;
    this.rx.destroy();
    this.tx.destroy();
  }

  /** Bytes crus que chegaram do cliente (lado "máquina"). */
  get raw(): Buffer {
    return Buffer.concat(this.rawChunks);
  }

  /**
   * Ocorrências dos bytes indicados no stream cru, com a informação de se o
   * próximo byte é `\n` — base da asserção de "tempo real é byte único".
   */
  framingOf(targets: readonly number[]): RealtimeFrame[] {
    const raw = this.raw;
    const frames: RealtimeFrame[] = [];
    for (let i = 0; i < raw.length; i++) {
      const byte = raw[i]!;
      if (!targets.includes(byte)) continue;
      frames.push({
        byte,
        offset: i,
        followedByNewline: raw[i + 1] === NEWLINE,
      });
    }
    return frames;
  }

  /** Injeta um alarme no meio do job (a máquina parou). */
  raiseAlarm(code = 1): void {
    this.epoch++;
    this.responses.length = 0;
    this.outstandingBytes = 0;
    this.outstandingLines = 0;
    this.state = 'Alarm';
    this.send(`ALARM:${code}\r\n`);
    this.send('<Alarm|MPos:0.000,0.000,0.000|FS:0,0>\r\n');
  }

  // --------------------------------------------------------------- interno

  private onChunk(chunk: Buffer): void {
    this.rawChunks.push(chunk);
    for (const byte of chunk) {
      switch (byte) {
        case STATUS:
          this.realtime.status++;
          this.sendStatus();
          continue;
        case FEED_HOLD:
          this.realtime.hold++;
          this.feedHold();
          continue;
        case CYCLE_START:
          this.realtime.resume++;
          this.cycleStart();
          continue;
        case SOFT_RESET:
          this.realtime.reset++;
          this.softReset();
          continue;
        case JOG_CANCEL:
          this.realtime.jogCancel++;
          continue;
        case NEWLINE: {
          const line = this.lineBuffer.replace(/\r$/, '');
          this.lineBuffer = '';
          this.onLine(line);
          continue;
        }
        default:
          break;
      }
      if (byte === CR) continue;
      if (byte >= 0x90 && byte <= 0x9d) {
        this.realtime.overrides++;
        continue;
      }
      this.lineBuffer += String.fromCharCode(byte);
    }
  }

  private onLine(rawLine: string): void {
    const line = rawLine.trim();
    if (!line) return;

    this.receivedLines.push(line);
    this.outstandingLines++;
    this.outstandingBytes += Buffer.byteLength(line, 'utf8') + 1;
    this.maxOutstandingBytes = Math.max(
      this.maxOutstandingBytes,
      this.outstandingBytes,
    );
    this.maxOutstandingLines = Math.max(
      this.maxOutstandingLines,
      this.outstandingLines,
    );
    if (
      this.outstandingBytes > this.rxBufferSize ||
      this.outstandingLines > this.plannerBlocks
    ) {
      this.windowViolations++;
    }

    if (this.state === 'Idle') this.state = 'Run';

    // Em alarme o GRBL bloqueia G-code (error:9); em Hold os acks congelam.
    if (this.state === 'Alarm') {
      this.enqueue({
        kind: 'error',
        line,
        bytes: this.lineBytes(line),
        code: 9,
      });
      return;
    }
    if (this.rejectLine?.(line)) {
      this.enqueue({
        kind: 'error',
        line,
        bytes: this.lineBytes(line),
        code: 9,
      });
      return;
    }
    this.enqueue({ kind: 'ok', line, bytes: this.lineBytes(line) });
  }

  private lineBytes(line: string): number {
    return Buffer.byteLength(line, 'utf8') + 1;
  }

  private enqueue(response: PendingResponse): void {
    this.responses.push(response);
    void this.drain();
  }

  /**
   * Entrega as respostas em ordem estrita, uma a cada `ackDelayMs`.
   * `Hold` pausa a entrega; soft reset/alarme (epoch) descartam a fila.
   */
  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.responses.length > 0 && this.state !== 'Hold') {
        const epoch = this.epoch;
        const next = this.responses[0]!;
        await sleep(this.ackDelayMs);
        if (this.epoch !== epoch) break;
        if (this.isHeld()) break;
        this.responses.shift();
        this.respond(next);
      }
    } finally {
      this.draining = false;
    }
    // Uma resposta enfileirada enquanto o laço estava no `await` (ex.: logo
    // após um reset) não pode ficar órfã.
    if (!this.closed && this.responses.length > 0 && this.state !== 'Hold') {
      void this.drain();
    }
  }

  private respond(response: PendingResponse): void {
    this.outstandingLines = Math.max(0, this.outstandingLines - 1);
    this.outstandingBytes = Math.max(0, this.outstandingBytes - response.bytes);
    if (response.kind === 'ok') {
      this.ackedLines.push(response.line);
      this.send('ok\r\n');
    } else {
      this.errorLines.push(response.line);
      this.send(`error:${response.code ?? 9}\r\n`);
    }
    if (
      this.state === 'Run' &&
      this.outstandingLines === 0 &&
      this.responses.length === 0
    ) {
      this.state = 'Idle';
    }
  }

  private feedHold(): void {
    if (this.state === 'Alarm') return;
    this.state = 'Hold';
  }

  /** Indireção para o TS não estreitar `state` através do `await`. */
  private isHeld(): boolean {
    return this.state === 'Hold';
  }

  private cycleStart(): void {
    if (this.state !== 'Hold') return;
    this.state = 'Run';
    void this.drain();
  }

  private softReset(): void {
    this.epoch++;
    this.responses.length = 0;
    this.outstandingBytes = 0;
    this.outstandingLines = 0;
    this.lineBuffer = '';
    this.state = 'Idle';
    // O GRBL real imprime o banner logo após o reset (classificado como welcome).
    this.send("Grbl 1.1f ['$' for help]\r\n");
  }

  private sendStatus(): void {
    this.send(`<${this.state}|MPos:0.000,0.000,0.000|FS:0,0>\r\n`);
  }

  private send(text: string): void {
    if (this.closed || this.tx.destroyed) return;
    this.tx.write(text);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitOpen(stream: fs.ReadStream | fs.WriteStream): Promise<void> {
  if (!stream.pending) return;
  await new Promise<void>((resolve) => {
    stream.once('open', () => resolve());
  });
}
