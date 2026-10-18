/**
 * Operações puras do editor vetorial (ferramentas de desenho).
 *
 * Complementa `design.ts` (formas → G-code): aqui vivem a geometria de edição
 * — *bounds*, seleção por grupos, *hit-test*, ordenação (z-order) e
 * simplificação de polilinhas (RDP). Sem DOM e sem estado global, para ser
 * testável em Vitest e reutilizável pelo renderer via bundle
 * (`public/designEditor.js` → `window.GRBL_DESIGN_EDITOR`).
 */

import type { Point, Shape } from './design';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Ordem de empilhamento (z-order) de uma seleção. */
export type ReorderMode = 'front' | 'back' | 'forward' | 'backward';

/** Caixa envolvente de uma forma (ou `null` se não tiver pontos). */
export function shapeBounds(shape: Shape): Bounds | null {
  if (!shape.points.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of shape.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** União de várias caixas (ou `null` se a lista for vazia). */
export function unionBounds(list: ReadonlyArray<Bounds>): Bounds | null {
  let out: Bounds | null = null;
  for (const b of list) {
    if (!out) {
      out = { ...b };
      continue;
    }
    if (b.minX < out.minX) out.minX = b.minX;
    if (b.minY < out.minY) out.minY = b.minY;
    if (b.maxX > out.maxX) out.maxX = b.maxX;
    if (b.maxY > out.maxY) out.maxY = b.maxY;
  }
  return out;
}

/** Caixa envolvente de um conjunto de formas selecionadas. */
export function selectionBounds(
  shapes: ReadonlyArray<Shape>,
  indices: ReadonlyArray<number>,
): Bounds | null {
  const list: Bounds[] = [];
  for (const i of indices) {
    const sh = shapes[i];
    if (!sh) continue;
    const b = shapeBounds(sh);
    if (b) list.push(b);
  }
  return unionBounds(list);
}

/** `true` se as duas caixas se sobrepõem. */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  );
}

/** Distância (euclidiana) do ponto ao segmento AB. */
export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** `true` se o ponto está dentro do polígono (regra par-ímpar). */
export function pointInPolygon(
  points: ReadonlyArray<Point>,
  x: number,
  y: number,
): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * `true` se (x, y) atinge a forma, dentro da tolerância `tol` (unidades do
 * mundo): interior (formas fechadas) **ou** proximidade de qualquer aresta.
 */
export function shapeHit(
  shape: Shape,
  x: number,
  y: number,
  tol: number,
): boolean {
  const pts = shape.points;
  if (pts.length === 0) return false;
  if (shape.closed && pts.length >= 3 && pointInPolygon(pts, x, y)) return true;
  if (pts.length === 1) return Math.hypot(x - pts[0].x, y - pts[0].y) <= tol;
  for (let i = 1; i < pts.length; i++) {
    if (
      distanceToSegment(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <=
      tol
    ) {
      return true;
    }
  }
  if (shape.closed && pts.length >= 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (distanceToSegment(x, y, last.x, last.y, first.x, first.y) <= tol)
      return true;
  }
  return false;
}

/** Índice da forma mais ao topo atingida por (x, y), ou -1. */
export function hitTest(
  shapes: ReadonlyArray<Shape>,
  x: number,
  y: number,
  tol = 0,
): number {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (shapeHit(shapes[i], x, y, tol)) return i;
  }
  return -1;
}

/** Índices da forma e de todo o seu grupo (se houver). */
export function expandSelection(
  shapes: ReadonlyArray<Shape>,
  index: number,
): number[] {
  const sh = shapes[index];
  if (!sh) return [];
  const g = sh.group;
  if (g === undefined || g === null) return [index];
  const out: number[] = [];
  for (let i = 0; i < shapes.length; i++) {
    if (shapes[i].group === g) out.push(i);
  }
  return out.length ? out : [index];
}

/**
 * Agrupa as formas em "entidades": cada forma sem `group` é uma entidade;
 * formas com o mesmo `group` formam uma única entidade. A ordem de cada
 * entidade é a da primeira forma que aparece.
 */
export function entityIndices(shapes: ReadonlyArray<Shape>): number[][] {
  const byGroup = new Map<string, number[]>();
  const entities: number[][] = [];
  for (let i = 0; i < shapes.length; i++) {
    const g = shapes[i].group;
    if (g === undefined || g === null) {
      entities.push([i]);
      continue;
    }
    const existing = byGroup.get(g);
    if (existing) {
      existing.push(i);
    } else {
      const list = [i];
      byGroup.set(g, list);
      entities.push(list);
    }
  }
  return entities;
}

/**
 * Reordena as entidades selecionadas na pilha (z-order), preservando a ordem
 * relativa. Retorna um **novo** array de formas (as formas são as mesmas).
 */
export function reorderEntities(
  shapes: ReadonlyArray<Shape>,
  selected: ReadonlySet<number>,
  mode: ReorderMode,
): Shape[] {
  const entities = entityIndices(shapes);
  const isSel = entities.map((e) => e.some((i) => selected.has(i)));
  let order = entities.map((_, i) => i);

  if (mode === 'front' || mode === 'back') {
    const sel = order.filter((i) => isSel[i]);
    const rest = order.filter((i) => !isSel[i]);
    order = mode === 'front' ? [...rest, ...sel] : [...sel, ...rest];
  } else if (mode === 'forward') {
    for (let i = order.length - 2; i >= 0; i--) {
      if (isSel[order[i]] && !isSel[order[i + 1]]) {
        [order[i], order[i + 1]] = [order[i + 1], order[i]];
      }
    }
  } else {
    for (let i = 1; i < order.length; i++) {
      if (isSel[order[i]] && !isSel[order[i - 1]]) {
        [order[i], order[i - 1]] = [order[i - 1], order[i]];
      }
    }
  }

  const out: Shape[] = [];
  for (const ei of order) {
    for (const idx of entities[ei]) out.push(shapes[idx]);
  }
  return out;
}

/**
 * Eixo de espelhamento/distribuição: `h` = horizontal (espelha/aplica em X),
 * `v` = vertical (Y).
 */
export type Axis = 'h' | 'v';

/** Entidades atingidas pela seleção (uma entidade entra se alguma forma dela foi selecionada). */
export function selectedEntities(
  shapes: ReadonlyArray<Shape>,
  selected: ReadonlySet<number>,
): number[][] {
  return entityIndices(shapes).filter((entity) =>
    entity.some((i) => selected.has(i)),
  );
}

/** Caixa envolvente de uma entidade (índices de formas). */
export function entityBounds(
  shapes: ReadonlyArray<Shape>,
  entity: ReadonlyArray<number>,
): Bounds | null {
  const list: Bounds[] = [];
  for (const i of entity) {
    const sh = shapes[i];
    if (!sh) continue;
    const b = shapeBounds(sh);
    if (b) list.push(b);
  }
  return unionBounds(list);
}

/**
 * Espelha as entidades selecionadas em torno do centro da seleção. Retorna um
 * **novo** array de formas; as não selecionadas são reaproveitadas.
 */
export function mirrorEntities(
  shapes: ReadonlyArray<Shape>,
  selected: ReadonlySet<number>,
  axis: Axis,
): Shape[] {
  const ents = selectedEntities(shapes, selected);
  const list: Bounds[] = [];
  for (const entity of ents) {
    const b = entityBounds(shapes, entity);
    if (b) list.push(b);
  }
  const bounds = unionBounds(list);
  if (!bounds) return shapes.slice();
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const flip = new Set<number>();
  for (const entity of ents) for (const i of entity) flip.add(i);
  return shapes.map((sh, i) => {
    if (!flip.has(i)) return sh;
    const points =
      axis === 'h'
        ? sh.points.map((p) => ({ x: 2 * cx - p.x, y: p.y }))
        : sh.points.map((p) => ({ x: p.x, y: 2 * cy - p.y }));
    return { ...sh, points };
  });
}

/**
 * Distribui as entidades selecionadas com folga igual entre as caixas
 * envolventes (o primeiro e o último ficam onde estão). Precisa de 3+ entidades.
 */
export function distributeEntities(
  shapes: ReadonlyArray<Shape>,
  selected: ReadonlySet<number>,
  axis: Axis,
): Shape[] {
  const items: Array<{ entity: number[]; bounds: Bounds }> = [];
  for (const entity of selectedEntities(shapes, selected)) {
    const bounds = entityBounds(shapes, entity);
    if (bounds) items.push({ entity, bounds });
  }
  const lo = (b: Bounds) => (axis === 'h' ? b.minX : b.minY);
  const hi = (b: Bounds) => (axis === 'h' ? b.maxX : b.maxY);
  items.sort((a, b) => lo(a.bounds) - lo(b.bounds));
  if (items.length < 3) return shapes.slice();

  let used = 0;
  for (const it of items) used += hi(it.bounds) - lo(it.bounds);
  const span = hi(items[items.length - 1].bounds) - lo(items[0].bounds);
  const gap = (span - used) / (items.length - 1);

  const shift = new Map<number, number>();
  let cursor = lo(items[0].bounds);
  for (const it of items) {
    const size = hi(it.bounds) - lo(it.bounds);
    const delta = cursor - lo(it.bounds);
    for (const i of it.entity) shift.set(i, delta);
    cursor += size + gap;
  }

  return shapes.map((sh, i) => {
    const delta = shift.get(i);
    if (!delta) return sh;
    const points =
      axis === 'h'
        ? sh.points.map((p) => ({ x: p.x + delta, y: p.y }))
        : sh.points.map((p) => ({ x: p.x, y: p.y + delta }));
    return { ...sh, points };
  });
}

/**
 * Matriz de cópias (`cols` × `rows`) das entidades selecionadas, com passo em
 * mm. As cópias de uma entidade agrupada recebem um grupo novo (`nextGroup`),
 * para poderem ser selecionadas/movidas de forma independente. A posição
 * (0, 0) é o original, que não é copiado.
 */
export function arrayEntities(
  shapes: ReadonlyArray<Shape>,
  selected: ReadonlySet<number>,
  cols: number,
  rows: number,
  stepX: number,
  stepY: number,
  nextGroup: () => string,
): Shape[] {
  const ents = selectedEntities(shapes, selected);
  if (!ents.length) return [];
  const c = Math.max(1, Math.floor(cols));
  const r = Math.max(1, Math.floor(rows));
  if (c * r <= 1) return [];
  const out: Shape[] = [];
  for (let gy = 0; gy < r; gy++) {
    for (let gx = 0; gx < c; gx++) {
      if (gx === 0 && gy === 0) continue;
      const dx = gx * stepX;
      const dy = gy * stepY;
      for (const entity of ents) {
        let grouped = false;
        for (const i of entity) {
          if (shapes[i] && shapes[i].group != null) grouped = true;
        }
        const group = grouped ? nextGroup() : undefined;
        for (const i of entity) {
          const src = shapes[i];
          if (!src) continue;
          const clone: Shape = {
            ...src,
            points: src.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          };
          if (group) clone.group = group;
          out.push(clone);
        }
      }
    }
  }
  return out;
}

/** Rota `p` em torno de (cx, cy) por `angle` radianos (y-down). */
export function rotatePoint(
  p: Point,
  cx: number,
  cy: number,
  angle: number,
): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/**
 * Simplifica uma polilinha pelo algoritmo Ramer–Douglas–Peucker.
 * `tolerance` em unidades dos pontos; retorna os pontos mantidos.
 */
export function simplifyPolyline(
  points: ReadonlyArray<Point>,
  tolerance: number,
): Point[] {
  const n = points.length;
  if (n <= 2 || tolerance <= 0) return points.map((p) => ({ ...p }));

  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length) {
    const [start, end] = stack.pop() as [number, number];
    let maxDist = 0;
    let idx = -1;
    const a = points[start];
    const b = points[end];
    for (let i = start + 1; i < end; i++) {
      const d = distanceToSegment(points[i].x, points[i].y, a.x, a.y, b.x, b.y);
      if (d > maxDist) {
        maxDist = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxDist > tolerance) {
      keep[idx] = 1;
      stack.push([start, idx], [idx, end]);
    }
  }

  const out: Point[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push({ ...points[i] });
  return out;
}
