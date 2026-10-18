/**
 * Operações booleanas de contornos fechados — módulo puro.
 *
 * Regra geral: a fronteira do resultado são os trechos de aresta em que a
 * **cobertura** (o predicado da operação) muda de lado. Cada aresta é partida
 * nas intersecções com as demais e testada com dois pontos próximos (de cada
 * lado); trechos em que a cobertura é a mesma são descartados e o restante é
 * encadeado em contornos. Isso resolve contenção e buracos sem casos especiais
 * e vale para qualquer operação (união, intersecção, subtração e exclusão).
 *
 * Sem DOM e sem estado global: testável em Vitest e reutilizável pelo renderer
 * via bundle (`public/boolean.js` → `window.GRBL_BOOLEAN`).
 */

import type { Point } from './design';
import { pointInPolygon } from './designEditor';

export type BooleanOp = 'union' | 'intersection' | 'difference' | 'xor';

/** Contorno fechado (o último ponto não se repete). */
export type Loop = ReadonlyArray<Point>;

/** Objeto do desenho: um ou mais contornos (furos entram por paridade). */
export type ObjectLoops = ReadonlyArray<Loop>;

/** Passo das amostras (mm) usadas para testar a cobertura de cada lado. */
const EPS = 1e-6;
/** Casas decimais para casar extremidades de arestas (0,1 µm). */
const ROUND = 1e4;
/** Área mínima de um contorno do resultado (mm²). */
const MIN_AREA = 1e-9;

export interface Segment {
  a: Point;
  b: Point;
}

interface Edge extends Segment {
  /** Normal externa unitária (para um contorno de área positiva). */
  n: Point;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Área assinada (shoelace). O sinal indica a orientação do contorno. */
export function signedArea(points: Loop): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    sum += p.x * q.y - q.x * p.y;
  }
  return sum / 2;
}

/** Caixa envolvente de um contorno. */
export function loopBounds(points: Loop): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  );
}

/** Normal externa unitária da aresta (a→b) de um contorno de área `area`. */
function outwardNormal(a: Point, b: Point, area: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const s = area >= 0 ? 1 : -1;
  return { x: (dy / len) * s, y: (-dx / len) * s };
}

/** Arestas de um contorno, com a normal externa de cada uma. */
export function edgesOf(points: Loop): Edge[] {
  const area = signedArea(points);
  const out: Edge[] = [];
  if (points.length < 3) return out;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (Math.hypot(b.x - a.x, b.y - a.y) < 1e-9) continue;
    out.push({ a, b, n: outwardNormal(a, b, area) });
  }
  return out;
}

/** Ponto sobre o segmento ab em `t` (0..1). */
function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Parâmetros (t, u) da intersecção própria de p1p2 com p3p4, ou `null`. */
export function intersectParams(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
): { t: number; u: number } | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-12) return null; // paralelos (ou coincidentes)
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / den;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / den;
  if (t < -1e-12 || t > 1 + 1e-12 || u < -1e-12 || u > 1 + 1e-12) return null;
  return { t, u };
}

/**
 * Parte as arestas de `edges` nas intersecções com `others` (que pode incluir
 * as próprias arestas — segmentos coincidentes são ignorados).
 */
export function splitEdges(
  edges: ReadonlyArray<Edge>,
  others: ReadonlyArray<Edge>,
): Edge[] {
  const out: Edge[] = [];
  for (const e of edges) {
    const ts: number[] = [0, 1];
    for (const o of others) {
      const hit = intersectParams(e.a, e.b, o.a, o.b);
      if (hit) ts.push(hit.t);
    }
    ts.sort((x, y) => x - y);
    let prev = 0;
    for (const t of ts) {
      if (t - prev > 1e-9) {
        out.push({ a: lerp(e.a, e.b, prev), b: lerp(e.a, e.b, t), n: e.n });
      }
      if (t > prev) prev = t;
    }
  }
  return out;
}

/** `true` se `p` está na região de um objeto (paridade de seus contornos). */
export function pointInObject(obj: ObjectLoops, p: Point): boolean {
  let count = 0;
  for (const loop of obj) if (pointInPolygon(loop, p.x, p.y)) count++;
  return count % 2 === 1;
}

/** `true` se `p` está na região do resultado da operação. */
export function coveredObjects(
  objs: ReadonlyArray<ObjectLoops>,
  p: Point,
  op: BooleanOp,
): boolean {
  if (!objs.length) return false;
  const inside = objs.map((obj) => pointInObject(obj, p));
  if (op === 'union') return inside.some(Boolean);
  if (op === 'intersection') return inside.every(Boolean);
  if (op === 'xor') return inside.filter(Boolean).length % 2 === 1;
  // Subtração: o primeiro objeto menos a união dos demais.
  return inside[0] === true && !inside.slice(1).some(Boolean);
}

/** `true` se `p` está na região do resultado (um contorno por objeto). */
export function covered(
  polys: ReadonlyArray<Loop>,
  p: Point,
  op: BooleanOp,
): boolean {
  return coveredObjects(
    polys.map((poly) => [poly]),
    p,
    op,
  );
}

/** Arestas do resultado, já orientadas (região coberta do lado interno). */
function keepEdges(
  objects: ReadonlyArray<ObjectLoops>,
  op: BooleanOp,
): Segment[] {
  const all = objects.map((obj) => obj.flatMap((loop) => edgesOf(loop)));
  const bounds = objects.map((obj) => loopBounds(obj.flat()));
  const kept: Segment[] = [];
  for (let i = 0; i < all.length; i++) {
    // Só as arestas de contornos que se tocam podem cortar as arestas de `i`
    // (rejeição rápida por caixa: evita O(n²) de testes de segmento à toa).
    const others: Edge[] = [];
    for (let j = 0; j < all.length; j++) {
      if (j === i || boundsOverlap(bounds[i], bounds[j]))
        others.push(...all[j]);
    }
    for (const raw of splitEdges(all[i], others)) {
      const mid = { x: (raw.a.x + raw.b.x) / 2, y: (raw.a.y + raw.b.y) / 2 };
      const inside = {
        x: mid.x - raw.n.x * EPS,
        y: mid.y - raw.n.y * EPS,
      };
      const outside = {
        x: mid.x + raw.n.x * EPS,
        y: mid.y + raw.n.y * EPS,
      };
      const ci = coveredObjects(objects, inside, op);
      const co = coveredObjects(objects, outside, op);
      if (ci === co) continue;
      kept.push(ci ? { a: raw.a, b: raw.b } : { a: raw.b, b: raw.a });
    }
  }
  return kept;
}

function key(p: Point): string {
  return `${Math.round(p.x * ROUND)},${Math.round(p.y * ROUND)}`;
}

/**
 * Remove arestas coincidentes: pares em sentidos opostos se cancelam (fronteira
 * interna ao resultado) e repetições no mesmo sentido viram uma só (contornos
 * coincidentes, como dois objetos idênticos numa união).
 */
export function dedupeSegments(segs: ReadonlyArray<Segment>): Segment[] {
  const groups = new Map<string, { seg: Segment; forward: boolean }[]>();
  for (const seg of segs) {
    const ka = key(seg.a);
    const kb = key(seg.b);
    const forward = ka <= kb;
    const id = forward ? `${ka}|${kb}` : `${kb}|${ka}`;
    const list = groups.get(id);
    if (list) list.push({ seg, forward });
    else groups.set(id, [{ seg, forward }]);
  }
  const out: Segment[] = [];
  for (const list of groups.values()) {
    let net = 0;
    for (const item of list) net += item.forward ? 1 : -1;
    if (net === 0) continue;
    // `item.forward` já é a própria ordem (a→b) do segmento em relação à chave
    // canônica: basta emitir o primeiro que tenha esse sentido, sem inverter.
    const pick = list.find((item) => item.forward === net > 0);
    if (!pick) continue;
    out.push({ a: pick.seg.a, b: pick.seg.b });
  }
  return out;
}

/**
 * Encadeia segmentos em contornos fechados. Em cada nó segue a aresta mais
 * alinhada com a chegada (evita "pular" para outra região em casos de toque);
 * trechos sem continuação (arestas soltas) são descartados.
 */
export function buildLoops(segs: ReadonlyArray<Segment>): Point[][] {
  const used = new Array<boolean>(segs.length).fill(false);
  const byStart = new Map<string, number[]>();
  segs.forEach((s, i) => {
    const k = key(s.a);
    const list = byStart.get(k);
    if (list) list.push(i);
    else byStart.set(k, [i]);
  });
  const loops: Point[][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    const start = segs[i].a;
    const pts: Point[] = [start];
    let cur = i;
    let guard = 0;
    while (guard++ <= segs.length) {
      used[cur] = true;
      const end = segs[cur].b;
      if (key(end) === key(start)) {
        if (pts.length >= 3) loops.push(pts);
        break;
      }
      pts.push(end);
      const din = segs[cur];
      const cands = (byStart.get(key(end)) || []).filter((j) => !used[j]);
      if (!cands.length) break; // aresta solta: descarta o trecho
      let best = cands[0];
      let bestDot = -Infinity;
      for (const j of cands) {
        const d1 = { x: din.b.x - din.a.x, y: din.b.y - din.a.y };
        const d2 = {
          x: segs[j].b.x - segs[j].a.x,
          y: segs[j].b.y - segs[j].a.y,
        };
        const l1 = Math.hypot(d1.x, d1.y) || 1;
        const l2 = Math.hypot(d2.x, d2.y) || 1;
        const dot = (d1.x * d2.x + d1.y * d2.y) / (l1 * l2);
        if (dot > bestDot) {
          bestDot = dot;
          best = j;
        }
      }
      cur = best;
    }
  }
  return loops.filter((l) => Math.abs(signedArea(l)) > MIN_AREA);
}

/**
 * Aplica a operação booleana a objetos (cada objeto é um ou mais contornos —
 * um texto, por exemplo, tem um contorno por letra e furo) e devolve os
 * contornos do resultado.
 */
export function booleanObjects(
  objects: ReadonlyArray<ObjectLoops>,
  op: BooleanOp,
): Point[][] {
  const list = objects.filter((obj) => obj.some((loop) => loop.length >= 3));
  if (!list.length) return [];
  if ((op === 'difference' || op === 'intersection') && list.length < 2) {
    return [];
  }
  return buildLoops(dedupeSegments(keepEdges(list, op)));
}

/**
 * Aplica a operação booleana a um conjunto de contornos fechados (um objeto por
 * contorno) e devolve os contornos do resultado.
 */
export function booleanLoops(
  polys: ReadonlyArray<Loop>,
  op: BooleanOp,
): Point[][] {
  const list = polys.filter((p) => p.length >= 3);
  if (!list.length) return [];
  if ((op === 'difference' || op === 'intersection') && list.length < 2) {
    return [];
  }
  return buildLoops(
    dedupeSegments(
      keepEdges(
        list.map((poly) => [poly]),
        op,
      ),
    ),
  );
}

/**
 * Agrupa contornos aninhados: cada contorno é uma entidade, mas os que estão
 * **dentro** de outro (buracos, ilhas de um furo) acompanham o contorno que os
 * contém — o resultado é a lista de grupos, cada um com os índices dos
 * contornos (o primeiro é o mais externo do grupo).
 */
export function groupNestedLoops(loops: ReadonlyArray<Loop>): number[][] {
  const areas = loops.map((l) => Math.abs(signedArea(l)));
  const parent = loops.map(() => -1);
  for (let i = 0; i < loops.length; i++) {
    const inner = loops[i][0];
    let bestArea = Infinity;
    for (let j = 0; j < loops.length; j++) {
      if (i === j) continue;
      if (areas[j] <= areas[i]) continue;
      if (!pointInPolygon(loops[j], inner.x, inner.y)) continue;
      if (areas[j] < bestArea) {
        bestArea = areas[j];
        parent[i] = j;
      }
    }
  }
  const groups: number[][] = [];
  for (let i = 0; i < loops.length; i++) {
    // só os contornos mais externos abrem um grupo
    if (parent[i] !== -1) continue;
    const members = [i];
    for (let j = 0; j < loops.length; j++) {
      let p = parent[j];
      while (p !== -1) {
        if (p === i) {
          members.push(j);
          break;
        }
        p = parent[p];
      }
    }
    groups.push(members);
  }
  return groups;
}
