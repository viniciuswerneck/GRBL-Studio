/**
 * Biblioteca de jobs (P2.9) — os últimos 50 programas executados.
 *
 * Layout em `<dir>/`:
 *  - `index.json`: metadados (mais novo primeiro), com a miniatura embutida;
 *  - `<id>.gz`: o programa, compactado com gzip.
 *
 * O G-code fica **fora** do índice e comprimido porque pode ter centenas de
 * milhares de linhas: reescrever um JSON gigante a cada job seria caro e
 * arriscado (RNF-11). A escrita do índice é atômica (tmp + rename) e o acervo
 * tem dois tetos — 50 entradas e um orçamento de bytes em disco — para nunca
 * crescer sem limite. Falhas de I/O nunca derrubam o app: a biblioteca é um
 * extra, não parte do fluxo de gravação.
 */

import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { gunzip, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import type { JobLibraryAdd, JobLibraryEntry } from '../../shared/types';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/** Teto de entradas (P2.9: "últimos 50 jobs"). */
export const JOB_LIBRARY_MAX = 50;
/** Programa maior que isto entra só como metadado (sem reexecutar). */
export const JOB_LIBRARY_MAX_PROGRAM_BYTES = 16 * 1024 * 1024;
/** Orçamento dos programas **comprimidos** em disco. */
export const JOB_LIBRARY_MAX_STORED_BYTES = 32 * 1024 * 1024;
/** Teto do data URL da miniatura (PNG 160×120 fica bem abaixo). */
export const JOB_LIBRARY_MAX_THUMB_CHARS = 48 * 1024;

/** Entrada como fica no índice (campos internos do armazenamento). */
interface StoredEntry extends JobLibraryEntry {
  /** Bytes do `.gz` em disco (orçamento). */
  storedBytes: number;
  /** Hash do programa (evita duplicar a mesma reexecução). */
  hash: string;
}

const ID_RE = /^[a-z0-9][a-z0-9-]{5,39}$/i;
const SOURCE_RE = /^[a-z0-9-]{1,24}$/i;
const THUMB_RE = /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/;

/** Nome curto e sem caracteres de controle (vai para a UI e para o disco). */
function cleanName(input: unknown): string {
  const raw = typeof input === 'string' ? input : '';
  // biome-ignore lint/suspicious/noControlCharactersInRegex: entrada do usuário
  const text = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return (text || 'job.gcode').slice(0, 120);
}

function cleanSource(input: unknown): string {
  const text = typeof input === 'string' ? input.trim().toLowerCase() : '';
  return SOURCE_RE.test(text) ? text : 'file';
}

function cleanSeconds(input: unknown): number {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return 0;
  // 30 dias é teto de sanidade (arquivo absurdo não vira número infinito).
  return Math.min(Math.round(value), 30 * 24 * 3600);
}

/** Miniatura válida (data URL de PNG/JPEG pequeno) ou `undefined`. */
function cleanThumb(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  if (input.length > JOB_LIBRARY_MAX_THUMB_CHARS) return undefined;
  return THUMB_RE.test(input) ? input : undefined;
}

function newId(): string {
  return `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
}

/** Normaliza o que veio do disco (índice editado à mão não derruba nada). */
function sanitizeEntry(input: unknown): StoredEntry | null {
  if (!input || typeof input !== 'object') return null;
  const rec = input as Record<string, unknown>;
  const id = typeof rec.id === 'string' ? rec.id : '';
  if (!ID_RE.test(id)) return null;
  const createdAt = Number(rec.createdAt);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return null;
  const bytes = Number(rec.bytes);
  const lines = Number(rec.lines);
  const storedBytes = Number(rec.storedBytes);
  return {
    id,
    name: cleanName(rec.name),
    source: cleanSource(rec.source),
    lines: Number.isFinite(lines) && lines > 0 ? Math.round(lines) : 0,
    estimatedSec: cleanSeconds(rec.estimatedSec),
    createdAt: Math.round(createdAt),
    bytes: Number.isFinite(bytes) && bytes > 0 ? Math.round(bytes) : 0,
    thumb: cleanThumb(rec.thumb),
    hasProgram: rec.hasProgram === true,
    storedBytes:
      Number.isFinite(storedBytes) && storedBytes > 0
        ? Math.round(storedBytes)
        : 0,
    hash: typeof rec.hash === 'string' ? rec.hash.slice(0, 64) : '',
  };
}

/** Metadados públicos (o índice não devolve o hash nem os bytes em disco). */
function toPublic(entry: StoredEntry): JobLibraryEntry {
  return {
    id: entry.id,
    name: entry.name,
    source: entry.source,
    lines: entry.lines,
    estimatedSec: entry.estimatedSec,
    createdAt: entry.createdAt,
    bytes: entry.bytes,
    thumb: entry.thumb,
    hasProgram: entry.hasProgram,
  };
}

export class JobLibrary {
  private readonly dir: string;
  private readonly indexFile: string;
  private cache: StoredEntry[] | null = null;
  /** Mutação em fila: dois `add` simultâneos não se atropelam no índice. */
  private queue: Promise<unknown> = Promise.resolve();
  /** Criação do diretório (uma vez; nunca lança duas vezes). */
  private dirReady: Promise<void> | null = null;

  constructor(dir: string) {
    this.dir = dir;
    this.indexFile = path.join(dir, 'index.json');
  }

  /** Serializa mutações (ordem de chegada) sem vazar rejeições. */
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private ensureDir(): Promise<void> {
    if (!this.dirReady) {
      this.dirReady = mkdir(this.dir, { recursive: true }).then(
        () => undefined,
      );
    }
    return this.dirReady;
  }

  private fileFor(id: string): string {
    return path.join(this.dir, `${id}.gz`);
  }

  private async load(): Promise<StoredEntry[]> {
    if (this.cache) return this.cache;
    try {
      const raw = await readFile(this.indexFile, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [];
      this.cache = list
        .map(sanitizeEntry)
        .filter((entry): entry is StoredEntry => entry !== null)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      // Índice ausente/corrompido: começa vazio (os `.gz` órfãos ficam para o
      // `clear()`; não custam RAM nem quebram a listagem).
      this.cache = [];
    }
    return this.cache;
  }

  /** Grava o índice de forma atômica e aplica os tetos de acervo. */
  private async persist(entries: StoredEntry[]): Promise<StoredEntry[]> {
    await this.ensureDir();
    const kept = [...entries].sort((a, b) => b.createdAt - a.createdAt);
    let total = kept.reduce((sum, entry) => sum + entry.storedBytes, 0);
    while (
      kept.length > JOB_LIBRARY_MAX ||
      (total > JOB_LIBRARY_MAX_STORED_BYTES && kept.length > 1)
    ) {
      const dropped = kept.pop();
      if (!dropped) break;
      total -= dropped.storedBytes;
      await this.removeFile(dropped.id);
    }

    const tmp = `${this.indexFile}.tmp`;
    await writeFile(tmp, `${JSON.stringify(kept, null, 2)}\n`, 'utf8');
    await rename(tmp, this.indexFile);
    this.cache = kept;
    return kept;
  }

  /** Remove o `.gz` de um id (silencioso quando não existe). */
  private async removeFile(id: string): Promise<void> {
    if (!ID_RE.test(id)) return;
    try {
      await rm(this.fileFor(id), { force: true });
    } catch {
      // melhor esforço: um órfão não pode impedir o registro do job
    }
  }

  /** Registra um job executado e devolve a entrada criada. */
  add(input: JobLibraryAdd): Promise<JobLibraryEntry> {
    return this.enqueue(async () => {
      const program = Array.isArray(input?.program) ? input.program : [];
      const text = program.join('\n');
      const bytes = Buffer.byteLength(text, 'utf8');
      const hash = createHash('sha1').update(text).digest('hex');
      const entries = await this.load();

      // Mesmo programa de novo (reexecução): atualiza em vez de duplicar.
      const previous = entries.find((item) => item.hash === hash);

      const id = newId();
      let storedBytes = 0;
      let hasProgram = false;
      if (bytes > 0 && bytes <= JOB_LIBRARY_MAX_PROGRAM_BYTES) {
        // Async: comprimir 16 MB não pode travar o streaming serial.
        const gz = await gzipAsync(Buffer.from(text, 'utf8'), { level: 6 });
        storedBytes = gz.length;
        await this.ensureDir();
        await writeFile(this.fileFor(id), gz);
        hasProgram = true;
      }

      const entry: StoredEntry = {
        id,
        name: cleanName(input?.name),
        source: cleanSource(input?.source),
        lines: program.length,
        estimatedSec: cleanSeconds(input?.estimatedSec),
        // Estritamente crescente mesmo em adds no mesmo milissegundo: a ordem
        // da lista não pode depender de desempate do `sort`.
        createdAt: Math.max(Date.now(), (entries[0]?.createdAt ?? 0) + 1),
        bytes,
        // Reexecutar sem miniatura (preview vazio) não apaga a anterior.
        thumb: cleanThumb(input?.thumb) ?? previous?.thumb,
        hasProgram,
        storedBytes,
        hash,
      };

      if (previous && previous.id !== id) await this.removeFile(previous.id);
      const next = [entry, ...entries.filter((item) => item.hash !== hash)];
      // Nome/miniatura antigos não valem mais: a entrada nova é a verdade.
      await this.persist(next);
      return toPublic(entry);
    });
  }

  /** Metadados, do mais recente para o mais antigo. */
  list(): Promise<JobLibraryEntry[]> {
    return this.enqueue(async () => (await this.load()).map(toPublic));
  }

  /** Programa de um job (texto pronto) — `null` se não houver/!permitido. */
  read(id: unknown): Promise<string | null> {
    return this.enqueue(async () => {
      const key = typeof id === 'string' ? id : '';
      if (!ID_RE.test(key)) return null;
      const entry = (await this.load()).find((item) => item.id === key);
      if (!entry?.hasProgram) return null;
      try {
        const gz = await readFile(this.fileFor(key));
        if (gz.length > JOB_LIBRARY_MAX_STORED_BYTES) return null;
        const out = await gunzipAsync(gz, {
          maxOutputLength: JOB_LIBRARY_MAX_PROGRAM_BYTES,
        });
        return out.toString('utf8');
      } catch {
        return null;
      }
    });
  }

  /** Remove uma entrada (arquivo + índice). `true` se algo saiu. */
  remove(id: unknown): Promise<boolean> {
    return this.enqueue(async () => {
      const key = typeof id === 'string' ? id : '';
      if (!ID_RE.test(key)) return false;
      const entries = await this.load();
      const next = entries.filter((item) => item.id !== key);
      if (next.length === entries.length) return false;
      await this.removeFile(key);
      await this.persist(next);
      return true;
    });
  }

  /** Esvazia a biblioteca (índice + programas). */
  clear(): Promise<void> {
    return this.enqueue(async () => {
      const entries = await this.load();
      for (const entry of entries) await this.removeFile(entry.id);
      await this.persist([]);
    });
  }
}
