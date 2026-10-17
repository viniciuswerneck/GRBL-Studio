/**
 * Log persistente de sessão (RNF-9).
 *
 * Grava as linhas do console e os eventos de conexão/job/erro em
 * `<userData>/logs/session-<timestamp>.log`. A escrita é **enfileirada e
 * agrupada** para não competir com o streaming serial (RNF-11): as linhas
 * entram numa fila em memória e o flush é agrupado (a cada ~400 ms ou 128
 * linhas). Falhas de I/O nunca interrompem o app.
 */

import { appendFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';

function stampNow(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
}

export class SessionLog {
  /** Diretório dos logs (`<userData>/logs`). */
  readonly dir: string;
  private file = '';
  private queue: string[] = [];
  private timer: NodeJS.Timeout | null = null;
  private initPromise: Promise<void> | null = null;
  private closed = false;

  constructor(baseDir: string) {
    this.dir = path.join(baseDir, 'logs');
  }

  /** Cria o diretório/arquivo da sessão uma única vez. Nunca lança. */
  init(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    try {
      await mkdir(this.dir, { recursive: true });
      this.file = path.join(this.dir, `session-${stampNow()}.log`);
      await appendFile(
        this.file,
        `# GRBL Studio session ${new Date().toISOString()}\n`,
      );
    } catch {
      this.file = '';
    }
  }

  /** Enfileira uma linha carimbada com o horário. Nunca lança. */
  append(text: string): void {
    if (this.closed) return;
    if (this.initPromise === null) void this.init();
    this.queue.push(`[${new Date().toISOString()}] ${text}`);
    if (this.queue.length >= 128) {
      this.cancelTimer();
      void this.writeNow();
    } else {
      this.schedule();
    }
  }

  /** Escreve o que estiver na fila (uma única chamada de I/O). */
  async writeNow(): Promise<void> {
    await this.init();
    // Sem arquivo (I/O falhou): descarta a fila para não crescer sem limite.
    if (!this.file) {
      this.queue = [];
      return;
    }
    if (this.queue.length === 0) return;
    const chunk = `${this.queue.join('\n')}\n`;
    this.queue = [];
    try {
      await appendFile(this.file, chunk);
    } catch {
      /* log é melhor esforço; nunca derruba o app */
    }
  }

  /** Descarrega a fila e para o timer (chamado no shutdown). Idempotente. */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.cancelTimer();
    await this.writeNow();
  }

  /** Caminho do arquivo da sessão (vazio se a criação falhou). */
  get path(): string {
    return this.file;
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.writeNow();
    }, 400);
  }

  private cancelTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
