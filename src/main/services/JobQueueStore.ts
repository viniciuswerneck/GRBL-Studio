/**
 * **Fila de trabalhos** (agenda) — armazenamento e leitura dos arquivos.
 *
 * A fila vive em `<userData>/queue.json` (pequena: só caminho, nome e estado) e
 * é reescrita de forma atômica a cada mudança. Os **programas não são copiados**:
 * cada item aponta para o arquivo original, que é lido só na hora de gravar.
 *
 * Por segurança, `read()` só abre caminhos que passaram pela fila (escolhidos no
 * diálogo ou carregados do JSON) — o renderer nunca ganha leitura livre de
 * arquivos. Falha de I/O nunca derruba o app: a fila é um extra.
 */

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { type JobQueueItem, sanitizeQueue } from '../../shared/jobQueue';
import type { OpenedTextFile } from '../../shared/types';

/** Mesmo teto dos diálogos de texto (protege RAM no main). */
const TEXT_MAX_BYTES = 64 * 1024 * 1024;

function newId(): string {
  return randomBytes(8).toString('hex');
}

export class JobQueueStore {
  private readonly file: string;
  /** Caminhos que o renderer pode mandar ler (só o que está na fila). */
  private allowed = new Set<string>();

  constructor(private readonly dir: string) {
    this.file = path.join(dir, 'queue.json');
  }

  private remember(items: readonly JobQueueItem[]): void {
    this.allowed = new Set(items.map((item) => item.path));
  }

  /** Lê a fila do disco (vazia/ inválida → `[]`). */
  async load(): Promise<JobQueueItem[]> {
    try {
      const text = await readFile(this.file, 'utf8');
      const items = sanitizeQueue(JSON.parse(text));
      this.remember(items);
      return items;
    } catch {
      return [];
    }
  }

  /** Grava a fila saneada e devolve o que ficou (fonte da verdade). */
  async save(input: unknown): Promise<JobQueueItem[]> {
    const items = sanitizeQueue(input);
    try {
      await mkdir(this.dir, { recursive: true });
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, JSON.stringify(items), 'utf8');
      await rename(tmp, this.file);
    } catch {
      // Sem disco a fila continua só na memória do renderer.
    }
    this.remember(items);
    return items;
  }

  /** Transforma caminhos escolhidos no diálogo em itens da fila. */
  async addPaths(paths: readonly string[]): Promise<JobQueueItem[]> {
    const items: JobQueueItem[] = [];
    for (const filePath of paths) {
      if (!filePath) continue;
      let info: Awaited<ReturnType<typeof stat>>;
      try {
        info = await stat(filePath);
      } catch {
        continue;
      }
      if (!info.isFile()) continue;
      items.push({
        id: newId(),
        path: filePath,
        name: path.basename(filePath),
        sizeBytes: info.size,
        status: 'pending',
        addedAt: Date.now(),
      });
      this.allowed.add(filePath);
    }
    return items;
  }

  /** Conteúdo do programa de um item da fila (com teto de tamanho). */
  async read(filePath: unknown): Promise<OpenedTextFile> {
    const target = typeof filePath === 'string' ? filePath : '';
    if (!target || !this.allowed.has(target)) {
      throw new Error('arquivo fora da fila');
    }
    const info = await stat(target);
    if (!info.isFile()) throw new Error('não é um arquivo');
    if (info.size > TEXT_MAX_BYTES) {
      throw new Error('arquivo grande demais para a fila');
    }
    const text = await readFile(target, 'utf8');
    return { path: target, name: path.basename(target), text };
  }
}
