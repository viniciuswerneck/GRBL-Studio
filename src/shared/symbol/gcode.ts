/**
 * Do símbolo para o **G-code GRBL** — módulo puro (sem DOM, sem máquina).
 *
 * Segue os invariantes do projeto (AGENTS.md): `G21`/`G90`/`G94` e `M5` no
 * cabeçalho, **`M5` antes de todo `G0`**, `M3`/`M4 S…` com `S ≤ $30`, `M5` no
 * fim e `G0 X0 Y0` na cauda. Coordenadas saem com 3 casas (1 µm — RNF-12), sem
 * arredondar a geometria do símbolo. Quem envia é o `GrblClient` (janela por
 * bytes); aqui só se produz texto (RNF-1).
 */

import { zigzagHatch } from '../hatch';
import {
  type SymbolBand,
  type SymbolExtent,
  type SymbolSegment,
  bandsToScanSegments,
  invertBands,
  matrixToBands,
  scanLinesPerModule,
} from './mask';
import { type QrEcc, type QrMode, encodeQr } from './qr';

/** Ponto do laser da COMGO Z1 (usado nos avisos de legibilidade). */
export const DEFAULT_SPOT_MM = 0.08;

export interface SymbolGcodeParams {
  /** Origem (canto inferior esquerdo do símbolo) na mesa, em mm. */
  originX?: number;
  originY?: number;
  /** Velocidade de queima (mm/min). */
  feed: number;
  /** Velocidade de deslocamento (mm/min). Padrão 3000. */
  travelFeed?: number;
  /** `$30` da máquina. */
  sMax: number;
  /** Potência em % do `$30`. Padrão 100. */
  powerPercent?: number;
  /** Passadas. Padrão 1. */
  passes?: number;
  /** Modo de potência dinâmica. Padrão `M4`. */
  mode?: 'M3' | 'M4';
  /** Estende cada trecho para os dois lados (mm). Padrão 0. */
  overscanMm?: number;
  /** Linhas de comentário do símbolo (o gerador acrescenta as de gravação). */
  header?: string[];
}

export interface SymbolGcodeResult {
  gcode: string;
  /** Linhas do programa (para o contador da UI). */
  lines: number;
  /** Trechos queimados (× passadas). */
  segments: number;
  widthMm: number;
  heightMm: number;
  /** Percurso queimado e percurso a laser desligado, em mm. */
  burnMm: number;
  travelMm: number;
}

const fmt = (v: number): string => v.toFixed(3);

/** Valor positivo e finito, ou o padrão. */
function positive(v: number | undefined, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Pontos finitos: coordenadas `NaN`/`Infinity` fariam o GRBL abortar o job. */
function finiteSegments(
  segments: ReadonlyArray<SymbolSegment>,
): SymbolSegment[] {
  const out: SymbolSegment[] = [];
  for (const s of segments) {
    if (
      Number.isFinite(s.x0) &&
      Number.isFinite(s.y0) &&
      Number.isFinite(s.x1) &&
      Number.isFinite(s.y1) &&
      Math.abs(s.x1 - s.x0) > 1e-9
    ) {
      out.push(s);
    }
  }
  return out;
}

/** Aplica o overscan (estende os dois lados de cada trecho). */
export function applyOverscan(
  segments: ReadonlyArray<SymbolSegment>,
  overscanMm: number,
): SymbolSegment[] {
  if (!(overscanMm > 0)) return segments.slice();
  return segments.map((s) => {
    const left = Math.min(s.x0, s.x1) - overscanMm;
    const right = Math.max(s.x0, s.x1) + overscanMm;
    const forward = s.x1 >= s.x0;
    return {
      x0: Math.max(0, forward ? left : right),
      y0: s.y0,
      x1: Math.max(0, forward ? right : left),
      y1: s.y1,
    };
  });
}

/**
 * Segmentos + dimensões → G-code completo. Os segmentos são ordenados em
 * zigue-zague (ida/volta por linha) para reduzir os `G0` entre linhas.
 */
export function symbolToGcode(
  segments: ReadonlyArray<SymbolSegment>,
  extent: SymbolExtent,
  params: SymbolGcodeParams,
): SymbolGcodeResult {
  const feed = positive(params.feed, 1000);
  const travelFeed = positive(params.travelFeed, 3000);
  const sMax = positive(params.sMax, 1000);
  const powerPercent = Number.isFinite(params.powerPercent)
    ? clamp(params.powerPercent as number, 0, 100)
    : 100;
  const passes = Number.isFinite(params.passes)
    ? Math.max(1, Math.floor(params.passes as number))
    : 1;
  const arm = params.mode === 'M3' ? 'M3' : 'M4';
  const originX = Number.isFinite(params.originX)
    ? (params.originX as number)
    : 0;
  const originY = Number.isFinite(params.originY)
    ? (params.originY as number)
    : 0;
  const power = Math.round((powerPercent / 100) * sMax);

  const ordered = zigzagHatch(finiteSegments(segments));
  const lines: string[] = [];

  for (const comment of params.header ?? []) lines.push(`; ${comment}`);
  lines.push(
    `; potência ${Math.round(powerPercent)}% (S${power}) · ${Math.round(feed)} mm/min · passadas ${passes} · ${arm}`,
  );
  lines.push(
    `; origem X${fmt(originX)} Y${fmt(originY)} · ${fmt(extent.widthMm)} × ${fmt(extent.heightMm)} mm`,
  );
  lines.push('G21');
  lines.push('G90');
  lines.push('G94');
  lines.push('M5');
  lines.push(`G0 X0 Y0 F${Math.round(travelFeed)}`);

  let burnMm = 0;
  let travelMm = 0;
  let emitted = 0;
  let cursorX = 0;
  let cursorY = 0;

  for (let pass = 0; pass < passes; pass++) {
    if (passes > 1) lines.push(`; pass ${pass + 1}/${passes}`);
    for (const s of ordered) {
      const x0 = originX + s.x0;
      const y0 = originY + s.y0;
      const x1 = originX + s.x1;
      const y1 = originY + s.y1;
      lines.push(`G0 X${fmt(x0)} Y${fmt(y0)}`);
      lines.push(`${arm} S${power}`);
      lines.push(`G1 X${fmt(x1)} Y${fmt(y1)} F${Math.round(feed)}`);
      lines.push('M5');
      travelMm += Math.hypot(x0 - cursorX, y0 - cursorY);
      burnMm += Math.hypot(x1 - x0, y1 - y0);
      cursorX = x1;
      cursorY = y1;
      emitted++;
    }
  }

  lines.push('M5');
  lines.push('G0 X0 Y0');
  travelMm += Math.hypot(cursorX, cursorY);
  lines.push('');

  return {
    gcode: lines.join('\n'),
    lines: lines.length,
    segments: emitted,
    widthMm: extent.widthMm,
    heightMm: extent.heightMm,
    burnMm,
    travelMm,
  };
}

// ------------------------------------------------------------------- avisos

export type SymbolWarningCode =
  | 'module-small'
  | 'module-tiny'
  | 'quiet-zone-small'
  | 'lines-too-few'
  | 'outside-work-area';

export interface SymbolWarningsOptions {
  /** Lado do módulo (QR) ou X-dimension (1D), em mm. */
  moduleMm: number;
  /** Quiet zone usada, em módulos. */
  quietZoneModules: number;
  /** Quiet zone mínima da norma, em módulos. */
  quietZoneMinModules: number;
  linesPerMm: number;
  widthMm: number;
  heightMm: number;
  originX: number;
  originY: number;
  /** Área de trabalho (`$130`/`$131`). Omitida = não confere. */
  workAreaX?: number;
  workAreaY?: number;
  /** Ponto do laser (mm). */
  spotMm?: number;
}

/**
 * Avisos de legibilidade/segurança (RF-SYM-6). Devolve **códigos** — o texto
 * vem do i18n, na UI.
 */
export function symbolWarnings(
  opts: SymbolWarningsOptions,
): SymbolWarningCode[] {
  const out: SymbolWarningCode[] = [];
  const spot = positive(opts.spotMm, DEFAULT_SPOT_MM);
  const moduleMm = opts.moduleMm;

  if (moduleMm > 0 && moduleMm < spot * 2) out.push('module-small');
  if (moduleMm > 0 && moduleMm < 0.3) out.push('module-tiny');
  if (opts.quietZoneModules < opts.quietZoneMinModules)
    out.push('quiet-zone-small');
  if (scanLinesPerModule(moduleMm, opts.linesPerMm) < 3)
    out.push('lines-too-few');

  const areaX = opts.workAreaX;
  const areaY = opts.workAreaY;
  if (
    areaX !== undefined &&
    areaY !== undefined &&
    areaX > 0 &&
    areaY > 0 &&
    (opts.originX < 0 ||
      opts.originY < 0 ||
      opts.originX + opts.widthMm > areaX + 1e-6 ||
      opts.originY + opts.heightMm > areaY + 1e-6)
  ) {
    out.push('outside-work-area');
  }
  return out;
}

// -------------------------------------------------------------- QR → G-code

export interface QrGcodeParams extends SymbolGcodeParams {
  /** Nível de correção. Padrão `M`. */
  ecc?: QrEcc;
  /** Versão fixa (1–40) ou automática. */
  version?: number | 'auto';
  /** Máscara fixa (0–7) ou automática. */
  mask?: number | 'auto';
  /** Lado do módulo em mm. Padrão 0,5. */
  moduleMm?: number;
  /** Quiet zone em módulos. Padrão 4 (norma). */
  quietZoneModules?: number;
  /** Linhas de varredura por mm. Padrão 10 (0,1 mm). */
  linesPerMm?: number;
  /** Inverte a polaridade (queima o fundo). Padrão falso. */
  invert?: boolean;
  /** Descarta trechos menores que isso (mm). */
  minRunMm?: number;
  /** Área de trabalho (`$130`/`$131`) para o aviso "não cabe". */
  workAreaX?: number;
  workAreaY?: number;
  /** Texto do conteúdo no cabeçalho (padrão: o próprio conteúdo). */
  label?: string;
  /** Máximo de caracteres do conteúdo no comentário. Padrão 60. */
  labelMaxChars?: number;
}

export interface QrGcodeResult extends SymbolGcodeResult {
  qr: {
    version: number;
    ecc: QrEcc;
    mask: number;
    size: number;
    mode: QrMode;
    byteLength: number;
  };
  moduleMm: number;
  quietZoneModules: number;
  linesPerModule: number;
  warnings: SymbolWarningCode[];
}

export const QR_QUIET_ZONE_MODULES = 4;

/**
 * Texto → G-code do QR Code, pronto para o pipeline normal (preview → Play ou
 * salvar). Puro: nenhuma dependência de DOM ou de máquina.
 */
export function qrToGcode(text: string, params: QrGcodeParams): QrGcodeResult {
  const qr = encodeQr(text, {
    ecc: params.ecc,
    version: params.version,
    mask: params.mask,
  });
  const moduleMm = positive(params.moduleMm, 0.5);
  const linesPerMm = positive(params.linesPerMm, 10);
  const quietZoneModules = Number.isFinite(params.quietZoneModules)
    ? Math.max(0, Math.floor(params.quietZoneModules as number))
    : QR_QUIET_ZONE_MODULES;
  const overscanMm = positive(params.overscanMm, 0);

  const geometry = matrixToBands(qr.matrix, { moduleMm, quietZoneModules });
  const baseBands: SymbolBand[] = geometry.bands;
  const extent = geometry.extent;
  const bands = params.invert ? invertBands(baseBands, extent) : baseBands;
  const segments = bandsToScanSegments(bands, {
    linesPerMm,
    minRunMm: params.minRunMm,
  });

  const label = params.label ?? text;
  const maxChars = Math.max(8, params.labelMaxChars ?? 60);
  const shown =
    label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
  const header = [
    'QR Code (GRBL Studio)',
    `conteúdo: ${shown}`,
    `versão ${qr.version} · ECC ${qr.ecc} · máscara ${qr.mask} · ${qr.size}×${qr.size} módulos`,
    `módulo ${fmt(moduleMm)} mm · quiet zone ${quietZoneModules} módulos · ${fmt(extent.widthMm)} × ${fmt(extent.heightMm)} mm`,
    `varredura ${linesPerMm} linhas/mm${params.invert ? ' · polaridade invertida' : ''}${overscanMm > 0 ? ` · overscan ${fmt(overscanMm)} mm` : ''}`,
  ];

  const result = symbolToGcode(applyOverscan(segments, overscanMm), extent, {
    ...params,
    header,
  });

  const warnings = symbolWarnings({
    moduleMm,
    quietZoneModules,
    quietZoneMinModules: QR_QUIET_ZONE_MODULES,
    linesPerMm,
    widthMm: extent.widthMm,
    heightMm: extent.heightMm,
    originX: params.originX ?? 0,
    originY: params.originY ?? 0,
    workAreaX: params.workAreaX,
    workAreaY: params.workAreaY,
  });

  return {
    ...result,
    qr: {
      version: qr.version,
      ecc: qr.ecc,
      mask: qr.mask,
      size: qr.size,
      mode: qr.mode,
      byteLength: qr.byteLength,
    },
    moduleMm,
    quietZoneModules,
    linesPerModule: scanLinesPerModule(moduleMm, linesPerMm),
    warnings,
  };
}
