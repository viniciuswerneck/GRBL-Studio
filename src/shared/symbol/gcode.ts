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

const fmt = (v: number): string => v.toFixed(3);

/** Valor positivo e finito, ou o padrão. */
function positive(v: number | undefined, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
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
  | 'hri-chars';

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
  /**
   * **Largura final** do símbolo em mm, já incluindo a quiet zone. Vence
   * `moduleMm`: o lado do módulo sai de `largura ÷ (módulos + 2 × quiet)`.
   */
  targetWidthMm?: number;
  /**
   * **Altura final** em mm (com a quiet zone). Omitida = igual à largura
   * (símbolo quadrado, o normal de um QR). As duas juntas esticam o símbolo
   * num eixo — o QR é quadrado, então esticar piora a leitura (aviso `stretched`).
   */
  targetHeightMm?: number;
  /** Lado do módulo em mm — usado quando não há alvo de largura/altura. Padrão 0,5. */
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
  const linesPerMm = positive(params.linesPerMm, 10);
  const quietZoneModules = Number.isFinite(params.quietZoneModules)
    ? Math.max(0, Math.floor(params.quietZoneModules as number))
    : QR_QUIET_ZONE_MODULES;
  const overscanMm = positive(params.overscanMm, 0);

  const totalModules = qr.size + quietZoneModules * 2;
  const { moduleXMm, moduleYMm } = qrModuleSizes(params, totalModules);
  const stretched =
    Math.abs(moduleXMm - moduleYMm) >
    STRETCH_TOLERANCE * Math.max(moduleXMm, moduleYMm);

  const geometry = matrixToBands(qr.matrix, {
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

  const label = params.label ?? text;
  const maxChars = Math.max(8, params.labelMaxChars ?? 60);
  const shown =
    label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
  const moduleText = stretched
    ? `módulo ${fmt(moduleXMm)} × ${fmt(moduleYMm)} mm`
    : `módulo ${fmt(moduleXMm)} mm`;
  const header = [
    'QR Code (GRBL Studio)',
    `conteúdo: ${shown}`,
    `versão ${qr.version} · ECC ${qr.ecc} · máscara ${qr.mask} · ${qr.size}×${qr.size} módulos`,
    `${moduleText} · quiet zone ${quietZoneModules} módulos · ${fmt(extent.widthMm)} × ${fmt(extent.heightMm)} mm`,
    `varredura ${linesPerMm} linhas/mm${params.invert ? ' · polaridade invertida' : ''}${overscanMm > 0 ? ` · overscan ${fmt(overscanMm)} mm` : ''}`,
  ];

  const result = symbolToGcode(applyOverscan(segments, overscanMm), extent, {
    ...params,
    header,
  });

  // Avisos pelo **menor** lado do módulo: é ele que limita a legibilidade.
  const warnings = symbolWarnings({
    moduleMm: Math.min(moduleXMm, moduleYMm),
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
  if (stretched) warnings.push('stretched');

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
    moduleMm: moduleXMm,
    moduleYMm,
    quietZoneModules,
    linesPerModule: scanLinesPerModule(
      Math.min(moduleXMm, moduleYMm),
      linesPerMm,
    ),
    warnings,
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

/**
 * Texto → G-code do código de barras 1D. Preenche as barras com varredura
 * **vertical** (§5.2 do plano) e desenha o HRI com a fonte de traço único
 * (`fonts.ts`) sob o símbolo. Puro: sem DOM e sem máquina.
 */
export function barcodeToGcode(
  text: string,
  params: BarcodeGcodeParams,
): BarcodeGcodeResult {
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
  const maxChars = Math.max(8, params.labelMaxChars ?? 60);
  const shown =
    label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
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
  ];

  const result = symbolToGcode(applyOverscan(segments, overscanMm), extent, {
    ...params,
    header,
    presorted: true,
  });

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

  return {
    ...result,
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
    linesPerModule: scanLinesPerModule(xDimMm, linesPerMm),
    warnings,
  };
}
