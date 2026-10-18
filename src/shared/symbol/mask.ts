/**
 * Do símbolo para a **geometria de varredura** — módulo puro (sem DOM, sem
 * G-code).
 *
 * O QR Code é descrito como **faixas** horizontais, cada uma com trechos escuros
 * em mm; a varredura transforma isso em segmentos de linha de gravação, com o
 * número de linhas por milímetro pedido — o módulo precisa de 3–4 linhas para
 * sair sólido e legível. O código de barras (fase S2) usa o caminho **vertical**
 * (`barsToVerticalSegments`): as linhas correm ao longo das barras.
 */

/** Trecho a queimar, em mm, nas coordenadas locais do símbolo. */
export interface SymbolSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Trecho escuro dentro de uma faixa (`x1 > x0`). */
export interface BandRun {
  x0: number;
  x1: number;
}

/** Faixa horizontal do símbolo: `y1 > y0`, trechos ordenados e sem sobrepor. */
export interface SymbolBand {
  y0: number;
  y1: number;
  runs: BandRun[];
}

export interface MatrixToBandsOptions {
  /** Lado do módulo no eixo X, em mm (> 0). */
  moduleMm: number;
  /**
   * Lado do módulo no eixo Y, em mm. Omitido = o mesmo de X (símbolo
   * quadrado). Diferente de X, o símbolo sai **esticado** num eixo
   * (RF-SYM-3: largura × altura independentes).
   */
  moduleYMm?: number;
  /** Quiet zone em módulos (padrão 4, conforme a norma). */
  quietZoneModules?: number;
}

export interface ScanOptions {
  /** Linhas de varredura por milímetro (10 = uma a cada 0,1 mm). */
  linesPerMm: number;
  /** Descarta trechos menores que isso (mm). Padrão 0 (não descarta). */
  minRunMm?: number;
}

/** Barra do símbolo 1D em unidades de módulo: começa em `x`, largura `w`. */
export interface ModuleBar {
  x: number;
  w: number;
}

export interface BarsToSegmentsOptions {
  /** X-dimension (largura do módulo) em mm (> 0). */
  xDimMm: number;
  /** Altura das barras em mm (> 0). */
  barHeightMm: number;
  /** Largura do símbolo em módulos, sem a quiet zone. */
  totalModules: number;
  /** Quiet zone por lado, em módulos. Padrão 10. */
  quietZoneModules?: number;
  /** Linhas de varredura por milímetro (vertical). */
  linesPerMm: number;
  /** Inverte a polaridade (queima os espaços). Padrão falso. */
  invert?: boolean;
}

export interface SymbolExtent {
  widthMm: number;
  heightMm: number;
}

/** Símbolo em coordenadas locais: faixas + caixa total (com a quiet zone). */
export interface SymbolGeometry {
  bands: SymbolBand[];
  extent: SymbolExtent;
}

/**
 * Matriz do QR → geometria em mm. `matrix[0]` é a linha do **topo**; o eixo Y do
 * G-code cresce para cima, então a banda da primeira linha fica no alto. A
 * caixa total inclui a quiet zone dos dois lados e as linhas em branco (senão o
 * símbolo "encolhe" e a RC/origem saem erradas).
 */
export function matrixToBands(
  matrix: boolean[][],
  opts: MatrixToBandsOptions,
): SymbolGeometry {
  const moduleXMm = opts.moduleMm;
  const moduleYMm = opts.moduleYMm ?? moduleXMm;
  const empty: SymbolGeometry = {
    bands: [],
    extent: { widthMm: 0, heightMm: 0 },
  };
  if (!Number.isFinite(moduleXMm) || moduleXMm <= 0) return empty;
  if (!Number.isFinite(moduleYMm) || moduleYMm <= 0) return empty;
  const rows = matrix.length;
  if (rows === 0) return empty;
  const quiet = Math.max(0, opts.quietZoneModules ?? 4);
  const cols = matrix[0].length;
  const bands: SymbolBand[] = [];
  for (let r = 0; r < rows; r++) {
    const y0 = (rows - 1 - r + quiet) * moduleYMm;
    const row = matrix[r];
    const runs: BandRun[] = [];
    let start = -1;
    for (let c = 0; c <= row.length; c++) {
      const on = c < row.length && row[c];
      if (on && start < 0) start = c;
      else if (!on && start >= 0) {
        runs.push({
          x0: (quiet + start) * moduleXMm,
          x1: (quiet + c) * moduleXMm,
        });
        start = -1;
      }
    }
    if (runs.length > 0) bands.push({ y0, y1: y0 + moduleYMm, runs });
  }
  return {
    bands,
    extent: {
      widthMm: (cols + quiet * 2) * moduleXMm,
      heightMm: (rows + quiet * 2) * moduleYMm,
    },
  };
}

/**
 * Barras do código de barras (fase S2) → segmentos de **varredura vertical**.
 *
 * O código de barras é preenchido **ao longo das barras** (linhas verticais),
 * não com faixas horizontais: o X-dimension é pequeno e precisaria de um número
 * enorme de linhas horizontais para a barra sair sólida; varrendo na vertical,
 * cada barra recebe `round(largura × linesPerMm)` linhas (no mínimo 1) e o
 * número de segmentos cai ~30×. A direção alterna a cada linha (sobe/desce) para
 * reduzir os `G0` — por isso quem consome estes segmentos deve **preservar a
 * ordem** (nada de `zigzagHatch`).
 *
 * `invert` queima os **espaços** (o complemento das barras) dentro da largura
 * total, incluindo as quiet zones — como o `invertBands` faz no QR.
 */
export function barsToVerticalSegments(
  bars: ReadonlyArray<ModuleBar>,
  opts: BarsToSegmentsOptions,
): SymbolSegment[] {
  const { xDimMm, barHeightMm, totalModules } = opts;
  if (!Number.isFinite(xDimMm) || xDimMm <= 0) return [];
  if (!Number.isFinite(barHeightMm) || barHeightMm <= 0) return [];
  if (!Number.isFinite(totalModules) || totalModules <= 0) return [];
  const linesPerMm = opts.linesPerMm;
  if (!Number.isFinite(linesPerMm) || linesPerMm <= 0) return [];
  const quiet = Math.max(0, opts.quietZoneModules ?? 10);
  const full = totalModules + quiet * 2;

  /** Trechos a queimar, em mm, dentro de `[0, full · xDim]`. */
  const spans: BandRun[] = [];
  if (opts.invert) {
    let cursor = 0;
    for (const bar of bars) {
      const start = quiet + bar.x;
      const end = quiet + bar.x + bar.w;
      if (start > cursor)
        spans.push({ x0: cursor * xDimMm, x1: start * xDimMm });
      cursor = Math.max(cursor, end);
    }
    if (cursor < full) spans.push({ x0: cursor * xDimMm, x1: full * xDimMm });
  } else {
    for (const bar of bars) {
      spans.push({
        x0: (quiet + bar.x) * xDimMm,
        x1: (quiet + bar.x + bar.w) * xDimMm,
      });
    }
  }

  const out: SymbolSegment[] = [];
  let line = 0;
  for (const span of spans) {
    const width = span.x1 - span.x0;
    if (width <= 0) continue;
    const count = Math.max(1, Math.round(width * linesPerMm));
    const step = width / count;
    for (let k = 0; k < count; k++) {
      const x = span.x0 + (k + 0.5) * step;
      const up = line % 2 === 0;
      out.push({
        x0: x,
        y0: up ? 0 : barHeightMm,
        x1: x,
        y1: up ? barHeightMm : 0,
      });
      line++;
    }
  }
  return out;
}

/** Dimensões efetivamente ocupadas pelos trechos (sem a quiet zone). */
export function bandsExtent(bands: ReadonlyArray<SymbolBand>): SymbolExtent {
  let widthMm = 0;
  let heightMm = 0;
  for (const band of bands) {
    heightMm = Math.max(heightMm, band.y1);
    for (const run of band.runs) widthMm = Math.max(widthMm, run.x1);
  }
  return { widthMm, heightMm };
}

/**
 * Inverte a polaridade (queima o fundo em vez do símbolo) dentro da caixa
 * delimitadora das faixas.
 */
export function invertBands(
  bands: ReadonlyArray<SymbolBand>,
  extent: SymbolExtent,
): SymbolBand[] {
  const out: SymbolBand[] = [];
  for (const band of bands) {
    const runs: BandRun[] = [];
    let cursor = 0;
    for (const run of band.runs) {
      if (run.x0 > cursor) runs.push({ x0: cursor, x1: run.x0 });
      cursor = Math.max(cursor, run.x1);
    }
    if (cursor < extent.widthMm) runs.push({ x0: cursor, x1: extent.widthMm });
    out.push({ y0: band.y0, y1: band.y1, runs });
  }
  return out;
}

/**
 * Faixas → segmentos de varredura. Cada faixa recebe
 * `round(altura × linesPerMm)` linhas (no mínimo 1), distribuídas por igual
 * dentro dela: o espaçamento entre linhas vizinhas fica uniforme e a última
 * linha continua dentro do módulo.
 */
export function bandsToScanSegments(
  bands: ReadonlyArray<SymbolBand>,
  opts: ScanOptions,
): SymbolSegment[] {
  const linesPerMm = opts.linesPerMm;
  if (!Number.isFinite(linesPerMm) || linesPerMm <= 0) return [];
  const minRun = Math.max(0, opts.minRunMm ?? 0);
  const out: SymbolSegment[] = [];
  for (const band of bands) {
    const height = band.y1 - band.y0;
    if (height <= 0 || band.runs.length === 0) continue;
    const count = Math.max(1, Math.round(height * linesPerMm));
    const step = height / count;
    for (let k = 0; k < count; k++) {
      const y = band.y0 + (k + 0.5) * step;
      for (const run of band.runs) {
        if (run.x1 - run.x0 < minRun) continue;
        out.push({ x0: run.x0, y0: y, x1: run.x1, y1: y });
      }
    }
  }
  return out;
}

/**
 * Diagnóstico de legibilidade: quantas linhas de varredura caem em cada módulo
 * (ou barra estreita) e se a quiet zone foi respeitada.
 */
export function scanLinesPerModule(
  moduleMm: number,
  linesPerMm: number,
): number {
  if (!(moduleMm > 0) || !(linesPerMm > 0)) return 0;
  return Math.max(1, Math.round(moduleMm * linesPerMm));
}
