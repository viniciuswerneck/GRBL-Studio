/**
 * Geometria da varredura e reamostragem (RF-IMG-3, RF-IMG-4, RF-IMG-9).
 *
 * O centro do ponto da primeira amostra fica a `dotSizeMm/2` de cada borda,
 * de modo que a área **queimada** (ponto incluído) coincida com a área pedida —
 * e nunca extrapole o retângulo de trabalho.
 */

import type { GeometryOptions, ScanDirection } from './types';

export interface ScanGeometry {
  /** Direção da varredura. */
  direction: ScanDirection;
  /** Passo entre amostras (mm). */
  pitch: number;
  /** Metade do ponto (inserção nas bordas, mm). */
  halfDot: number;
  /** Número de linhas de varredura. */
  rows: number;
  /** Número de amostras por linha. */
  cols: number;
  /** Centro da primeira amostra no eixo da linha (linha 0). */
  rowStart: number;
  /** Centro da primeira amostra no eixo de varredura (coluna 0). */
  scanStart: number;
  /** Coordenada do canto da área de trabalho no eixo da linha. */
  rowOrigin: number;
  /** Coordenada do canto da área de trabalho no eixo de varredura. */
  scanOrigin: number;
}

function mustPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} precisa ser um número maior que zero.`);
  }
}

/** Valida as opções geométricas. */
export function validateGeometry(g: GeometryOptions): void {
  mustPositive(g.widthMm, 'Largura');
  mustPositive(g.heightMm, 'Altura');
  mustPositive(g.linesPerMm, 'Linhas/mm');
  if (!Number.isFinite(g.offsetX) || !Number.isFinite(g.offsetY)) {
    throw new Error('Offset inválido.');
  }
  if (!Number.isFinite(g.dotSizeMm) || g.dotSizeMm < 0) {
    throw new Error('Tamanho do ponto inválido.');
  }
  if (g.direction !== 'h' && g.direction !== 'v') {
    throw new Error('Direção de varredura inválida.');
  }
}

/** Calcula a geometria de varredura (linhas, colunas e posições). */
export function computeScanGeometry(g: GeometryOptions): ScanGeometry {
  validateGeometry(g);

  const pitch = 1 / g.linesPerMm;

  const scanLength = g.direction === 'h' ? g.widthMm : g.heightMm;
  const rowLength = g.direction === 'h' ? g.heightMm : g.widthMm;

  // Metade do ponto nunca pode exceder metade da área, senão a borda do ponto
  // sairia do retângulo de trabalho (caso degenerado: área menor que o ponto).
  const halfDot = Math.min(g.dotSizeMm / 2, scanLength / 2, rowLength / 2);
  const dotSize = halfDot * 2;

  // Espaço útil para o **centro** do ponto (o ponto ocupa dotSize na borda).
  const scanSpan = Math.max(0, scanLength - dotSize);
  const rowSpan = Math.max(0, rowLength - dotSize);

  const cols = Math.max(1, Math.floor(scanSpan / pitch) + 1);
  const rows = Math.max(1, Math.floor(rowSpan / pitch) + 1);

  const rowOrigin = g.direction === 'h' ? g.offsetY : g.offsetX;
  const scanOrigin = g.direction === 'h' ? g.offsetX : g.offsetY;

  return {
    direction: g.direction,
    pitch,
    halfDot,
    rows,
    cols,
    rowStart: rowOrigin + halfDot,
    scanStart: scanOrigin + halfDot,
    rowOrigin,
    scanOrigin,
  };
}

/**
 * Monta a matriz `rows * cols` de valores 0..1 (1 = branco) reamostrando a
 * imagem com interpolação bilinear no espaço físico (mm -> pixels).
 */
export function sampleGrid(
  gray: Float32Array,
  imgWidth: number,
  imgHeight: number,
  g: GeometryOptions,
  geom: ScanGeometry,
): Float32Array {
  if (gray.length !== imgWidth * imgHeight) {
    throw new Error(
      'Buffer de cinza incompatível com as dimensões informadas.',
    );
  }

  const grid = new Float32Array(geom.rows * geom.cols);
  const widthScale = imgWidth > 1 ? (imgWidth - 1) / g.widthMm : 0;
  const heightScale = imgHeight > 1 ? (imgHeight - 1) / g.heightMm : 0;

  for (let r = 0; r < geom.rows; r++) {
    const rowCoord = geom.rowStart + r * geom.pitch;
    for (let c = 0; c < geom.cols; c++) {
      const scanCoord = geom.scanStart + c * geom.pitch;

      const px = geom.direction === 'h' ? scanCoord : rowCoord;
      const py = geom.direction === 'h' ? rowCoord : scanCoord;

      const u = (px - g.offsetX) * widthScale;
      const v = (py - g.offsetY) * heightScale;
      grid[r * geom.cols + c] = bilinear(gray, imgWidth, imgHeight, u, v);
    }
  }
  return grid;
}

/** Interpolação bilinear com clamp nas bordas. */
function bilinear(
  src: Float32Array,
  width: number,
  height: number,
  u: number,
  v: number,
): number {
  const x = u < 0 ? 0 : u > width - 1 ? width - 1 : u;
  const y = v < 0 ? 0 : v > height - 1 ? height - 1 : v;

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1 < width ? x0 + 1 : width - 1;
  const y1 = y0 + 1 < height ? y0 + 1 : height - 1;

  const fx = x - x0;
  const fy = y - y0;

  const top = src[y0 * width + x0]! * (1 - fx) + src[y0 * width + x1]! * fx;
  const bottom = src[y1 * width + x0]! * (1 - fx) + src[y1 * width + x1]! * fx;
  return top * (1 - fy) + bottom * fy;
}
