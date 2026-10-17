/**
 * Preferências persistidas (RF-CFG-5, RF-CON-3).
 *
 * Armazena um JSON simples em `<userData>/prefs.json`. Optamos por não usar
 * `electron-store` (ADR-6) porque as versões atuais são ESM-only e brigariam
 * com o `main` em CommonJS; o efeito prático é o mesmo e sem dependência.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { isLang } from '../../shared/i18n';
import { sanitizeMacros } from '../../shared/macros';
import { isThemeId } from '../../shared/themes';
import type { AlarmEntry, Prefs, SettingProfile } from '../../shared/types';

/** Perfis de configuração `$$` (RF-CFG-4): filtra e normaliza o que veio do disco. */
function sanitizeSettingProfiles(input: unknown): SettingProfile[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: SettingProfile[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.name !== 'string' || !rec.name.trim()) continue;
    const values: Record<string, string> = {};
    if (rec.values && typeof rec.values === 'object') {
      for (const [key, value] of Object.entries(
        rec.values as Record<string, unknown>,
      )) {
        if (
          /^\d+$/.test(key) &&
          (typeof value === 'string' || typeof value === 'number')
        ) {
          values[key] = String(value).trim();
        }
      }
    }
    out.push({ name: rec.name.trim(), values });
  }
  return out;
}

/** Histórico de alarmes (RF-STA-7): mantém as últimas 100 entradas. */
function sanitizeAlarmHistory(input: unknown): AlarmEntry[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: AlarmEntry[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.message !== 'string') continue;
    const entry: AlarmEntry = {
      ts:
        typeof rec.ts === 'number' && Number.isFinite(rec.ts)
          ? rec.ts
          : Date.now(),
      message: rec.message,
    };
    if (typeof rec.code === 'number' && Number.isFinite(rec.code))
      entry.code = rec.code;
    if (typeof rec.solution === 'string') entry.solution = rec.solution;
    out.push(entry);
  }
  return out.slice(-100);
}

/** Filtra o que veio do disco, mantendo só chaves/tipos conhecidos. */
function sanitize(input: unknown): Prefs {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;
  const prefs: Prefs = {};
  if (typeof raw.port === 'string' && raw.port) prefs.port = raw.port;
  if (typeof raw.baud === 'number' && Number.isFinite(raw.baud))
    prefs.baud = raw.baud;
  if (isThemeId(raw.theme)) prefs.theme = raw.theme;
  if (raw.units === 'mm' || raw.units === 'in') prefs.units = raw.units;
  if (isLang(raw.lang)) prefs.lang = raw.lang;
  if (raw.mode === 'basic' || raw.mode === 'advanced') prefs.mode = raw.mode;
  if (typeof raw.machineProfile === 'string' && raw.machineProfile)
    prefs.machineProfile = raw.machineProfile;
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
  if (typeof raw.fileDir === 'string' && raw.fileDir)
    prefs.fileDir = raw.fileDir;
  const profiles = sanitizeSettingProfiles(raw.settingProfiles);
  if (profiles) prefs.settingProfiles = profiles;
  const history = sanitizeAlarmHistory(raw.alarmHistory);
  if (history) prefs.alarmHistory = history;
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
