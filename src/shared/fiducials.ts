/**
 * **Marcas de registro (fiduciais)** — módulo puro.
 *
 * Pequenas marcas em volta da arte que servem de referência física:
 *
 * - alinhar uma peça já cortada/impressa na mesa (jogar o laser até a marca e
 *   zerar o eixo);
 * - conferir o alinhamento entre duas passadas (frente/verso, tiling, encaixe
 *   de peças);
 * - remontar peças cortadas em partes.
 *
 * São **linhas abertas** (gravação), não contornos: não entram na compensação
 * de kerf e não fecham a peça. Ficam **fora** da área da arte, a uma distância
 * configurável, para não encostar no corte.
 *
 * Puro e testável: sem DOM, sem IPC.
 */

import type { Point } from './design';

export type FiducialKind = 'corners' | 'crosses';

/** Limites de sanidade (mm). */
export const FIDUCIAL_OFFSET_MAX_MM = 100;
export const FIDUCIAL_SIZE_MIN_MM = 1;
export const FIDUCIAL_SIZE_MAX_MM = 100;

export interface FiducialBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface FiducialOptions {
  kind?: FiducialKind;
  /** Distância entre a arte e a marca (mm). */
  offset?: number;
  /** Comprimento de cada braço da marca (mm). */
  size?: number;
}

/** Distância válida (mm): 0..100; inválida → 0. */
export function sanitizeFiducialOffset(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(FIDUCIAL_OFFSET_MAX_MM, n);
}

/** Tamanho válido (mm): 1..100; inválido → 10 (padrão). */
export function sanitizeFiducialSize(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(FIDUCIAL_SIZE_MAX_MM, Math.max(FIDUCIAL_SIZE_MIN_MM, n));
}

/** Braço em `L` com o vértice no canto externo e as pontas para dentro. */
function cornerMark(
  x: number,
  y: number,
  dx: number,
  dy: number,
  size: number,
): Point[] {
  return [
    { x: x + dx * size, y },
    { x, y },
    { x, y: y + dy * size },
  ];
}

/** Cruz centrada em `(x, y)` — dois traços perpendiculares. */
function crossMark(x: number, y: number, size: number): Point[][] {
  const h = size / 2;
  return [
    [
      { x: x - h, y },
      { x: x + h, y },
    ],
    [
      { x, y: y - h },
      { x, y: y + h },
    ],
  ];
}

/**
 * Marcas em volta de `bounds`:
 * - `corners`: um `L` em cada canto (4 traços de 3 pontos), com o vértice no
 *   canto deslocado para fora e os braços apontando para a arte;
 * - `crosses`: uma cruz no meio de cada lado (8 traços de 2 pontos).
 *
 * Devolve polilinhas abertas; geometria degenerada devolve `[]`.
 */
export function fiducialMarks(
  bounds: FiducialBounds,
  options: FiducialOptions = {},
): Point[][] {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  if (!(w > 0) || !(h > 0)) return [];
  const off = sanitizeFiducialOffset(options.offset ?? 5);
  const size = sanitizeFiducialSize(options.size ?? 10);
  const kind: FiducialKind = options.kind === 'crosses' ? 'crosses' : 'corners';
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const left = bounds.minX - off;
  const right = bounds.maxX + off;
  const bottom = bounds.minY - off;
  const top = bounds.maxY + off;

  if (kind === 'crosses') {
    return [
      ...crossMark(cx, bottom, size),
      ...crossMark(cx, top, size),
      ...crossMark(left, cy, size),
      ...crossMark(right, cy, size),
    ];
  }
  return [
    cornerMark(left, bottom, 1, 1, size),
    cornerMark(right, bottom, -1, 1, size),
    cornerMark(right, top, -1, -1, size),
    cornerMark(left, top, 1, -1, size),
  ];
}
