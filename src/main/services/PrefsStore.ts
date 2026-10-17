/**
 * Preferências persistidas (RF-CFG-5, RF-CON-3).
 *
 * Armazena um JSON simples em `<userData>/prefs.json`. Optamos por não usar
 * `electron-store` (ADR-6) porque as versões atuais são ESM-only e brigariam
 * com o `main` em CommonJS; o efeito prático é o mesmo e sem dependência.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { sanitizeMacros } from '../../shared/macros';
import type { Prefs } from '../../shared/types';

/** Filtra o que veio do disco, mantendo só chaves/tipos conhecidos. */
function sanitize(input: unknown): Prefs {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;
  const prefs: Prefs = {};
  if (typeof raw.port === 'string' && raw.port) prefs.port = raw.port;
  if (typeof raw.baud === 'number' && Number.isFinite(raw.baud))
    prefs.baud = raw.baud;
  if (raw.theme === 'dark' || raw.theme === 'light') prefs.theme = raw.theme;
  if (raw.units === 'mm' || raw.units === 'in') prefs.units = raw.units;
  if (typeof raw.autoConnect === 'boolean') prefs.autoConnect = raw.autoConnect;
  if (Array.isArray(raw.macros)) prefs.macros = sanitizeMacros(raw.macros);
  if (raw.transport === 'serial' || raw.transport === 'tcp')
    prefs.transport = raw.transport;
  if (typeof raw.host === 'string' && raw.host) prefs.host = raw.host;
  if (
    typeof raw.tcpPort === 'number' &&
    Number.isInteger(raw.tcpPort) &&
    raw.tcpPort > 0 &&
    raw.tcpPort < 65536
  )
    prefs.tcpPort = raw.tcpPort;
  return prefs;
}

export class PrefsStore {
  private readonly file: string;
  private cache: Prefs | null = null;

  constructor(filePath: string) {
    this.file = filePath;
  }

  async read(): Promise<Prefs> {
    if (this.cache) return this.cache;
    try {
      const raw = await readFile(this.file, 'utf8');
      this.cache = sanitize(JSON.parse(raw));
    } catch {
      this.cache = {};
    }
    return this.cache;
  }

  async updateInPlace(patch: Partial<Prefs>): Promise<Prefs> {
    const current = await this.read();
    const next = sanitize({ ...current, ...patch });
    this.cache = next;
    await mkdir(path.dirname(this.file), { recursive: true });
    await writeFile(this.file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    return next;
  }
}
