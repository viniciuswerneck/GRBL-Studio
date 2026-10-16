/**
 * Vetorização / recorte (RF-IMG-6): imagem -> contornos -> G-code de corte.
 *
 * O que é preto (abaixo de `bwThreshold`, após os ajustes) vira um contorno
 * fechado percorrido a `S = s-max` — serve para **recorte** e para gravar
 * só o desenho de linha. Não há inserção do ponto (`dotSizeMm`): o caminho
 * segue a borda exata da forma.
 *
 * Pipeline: cinza -> ajustes -> limiar -> traçado (contour.ts) -> RDP ->
 * conversão px -> mm -> emissão. O preview reaproveita a geometria da
 * varredura (grade binária limiada), então o renderer não muda.
 *
 * Invariantes herdados de gcode.ts (AGENTS.md): coordenadas sempre dentro da
 * área de trabalho, `M5` antes de todo `G0`, `S` dentro de [s-min, s-max],
 * `F` nunca em `G0`, no máximo 3 decimais.
 */

import { applyAdjust, toGrayscale } from './adjust';
import { assertWorkArea, formatCoord as f } from './format';
import { computeScanGeometry, sampleGrid, type ScanGeometry } from './raster';
import {
  polygonArea,
  simplifyContour,
  traceContours,
  type Contour,
  type PixelPoint,
} from './contour';
import type { GcodeResult, GcodeStats, ImageToGcodeOptions } from './types';

/** Área mínima de um ilhote para virar contorno (px²). Ilhote de 1 px é ruído de limiar. */
const MIN_AREA_PX = 2;

/** Suavização padrão do RDP em pixels da imagem (0,5 px remove o degrau de 1 px). */
export const DEFAULT_SIMPLIFY_PX = 0.5;

interface Point {
  x: number;
  y: number;
}

/** Converte imagem em G-code de contorno. Entrada deve passar por `validateOptions`. */
export function vectorToGcode(
  rgba: Uint8ClampedArray | Uint8Array,
  imgWidth: number,
  imgHeight: number,
  opts: ImageToGcodeOptions,
): GcodeResult {
  const g = opts.geometry;
  const threshold = opts.adjust.bwThreshold;
  const geom = computeScanGeometry(g);

  const gray = applyAdjust(toGrayscale(rgba, imgWidth, imgHeight), opts.adjust);

  // Máscara de matéria no tamanho cheio da imagem (1 = recortar).
  const mask = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i]! < threshold ? 1 : 0;

  // Preview: mesma grade da varredura, limiada — sem mudança no renderer.
  const sampled = sampleGrid(gray, imgWidth, imgHeight, g, geom);
  const grid = new Float32Array(sampled.length);
  for (let i = 0; i < sampled.length; i++)
    grid[i] = sampled[i]! < threshold ? 0 : 1;

  const simplifyPx = opts.simplifyPx ?? DEFAULT_SIMPLIFY_PX;
  const contours = traceContours(mask, imgWidth, imgHeight)
    .filter((c) => polygonArea(c) >= MIN_AREA_PX)
    .map((c) => simplifyContour(c, simplifyPx))
    .filter((c) => c.length >= 3);

  return emitVector(contours, geom, opts, imgWidth, imgHeight, grid);
}

function emitVector(
  contours: Contour[],
  geom: ScanGeometry,
  opts: ImageToGcodeOptions,
  imgWidth: number,
  imgHeight: number,
  grid: Float32Array,
): GcodeResult {
  const g = opts.geometry;
  const e = opts.engrave;
  const out: string[] = ['G21', 'G90', 'G94', 'M5'];

  let lastF: number | null = null;
  let lastS = 0; // modal inicial do GRBL é S0
  let armed = false;
  let cursor: Point = { x: g.offsetX, y: g.offsetY };

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

  /** Canto de pixel -> mm: 0..w mapeia exatamente para a área pedida. */
  const toMm = (p: PixelPoint): Point => ({
    x: g.offsetX + (p.x / imgWidth) * g.widthMm,
    y: g.offsetY + (p.y / imgHeight) * g.heightMm,
  });

  /** Deslocamento com laser desligado. */
  const travel = (to: Point): void => {
    g0Mm += Math.hypot(to.x - cursor.x, to.y - cursor.y);
    if (armed) out.push('M5');
    out.push(`G0 X${f(to.x)} Y${f(to.y)}`);
    cursor = { ...to };
    track(to.x, to.y);

    // Rearme: M4 é dinâmico (seguro parado); M3 precisa nascer com S0 para
    // não acender o laser antes do movimento.
    if (e.mode === 'M4') {
      out.push('M4');
    } else {
      out.push('M3 S0');
      lastS = 0;
    }
    armed = true;
  };

  /** Corte: mesmo feed e potência (s-max) do início ao fim do contorno. */
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

  for (const contour of contours) {
    const points = contour.map(toMm);
    travel(points[0]!);
    for (let i = 1; i < points.length; i++) burn(points[i]!);
    burn(points[0]!); // fecha o contorno (sem levantar o laser)
  }

  out.push('M5');

  // Sem contorno (imagem branca): área alcançada é só o ponto inicial.
  if (!Number.isFinite(bounds.xMin)) {
    bounds.xMin = bounds.xMax = g.offsetX;
    bounds.yMin = bounds.yMax = g.offsetY;
  }
  assertWorkArea(bounds, g);

  // Caminhos normalizados (0..1) para o preview traçar o contorno real.
  const paths: number[] = [];
  for (const contour of contours) {
    paths.push(contour.length);
    for (const p of contour) paths.push(p.x / imgWidth, p.y / imgHeight);
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
    contours: contours.length,
  };

  return { gcode, stats, grid, contourPaths: Float32Array.from(paths) };
}
