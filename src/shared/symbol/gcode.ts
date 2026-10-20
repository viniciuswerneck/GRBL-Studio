/**
 * Do símbolo para o **G-code GRBL** — módulo puro (sem DOM, sem máquina).
 *
 * Segue os invariantes do projeto (AGENTS.md): `G21`/`G90`/`G94` e `M5` no
 * cabeçalho, **`M5` antes de todo `G0`**, `M3`/`M4 S…` com `S ≤ $30`, `M5` no
 * fim e `G0 X0 Y0` na cauda. Coordenadas saem com 3 casas (1 µm — RNF-12), sem
 * arredondar a geometria do símbolo. Quem envia é o `GrblClient` (janela por
 * bytes); aqui só se produz texto (RNF-1).
 */

import { textToShapes, unsupportedChars } from '../fonts';
import { zigzagHatch } from '../hatch';
import {
  BARCODE_SPECS,
  type BarcodeSymbology,
  type Code128Charset,
  type Code39Ratio,
  encodeBarcode,
} from './barcode';
import {
  type SymbolBand,
  type SymbolExtent,
  type SymbolSegment,
  bandsToScanSegments,
  barsToVerticalSegments,
  invertBands,
  matrixToBands,
  scanLinesPerModule,
} from './mask';
import { DATA_MATRIX_QUIET_ZONE, encodeDataMatrix } from './datamatrix';
import { encodeAztec } from './aztec';
import {
  PDF417_QUIET_ZONE_MODULES,
  type Pdf417EccLevel,
  encodePdf417,
} from './pdf417';
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
  /**
   * Segmentos já vêm na ordem de gravação (varredura vertical do código de
   * barras). Padrão falso: o G-code reordena em zigue-zague por linha.
   */
  presorted?: boolean;
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

// ------------------------------------------------------------- grade (RF-SYM-9)

/** Um símbolo já codificado, pronto para ser posicionado numa grade. */
export interface SymbolGridCell {
  /** Segmentos no sistema local (canto inferior esquerdo em 0,0). */
  segments: SymbolSegment[];
  extent: SymbolExtent;
  /** Rótulo do conteúdo (comentário e status). */
  label: string;
  /**
   * Segmentos já na ordem de gravação (varredura vertical do 1D): a grade
   * **não** reordena em zigue-zague.
   */
  presorted?: boolean;
  /** Avisos de legibilidade do símbolo (RF-SYM-6), agregados na grade. */
  warnings: SymbolWarningCode[];
}

export interface SymbolGridParams extends SymbolGcodeParams {
  /** Espaço horizontal entre células, em mm. Padrão 5. */
  gapXMm?: number;
  /** Espaço vertical entre células, em mm. Padrão 5. */
  gapYMm?: number;
  /**
   * Colunas fixas; `0`/omitido usa um quadrado aproximado
   * (`ceil(sqrt(n))`). Linhas são calculadas.
   */
  columns?: number;
  /** Máximo de caracteres do rótulo de cada célula no comentário. Padrão 60. */
  labelMaxChars?: number;
}

export interface SymbolGridResult extends SymbolGcodeResult {
  /** Símbolos posicionados. */
  count: number;
  columns: number;
  rows: number;
  /** Maior largura/altura de célula (as colunas/linhas ficam alinhadas). */
  cellWidthMm: number;
  cellHeightMm: number;
  /** Avisos agregados de todos os símbolos (sem repetição). */
  warnings: SymbolWarningCode[];
}

const fmt = (v: number): string => v.toFixed(3);

/** Valor positivo e finito, ou o padrão. */
function positive(v: number | undefined, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

const utf8 = new TextEncoder();

/**
 * Teto de bytes de cada linha do cabeçalho (comentário de G-code). Folga sobre
 * o buffer RX de 128 B: nunca é a linha que estoura o envio.
 */
const HEADER_MAX_BYTES = 110;

/**
 * Corta o texto em um orçamento de **bytes** UTF-8 (não de caracteres): o
 * cabeçalho vira comentário de G-code e uma linha não pode passar do buffer RX
 * do GRBL (128 B típicos). Com acentos (Latin-1 = 2 B) contar caracteres
 * mentiria.
 */
function truncateBytes(text: string, maxBytes: number, ellipsis = '…'): string {
  if (utf8.encode(text).length <= maxBytes) return text;
  const suffix = utf8.encode(ellipsis);
  const budget = Math.max(0, maxBytes - suffix.length);
  let out = '';
  let used = 0;
  for (const ch of text) {
    const size = utf8.encode(ch).length;
    if (used + size > budget) break;
    out += ch;
    used += size;
  }
  return out + ellipsis;
}

/**
 * Pontos finitos e trecho com comprimento real: coordenadas `NaN`/`Infinity`
 * fariam o GRBL abortar o job, e um trecho de comprimento zero não queima nada.
 * Vale para os dois eixos (a varredura do código de barras é vertical).
 */
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
      Math.hypot(s.x1 - s.x0, s.y1 - s.y0) > 1e-9
    ) {
      out.push(s);
    }
  }
  return out;
}

/**
 * Aplica o overscan: estende os dois lados do trecho no **eixo do movimento**
 * (o maior dos dois), preservando o sentido. Nunca cruza o zero local.
 */
export function applyOverscan(
  segments: ReadonlyArray<SymbolSegment>,
  overscanMm: number,
): SymbolSegment[] {
  if (!(overscanMm > 0)) return segments.slice();
  return segments.map((s) => {
    const horizontal = Math.abs(s.x1 - s.x0) >= Math.abs(s.y1 - s.y0);
    if (horizontal) {
      const lo = Math.min(s.x0, s.x1) - overscanMm;
      const hi = Math.max(s.x0, s.x1) + overscanMm;
      const forward = s.x1 >= s.x0;
      return {
        x0: Math.max(0, forward ? lo : hi),
        y0: s.y0,
        x1: Math.max(0, forward ? hi : lo),
        y1: s.y1,
      };
    }
    const lo = Math.min(s.y0, s.y1) - overscanMm;
    const hi = Math.max(s.y0, s.y1) + overscanMm;
    const forward = s.y1 >= s.y0;
    return {
      x0: s.x0,
      y0: Math.max(0, forward ? lo : hi),
      x1: s.x1,
      y1: Math.max(0, forward ? hi : lo),
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

  const ordered = params.presorted
    ? finiteSegments(segments)
    : zigzagHatch(finiteSegments(segments));
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
  | 'outside-work-area'
  | 'stretched'
  | 'x-dim-small'
  | 'bar-height-small'
  | 'hri-chars'
  | 'uppercased';

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

/** Parâmetros **de geometria** comuns aos símbolos 2D (QR e Data Matrix). */
export interface MatrixGcodeParams extends SymbolGcodeParams {
  /**
   * **Largura final** do símbolo em mm, já incluindo a quiet zone. Vence
   * `moduleMm`: o lado do módulo sai de `largura ÷ (módulos + 2 × quiet)`.
   */
  targetWidthMm?: number;
  /**
   * **Altura final** em mm (com a quiet zone). Omitida = igual à largura
   * (símbolo quadrado). As duas juntas esticam o símbolo num eixo — num
   * símbolo quadrado isso piora a leitura (aviso `stretched`).
   */
  targetHeightMm?: number;
  /** Lado do módulo em mm — usado quando não há alvo de largura/altura. Padrão 0,5. */
  moduleMm?: number;
  /** Quiet zone em módulos. Padrão: o da simbologia (QR 4, Data Matrix 1). */
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

export interface QrGcodeParams extends MatrixGcodeParams {
  /** Nível de correção. Padrão `M`. */
  ecc?: QrEcc;
  /** Versão fixa (1–40) ou automática. */
  version?: number | 'auto';
  /** Máscara fixa (0–7) ou automática. */
  mask?: number | 'auto';
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
  /** Lado do módulo efetivo no eixo X (mm). */
  moduleMm: number;
  /** Lado do módulo efetivo no eixo Y (mm); igual a `moduleMm` se quadrado. */
  moduleYMm: number;
  quietZoneModules: number;
  linesPerModule: number;
  warnings: SymbolWarningCode[];
}

export const QR_QUIET_ZONE_MODULES = 4;

/** Menor lado de módulo aceito (mm) — abaixo disso o símbolo vira ruído. */
export const MIN_MODULE_MM = 0.05;

/** Maior lado de módulo aceito (mm) — mesmo teto do campo na interface. */
export const MAX_MODULE_MM = 20;

/**
 * Lado do módulo em cada eixo, a partir do alvo em mm (`largura`/`altura`
 * finais, quiet zone incluída) — que vence o lado do módulo explícito:
 *
 * - só largura **ou** só altura → símbolo **quadrado** com aquele tamanho;
 * - as duas → cada eixo com o seu (símbolo esticado);
 * - nenhuma → `moduleMm` (padrão 0,5 mm).
 *
 * O alvo é limitado a `[MIN_MODULE_MM, MAX_MODULE_MM]` por módulo: um alvo
 * pequeno demais com um símbolo de muitas linhas sairia fisicamente
 * impossível (abaixo do ponto do laser) — o status mostra o tamanho real.
 */
export function qrModuleSizes(
  params: {
    moduleMm?: number;
    targetWidthMm?: number;
    targetHeightMm?: number;
  },
  totalModules: number,
): { moduleXMm: number; moduleYMm: number } {
  const fromTarget = (target: number): number =>
    clamp(target / totalModules, MIN_MODULE_MM, MAX_MODULE_MM);
  const targetW = positive(params.targetWidthMm, 0);
  const targetH = positive(params.targetHeightMm, 0);
  if (targetW > 0 && targetH > 0) {
    return { moduleXMm: fromTarget(targetW), moduleYMm: fromTarget(targetH) };
  }
  const single = targetW > 0 ? targetW : targetH;
  if (single > 0) {
    const module = fromTarget(single);
    return { moduleXMm: module, moduleYMm: module };
  }
  const module = positive(params.moduleMm, 0.5);
  return { moduleXMm: module, moduleYMm: module };
}

/** Esticamento tolerado antes do aviso `stretched` (5% de diferença). */
const STRETCH_TOLERANCE = 0.05;

/** Símbolo já codificado, no que o pipeline 2D precisa saber. */
interface MatrixSymbol {
  matrix: boolean[][];
  /** Módulos por lado, **sem** a quiet zone. */
  size: number;
  /** Quiet zone padrão da simbologia, em módulos. */
  quietZoneModules: number;
  /** Quiet zone mínima da norma (para o aviso `quiet-zone-small`). */
  quietZoneMinModules: number;
  /** Primeira linha do comentário, ex.: `'QR Code (GRBL Studio)'`. */
  title: string;
  /** Linhas de detalhe (versão/ECC ou blocos/codewords). */
  details: string[];
}

/** Geometria de um símbolo 2D: segmentos prontos, extensão e comentários. */
interface MatrixGeometry {
  segments: SymbolSegment[];
  extent: SymbolExtent;
  header: string[];
  moduleXMm: number;
  moduleYMm: number;
  quietZoneModules: number;
  linesPerMm: number;
  warnings: SymbolWarningCode[];
  stretched: boolean;
}

/** Pipeline comum dos símbolos 2D: matriz → varredura → segmentos + avisos. */
function matrixGeometry(
  symbol: MatrixSymbol,
  params: MatrixGcodeParams,
): MatrixGeometry {
  const linesPerMm = positive(params.linesPerMm, 10);
  const quietZoneModules = Number.isFinite(params.quietZoneModules)
    ? Math.max(0, Math.floor(params.quietZoneModules as number))
    : symbol.quietZoneModules;
  const overscanMm = positive(params.overscanMm, 0);

  const totalModules = symbol.size + quietZoneModules * 2;
  const { moduleXMm, moduleYMm } = qrModuleSizes(params, totalModules);
  const stretched =
    Math.abs(moduleXMm - moduleYMm) >
    STRETCH_TOLERANCE * Math.max(moduleXMm, moduleYMm);

  const geometry = matrixToBands(symbol.matrix, {
    moduleMm: moduleXMm,
    moduleYMm,
    quietZoneModules,
  });
  const baseBands: SymbolBand[] = geometry.bands;
  const extent = geometry.extent;
  const bands = params.invert ? invertBands(baseBands, extent) : baseBands;
  const segments = bandsToScanSegments(bands, {
    linesPerMm,
    minRunMm: params.minRunMm,
  });

  const label = params.label ?? '';
  // Orçamento em **bytes** (acentos ocupam 2 no Latin-1) e teto por linha: o
  // cabeçalho é comentário de G-code e não pode passar do buffer RX da máquina.
  const maxBytes = Math.max(8, params.labelMaxChars ?? 60);
  const shown = truncateBytes(label, maxBytes);
  const moduleText = stretched
    ? `módulo ${fmt(moduleXMm)} × ${fmt(moduleYMm)} mm`
    : `módulo ${fmt(moduleXMm)} mm`;
  const header = [
    symbol.title,
    ...(shown ? [`conteúdo: ${shown}`] : []),
    ...symbol.details,
    `${moduleText} · quiet zone ${quietZoneModules} módulos · ${fmt(extent.widthMm)} × ${fmt(extent.heightMm)} mm`,
    `varredura ${linesPerMm} linhas/mm${params.invert ? ' · polaridade invertida' : ''}${overscanMm > 0 ? ` · overscan ${fmt(overscanMm)} mm` : ''}`,
  ].map((line) => truncateBytes(line, HEADER_MAX_BYTES));

  // Avisos pelo **menor** lado do módulo: é ele que limita a legibilidade.
  const warnings = symbolWarnings({
    moduleMm: Math.min(moduleXMm, moduleYMm),
    quietZoneModules,
    quietZoneMinModules: symbol.quietZoneMinModules,
    linesPerMm,
    widthMm: extent.widthMm,
    heightMm: extent.heightMm,
    originX: params.originX ?? 0,
    originY: params.originY ?? 0,
    workAreaX: params.workAreaX,
    workAreaY: params.workAreaY,
  });
  if (stretched) warnings.push('stretched');

  return {
    segments: applyOverscan(segments, overscanMm),
    extent,
    header,
    moduleXMm,
    moduleYMm,
    quietZoneModules,
    linesPerMm,
    warnings,
    stretched,
  };
}

/** Pipeline comum dos símbolos 2D: geometria → G-code (um símbolo). */
function matrixToGcode(
  symbol: MatrixSymbol,
  params: MatrixGcodeParams,
): {
  result: SymbolGcodeResult;
  extent: SymbolExtent;
  moduleXMm: number;
  moduleYMm: number;
  quietZoneModules: number;
  linesPerMm: number;
  warnings: SymbolWarningCode[];
  stretched: boolean;
} {
  const g = matrixGeometry(symbol, params);
  const result = symbolToGcode(g.segments, g.extent, {
    ...params,
    header: g.header,
  });
  return {
    result,
    extent: g.extent,
    moduleXMm: g.moduleXMm,
    moduleYMm: g.moduleYMm,
    quietZoneModules: g.quietZoneModules,
    linesPerMm: g.linesPerMm,
    warnings: g.warnings,
    stretched: g.stretched,
  };
}

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
  const g = matrixToGcode(
    {
      matrix: qr.matrix,
      size: qr.size,
      quietZoneModules: QR_QUIET_ZONE_MODULES,
      quietZoneMinModules: QR_QUIET_ZONE_MODULES,
      title: 'QR Code (GRBL Studio)',
      details: [
        `versão ${qr.version} · ECC ${qr.ecc} · máscara ${qr.mask} · ${qr.size}×${qr.size} módulos`,
      ],
    },
    { ...params, label: params.label ?? text },
  );

  return {
    ...g.result,
    qr: {
      version: qr.version,
      ecc: qr.ecc,
      mask: qr.mask,
      size: qr.size,
      mode: qr.mode,
      byteLength: qr.byteLength,
    },
    moduleMm: g.moduleXMm,
    moduleYMm: g.moduleYMm,
    quietZoneModules: g.quietZoneModules,
    linesPerModule: scanLinesPerModule(
      Math.min(g.moduleXMm, g.moduleYMm),
      g.linesPerMm,
    ),
    warnings: g.warnings,
  };
}

// ------------------------------------------------------ Data Matrix → G-code

export interface DataMatrixGcodeParams extends MatrixGcodeParams {
  /** Lado em módulos (10…144) ou `'auto'` (o menor que couber). */
  size?: number | 'auto';
}

export interface DataMatrixGcodeResult extends SymbolGcodeResult {
  datamatrix: {
    /** Lado do símbolo em módulos, sem a quiet zone. */
    size: number;
    /** Blocos Reed–Solomon intercalados. */
    eccBlocks: number;
    /** Codewords de dados do símbolo (com padding). */
    dataCodewords: number;
  };
  moduleMm: number;
  moduleYMm: number;
  quietZoneModules: number;
  linesPerModule: number;
  warnings: SymbolWarningCode[];
}

/** Parâmetros de geometria do **PDF417** (RF-SYM-7). */
export interface Pdf417GcodeParams extends SymbolGcodeParams {
  /** Nível de correção de erro (0…8). Padrão 2. */
  eccLevel?: number;
  /**
   * Colunas de **dados** do PDF417 (1…30) ou `'auto'` (padrão). Nome distinto
   * de `SymbolGridParams.columns` (colunas da grade, RF-SYM-9).
   */
  dataColumns?: number | 'auto';
  /**
   * Largura final em mm, já com a quiet zone. Vence `moduleMm`.
   */
  targetWidthMm?: number;
  /** Largura de um módulo (X-dimension), em mm. Padrão 0,4. */
  moduleMm?: number;
  /** Altura de cada linha, em mm. Padrão 3 × módulo. */
  rowHeightMm?: number;
  /** Quiet zone em módulos. Padrão 2 (norma). */
  quietZoneModules?: number;
  /** Linhas de varredura por mm. Padrão 10. */
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

export interface Pdf417GcodeResult extends SymbolGcodeResult {
  pdf417: {
    rows: number;
    /** Colunas de **dados** (sem indicadores/start/stop). */
    columns: number;
    eccLevel: Pdf417EccLevel;
    ecCodewords: number;
    dataCodewords: number;
    totalCodewords: number;
  };
  /** Largura de um módulo (X-dimension) efetiva, em mm. */
  moduleMm: number;
  /** Altura de cada linha efetiva, em mm. */
  rowHeightMm: number;
  quietZoneModules: number;
  /** Largura total em módulos (com quiet zone). */
  widthModules: number;
  linesPerModule: number;
  warnings: SymbolWarningCode[];
}

/**
 * Texto → G-code do **Data Matrix ECC200** (ISO/IEC 16022, modo ASCII).
 * Mesmo pipeline do QR: matriz → bandas → varredura vertical → G-code; quiet
 * zone de 1 módulo por lado (norma) e avisos de legibilidade iguais.
 */
export function dataMatrixToGcode(
  text: string,
  params: DataMatrixGcodeParams,
): DataMatrixGcodeResult {
  const dm = encodeDataMatrix(text, { size: params.size });
  const g = matrixToGcode(
    {
      matrix: dm.matrix,
      size: dm.size,
      quietZoneModules: DATA_MATRIX_QUIET_ZONE,
      quietZoneMinModules: DATA_MATRIX_QUIET_ZONE,
      title: 'Data Matrix ECC200 (GRBL Studio)',
      details: [
        `${dm.size}×${dm.size} módulos · ${dm.eccBlocks} bloco(s) EC · ${dm.dataCodewords} codewords de dados`,
      ],
    },
    { ...params, label: params.label ?? text },
  );

  return {
    ...g.result,
    datamatrix: {
      size: dm.size,
      eccBlocks: dm.eccBlocks,
      dataCodewords: dm.dataCodewords,
    },
    moduleMm: g.moduleXMm,
    moduleYMm: g.moduleYMm,
    quietZoneModules: g.quietZoneModules,
    linesPerModule: scanLinesPerModule(
      Math.min(g.moduleXMm, g.moduleYMm),
      g.linesPerMm,
    ),
    warnings: g.warnings,
  };
}

/**
 * QR Code → célula de grade (RF-SYM-9): a mesma geometria do símbolo único,
 * mas sem G-code, para posicionar vários num único programa.
 */
export function qrToCell(text: string, params: QrGcodeParams): SymbolGridCell {
  const qr = encodeQr(text, {
    ecc: params.ecc,
    version: params.version,
    mask: params.mask,
  });
  const g = matrixGeometry(
    {
      matrix: qr.matrix,
      size: qr.size,
      quietZoneModules: QR_QUIET_ZONE_MODULES,
      quietZoneMinModules: QR_QUIET_ZONE_MODULES,
      title: 'QR Code (GRBL Studio)',
      details: [
        `versão ${qr.version} · ECC ${qr.ecc} · máscara ${qr.mask} · ${qr.size}×${qr.size} módulos`,
      ],
    },
    { ...params, label: params.label ?? text },
  );
  return {
    segments: g.segments,
    extent: g.extent,
    label: text,
    warnings: g.warnings,
  };
}

/**
 * Data Matrix → célula de grade (RF-SYM-9). Mesma geometria do símbolo único.
 */
export function dataMatrixToCell(
  text: string,
  params: DataMatrixGcodeParams,
): SymbolGridCell {
  const dm = encodeDataMatrix(text, { size: params.size });
  const g = matrixGeometry(
    {
      matrix: dm.matrix,
      size: dm.size,
      quietZoneModules: DATA_MATRIX_QUIET_ZONE,
      quietZoneMinModules: DATA_MATRIX_QUIET_ZONE,
      title: 'Data Matrix ECC200 (GRBL Studio)',
      details: [
        `${dm.size}×${dm.size} módulos · ${dm.eccBlocks} bloco(s) EC · ${dm.dataCodewords} codewords de dados`,
      ],
    },
    { ...params, label: params.label ?? text },
  );
  return {
    segments: g.segments,
    extent: g.extent,
    label: text,
    warnings: g.warnings,
  };
}

// --------------------------------------------------------- PDF417 → G-code

/** Largura de módulo padrão do PDF417 (X-dimension), em mm. */
const PDF417_DEFAULT_MODULE_MM = 0.4;
/** Altura de linha padrão = este fator × largura do módulo. */
const PDF417_ROW_HEIGHT_FACTOR = 3;

interface Pdf417Geometry {
  pdf: ReturnType<typeof encodePdf417>;
  segments: SymbolSegment[];
  extent: SymbolExtent;
  header: string[];
  moduleMm: number;
  rowHeightMm: number;
  quietZoneModules: number;
  linesPerMm: number;
  widthModules: number;
  warnings: SymbolWarningCode[];
}

/** Pipeline do PDF417: matriz retangular → varredura horizontal → segmentos. */
function pdf417Geometry(
  text: string,
  params: Pdf417GcodeParams,
): Pdf417Geometry {
  const pdf = encodePdf417(text, {
    eccLevel: params.eccLevel,
    columns: params.dataColumns,
  });
  const widthModules = pdf.matrix[0]?.length ?? 0;
  const quietZoneModules = Number.isFinite(params.quietZoneModules)
    ? Math.max(0, Math.floor(params.quietZoneModules as number))
    : PDF417_QUIET_ZONE_MODULES;
  const linesPerMm = positive(params.linesPerMm, 10);
  const overscanMm = positive(params.overscanMm, 0);

  const totalModules = widthModules + quietZoneModules * 2;
  let moduleMm = positive(params.moduleMm, PDF417_DEFAULT_MODULE_MM);
  const target = positive(params.targetWidthMm, 0);
  if (target > 0) moduleMm = target / totalModules;
  moduleMm = clamp(moduleMm, MIN_MODULE_MM, MAX_MODULE_MM);
  const rowHeightMm = positive(
    params.rowHeightMm,
    moduleMm * PDF417_ROW_HEIGHT_FACTOR,
  );

  const geometry = matrixToBands(pdf.matrix, {
    moduleMm,
    moduleYMm: rowHeightMm,
    quietZoneModules,
  });
  const baseBands: SymbolBand[] = geometry.bands;
  const extent = geometry.extent;
  const bands = params.invert ? invertBands(baseBands, extent) : baseBands;
  const segments = bandsToScanSegments(bands, {
    linesPerMm,
    minRunMm: params.minRunMm,
  });

  const shown = truncateBytes(
    params.label ?? text,
    Math.max(8, params.labelMaxChars ?? 60),
  );
  const header = [
    'PDF417 (GRBL Studio)',
    `conteúdo: ${shown}`,
    `${pdf.rows} × ${pdf.columns} codewords · EC nível ${pdf.eccLevel} (${pdf.ecCodewords}) · ${pdf.dataCodewords} dados + ${pdf.ecCodewords} EC`,
    `módulo ${fmt(moduleMm)} mm · linha ${fmt(rowHeightMm)} mm · quiet zone ${quietZoneModules} módulos · ${fmt(extent.widthMm)} × ${fmt(extent.heightMm)} mm`,
    `varredura ${linesPerMm} linhas/mm${params.invert ? ' · polaridade invertida' : ''}${overscanMm > 0 ? ` · overscan ${fmt(overscanMm)} mm` : ''}`,
  ].map((line) => truncateBytes(line, HEADER_MAX_BYTES));

  // Legibilidade pelo **X-dimension**; o preenchimento vertical depende da
  // altura da linha (não do módulo), então reavaliamos `lines-too-few`.
  const warnings: SymbolWarningCode[] = symbolWarnings({
    moduleMm,
    quietZoneModules,
    quietZoneMinModules: PDF417_QUIET_ZONE_MODULES,
    linesPerMm,
    widthMm: extent.widthMm,
    heightMm: extent.heightMm,
    originX: params.originX ?? 0,
    originY: params.originY ?? 0,
    workAreaX: params.workAreaX,
    workAreaY: params.workAreaY,
  }).filter((w) => w !== 'lines-too-few');
  if (scanLinesPerModule(rowHeightMm, linesPerMm) < 3) {
    warnings.push('lines-too-few');
  }

  return {
    pdf,
    segments: applyOverscan(segments, overscanMm),
    extent,
    header,
    moduleMm,
    rowHeightMm,
    quietZoneModules,
    linesPerMm,
    widthModules,
    warnings,
  };
}

/**
 * Texto → G-code do **PDF417** (ISO/IEC 15438), pronto para o preview/Play ou
 * salvar. Puro: sem DOM e sem máquina.
 */
export function pdf417ToGcode(
  text: string,
  params: Pdf417GcodeParams,
): Pdf417GcodeResult {
  const g = pdf417Geometry(text, params);
  const result = symbolToGcode(g.segments, g.extent, {
    ...params,
    header: g.header,
  });
  return {
    ...result,
    pdf417: {
      rows: g.pdf.rows,
      columns: g.pdf.columns,
      eccLevel: g.pdf.eccLevel,
      ecCodewords: g.pdf.ecCodewords,
      dataCodewords: g.pdf.dataCodewords,
      totalCodewords: g.pdf.totalCodewords,
    },
    moduleMm: g.moduleMm,
    rowHeightMm: g.rowHeightMm,
    quietZoneModules: g.quietZoneModules,
    widthModules: g.widthModules,
    linesPerModule: scanLinesPerModule(g.rowHeightMm, g.linesPerMm),
    warnings: g.warnings,
  };
}

/** PDF417 → célula de grade (RF-SYM-9). Mesma geometria do símbolo único. */
export function pdf417ToCell(
  text: string,
  params: Pdf417GcodeParams,
): SymbolGridCell {
  const g = pdf417Geometry(text, params);
  return {
    segments: g.segments,
    extent: g.extent,
    label: text,
    warnings: g.warnings,
  };
}

// --------------------------------------------------------- Aztec → G-code

/** Quiet zone do Aztec: a norma **não exige** nenhuma (0 módulos). */
export const AZTEC_QUIET_ZONE_MODULES = 0;

/** Parâmetros de geometria do **Aztec** (RF-SYM-7). */
export interface AztecGcodeParams extends MatrixGcodeParams {
  /**
   * Correção de erro em **%** das palavras de dados (mínimo 23 % pela norma
   * ISO/IEC 24778). Padrão 33 %.
   */
  eccPercent?: number;
  /**
   * Camadas forçadas: positivo = símbolo **normal**, negativo = **compacto**,
   * `0` = automático (padrão).
   */
  layers?: number;
}

export interface AztecGcodeResult extends SymbolGcodeResult {
  aztec: {
    /** Camadas de dados do símbolo. */
    layers: number;
    /** Símbolo compacto (≤ 4 camadas). */
    compact: boolean;
    /** Palavras de dados. */
    codeWords: number;
    /** Palavras de correção de erro. */
    eccCodewords: number;
    /** Bits por palavra de dados. */
    wordSize: number;
  };
  moduleMm: number;
  moduleYMm: number;
  quietZoneModules: number;
  linesPerModule: number;
  warnings: SymbolWarningCode[];
}

/**
 * Texto → G-code do **Aztec** (ISO/IEC 24778), pronto para o preview/Play ou
 * salvar. Mesmo pipeline do QR/Data Matrix: matriz → bandas → varredura
 * vertical → G-code. O conteúdo é **byte a byte** (Latin-1).
 */
export function aztecToGcode(
  text: string,
  params: AztecGcodeParams,
): AztecGcodeResult {
  const aztec = encodeAztec(text, {
    eccPercent: params.eccPercent,
    layers: params.layers,
  });
  const g = matrixToGcode(
    {
      matrix: aztec.matrix,
      size: aztec.size,
      quietZoneModules: AZTEC_QUIET_ZONE_MODULES,
      quietZoneMinModules: AZTEC_QUIET_ZONE_MODULES,
      title: 'Aztec (GRBL Studio)',
      details: [
        `${aztec.size}×${aztec.size} módulos · ${aztec.layers} camadas${aztec.compact ? ' compactas' : ''} · ${aztec.codeWords} palavras de dados + ${aztec.eccCodewords} EC`,
      ],
    },
    { ...params, label: params.label ?? text },
  );

  return {
    ...g.result,
    aztec: {
      layers: aztec.layers,
      compact: aztec.compact,
      codeWords: aztec.codeWords,
      eccCodewords: aztec.eccCodewords,
      wordSize: aztec.wordSize,
    },
    moduleMm: g.moduleXMm,
    moduleYMm: g.moduleYMm,
    quietZoneModules: g.quietZoneModules,
    linesPerModule: scanLinesPerModule(
      Math.min(g.moduleXMm, g.moduleYMm),
      g.linesPerMm,
    ),
    warnings: g.warnings,
  };
}

/** Aztec → célula de grade (RF-SYM-9). Mesma geometria do símbolo único. */
export function aztecToCell(
  text: string,
  params: AztecGcodeParams,
): SymbolGridCell {
  const aztec = encodeAztec(text, {
    eccPercent: params.eccPercent,
    layers: params.layers,
  });
  const g = matrixGeometry(
    {
      matrix: aztec.matrix,
      size: aztec.size,
      quietZoneModules: AZTEC_QUIET_ZONE_MODULES,
      quietZoneMinModules: AZTEC_QUIET_ZONE_MODULES,
      title: 'Aztec (GRBL Studio)',
      details: [
        `${aztec.size}×${aztec.size} módulos · ${aztec.layers} camadas${aztec.compact ? ' compactas' : ''} · ${aztec.codeWords} palavras de dados + ${aztec.eccCodewords} EC`,
      ],
    },
    { ...params, label: params.label ?? text },
  );
  return {
    segments: g.segments,
    extent: g.extent,
    label: text,
    warnings: g.warnings,
  };
}

// ------------------------------------------------------------ 1D → G-code

/** Nome curto da simbologia (só para o comentário do G-code). */
const SYMBOLOGY_NAMES: Record<BarcodeSymbology, string> = {
  code128: 'Code 128',
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  upca: 'UPC-A',
  code39: 'Code 39',
  itf14: 'ITF-14',
  codabar: 'Codabar',
  code93: 'Code 93',
  'gs1-128': 'GS1-128',
};

export interface BarcodeGcodeParams extends SymbolGcodeParams {
  /** Simbologia 1D. */
  symbology: BarcodeSymbology;
  /** Code 128: conjunto fixo ou `auto`. Padrão `auto`. */
  code128Charset?: 'auto' | Code128Charset;
  /** Code 39: razão largo:estreito. Padrão `3`. */
  code39Ratio?: Code39Ratio;
  /** Code 39: caractere de verificação mod 43. Padrão falso. */
  code39Checksum?: boolean;
  /**
   * **Largura final** do símbolo em mm, já com a quiet zone. Vence o
   * X-dimension: `xDim = largura ÷ (módulos + 2 × quiet)`.
   */
  targetWidthMm?: number;
  /** X-dimension (largura do módulo) em mm. Padrão da simbologia (0,33/0,5). */
  xDimMm?: number;
  /** Altura das barras em mm. Padrão da simbologia. */
  barHeightMm?: number;
  /** Quiet zone por lado, em módulos. Padrão do mínimo da norma. */
  quietZoneModules?: number;
  /** Linhas de varredura por mm (na vertical). Padrão 10. */
  linesPerMm?: number;
  /** Desenha o HRI (texto legível) sob as barras. Padrão verdadeiro. */
  hri?: boolean;
  /** Altura do HRI em mm. Padrão `clamp(altura/4, 1,2, 4)`. */
  hriHeightMm?: number;
  /** Espaço entre as barras e o HRI, em mm. Padrão 1 módulo. */
  hriGapMm?: number;
  /** Inverte a polaridade (queima os espaços). Padrão falso. */
  invert?: boolean;
  /** Área de trabalho (`$130`/`$131`) para o aviso "não cabe". */
  workAreaX?: number;
  workAreaY?: number;
  /** Texto do conteúdo no cabeçalho (padrão: o próprio dado). */
  label?: string;
  /** Máximo de caracteres do conteúdo no comentário. Padrão 60. */
  labelMaxChars?: number;
}

export interface BarcodeGcodeResult extends SymbolGcodeResult {
  barcode: {
    symbology: BarcodeSymbology;
    data: string;
    hri: string;
    totalModules: number;
    checkDigit?: number;
    checkChar?: string;
  };
  xDimMm: number;
  barHeightMm: number;
  quietZoneModules: number;
  linesPerModule: number;
  warnings: SymbolWarningCode[];
}

/** Geometria de um código de barras: segmentos, extensão e comentários. */
interface BarcodeGeometry {
  segments: SymbolSegment[];
  extent: SymbolExtent;
  header: string[];
  warnings: SymbolWarningCode[];
  barcode: {
    symbology: BarcodeSymbology;
    data: string;
    hri: string;
    totalModules: number;
    checkDigit?: number;
    checkChar?: string;
  };
  xDimMm: number;
  barHeightMm: number;
  quietZoneModules: number;
  linesPerMm: number;
}

/**
 * Codifica o 1D e devolve a geometria (sem G-code) — compartilhado com a grade.
 */
function barcodeGeometry(
  text: string,
  params: BarcodeGcodeParams,
): BarcodeGeometry {
  const spec = BARCODE_SPECS[params.symbology] ?? BARCODE_SPECS.code128;
  const barcode = encodeBarcode(text, {
    symbology: params.symbology,
    code128Charset: params.code128Charset,
    code39Ratio: params.code39Ratio,
    code39Checksum: params.code39Checksum,
  });

  const linesPerMm = positive(params.linesPerMm, 10);
  const quietZoneModules = Number.isFinite(params.quietZoneModules)
    ? Math.max(0, Math.floor(params.quietZoneModules as number))
    : spec.quietZoneMinModules;
  const barHeightMm = positive(params.barHeightMm, spec.defaultBarHeightMm);
  const totalModules = barcode.totalModules + quietZoneModules * 2;

  // Alvo de largura vence o X-dimension explícito (mesma regra do QR).
  const targetWidth = positive(params.targetWidthMm, 0);
  const xDimMm =
    targetWidth > 0
      ? clamp(targetWidth / totalModules, MIN_MODULE_MM, MAX_MODULE_MM)
      : clamp(
          positive(params.xDimMm, spec.defaultXDimMm),
          MIN_MODULE_MM,
          MAX_MODULE_MM,
        );
  const overscanMm = positive(params.overscanMm, 0);
  const contentWidthMm = totalModules * xDimMm;

  let segments = barsToVerticalSegments(barcode.bars, {
    xDimMm,
    barHeightMm,
    totalModules: barcode.totalModules,
    quietZoneModules,
    linesPerMm,
    invert: params.invert,
  });

  // HRI abaixo das barras, centralizado na largura total.
  const showHri = params.hri !== false && barcode.hri.length > 0;
  const hriHeightMm = positive(
    params.hriHeightMm,
    clamp(barHeightMm / 4, 1.2, 4),
  );
  const hriGapMm = positive(params.hriGapMm, xDimMm);
  let hriBlockMm = 0;
  if (showHri) {
    const shapes = textToShapes({
      text: barcode.hri,
      size: hriHeightMm,
      x: 0,
      y: -hriGapMm - hriHeightMm,
    });
    let textWidth = 0;
    for (const shape of shapes) {
      for (const p of shape.points) textWidth = Math.max(textWidth, p.x);
    }
    const dx = Math.max(0, (contentWidthMm - textWidth) / 2);
    for (const shape of shapes) {
      for (let i = 1; i < shape.points.length; i++) {
        const a = shape.points[i - 1];
        const b = shape.points[i];
        segments.push({ x0: a.x + dx, y0: a.y, x1: b.x + dx, y1: b.y });
      }
    }
    hriBlockMm = hriGapMm + hriHeightMm;
  }

  // Tudo para Y ≥ 0 (o HRI fica no fundo do símbolo local).
  if (hriBlockMm > 0) {
    segments = segments.map((s) => ({
      x0: s.x0,
      y0: s.y0 + hriBlockMm,
      x1: s.x1,
      y1: s.y1 + hriBlockMm,
    }));
  }
  const extent: SymbolExtent = {
    widthMm: contentWidthMm,
    heightMm: barHeightMm + hriBlockMm,
  };

  const label = params.label ?? barcode.data;
  const shown = truncateBytes(label, Math.max(8, params.labelMaxChars ?? 60));
  const check =
    barcode.checkDigit !== undefined
      ? ` · verificador ${barcode.checkDigit}`
      : barcode.checkChar
        ? ` · verificação ${barcode.checkChar}`
        : '';
  const header = [
    `Código de barras ${SYMBOLOGY_NAMES[params.symbology]} (GRBL Studio)`,
    `conteúdo: ${shown}${check}`,
    `${barcode.totalModules} módulos · X-dim ${fmt(xDimMm)} mm · barras ${fmt(barHeightMm)} mm · quiet zone ${quietZoneModules} módulos`,
    `${fmt(extent.widthMm)} × ${fmt(extent.heightMm)} mm · varredura ${linesPerMm} linhas/mm${showHri ? ` · HRI ${fmt(hriHeightMm)} mm` : ''}${params.invert ? ' · polaridade invertida' : ''}${overscanMm > 0 ? ` · overscan ${fmt(overscanMm)} mm` : ''}`,
  ].map((line) => truncateBytes(line, HEADER_MAX_BYTES));

  const warnings = symbolWarnings({
    moduleMm: xDimMm,
    quietZoneModules,
    quietZoneMinModules: spec.quietZoneMinModules,
    linesPerMm,
    widthMm: extent.widthMm,
    heightMm: extent.heightMm,
    originX: params.originX ?? 0,
    originY: params.originY ?? 0,
    workAreaX: params.workAreaX,
    workAreaY: params.workAreaY,
  });
  if (xDimMm < spec.xDimMinMm - 1e-9) warnings.push('x-dim-small');
  if (barHeightMm < spec.barHeightMinMm - 1e-9)
    warnings.push('bar-height-small');
  if (showHri && unsupportedChars(barcode.hri).length > 0) {
    warnings.push('hri-chars');
  }
  // O Code 39 só tem um alfabeto (maiúsculas): normalizar pode **mudar o dado**
  // que o leitor devolve — avisa em vez de mudar em silêncio.
  if (params.symbology === 'code39' && text !== barcode.data) {
    warnings.push('uppercased');
  }

  return {
    segments: applyOverscan(segments, overscanMm),
    extent,
    header,
    warnings,
    barcode: {
      symbology: params.symbology,
      data: barcode.data,
      hri: barcode.hri,
      totalModules: barcode.totalModules,
      checkDigit: barcode.checkDigit,
      checkChar: barcode.checkChar,
    },
    xDimMm,
    barHeightMm,
    quietZoneModules,
    linesPerMm,
  };
}

/**
 * Texto → G-code do código de barras 1D. Preenche as barras com varredura
 * **vertical** (§5.2 do plano) e desenha o HRI com a fonte de traço único
 * (`fonts.ts`) sob o símbolo. Puro: sem DOM e sem máquina.
 */
export function barcodeToGcode(
  text: string,
  params: BarcodeGcodeParams,
): BarcodeGcodeResult {
  const g = barcodeGeometry(text, params);
  const result = symbolToGcode(g.segments, g.extent, {
    ...params,
    header: g.header,
    presorted: true,
  });

  return {
    ...result,
    barcode: g.barcode,
    xDimMm: g.xDimMm,
    barHeightMm: g.barHeightMm,
    quietZoneModules: g.quietZoneModules,
    linesPerModule: scanLinesPerModule(g.xDimMm, g.linesPerMm),
    warnings: g.warnings,
  };
}

/**
 * Código de barras → célula de grade (RF-SYM-9). Segmentos já em ordem de
 * gravação (`presorted`), então a grade não os reordena.
 */
export function barcodeToCell(
  text: string,
  params: BarcodeGcodeParams,
): SymbolGridCell {
  const g = barcodeGeometry(text, params);
  return {
    segments: g.segments,
    extent: g.extent,
    label: g.barcode.data,
    presorted: true,
    warnings: g.warnings,
  };
}

// ------------------------------------------------------------- grade (RF-SYM-9)

/** Colunas padrão: quadrado aproximado com todas as células preenchidas. */
function gridColumns(count: number, requested: number | undefined): number {
  if (Number.isFinite(requested) && (requested as number) >= 1) {
    return Math.min(count, Math.floor(requested as number));
  }
  return Math.max(1, Math.ceil(Math.sqrt(count)));
}

/**
 * Vários símbolos → **um** programa de G-code em grade (RF-SYM-9). As células
 * têm o tamanho da **maior** (colunas e linhas alinhadas), preenchidas da
 * esquerda para a direita e de **cima para baixo** (a primeira linha da lista
 * fica no **topo**, na ordem de leitura). Cabeçalho/rodapé (`G21 G90 G94 M5 … M5
 * G0 X0 Y0`) são emitidos uma vez; as passadas varrem a grade inteira. Puro.
 */
export function symbolGridToGcode(
  cells: ReadonlyArray<SymbolGridCell>,
  params: SymbolGridParams,
): SymbolGridResult {
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

  const count = cells.length;
  const gapX = Number.isFinite(params.gapXMm)
    ? Math.max(0, params.gapXMm as number)
    : 5;
  const gapY = Number.isFinite(params.gapYMm)
    ? Math.max(0, params.gapYMm as number)
    : 5;
  const columns = count > 0 ? gridColumns(count, params.columns) : 0;
  const rows = count > 0 ? Math.ceil(count / columns) : 0;

  let cellWidthMm = 0;
  let cellHeightMm = 0;
  for (const cell of cells) {
    cellWidthMm = Math.max(cellWidthMm, cell.extent.widthMm);
    cellHeightMm = Math.max(cellHeightMm, cell.extent.heightMm);
  }
  const widthMm = count > 0 ? columns * cellWidthMm + (columns - 1) * gapX : 0;
  const heightMm = count > 0 ? rows * cellHeightMm + (rows - 1) * gapY : 0;

  const lines: string[] = [];
  for (const comment of params.header ?? []) lines.push(`; ${comment}`);
  lines.push('; Grade de símbolos (GRBL Studio)');
  lines.push(
    `; ${count} símbolo(s) · ${columns} × ${rows} · célula ${fmt(cellWidthMm)} × ${fmt(cellHeightMm)} mm · espaçamento ${fmt(gapX)} × ${fmt(gapY)} mm`,
  );
  lines.push(
    `; potência ${Math.round(powerPercent)}% (S${power}) · ${Math.round(feed)} mm/min · passadas ${passes} · ${arm}`,
  );
  lines.push(
    `; origem X${fmt(originX)} Y${fmt(originY)} · ${fmt(widthMm)} × ${fmt(heightMm)} mm`,
  );
  // Rótulos por célula, no orçamento de bytes do cabeçalho (nunca estoura o RX).
  const labelBudget = Math.max(8, params.labelMaxChars ?? 60);
  let usedBytes = 0;
  for (let i = 0; i < count && lines.length < 400; i++) {
    const label = truncateBytes(cells[i].label, labelBudget);
    const line = `; [${i + 1}] ${label}`;
    const cost = utf8.encode(line).length + 1;
    if (usedBytes + cost > HEADER_MAX_BYTES * 32) {
      lines.push('; …');
      break;
    }
    lines.push(line);
    usedBytes += cost;
  }
  lines.push('G21');
  lines.push('G90');
  lines.push('G94');
  lines.push('M5');
  lines.push(`G0 X0 Y0 F${Math.round(travelFeed)}`);

  const placed = cells.map((cell, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const dx = originX + col * (cellWidthMm + gapX);
    const dy = originY + (rows - 1 - row) * (cellHeightMm + gapY);
    const ordered = cell.presorted
      ? finiteSegments(cell.segments)
      : zigzagHatch(finiteSegments(cell.segments));
    return ordered.map(
      (s): SymbolSegment => ({
        x0: s.x0 + dx,
        y0: s.y0 + dy,
        x1: s.x1 + dx,
        y1: s.y1 + dy,
      }),
    );
  });

  let burnMm = 0;
  let travelMm = 0;
  let emitted = 0;
  let cursorX = 0;
  let cursorY = 0;
  for (let pass = 0; pass < passes; pass++) {
    if (passes > 1) lines.push(`; pass ${pass + 1}/${passes}`);
    for (const cell of placed) {
      for (const s of cell) {
        lines.push(`G0 X${fmt(s.x0)} Y${fmt(s.y0)}`);
        lines.push(`${arm} S${power}`);
        lines.push(`G1 X${fmt(s.x1)} Y${fmt(s.y1)} F${Math.round(feed)}`);
        lines.push('M5');
        travelMm += Math.hypot(s.x0 - cursorX, s.y0 - cursorY);
        burnMm += Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
        cursorX = s.x1;
        cursorY = s.y1;
        emitted++;
      }
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
    widthMm,
    heightMm,
    burnMm,
    travelMm,
    count,
    columns,
    rows,
    cellWidthMm,
    cellHeightMm,
    warnings: [...new Set(cells.flatMap((cell) => cell.warnings))],
  };
}

/** Vários QR Codes → G-code em grade (RF-SYM-9). */
export function qrGridToGcode(
  texts: ReadonlyArray<string>,
  params: QrGcodeParams & SymbolGridParams,
): SymbolGridResult {
  return symbolGridToGcode(
    texts.map((text) => qrToCell(text, params)),
    params,
  );
}

/** Vários Data Matrix → G-code em grade (RF-SYM-9). */
export function dataMatrixGridToGcode(
  texts: ReadonlyArray<string>,
  params: DataMatrixGcodeParams & SymbolGridParams,
): SymbolGridResult {
  return symbolGridToGcode(
    texts.map((text) => dataMatrixToCell(text, params)),
    params,
  );
}

/** Vários PDF417 → G-code em grade (RF-SYM-7/9). */
export function pdf417GridToGcode(
  texts: ReadonlyArray<string>,
  params: Pdf417GcodeParams & SymbolGridParams,
): SymbolGridResult {
  return symbolGridToGcode(
    texts.map((text) => pdf417ToCell(text, params)),
    params,
  );
}

/** Vários códigos de barras 1D → G-code em grade (RF-SYM-9). */
export function barcodeGridToGcode(
  texts: ReadonlyArray<string>,
  params: BarcodeGcodeParams & SymbolGridParams,
): SymbolGridResult {
  return symbolGridToGcode(
    texts.map((text) => barcodeToCell(text, params)),
    params,
  );
}

/** Vários Aztec → G-code em grade (RF-SYM-9). */
export function aztecGridToGcode(
  texts: ReadonlyArray<string>,
  params: AztecGcodeParams & SymbolGridParams,
): SymbolGridResult {
  return symbolGridToGcode(
    texts.map((text) => aztecToCell(text, params)),
    params,
  );
}
