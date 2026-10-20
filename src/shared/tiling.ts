/**
 * **Tiling (peça maior que a mesa)** — módulo puro.
 *
 * Quando a arte passa da área útil da máquina, o programa é dividido em
 * **tiles**: janelas do tamanho da mesa que se sobrepõem numa faixa. Para cada
 * tile sai um G-code com a origem no canto inferior esquerdo **da janela**, de
 * modo que o usuário reposiciona o material/zero e roda o programa seguinte.
 * A faixa de sobreposição é cortada pelos dois vizinhos: é ela que garante que
 * a emenda não fique com falha de alinhamento.
 *
 * O corte é feito sobre os **movimentos já parseados** (`parseGcode`), então
 * o kerf, as abas e as passadas do G-code original são preservados: o tiler só
 * recorta segmentos nas bordas e desloca a origem. Arcos já vêm subdivididos
 * pelo parser; `G0` viram deslocamento (sem queima) e cada trecho de corte
 * recebe sua própria ignição.
 *
 * Puro e testável: sem DOM, sem IPC.
 */

import { parseGcode, type PreviewMove } from './preview';

/** Limites de sanidade da janela (mm). */
export const TILE_MIN_MM = 5;
export const TILE_MAX_MM = 2000;
/** Sobreposição máxima entre tiles (mm). */
export const TILE_OVERLAP_MAX_MM = 50;
/** Teto de tiles gerados (protege memória/disco de um erro de digitação). */
export const TILE_MAX_COUNT = 200;

export interface TileBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Janela de um tile, em coordenadas da arte (mm). */
export interface TileRect {
  /** Linha (0-based, de baixo para cima) e coluna (0-based, da esquerda). */
  row: number;
  col: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TilePlan {
  cols: number;
  rows: number;
  /** Passo entre janelas (mm): `tamanho − sobreposição`. */
  stepX: number;
  stepY: number;
  overlap: number;
  /** Tamanho nominal da janela (mm). */
  tileW: number;
  tileH: number;
  tiles: TileRect[];
}

/** Janela válida (mm): 5..2000; inválida → 0. */
export function sanitizeTileSize(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(TILE_MAX_MM, Math.max(TILE_MIN_MM, n));
}

/** Sobreposição válida (mm): 0..50. */
export function sanitizeOverlap(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(TILE_OVERLAP_MAX_MM, n);
}

/** Quantas janelas cabem num eixo (1 quando a arte cabe). */
function axisCount(size: number, tile: number, overlap: number): number {
  if (size <= tile) return 1;
  // Passo máximo que ainda deixa a sobreposição pedida.
  const step = Math.max(TILE_MIN_MM, tile - overlap);
  return 1 + Math.ceil((size - tile) / step);
}

/**
 * Plano de tiles que cobre a área da arte. O passo é `janela − sobreposição`,
 * o menor que ainda garante cobertura: a última janela pode sobrar além da
 * arte (sem material), mas nada é cortado duas vezes de graça.
 */
export function planTiles(
  bounds: TileBounds,
  tileW: number,
  tileH: number,
  overlap: number,
): TilePlan | null {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  if (!(w > 0) || !(h > 0)) return null;
  const tw = sanitizeTileSize(tileW);
  const th = sanitizeTileSize(tileH);
  if (!tw || !th) return null;
  const ov = Math.min(
    sanitizeOverlap(overlap),
    Math.max(0, Math.min(tw, th) - TILE_MIN_MM),
  );

  const cols = axisCount(w, tw, ov);
  const rows = axisCount(h, th, ov);
  if (cols * rows > TILE_MAX_COUNT) return null;

  // Passo mínimo que ainda cobre a arte **com** a sobreposição pedida: assim
  // não se corta a mesma faixa duas vezes sem necessidade.
  const stepX = cols > 1 ? tw - ov : 0;
  const stepY = rows > 1 ? th - ov : 0;

  const tiles: TileRect[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = bounds.minX + col * stepX;
      const y0 = bounds.minY + row * stepY;
      tiles.push({ row, col, x0, y0, x1: x0 + tw, y1: y0 + th });
    }
  }
  return { cols, rows, stepX, stepY, overlap: ov, tileW: tw, tileH: th, tiles };
}

/** Recorta um segmento contra a janela (Liang–Barsky). */
function clipSegment(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rect: TileRect,
): [number, number, number, number] | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  const tests: Array<[number, number]> = [
    [-dx, x0 - rect.x0],
    [dx, rect.x1 - x0],
    [-dy, y0 - rect.y0],
    [dy, rect.y1 - y0],
  ];
  for (const [p, q] of tests) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  if (t1 - t0 < 1e-12) return null;
  return [x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1];
}

/** Coordenada com 3 casas (1 µm), sem `-0`. */
function fmt(v: number): string {
  return (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3);
}

export interface TileProgram {
  rect: TileRect;
  /** Nome sugerido (`peca-r1c2.gcode`). */
  name: string;
  text: string;
  /** Quantos trechos de corte caíram na janela. */
  cuts: number;
}

export interface TileResult {
  tiles: TileProgram[];
  /** Trechos de corte que não caíram em nenhuma janela (não deve acontecer). */
  skipped: number;
}

/** Modo laser do arquivo (M3 constante ou M4 dinâmico) — o 1º que aparecer. */
function laserMode(text: string): 'M3' | 'M4' {
  const m = /\bM([34])\b/.exec(text);
  return m && m[1] === '3' ? 'M3' : 'M4';
}

/**
 * Gera um programa por tile. A origem de cada programa é o canto inferior
 * esquerdo da janela; coordenadas fora dela são recortadas.
 */
export function tileGcode(
  text: string,
  plan: TilePlan,
  baseName = 'tile',
): TileResult {
  const program = parseGcode(text);
  const mode = laserMode(text);
  const tiles: TileProgram[] = [];
  let skipped = 0;

  for (const rect of plan.tiles) {
    const lines: string[] = [
      `; GRBL Studio — tile ${rect.row + 1}/${plan.rows}, coluna ${rect.col + 1}/${plan.cols}`,
      `; janela ${(rect.x1 - rect.x0).toFixed(2)} × ${(rect.y1 - rect.y0).toFixed(2)} mm · sobreposição ${plan.overlap} mm`,
      '; origem: canto inferior esquerdo desta janela (X0 Y0)',
      '; confira a numeração no arquivo antes de cada passada',
      'G21',
      'G90',
      'M5',
    ];
    let lastX: number | null = null;
    let lastY: number | null = null;
    let power: number | null = null;
    let feed: number | null = null;
    let cuts = 0;

    const cut = (move: PreviewMove): void => {
      if (move.rapid) return;
      const s =
        typeof move.s === 'number' && Number.isFinite(move.s) ? move.s : 0;
      // Sem potência não há queima: `S0` é deslocamento disfarçado de G1.
      if (s <= 0) return;
      const seg = clipSegment(move.x0, move.y0, move.x1, move.y1, rect);
      if (!seg) return;
      const [ax, ay, bx, by] = seg;
      const lx = ax - rect.x0;
      const ly = ay - rect.y0;
      const ex = bx - rect.x0;
      const ey = by - rect.y0;
      // Só continua de onde parou quando o ponto é **exatamente** o mesmo:
      // dois trechos separados não podem virar um corte contínuo.
      if (
        lastX === null ||
        lastY === null ||
        Math.abs(lastX - lx) > 1e-6 ||
        Math.abs(lastY - ly) > 1e-6
      ) {
        lines.push(`G0 X${fmt(lx)} Y${fmt(ly)}`);
      }
      if (power !== s) {
        lines.push(`${mode} S${Math.round(s)}`);
        power = s;
      }
      const f = move.feed && move.feed > 0 ? move.feed : 1000;
      const feedPart = feed === f ? '' : ` F${Math.round(f)}`;
      lines.push(`G1 X${fmt(ex)} Y${fmt(ey)}${feedPart}`);
      feed = f;
      lastX = ex;
      lastY = ey;
      cuts++;
    };

    for (const move of program.moves) cut(move);
    if (!cuts) {
      skipped++;
      continue;
    }
    lines.push('M5', 'G0 X0.000 Y0.000');
    tiles.push({
      rect,
      name: `${baseName}-r${rect.row + 1}c${rect.col + 1}.gcode`,
      text: `${lines.join('\n')}\n`,
      cuts,
    });
  }
  return { tiles, skipped };
}
