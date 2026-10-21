/**
 * **Gabarito (jig / molde)** — RF-DSN-25.
 *
 * A partir da peça (seleção ou arte inteira), gera um contorno em volta dela
 * com uma **folga** de encaixe: o molde fica na mesa e a peça é apoiada dentro
 * dele, sempre no mesmo lugar — repetir 100 peças sem medir de novo.
 *
 * Só o **contorno externo** (profundidade par, pelo mesmo critério *even-odd*
 * do kerf) vira molde: furos e ilhas não definem o encaixe. Linhas abertas e
 * traços grossos (`width`) ficam de fora e são contados em `skipped`.
 *
 * Puro e testável; o deslocamento usa o mesmo `offsetLoop` do kerf.
 */
import type { Point, Shape } from './design';
import { containmentDepth } from './kerf';
import { offsetLoop } from './offset';

/** Teto de sanidade da folga do molde (mm). */
export const JIG_CLEARANCE_MAX_MM = 5;
/** Folga mínima usada no deslocamento (0 daria um molde colado na peça). */
export const JIG_CLEARANCE_MIN_MM = 0.05;

export interface JigResult {
  /** Contornos externos deslocados para fora, um por peça. */
  outlines: Point[][];
  /** Formas que não servem de molde (abertas ou com traço grosso). */
  skipped: number;
}

export function sanitizeJigClearance(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(JIG_CLEARANCE_MAX_MM, n);
}

export function jigOutlines(
  shapes: ReadonlyArray<Shape>,
  clearance: number,
): JigResult {
  const usable = shapes.filter(
    (s) =>
      s.closed &&
      s.points.length >= 3 &&
      !(typeof s.width === 'number' && s.width > 0),
  );
  const loops: Point[][] = usable.map((s) => s.points);
  const distance = Math.max(
    JIG_CLEARANCE_MIN_MM,
    sanitizeJigClearance(clearance),
  );
  const outlines: Point[][] = [];
  for (let i = 0; i < usable.length; i++) {
    const loop = loops[i];
    if (containmentDepth(loop, loops) % 2 !== 0) continue;
    const out = offsetLoop(loop, distance, {
      join: 'miter',
      miterLimit: 4,
    });
    if (out && out.length >= 3) outlines.push(out);
  }
  return { outlines, skipped: shapes.length - usable.length };
}
