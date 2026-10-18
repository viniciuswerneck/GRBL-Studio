/**
 * Offset (inset/outset) de contornos fechados — módulo puro.
 *
 * Cada aresta é deslocada pela normal externa (`distance` > 0 cresce,
 * < 0 encolhe) e os vértices são recalculados na intersecção das arestas
 * deslocadas, com três estilos de canto:
 *
 * - `miter`: quina em bico (limitada por `miterLimit`, o excedente vira
 *   chanfro — evita espigões em ângulos agudos);
 * - `bevel`: chanfro (dois pontos, sem vértice novo);
 * - `round`: arco com `arcSamples` amostras por quadrante.
 *
 * Contornos que colapsam (área muito pequena ou invertida) são descartados.
 * Limitação conhecida: contornos côncavos muito fechados podem se
 * auto-intersectar no offset positivo — igual a um offset simples de mercado.
 *
 * Sem DOM: testável em Vitest e usado pelo renderer via
 * `public/offset.js` → `window.GRBL_OFFSET`.
 */

import { type Loop, signedArea } from './boolean';
import type { Point } from './design';

export type JoinStyle = 'miter' | 'round' | 'bevel';

export interface OffsetOptions {
  /** Estilo do canto (padrão `miter`). */
  join?: JoinStyle;
  /** Limite do bico, em múltiplos da distância (padrão 3). */
  miterLimit?: number;
  /** Amostras por quadrante nos cantos arredondados (padrão 6). */
  arcSamples?: number;
}

const MIN_AREA = 1e-6;

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** Normal externa de uma aresta (a→b) num contorno de área `area`. */
function normal(a: Point, b: Point, area: number): Point {
  const d = unit(a, b);
  const s = area >= 0 ? 1 : -1;
  return { x: d.y * s, y: -d.x * s };
}

/** Intersecção das retas (p, dp) e (q, dq); `null` se paralelas. */
function lineIntersect(p: Point, dp: Point, q: Point, dq: Point): Point | null {
  const den = dp.x * dq.y - dp.y * dq.x;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((q.x - p.x) * dq.y - (q.y - p.y) * dq.x) / den;
  return { x: p.x + dp.x * t, y: p.y + dp.y * t };
}

/** Distância mínima de `p` ao contorno (arestas) de `points`. */
function distanceToLoop(p: Point, points: Loop): number {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
    if (d < best) best = d;
  }
  return best;
}

/**
 * Desloca um contorno fechado por `distance` mm (positivo cresce) e devolve o
 * contorno resultante (ou `null` se ele colapsar).
 */
export function offsetLoop(
  points: Loop,
  distance: number,
  options: OffsetOptions = {},
): Point[] | null {
  const n = points.length;
  if (n < 3 || Math.abs(distance) < 1e-9) return null;
  const area = signedArea(points);
  if (Math.abs(area) < MIN_AREA) return null;
  const join = options.join ?? 'miter';
  const miterLimit = options.miterLimit ?? 3;
  const samples = Math.max(2, Math.round(options.arcSamples ?? 6));
  const sign = Math.sign(area) * Math.sign(distance);

  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const d1 = unit(prev, cur);
    const d2 = unit(cur, next);
    const cross = d1.x * d2.y - d1.y * d2.x;
    const n1 = normal(prev, cur, area);
    const n2 = normal(cur, next, area);
    const a = { x: cur.x + n1.x * distance, y: cur.y + n1.y * distance };
    const b = { x: cur.x + n2.x * distance, y: cur.y + n2.y * distance };

    if (Math.abs(cross) < 1e-9) {
      out.push(a); // trecho reto (ou quase): um ponto basta
      continue;
    }
    const mit = lineIntersect(a, d1, b, d2);
    // Quina "fechando" (convexa no offset negativo, côncava no positivo): o
    // próprio cruzamento das retas deslocadas é o novo vértice.
    if (!mit || cross * sign <= 0) {
      out.push(mit ?? a);
      continue;
    }
    // Quina abrindo: bico (limitado), chanfro ou arco.
    const miterLen = Math.hypot(mit.x - cur.x, mit.y - cur.y);
    if (join === 'round') {
      out.push(a);
      addArc(out, cur, a, b, samples);
      out.push(b);
    } else if (join === 'bevel' || miterLen > miterLimit * Math.abs(distance)) {
      out.push(a, b);
    } else {
      out.push(mit);
    }
  }

  const cleaned = dedupe(out);
  if (cleaned.length < 3) return null;
  const resultArea = signedArea(cleaned);
  if (Math.abs(resultArea) < MIN_AREA) return null;
  // Um offset não pode inverter o sentido do contorno (colapso degenerado).
  if (resultArea * area < 0) return null;
  // Encolhendo, cada vértice tem de continuar a `|distance|` da fronteira
  // original; abaixo disso as arestas opostas se cruzaram (o contorno virou um
  // "espelho" do esperado) e a passada é inválida.
  if (distance < 0) {
    for (const p of cleaned) {
      if (distanceToLoop(p, points) < Math.abs(distance) * 0.95) return null;
    }
  }
  return cleaned;
}

/** Arco (centrado em `center`) entre dois pontos, com `samples` por quadrante. */
function addArc(
  out: Point[],
  center: Point,
  from: Point,
  to: Point,
  samples: number,
): void {
  const ra = Math.atan2(from.y - center.y, from.x - center.x);
  const rb = Math.atan2(to.y - center.y, to.x - center.x);
  const r = Math.hypot(from.x - center.x, from.y - center.y);
  let sweep = rb - ra;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  while (sweep < -Math.PI) sweep += 2 * Math.PI;
  const steps = Math.max(
    1,
    Math.ceil((Math.abs(sweep) / (Math.PI / 2)) * samples),
  );
  for (let i = 1; i < steps; i++) {
    const a = ra + (sweep * i) / steps;
    out.push({ x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r });
  }
}

/** Remove pontos repetidos (e o último, se igual ao primeiro). */
function dedupe(points: ReadonlyArray<Point>): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.hypot(last.x - p.x, last.y - p.y) < 1e-9) continue;
    out.push(p);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && Math.hypot(first.x - last.x, first.y - last.y) < 1e-9) {
    out.pop();
  }
  return out;
}

/**
 * Gera `passes` contornos concêntricos, com `distance` mm de espaçamento
 * (o primeiro fica a `distance` do original). Passadas que colapsam param a
 * sequência. `distance` negativo encolhe.
 */
export function offsetPasses(
  points: Loop,
  distance: number,
  passes = 1,
  options: OffsetOptions = {},
): Point[][] {
  const out: Point[][] = [];
  if (Math.abs(distance) < 1e-9) return out;
  let current: Loop = points;
  const count = Math.max(1, Math.floor(passes));
  for (let i = 0; i < count; i++) {
    const next = offsetLoop(current, distance, options);
    if (!next) break;
    out.push(next);
    current = next;
  }
  return out;
}
