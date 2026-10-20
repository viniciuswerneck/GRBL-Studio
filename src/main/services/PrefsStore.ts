/**
 * Preferências persistidas (RF-CFG-5, RF-CON-3).
 *
 * Armazena um JSON simples em `<userData>/prefs.json`. Optamos por não usar
 * `electron-store` (ADR-6) porque as versões atuais são ESM-only e brigariam
 * com o `main` em CommonJS; o efeito prático é o mesmo e sem dependência.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { sanitizeBatchPrefs } from '../../shared/batch';
import { isLang } from '../../shared/i18n';
import { sanitizeMacros } from '../../shared/macros';
import { sanitizePresets } from '../../shared/materialPresets';
import { isThemeId } from '../../shared/themes';
import type {
  AlarmEntry,
  BarcodePrefs,
  Prefs,
  SettingProfile,
  Symbol2dPrefs,
  SymbolPrefs,
} from '../../shared/types';

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

/** Número finito dentro da faixa (senão `undefined`, para o campo sumir). */
function finiteIn(
  value: unknown,
  min: number,
  max: number,
): number | undefined {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : undefined;
}

const SYMBOLOGIES = new Set([
  'code128',
  'ean13',
  'ean8',
  'upca',
  'code39',
  'itf14',
  'codabar',
  'code93',
  'gs1-128',
]);

/**
 * Ajustes das ferramentas de símbolo (RF-CFG-5): só números/booleanos/enums
 * conhecidos. O **conteúdo** digitado nunca é aceito aqui — não é preferência.
 */
function sanitizeSymbols(input: unknown): SymbolPrefs | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const out: SymbolPrefs = {};

  if (raw.qr && typeof raw.qr === 'object') {
    const q = raw.qr as Record<string, unknown>;
    const qr: Symbol2dPrefs = {};
    if (
      q.symbology === 'qr' ||
      q.symbology === 'datamatrix' ||
      q.symbology === 'pdf417' ||
      q.symbology === 'aztec'
    ) {
      qr.symbology = q.symbology;
    }
    if (q.ecc === 'L' || q.ecc === 'M' || q.ecc === 'Q' || q.ecc === 'H') {
      qr.ecc = q.ecc;
    }
    const version = finiteIn(q.version, 0, 40);
    if (version !== undefined) qr.version = Math.round(version);
    const dmSize = finiteIn(q.dmSize, 0, 144);
    if (dmSize !== undefined) qr.dmSize = Math.round(dmSize);
    // PDF417 (RF-SYM-7).
    const pdfEcc = finiteIn(q.pdfEcc, 0, 8);
    if (pdfEcc !== undefined) qr.pdfEcc = Math.round(pdfEcc);
    const pdfColumns = finiteIn(q.pdfColumns, 1, 30);
    if (pdfColumns !== undefined) qr.pdfColumns = Math.round(pdfColumns);
    const pdfRowHeightMm = finiteIn(q.pdfRowHeightMm, 0.1, 50);
    if (pdfRowHeightMm !== undefined) qr.pdfRowHeightMm = pdfRowHeightMm;
    // Aztec (RF-SYM-7): a norma pede no mínimo 23 %.
    const aztecEccPercent = finiteIn(q.aztecEccPercent, 23, 90);
    if (aztecEccPercent !== undefined) {
      qr.aztecEccPercent = Math.round(aztecEccPercent);
    }
    const moduleMm = finiteIn(q.moduleMm, 0.05, 20);
    if (moduleMm !== undefined) qr.moduleMm = moduleMm;
    const quiet = finiteIn(q.quietZoneModules, 0, 10);
    if (quiet !== undefined) qr.quietZoneModules = Math.round(quiet);
    const lines = finiteIn(q.linesPerMm, 1, 40);
    if (lines !== undefined) qr.linesPerMm = Math.round(lines);
    const width = finiteIn(q.widthMm, 0, 1000);
    if (width !== undefined) qr.widthMm = width;
    const height = finiteIn(q.heightMm, 0, 1000);
    if (height !== undefined) qr.heightMm = height;
    if (typeof q.keepAspect === 'boolean') qr.keepAspect = q.keepAspect;
    const power = finiteIn(q.powerPercent, 0, 100);
    if (power !== undefined) qr.powerPercent = power;
    const feed = finiteIn(q.feed, 1, 20000);
    if (feed !== undefined) qr.feed = Math.round(feed);
    const passes = finiteIn(q.passes, 1, 10);
    if (passes !== undefined) qr.passes = Math.round(passes);
    if (q.mode === 'M3' || q.mode === 'M4') qr.mode = q.mode;
    const overscan = finiteIn(q.overscanMm, 0, 5);
    if (overscan !== undefined) qr.overscanMm = overscan;
    if (typeof q.invert === 'boolean') qr.invert = q.invert;
    if (Object.keys(qr).length > 0) out.qr = qr;
  }

  if (raw.barcode && typeof raw.barcode === 'object') {
    const b = raw.barcode as Record<string, unknown>;
    const bar: BarcodePrefs = {};
    if (typeof b.symbology === 'string' && SYMBOLOGIES.has(b.symbology)) {
      bar.symbology = b.symbology;
    }
    const width = finiteIn(b.targetWidthMm, 0, 1000);
    if (width !== undefined) bar.targetWidthMm = width;
    const xDim = finiteIn(b.xDimMm, 0.05, 20);
    if (xDim !== undefined) bar.xDimMm = xDim;
    const height = finiteIn(b.barHeightMm, 1, 200);
    if (height !== undefined) bar.barHeightMm = height;
    const quiet = finiteIn(b.quietZoneModules, 0, 30);
    if (quiet !== undefined) bar.quietZoneModules = Math.round(quiet);
    const lines = finiteIn(b.linesPerMm, 1, 40);
    if (lines !== undefined) bar.linesPerMm = Math.round(lines);
    if (typeof b.hri === 'boolean') bar.hri = b.hri;
    if (b.code39Ratio === 2 || b.code39Ratio === 3) {
      bar.code39Ratio = b.code39Ratio;
    }
    if (typeof b.code39Checksum === 'boolean') {
      bar.code39Checksum = b.code39Checksum;
    }
    const power = finiteIn(b.powerPercent, 0, 100);
    if (power !== undefined) bar.powerPercent = power;
    const feed = finiteIn(b.feed, 1, 20000);
    if (feed !== undefined) bar.feed = Math.round(feed);
    const passes = finiteIn(b.passes, 1, 10);
    if (passes !== undefined) bar.passes = Math.round(passes);
    if (b.mode === 'M3' || b.mode === 'M4') bar.mode = b.mode;
    const overscan = finiteIn(b.overscanMm, 0, 5);
    if (overscan !== undefined) bar.overscanMm = overscan;
    if (typeof b.invert === 'boolean') bar.invert = b.invert;
    if (Object.keys(bar).length > 0) out.barcode = bar;
  }

  return out.qr || out.barcode ? out : undefined;
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
  const onboarding = finiteIn(raw.onboarding, 0, 1000);
  if (onboarding !== undefined) prefs.onboarding = Math.round(onboarding);
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
  const symbols = sanitizeSymbols(raw.symbols);
  if (symbols) prefs.symbols = symbols;
  const batch = sanitizeBatchPrefs(raw.batch);
  if (batch) prefs.batch = batch;
  if (Array.isArray(raw.materialPresets))
    prefs.materialPresets = sanitizePresets(raw.materialPresets);
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
