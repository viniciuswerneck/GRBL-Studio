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
 * A espessura do traço entra na conta — o que o usuário vê é a faixa de
 * `width` mm, não uma linha fina no meio dela.
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
  const band =
    typeof shape.width === 'number' && Number.isFinite(shape.width)
      ? Math.abs(shape.width) / 2
      : 0;
  const reach = Math.max(0, tol) + band;
  if (pts.length === 1) return Math.hypot(x - pts[0].x, y - pts[0].y) <= reach;
  for (let i = 1; i < pts.length; i++) {
    if (
      distanceToSegment(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <=
      reach
    ) {
      return true;
    }
  }
  if (shape.closed && pts.length >= 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (distanceToSegment(x, y, last.x, last.y, first.x, first.y) <= reach)
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
    // Grupo vazio/nulo = forma solta. Sem isso, todas as formas com `group: ''`
    // cairiam no mesmo balde e virariam um bloco único.
    if (g === undefined || g === null || g === '') {
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
    // Espelhar inverte o sentido do contorno (winding). Num contorno fechado
    // isso muda o que é "dentro" e "fora": `offsetLoop` decide crescer/encolher
    // pelo sinal da área (`signedArea`), então um furo espelhado passaria a
    // engordar como peça. Invertemos a ordem dos pontos para preservar a
    // orientação — em forma aberta o sentido só muda o lado do deslocamento,
    // que não é usado na geração (o traço usa os dois lados).
    const closed = Boolean(sh.closed) && points.length > 2;
    return { ...sh, points: closed ? points.slice().reverse() : points };
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

// --------------------------------------------------- caneta (freehand)

/**
 * Cria uma forma a partir de pontos de desenho livre.
 * Aplica simplificação RDP (`tolerance`) e remove pontos duplicados.
 * `kind` default = 'polygon' (fechado) se o traço voltar ao início;
 * caso contrário 'polygon' aberto (linha).
 */
export function createFreehandShape(
  rawPoints: ReadonlyArray<Point>,
  options: {
    tolerance?: number;
    closeThreshold?: number;
    kind?: 'polygon' | 'line';
  } = {},
): Shape | null {
  const tolerance = options.tolerance ?? 0.5;
  const closeThreshold = options.closeThreshold ?? 1.0;
  if (!rawPoints.length) return null;

  // Remove pontos consecutivos idênticos
  const cleaned: Point[] = [];
  for (const p of rawPoints) {
    const last = cleaned[cleaned.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-4) {
      cleaned.push({ ...p });
    }
  }
  if (cleaned.length < 2) return null;

  // Simplifica (RDP)
  const simple = simplifyPolyline(cleaned, tolerance);
  if (simple.length < 2) return null;

  // Detecta fechamento (último próximo do primeiro). Precisa de 4 pontos
  // simplificados: ao descartar o último (= primeiro) o laço tem de continuar
  // com 3+ pontos — um "fechado" de 2 pontos tem área zero e sumiria ao ganhar
  // espessura.
  const first = simple[0];
  const last = simple[simple.length - 1];
  const closed =
    simple.length >= 4 &&
    Math.hypot(last.x - first.x, last.y - first.y) <= closeThreshold;

  // Se fecha, garante que o último = primeiro (não duplicado no array)
  const points = closed ? simple.slice(0, -1) : simple;

  return {
    kind: options.kind ?? 'polygon',
    points,
    closed,
    name: closed ? 'Forma' : 'Linha',
  };
}

// --------------------------------------------------- edição de nós

/** Tipo de alvo de hit-test para edição de nós. */
export interface NodeHit {
  /** Índice do nó (0 = primeiro ponto). */
  nodeIndex: number;
  /** Se é o primeiro nó de um caminho fechado. */
  isFirst: boolean;
}

/** Tipo de alvo de segmento para inserção de nó. */
export interface SegmentHit {
  /** Índice do segmento (0 = entre ponto 0 e 1). */
  segmentIndex: number;
  /** Ponto mais próximo no segmento. */
  point: Point;
}

/**
 * Testa se (x, y) atinge algum nó da polilinha.
 * Retorna o NodeHit do nó mais próximo (dentro de `tol`), ou null.
 */
export function hitTestNode(
  points: ReadonlyArray<Point>,
  x: number,
  y: number,
  tol: number,
): NodeHit | null {
  let best: NodeHit | null = null;
  let bestDist = tol;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = { nodeIndex: i, isFirst: i === 0 };
    }
  }
  return best;
}

/**
 * Testa se (x, y) atinge algum segmento da polilinha.
 * Retorna o SegmentHit do segmento mais próximo (dentro de `tol`), ou null.
 */
export function hitTestSegment(
  points: ReadonlyArray<Point>,
  x: number,
  y: number,
  tol: number,
  closed: boolean,
): SegmentHit | null {
  const n = points.length;
  if (n < 2) return null;
  let best: SegmentHit | null = null;
  let bestDist = tol;
  for (let i = 1; i < n; i++) {
    const d = distanceToSegment(
      x,
      y,
      points[i - 1].x,
      points[i - 1].y,
      points[i].x,
      points[i].y,
    );
    if (d < bestDist) {
      bestDist = d;
      // Projeção no segmento
      const ax = points[i - 1].x;
      const ay = points[i - 1].y;
      const bx = points[i].x;
      const by = points[i].y;
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      const t =
        len2 === 0
          ? 0
          : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
      best = {
        segmentIndex: i - 1,
        point: { x: ax + t * dx, y: ay + t * dy },
      };
    }
  }
  // Segmento de fechamento (último → primeiro)
  if (closed && n >= 3) {
    const d = distanceToSegment(
      x,
      y,
      points[n - 1].x,
      points[n - 1].y,
      points[0].x,
      points[0].y,
    );
    if (d < bestDist) {
      bestDist = d;
      const ax = points[n - 1].x;
      const ay = points[n - 1].y;
      const bx = points[0].x;
      const by = points[0].y;
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      const t =
        len2 === 0
          ? 0
          : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
      best = {
        segmentIndex: n - 1,
        point: { x: ax + t * dx, y: ay + t * dy },
      };
    }
  }
  return best;
}

/**
 * Insere um nó no segmento `segmentIndex` (antes do ponto `segmentIndex + 1`).
 * `newPoint` é a posição do novo nó (geralmente a projeção no segmento).
 * Retorna novo array de pontos.
 */
export function insertNode(
  points: ReadonlyArray<Point>,
  segmentIndex: number,
  newPoint: Point,
): Point[] {
  const out = points.map((p) => ({ ...p }));
  // segmentIndex = 0 → antes do ponto 1; ou seja, insere no índice 1
  out.splice(segmentIndex + 1, 0, { ...newPoint });
  return out;
}

/**
 * Remove o nó em `nodeIndex`.
 * Se ficar com < 2 pontos (aberto) ou < 3 (fechado), retorna o array original inalterado.
 */
export function removeNode(
  points: ReadonlyArray<Point>,
  nodeIndex: number,
  closed: boolean,
): Point[] {
  const minPts = closed ? 3 : 2;
  if (points.length <= minPts) return points.map((p) => ({ ...p }));
  const out = points.map((p) => ({ ...p }));
  out.splice(nodeIndex, 1);
  return out;
}

/**
 * Move o nó em `nodeIndex` para `(x, y)`.
 */
export function moveNode(
  points: ReadonlyArray<Point>,
  nodeIndex: number,
  x: number,
  y: number,
): Point[] {
  if (nodeIndex < 0 || nodeIndex >= points.length)
    return points.map((p) => ({ ...p }));
  const out = points.map((p) => ({ ...p }));
  out[nodeIndex] = { x, y };
  return out;
}

/**
 * Divide uma polilinha aberta em duas no nó `nodeIndex` (0 < index < n-1).
 * Retorna [parteA, parteB] onde parteA termina no nó e parteB começa nele
 * (o nó aparece em ambas). Se não for divisível, retorna [original, null].
 */
export function splitPolyline(
  points: ReadonlyArray<Point>,
  nodeIndex: number,
): [Point[], Point[] | null] {
  const n = points.length;
  if (nodeIndex <= 0 || nodeIndex >= n - 1)
    return [points.map((p) => ({ ...p })), null];
  const a = points.slice(0, nodeIndex + 1).map((p) => ({ ...p }));
  const b = points.slice(nodeIndex).map((p) => ({ ...p }));
  return [a, b];
}

/**
 * Junta duas polilinhas abertas se a ponta de `a` coincidir com a ponta de `b`
 * (dentro de `tol`). Retorna a polilinha unida ou null.
 */
export function tryJoinPolylines(
  a: ReadonlyArray<Point>,
  b: ReadonlyArray<Point>,
  tol = 1e-4,
): Point[] | null {
  if (!a.length || !b.length) return null;
  const aEnd = a[a.length - 1];
  const bStart = b[0];
  if (Math.hypot(aEnd.x - bStart.x, aEnd.y - bStart.y) <= tol) {
    return [...a.map((p) => ({ ...p })), ...b.slice(1).map((p) => ({ ...p }))];
  }
  const aStart = a[0];
  const bEnd = b[b.length - 1];
  if (Math.hypot(aStart.x - bEnd.x, aStart.y - bEnd.y) <= tol) {
    return [...b.map((p) => ({ ...p })), ...a.slice(1).map((p) => ({ ...p }))];
  }
  return null;
}
