/**
 * **Biblioteca de símbolos** — RF-DSN-27.
 *
 * Catálogo **offline** de formas prontas para arrastar à prancheta: estrelas,
 * coração, raio, setas, lua/sol, moldura, cantos, check, cruz, divisória…
 *
 * Cada item é um conjunto de **polilinhas** desenhadas num espaço livre (Y
 * para cima) e o `libraryShapes` encaixa a caixa da forma no tamanho pedido,
 * centrada no ponto de inserção — o mesmo `sizeMm` vale para a **maior**
 * dimensão, então nada sai esticado. As formas entram como `kind: 'line'`,
 * exatamente como se fossem desenhadas à mão (camada, potência, kerf e
 * agrupamento funcionam igual).
 *
 * Puro e testável: sem DOM, sem IPC.
 */
import type { Point, Shape } from './design';

/** Categoria só para agrupar no diálogo (não muda a geometria). */
export type LibraryCategory = 'basic' | 'nature' | 'deco';

export interface LibraryPath {
  points: Point[];
  closed?: boolean;
}

export interface LibraryItem {
  id: string;
  /** Chave i18n do nome (pt-BR é a fonte da verdade). */
  nameKey: string;
  category: LibraryCategory;
  paths: LibraryPath[];
}

/** Tamanho aceito (mm) — o mesmo intervalo dos geradores. */
export const LIBRARY_MIN_MM = 5;
export const LIBRARY_MAX_MM = 400;
export const LIBRARY_DEFAULT_MM = 40;

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Polígono regular de `n` lados, raio 0,5, primeiro vértice em `rot`. */
function polygon(n: number, rot = 0): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    pts.push({ x: 0.5 + Math.cos(a) * 0.5, y: 0.5 + Math.sin(a) * 0.5 });
  }
  return pts;
}

/** Estrela de `n` pontas (raio externo 0,5, interno `inner` × 0,5). */
function star(n: number, inner: number, rot = Math.PI / 2): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * TAU;
    const r = i % 2 === 0 ? 0.5 : inner * 0.5;
    pts.push({ x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r });
  }
  return pts;
}

/** Arco de circunferência (radianos, Y para cima). */
function arc(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  steps = 24,
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function circle(cx: number, cy: number, r: number, steps = 40): Point[] {
  return arc(cx, cy, r, 0, TAU, steps);
}

function rect(x0: number, y0: number, x1: number, y1: number): Point[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

/** Coração paramétrico (16 sen³ t, …) — suave e fechado. */
function heart(steps = 72): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * TAU;
    const x = 16 * Math.sin(t) ** 3;
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    pts.push({ x, y });
  }
  return pts;
}

/** Lua crescente: metade externa + arco interno que fecha nas pontas. */
function moon(): Point[] {
  const outer = arc(0.5, 0.5, 0.5, -Math.PI / 2, Math.PI / 2, 28);
  const r = Math.hypot(0.22, 0.5);
  const a = Math.atan2(0.5, 0.22);
  const inner = arc(0.28, 0.5, r, a, -a, 28);
  return [...outer, ...inner];
}

/** Raio (lightning) — polígono fechado. */
function bolt(): Point[] {
  return [
    { x: 0.62, y: 1 },
    { x: 0.18, y: 0.5 },
    { x: 0.45, y: 0.5 },
    { x: 0.38, y: 0 },
    { x: 0.82, y: 0.52 },
    { x: 0.55, y: 0.52 },
  ];
}

/** Seta para a direita. */
function arrow(): Point[] {
  return [
    { x: 0, y: 0.35 },
    { x: 0.58, y: 0.35 },
    { x: 0.58, y: 0.12 },
    { x: 1, y: 0.5 },
    { x: 0.58, y: 0.88 },
    { x: 0.58, y: 0.65 },
    { x: 0, y: 0.65 },
  ];
}

const ITEMS: LibraryItem[] = [
  {
    id: 'star5',
    nameKey: 'design.lib.star5',
    category: 'basic',
    paths: [{ points: star(5, 0.382), closed: true }],
  },
  {
    id: 'star6',
    nameKey: 'design.lib.star6',
    category: 'basic',
    paths: [{ points: star(6, 0.55), closed: true }],
  },
  {
    id: 'hexagon',
    nameKey: 'design.lib.hexagon',
    category: 'basic',
    paths: [{ points: polygon(6, Math.PI / 6), closed: true }],
  },
  {
    id: 'heart',
    nameKey: 'design.lib.heart',
    category: 'basic',
    paths: [{ points: heart(), closed: true }],
  },
  {
    id: 'bolt',
    nameKey: 'design.lib.bolt',
    category: 'basic',
    paths: [{ points: bolt(), closed: true }],
  },
  {
    id: 'arrow',
    nameKey: 'design.lib.arrow',
    category: 'basic',
    paths: [{ points: arrow(), closed: true }],
  },
  {
    id: 'moon',
    nameKey: 'design.lib.moon',
    category: 'nature',
    paths: [{ points: moon(), closed: true }],
  },
  {
    id: 'sun',
    nameKey: 'design.lib.sun',
    category: 'nature',
    paths: [
      { points: circle(0.5, 0.5, 0.22), closed: true },
      ...Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * TAU;
        return {
          points: [
            { x: 0.5 + Math.cos(a) * 0.32, y: 0.5 + Math.sin(a) * 0.32 },
            { x: 0.5 + Math.cos(a) * 0.48, y: 0.5 + Math.sin(a) * 0.48 },
          ],
          closed: false,
        };
      }),
    ],
  },
  {
    id: 'frame',
    nameKey: 'design.lib.frame',
    category: 'deco',
    paths: [
      { points: rect(0, 0, 1, 1), closed: true },
      { points: rect(0.08, 0.08, 0.92, 0.92), closed: true },
    ],
  },
  {
    id: 'corners',
    nameKey: 'design.lib.corners',
    category: 'deco',
    paths: [
      {
        points: [
          { x: 0, y: 0.2 },
          { x: 0, y: 0 },
          { x: 0.2, y: 0 },
        ],
      },
      {
        points: [
          { x: 0.8, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 0.2 },
        ],
      },
      {
        points: [
          { x: 1, y: 0.8 },
          { x: 1, y: 1 },
          { x: 0.8, y: 1 },
        ],
      },
      {
        points: [
          { x: 0.2, y: 1 },
          { x: 0, y: 1 },
          { x: 0, y: 0.8 },
        ],
      },
    ],
  },
  {
    id: 'check',
    nameKey: 'design.lib.check',
    category: 'deco',
    paths: [
      {
        points: [
          { x: 0.12, y: 0.55 },
          { x: 0.4, y: 0.22 },
          { x: 0.9, y: 0.82 },
        ],
      },
    ],
  },
  {
    id: 'cross',
    nameKey: 'design.lib.cross',
    category: 'deco',
    paths: [
      {
        points: [
          { x: 0.35, y: 0 },
          { x: 0.65, y: 0 },
          { x: 0.65, y: 0.35 },
          { x: 1, y: 0.35 },
          { x: 1, y: 0.65 },
          { x: 0.65, y: 0.65 },
          { x: 0.65, y: 1 },
          { x: 0.35, y: 1 },
          { x: 0.35, y: 0.65 },
          { x: 0, y: 0.65 },
          { x: 0, y: 0.35 },
          { x: 0.35, y: 0.35 },
        ],
        closed: true,
      },
    ],
  },
  {
    id: 'xmark',
    nameKey: 'design.lib.xmark',
    category: 'deco',
    paths: [
      {
        points: [
          { x: 0.12, y: 0.12 },
          { x: 0.88, y: 0.88 },
        ],
      },
      {
        points: [
          { x: 0.88, y: 0.12 },
          { x: 0.12, y: 0.88 },
        ],
      },
    ],
  },
  {
    id: 'divider',
    nameKey: 'design.lib.divider',
    category: 'deco',
    paths: [
      {
        points: [
          { x: 0, y: 0.5 },
          { x: 0.42, y: 0.5 },
        ],
      },
      {
        points: [
          { x: 0.58, y: 0.5 },
          { x: 1, y: 0.5 },
        ],
      },
      {
        points: [
          { x: 0.5, y: 0.38 },
          { x: 0.58, y: 0.5 },
          { x: 0.5, y: 0.62 },
          { x: 0.42, y: 0.5 },
        ],
        closed: true,
      },
    ],
  },
];

/** Catálogo na ordem de exibição. */
export const SHAPE_LIBRARY: readonly LibraryItem[] = ITEMS;

export function libraryItem(id: unknown): LibraryItem | null {
  if (typeof id !== 'string') return null;
  return ITEMS.find((item) => item.id === id) ?? null;
}

export function sanitizeLibrarySize(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return LIBRARY_DEFAULT_MM;
  return Math.round(clamp(n, LIBRARY_MIN_MM, LIBRARY_MAX_MM) * 10) / 10;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function itemBounds(item: LibraryItem): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of item.paths) {
    for (const p of path.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

/**
 * Formas do item no tamanho pedido, **centradas** em `(cx, cy)` (mm, Y para
 * baixo como no editor). O `sizeMm` é a maior dimensão da caixa da forma.
 */
export function libraryShapes(
  item: LibraryItem | null | undefined,
  sizeMm: number,
  cx = 0,
  cy = 0,
): Shape[] {
  if (!item) return [];
  const box = itemBounds(item);
  if (!box) return [];
  const size = sanitizeLibrarySize(sizeMm);
  const w = Math.max(box.maxX - box.minX, 1e-9);
  const h = Math.max(box.maxY - box.minY, 1e-9);
  const scale = size / Math.max(w, h);
  const mx = (box.minX + box.maxX) / 2;
  const my = (box.minY + box.maxY) / 2;
  const ox = Number.isFinite(cx) ? cx : 0;
  const oy = Number.isFinite(cy) ? cy : 0;
  return item.paths.map((path) => ({
    kind: 'line',
    closed: Boolean(path.closed),
    points: path.points.map((p) => ({
      x: ox + (p.x - mx) * scale,
      y: oy - (p.y - my) * scale,
    })),
  }));
}
