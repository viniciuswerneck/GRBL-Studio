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

// ------------------------------------------------- espessura do traço (banda)

/**
 * Espaçamento padrão entre as linhas paralelas de um traço grosso (mm):
 * aproximadamente o *kerf* de um laser de diodo — o mesmo passo que o
 * preenchimento por varredura usa.
 */
export const STROKE_STEP = 0.1;

/** Máximo de linhas paralelas por traço (evita G-code patológico). */
export const MAX_STROKE_LINES = 201;

/**
 * Distâncias das linhas paralelas que cobrem uma faixa de largura `width`
 * **centrada** no traço: `0, ±passo, ±2·passo … ±width/2`. Como um traço de
 * caneta — metade para cada lado. O passo nunca passa de `step` (as pontas
 * ficam exatamente em ±width/2) e a quantidade de linhas é limitada por
 * `maxLines`.
 */
export function strokeOffsets(
  width: number,
  step: number = STROKE_STEP,
  maxLines: number = MAX_STROKE_LINES,
): number[] {
  const half = Math.abs(width) / 2;
  if (!(half > 5e-4)) return [0];
  const cap = Math.max(1, Math.floor(Math.max(3, maxLines) / 2));
  const n = Math.max(1, Math.min(cap, Math.ceil(half / Math.max(1e-4, step))));
  const s = half / n;
  const out: number[] = [];
  for (let k = n; k >= 1; k--) out.push(-k * s);
  out.push(0);
  for (let k = 1; k <= n; k++) out.push(k * s);
  return out;
}

/**
 * Offset de uma polilinha **aberta** para um dos lados: `distance` > 0 desloca
 * para a esquerda do sentido do traço (as duas metades da faixa saem dos sinais
 * ±). Cantos agudos viram chanfro a partir de `miterLimit` (evita espigões).
 * Devolve `null` se a polilinha colapsar.
 */
export function offsetPolyline(
  points: ReadonlyArray<Point>,
  distance: number,
  options: Pick<OffsetOptions, 'miterLimit'> = {},
): Point[] | null {
  const src = dedupe(points);
  if (src.length < 2 || Math.abs(distance) < 1e-9) return null;
  const miterLimit = options.miterLimit ?? 3;
  const out: Point[] = [];
  const n = src.length;
  for (let i = 0; i < n; i++) {
    const cur = src[i];
    const first = i === 0;
    const last = i === n - 1;
    if (first || last) {
      // Ponta: desloca na normal do único segmento ligado ao vértice (sentido
      // do traço, para os dois lados usarem a mesma normal).
      const d = first ? unit(cur, src[1]) : unit(src[n - 2], cur);
      out.push({ x: cur.x + -d.y * distance, y: cur.y + d.x * distance });
      continue;
    }
    const d1 = unit(src[i - 1], cur);
    const d2 = unit(cur, src[i + 1]);
    const a = { x: cur.x + -d1.y * distance, y: cur.y + d1.x * distance };
    const b = { x: cur.x + -d2.y * distance, y: cur.y + d2.x * distance };
    const cross = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(cross) < 1e-9) {
      out.push(a);
      continue;
    }
    const mit = lineIntersect(a, d1, b, d2);
    // Curva fechando (o lado de dentro do arco): o cruzamento das retas
    // deslocadas é o próprio vértice; encolhe sem espigão.
    if (!mit || cross * distance < 0) {
      out.push(mit ?? a);
      continue;
    }
    const miterLen = Math.hypot(mit.x - cur.x, mit.y - cur.y);
    if (miterLen > miterLimit * Math.abs(distance)) out.push(a, b);
    else out.push(mit);
  }
  return out.length >= 2 ? out : null;
}

/**
 * Linhas que cobrem um traço de largura `width` mm **centrada** no caminho: o
 * próprio caminho mais as paralelas até ±width/2 (contornos fechados geram
 * anéis concêntricos; linhas abertas, paralelas de cada lado). Espessura menor
 * ou igual ao passo não muda nada (fica dentro do feixe): devolve o caminho
 * original.
 */
export function strokePaths(
  points: ReadonlyArray<Point>,
  closed: boolean,
  width: number,
  step: number = STROKE_STEP,
  options: OffsetOptions = {},
): Point[][] {
  const src = dedupe(points);
  if (src.length < (closed ? 3 : 2)) return [];
  if (!(width > step)) return [src];
  const out: Point[][] = [];
  for (const d of strokeOffsets(width, step)) {
    if (Math.abs(d) < 1e-9) {
      out.push(src);
      continue;
    }
    const ring = closed
      ? offsetLoop(src, d, options)
      : offsetPolyline(src, d, options);
    if (ring && ring.length >= (closed ? 3 : 2)) out.push(ring);
  }
  return out;
}
