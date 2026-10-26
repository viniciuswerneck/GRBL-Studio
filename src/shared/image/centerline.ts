/**
 * **Centerline** (RF-IMG-16): imagem -> **linha única** (esqueleto) -> G-code.
 *
 * Diferente do modo `vector` (RF-IMG-6), que percorre a **borda** da forma e
 * serve para recorte, o centerline reduz cada traço à sua **medial axis**: um
 * logo com letras grossas vira um desenho de uma passada só, que se grava com
 * o laser no centro do traço — mais rápido, mais fino e sem contorno duplo.
 *
 * Pipeline:
 *  1. cinza (ajustes) -> máscara binária (preto = matéria);
 *  2. **redução limitada** (`maxDim`): esqueletizar em resolução de trabalho
 *     (a imagem inteira pode ter milhões de pixels; o esqueleto não precisa
 *     deles). Bloco escuro -> célula de matéria, então traços finos sobrevivem;
 *  3. **afinamento de Zhang–Suen** com lista de borda (só os pixels de borda
 *     são reavaliados — sólidos grandes não custam O(iterações × área));
 *  4. traçado dos pixels do esqueleto em **polilinhas** (nós = pontas e
 *     junções; ciclos fechados quando não há nó), poda de **esporões** curtos e
 *     RDP para tirar o degrau de 1 px;
 *  5. emissão com os mesmos invariantes do resto do pipeline (AGENTS.md):
 *     `M5` antes de todo `G0`, `S` em [s-min, s-max], `F` só em `G1`,
 *     no máximo 3 decimais e nada fora da área de trabalho.
 *
 * Puro e testável: sem DOM, sem disco, sem IPC.
 */

import { applyAdjust, toGrayscale } from './adjust';
import { assertWorkArea, formatCoord as f } from './format';
import { computeScanGeometry, sampleGrid } from './raster';
import type { PixelPoint } from './contour';
import type { GcodeResult, GcodeStats, ImageToGcodeOptions } from './types';

/** Resolução máxima (maior lado) usada para esqueletizar. */
export const DEFAULT_CENTERLINE_MAX_DIM = 900;
/** Poda de esporão padrão, em pixels da malha de trabalho. */
export const DEFAULT_MIN_BRANCH_PX = 4;
/** RDP padrão do centerline (1 px de esqueleto = degrau). */
export const DEFAULT_CENTERLINE_SIMPLIFY_PX = 0.75;

/** Máscara binária (1 = matéria) na resolução de trabalho. */
export interface WorkingMask {
  mask: Uint8Array;
  width: number;
  height: number;
  /** Quantos pixels da imagem cada célula cobre (>= 1). */
  step: number;
}

/**
 * Máscara de trabalho: reduz a imagem por blocos quando ela passa de
 * `maxDim`, marcando a célula como matéria se **qualquer** pixel do bloco for
 * escuro (traço de 1 px não desaparece na redução).
 */
export function buildWorkingMask(
  gray: ArrayLike<number>,
  imgWidth: number,
  imgHeight: number,
  threshold: number,
  maxDim = DEFAULT_CENTERLINE_MAX_DIM,
): WorkingMask {
  if (imgWidth <= 0 || imgHeight <= 0) {
    throw new Error('Dimensão de imagem inválida.');
  }
  if (gray.length < imgWidth * imgHeight) {
    throw new Error('Imagem incompatível com as dimensões.');
  }
  const limit = Math.max(16, Math.trunc(maxDim) || DEFAULT_CENTERLINE_MAX_DIM);
  const step = Math.max(1, Math.ceil(Math.max(imgWidth, imgHeight) / limit));
  const width = Math.ceil(imgWidth / step);
  const height = Math.ceil(imgHeight / step);
  const mask = new Uint8Array(width * height);
  for (let oy = 0; oy < height; oy++) {
    const y0 = oy * step;
    const y1 = Math.min(imgHeight, y0 + step);
    for (let ox = 0; ox < width; ox++) {
      const x0 = ox * step;
      const x1 = Math.min(imgWidth, x0 + step);
      let dark = false;
      for (let y = y0; y < y1 && !dark; y++) {
        const row = y * imgWidth;
        for (let x = x0; x < x1; x++) {
          if (gray[row + x]! < threshold) {
            dark = true;
            break;
          }
        }
      }
      mask[oy * width + ox] = dark ? 1 : 0;
    }
  }
  return { mask, width, height, step };
}

/**
 * Afinamento de Zhang–Suen (1984) até o esqueleto de 1 px.
 *
 * A máscara de entrada **não** é alterada. A grade é emoldurada por 1 pixel de
 * fundo (evita casos de borda da imagem) e só os pixels de borda entram na
 * lista de avaliação — o custo acompanha o perímetro, não a área.
 */
export function thinMask(
  mask: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  if (width <= 0 || height <= 0) {
    throw new Error('Dimensão de máscara inválida.');
  }
  if (mask.length < width * height) {
    throw new Error('Máscara incompatível com as dimensões.');
  }
  const W = width + 2;
  const H = height + 2;
  const skel = new Uint8Array(W * H);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      skel[(y + 1) * W + (x + 1)] = mask[y * width + x] !== 0 ? 1 : 0;
    }
  }

  const at = (x: number, y: number): number => skel[y * W + x]!;

  // Borda inicial: matéria com qualquer vizinho (8) de fundo.
  const border = new Set<number>();
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (!at(x, y)) continue;
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          if (!at(x + dx, y + dy)) {
            edge = true;
            break;
          }
        }
      }
      if (edge) border.add(y * W + x);
    }
  }

  const transitions = (
    p2: number,
    p3: number,
    p4: number,
    p5: number,
    p6: number,
    p7: number,
    p8: number,
    p9: number,
  ): number => {
    const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
    let count = 0;
    for (let i = 0; i < 8; i++) {
      if (seq[i] === 0 && seq[i + 1] === 1) count++;
    }
    return count;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (let phase = 0; phase < 2; phase++) {
      const remove: number[] = [];
      for (const idx of border) {
        if (!skel[idx]) continue;
        const x = idx % W;
        const y = (idx - x) / W;
        const p2 = at(x, y - 1);
        const p3 = at(x + 1, y - 1);
        const p4 = at(x + 1, y);
        const p5 = at(x + 1, y + 1);
        const p6 = at(x, y + 1);
        const p7 = at(x - 1, y + 1);
        const p8 = at(x - 1, y);
        const p9 = at(x - 1, y - 1);
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;
        if (transitions(p2, p3, p4, p5, p6, p7, p8, p9) !== 1) continue;
        if (phase === 0) {
          if (p2 * p4 * p6 !== 0) continue;
          if (p4 * p6 * p8 !== 0) continue;
        } else {
          if (p2 * p4 * p8 !== 0) continue;
          if (p2 * p6 * p8 !== 0) continue;
        }
        remove.push(idx);
      }
      if (remove.length === 0) continue;
      changed = true;
      for (const idx of remove) {
        skel[idx] = 0;
        border.delete(idx);
        const x = idx % W;
        const y = (idx - x) / W;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const n = (y + dy) * W + (x + dx);
            if (skel[n]) border.add(n);
          }
        }
      }
    }
  }

  // Devolve sem a moldura (mesmas dimensões da máscara de entrada).
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[y * width + x] = skel[(y + 1) * W + (x + 1)]!;
    }
  }
  return out;
}

/** Deslocamentos dos 8 vizinhos, em ordem determinística. */
const NB_DX = [0, 1, 1, 1, 0, -1, -1, -1];
const NB_DY = [-1, -1, 0, 1, 1, 1, 0, -1];

/**
 * Adjacência de traçado: 8-vizinhos **sem atalho diagonal**. Se algum dos
 * ortogonais do passo diagonal existe, os dois pixels já estão ligados por ele
 * em dois passos (num anel, o canto vira grau 3 e o traçado se fragmenta em
 * triângulos). O passo diagonal só vale quando é um degrau de verdade (os dois
 * ortogonais vazios).
 */
const adjacent = (
  skeleton: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  dx: number,
  dy: number,
): boolean => {
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
  if (!skeleton[ny * width + nx]) return false;
  if (dx !== 0 && dy !== 0) {
    const a = skeleton[y * width + nx]!;
    const b = skeleton[ny * width + x]!;
    if (a || b) return false;
  }
  return true;
};

/**
 * Traça o esqueleto em polilinhas (coordenadas de pixel inteiras).
 *
 * Junções e pontas viram extremidades; um laço sem junção sai como caminho
 * **fechado** (primeiro ponto repetido no fim). Cada aresta é usada uma vez.
 */
export function traceSkeleton(
  skeleton: Uint8Array,
  width: number,
  height: number,
): PixelPoint[][] {
  if (width <= 0 || height <= 0) return [];
  const n = width * height;
  if (skeleton.length < n) throw new Error('Esqueleto incompatível.');
  const pixels: number[] = [];
  const degree = new Map<number, number>();
  const neighborList = new Map<number, number[]>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!skeleton[y * width + x]) continue;
      const id = y * width + x;
      const list: number[] = [];
      for (let k = 0; k < 8; k++) {
        const dx = NB_DX[k]!;
        const dy = NB_DY[k]!;
        if (!adjacent(skeleton, width, height, x, y, dx, dy)) continue;
        list.push((y + dy) * width + (x + dx));
      }
      pixels.push(id);
      neighborList.set(id, list);
      degree.set(id, list.length);
    }
  }

  const used = new Set<number>();
  const key = (a: number, b: number): number => (a < b ? a * n + b : b * n + a);
  const point = (id: number): PixelPoint => ({
    x: id % width,
    y: (id - (id % width)) / width,
  });

  const paths: PixelPoint[][] = [];

  const walk = (start: number, first: number): number[] => {
    used.add(key(start, first));
    const path = [start, first];
    let prev = start;
    let cur = first;
    while (true) {
      if (cur === start) break;
      if (degree.get(cur) !== 2) break;
      const next = (neighborList.get(cur) ?? []).find(
        (nb) => nb !== prev && !used.has(key(cur, nb)),
      );
      if (next === undefined) break;
      used.add(key(cur, next));
      path.push(next);
      prev = cur;
      cur = next;
    }
    return path;
  };

  // 1) Pontas e junções (grau != 2).
  for (const id of pixels) {
    if (degree.get(id) === 2) continue;
    for (const nb of neighborList.get(id) ?? []) {
      if (used.has(key(id, nb))) continue;
      const path = walk(id, nb);
      if (path.length >= 2) paths.push(path.map(point));
    }
  }

  // 2) Laços fechados (todos os pixels com grau 2).
  for (const id of pixels) {
    for (const nb of neighborList.get(id) ?? []) {
      if (used.has(key(id, nb))) continue;
      const path = walk(id, nb);
      if (path.length >= 3) {
        path.push(id); // fecha o laço (primeiro == último)
        paths.push(path.map(point));
      }
    }
  }

  return paths;
}

/**
 * Poda esporões: caminho curto com **uma ponta livre** (só ele chega ali) e a
 * outra numa **junção** (outros caminhos também chegam). Esporão é ruído do
 * afinamento, não traço de verdade — um traço curto entre duas pontas livres
 * (ou um laço) fica.
 */
export function pruneSpurs(
  paths: PixelPoint[][],
  minLengthPx: number,
): PixelPoint[][] {
  const min = Math.max(0, minLengthPx);
  if (min <= 0) return paths.map((p) => p.slice());
  const key = (p: PixelPoint): string => `${p.x},${p.y}`;
  const closed = (path: PixelPoint[]): boolean =>
    path.length > 1 &&
    path[0]!.x === path[path.length - 1]!.x &&
    path[0]!.y === path[path.length - 1]!.y;
  const ends = new Map<string, number>();
  for (const path of paths) {
    if (path.length < 2 || closed(path)) continue;
    for (const end of [path[0]!, path[path.length - 1]!]) {
      ends.set(key(end), (ends.get(key(end)) ?? 0) + 1);
    }
  }
  return paths.filter((path) => {
    if (path.length < 2) return false;
    if (closed(path) || pathLength(path) > min) return true;
    const a = ends.get(key(path[0]!)) ?? 0;
    const b = ends.get(key(path[path.length - 1]!)) ?? 0;
    const spur = (a === 1 && b >= 2) || (b === 1 && a >= 2);
    return !spur;
  });
}

/** Comprimento de uma polilinha em pixels. */
export function pathLength(path: readonly PixelPoint[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i]!.x - path[i - 1]!.x;
    const dy = path[i]!.y - path[i - 1]!.y;
    total += Math.hypot(dx, dy);
  }
  return total;
}

/** Centerline da imagem em polilinhas de pixel (já podadas e simplificadas). */
export function traceCenterline(
  rgba: Uint8ClampedArray | Uint8Array,
  imgWidth: number,
  imgHeight: number,
  opts: ImageToGcodeOptions,
): { paths: PixelPoint[][]; working: WorkingMask } {
  const gray = applyAdjust(toGrayscale(rgba, imgWidth, imgHeight), opts.adjust);
  return traceCenterlineFromGray(gray, imgWidth, imgHeight, opts);
}

/** Mesmo pipeline, com o cinza já ajustado (o G-code aproveita o mesmo). */
export function traceCenterlineFromGray(
  gray: ArrayLike<number>,
  imgWidth: number,
  imgHeight: number,
  opts: ImageToGcodeOptions,
): { paths: PixelPoint[][]; working: WorkingMask } {
  const working = buildWorkingMask(
    gray,
    imgWidth,
    imgHeight,
    opts.adjust.bwThreshold,
    opts.centerlineMaxDim,
  );
  const skeleton = thinMask(working.mask, working.width, working.height);
  const minBranch =
    opts.minBranchPx === undefined ? DEFAULT_MIN_BRANCH_PX : opts.minBranchPx;
  const raw = pruneSpurs(
    traceSkeleton(skeleton, working.width, working.height),
    minBranch,
  );

  // Converte a malha de trabalho para pixels da imagem (centro da célula).
  const sx = imgWidth / working.width;
  const sy = imgHeight / working.height;
  const inImage = raw.map((path) =>
    path.map((p) => ({ x: (p.x + 0.5) * sx, y: (p.y + 0.5) * sy })),
  );

  const epsilon =
    opts.simplifyPx === undefined
      ? DEFAULT_CENTERLINE_SIMPLIFY_PX
      : opts.simplifyPx;
  const simplified = inImage
    .map((path) => simplifyOpenPath(path, epsilon * Math.max(1, working.step)))
    .filter((path) => path.length >= 2);

  return { paths: simplified, working };
}

/**
 * RDP de caminho **aberto** (as duas pontas ficam). Usado no centerline;
 * o contorno fechado tem a sua própria versão em `contour.ts`.
 */
export function simplifyOpenPath(
  points: readonly PixelPoint[],
  epsilonPx: number,
): PixelPoint[] {
  const n = points.length;
  if (n < 3 || !Number.isFinite(epsilonPx) || epsilonPx <= 0) {
    return points.map((p) => ({ ...p }));
  }
  const keep = new Array<boolean>(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;
  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    if (end - start < 2) continue;
    let maxDist = -1;
    let maxIdx = -1;
    for (let i = start + 1; i < end; i++) {
      const d = distanceToSegment(points[i]!, points[start]!, points[end]!);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxIdx >= 0 && maxDist > epsilonPx) {
      keep[maxIdx] = true;
      stack.push([start, maxIdx], [maxIdx, end]);
    }
  }
  const out: PixelPoint[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push({ ...points[i]! });
  return out;
}

function distanceToSegment(
  p: PixelPoint,
  a: PixelPoint,
  b: PixelPoint,
): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return Math.hypot(wx, wy);
  let t = (wx * vx + wy * vy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return Math.hypot(wx - t * vx, wy - t * vy);
}

interface Point {
  x: number;
  y: number;
}

/** Imagem -> G-code de **linha única** (centerline). */
export function centerlineToGcode(
  rgba: Uint8ClampedArray | Uint8Array,
  imgWidth: number,
  imgHeight: number,
  opts: ImageToGcodeOptions,
): GcodeResult {
  const g = opts.geometry;
  const e = opts.engrave;
  const geom = computeScanGeometry(g);
  const gray = applyAdjust(toGrayscale(rgba, imgWidth, imgHeight), opts.adjust);
  const { paths } = traceCenterlineFromGray(gray, imgWidth, imgHeight, opts);

  const sampled = sampleGrid(gray, imgWidth, imgHeight, g, geom);
  const grid = new Float32Array(sampled.length);
  for (let i = 0; i < sampled.length; i++) {
    grid[i] = sampled[i]! < opts.adjust.bwThreshold ? 0 : 1;
  }

  const toMm = (p: PixelPoint): Point => ({
    x: g.offsetX + (p.x / imgWidth) * g.widthMm,
    y: g.offsetY + (1 - p.y / imgHeight) * g.heightMm,
  });

  const passes = opts.passes ?? 1;
  const out: string[] = ['G21', 'G90', 'G94', 'M5'];
  let g0Mm = 0;
  let g1Mm = 0;
  let segments = 0;
  const bounds = {
    xMin: Infinity,
    xMax: -Infinity,
    yMin: Infinity,
    yMax: -Infinity,
  };
  const track = (x: number, y: number): void => {
    if (x < bounds.xMin) bounds.xMin = x;
    if (x > bounds.xMax) bounds.xMax = x;
    if (y < bounds.yMin) bounds.yMin = y;
    if (y > bounds.yMax) bounds.yMax = y;
  };

  for (let pass = 0; pass < passes; pass++) {
    if (passes > 1) out.push(`; pass ${pass + 1}/${passes}`);
    let lastF: number | null = null;
    let lastS = 0;
    let armed = false;
    let cursor: Point = { x: g.offsetX, y: g.offsetY };

    const travel = (to: Point): void => {
      g0Mm += Math.hypot(to.x - cursor.x, to.y - cursor.y);
      if (armed) out.push('M5');
      out.push(`G0 X${f(to.x)} Y${f(to.y)}`);
      cursor = { ...to };
      track(to.x, to.y);
      if (e.mode === 'M4') {
        out.push('M4');
      } else {
        out.push('M3 S0');
        lastS = 0;
      }
      armed = true;
    };

    const burn = (to: Point): void => {
      g1Mm += Math.hypot(to.x - cursor.x, to.y - cursor.y);
      out.push(
        `G1 X${f(to.x)} Y${f(to.y)}${e.sMax === lastS ? '' : ` S${e.sMax}`}${
          e.speedMmMin === lastF ? '' : ` F${f(e.speedMmMin)}`
        }`,
      );
      lastS = e.sMax;
      lastF = e.speedMmMin;
      segments++;
      cursor = { ...to };
      track(to.x, to.y);
    };

    for (const path of paths) {
      const points = path.map(toMm);
      if (points.length < 2) continue;
      travel(points[0]!);
      for (let i = 1; i < points.length; i++) burn(points[i]!);
    }
    out.push('M5');
  }

  if (!Number.isFinite(bounds.xMin)) {
    bounds.xMin = bounds.xMax = g.offsetX;
    bounds.yMin = bounds.yMax = g.offsetY;
  }
  assertWorkArea(bounds, g);

  // Preview: comprimento **negativo** = caminho aberto (o contorno fecha).
  const flat: number[] = [];
  for (const path of paths) {
    flat.push(-path.length);
    for (const p of path) flat.push(p.x / imgWidth, p.y / imgHeight);
  }

  const gcode = `${out.join('\n')}\n`;
  const estimatedSec =
    (g1Mm / e.speedMmMin + g0Mm / e.travelSpeedMmMin) * 60 || 0;
  const stats: GcodeStats = {
    rows: geom.rows,
    cols: geom.cols,
    segments,
    bytes: new TextEncoder().encode(gcode).length,
    linesPerMm: g.linesPerMm,
    burnedMm: g1Mm,
    travelMm: g0Mm,
    estimatedSec,
    bounds: { ...bounds },
    paths: paths.length,
  };

  return {
    gcode,
    stats,
    grid,
    contourPaths: Float32Array.from(flat),
  };
}
