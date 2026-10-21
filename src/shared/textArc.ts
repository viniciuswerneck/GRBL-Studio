/**
 * **Texto em curva / arco** — RF-DSN-26.
 *
 * O bloco de texto (já convertido em contornos) é dobrado sobre um arco de
 * raio `R`: cada ponto é levado para o arco mantendo a distância ao longo da
 * curva (o texto não estica nem encolhe) e a altura em relação à linha de base.
 *
 * - raio **positivo** → arco para cima (centro abaixo da linha de base);
 * - raio **negativo** → arco para baixo (centro acima).
 *
 * `baseline` é o Y da linha de base (o mesmo `y` em que o texto foi gerado):
 * assim descendentes (g, p) ficam corretos e linhas extras de um bloco
 * multilinha acompanham o arco como arcos concêntricos.
 *
 * Puro e testável — nada de DOM.
 */
import type { Point, Shape } from './design';

/** Raio mínimo aceito (mm) — abaixo disso o texto fecha em círculo. */
export const ARC_RADIUS_MIN_MM = 5;

function blockBounds(shapes: ReadonlyArray<Shape>): {
  minX: number;
  maxX: number;
} | null {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const s of shapes) {
    for (const p of s.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
    }
  }
  return Number.isFinite(minX) ? { minX, maxX } : null;
}

/**
 * Menor raio que mantém o texto dentro de ~50° de cada lado do ápice
 * (metade da largura / 0,9 rad), arredondado para cima.
 */
export function minArcRadius(shapes: ReadonlyArray<Shape>): number {
  const b = blockBounds(shapes);
  if (!b) return ARC_RADIUS_MIN_MM;
  const half = Math.max(0, (b.maxX - b.minX) / 2);
  return Math.max(ARC_RADIUS_MIN_MM, half / 0.9);
}

export function arcTextShapes(
  shapes: ReadonlyArray<Shape>,
  radius: number,
  baseline: number,
): Shape[] {
  const r = typeof radius === 'number' && Number.isFinite(radius) ? radius : 0;
  const base =
    typeof baseline === 'number' && Number.isFinite(baseline) ? baseline : 0;
  if (Math.abs(r) < 1e-6) {
    return shapes.map((s) => ({
      ...s,
      points: s.points.map((p) => ({ x: p.x, y: p.y })),
    }));
  }
  const sign = r >= 0 ? 1 : -1;
  const R = Math.abs(r);
  const b = blockBounds(shapes);
  if (!b) return shapes.map((s) => ({ ...s, points: [...s.points] }));
  const cx = (b.minX + b.maxX) / 2;
  const map = (p: Point): Point => {
    const theta = (p.x - cx) / R;
    const h = p.y - base;
    // Distância ao centro: o ápice fica em R; a altura do glifo cresce para
    // fora do arco (ou para dentro, quando o centro está acima).
    const rr = R + sign * h;
    return {
      x: cx + rr * Math.sin(theta),
      y: base - sign * R + sign * rr * Math.cos(theta),
    };
  };
  return shapes.map((s) => ({ ...s, points: s.points.map(map) }));
}
