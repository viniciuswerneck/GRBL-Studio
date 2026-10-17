/**
 * Emissor de G-code: imagem -> linhas de varredura (RF-IMG-4/5/7/9).
 *
 * Regras de segurança (AGENTS.md + DESIGN.md 3.2):
 *  - Toda posição gerada fica **dentro** da área de trabalho (validado ao final).
 *  - `S` sempre dentro de [sMin, sMax] (e abaixo de 32767, limite do GRBL).
 *  - `M5` antes de qualquer deslocamento `G0` e rearme do modo depois.
 *  - Nunca emitir `F` em `G0` (senão a próxima gravação herdaria a feed errada).
 */

import { applyAdjust, toGrayscale, validateAdjust } from './adjust';
import { floydSteinberg } from './dither';
import { assertWorkArea, formatCoord as f, MAX_S } from './format';
import {
  computeScanGeometry,
  sampleGrid,
  validateGeometry,
  type ScanGeometry,
} from './raster';
import type { GcodeResult, GcodeStats, ImageToGcodeOptions } from './types';
import { vectorToGcode } from './vector';

const DEFAULT_GAP_MM = 1;
/** Velocidade dos `G0` assumida só na estimativa de tempo (padrão `$25` do GRBL). */
const TRAVEL_ESTIMATE_MMPM = 5000;

/** Valida todas as opções; lança com mensagem amigável. */
export function validateOptions(opts: ImageToGcodeOptions): void {
  validateAdjust(opts.adjust);
  validateGeometry(opts.geometry);

  const e = opts.engrave;
  if (!Number.isFinite(e.speedMmMin) || e.speedMmMin <= 0) {
    throw new Error('Velocidade de gravação inválida.');
  }
  if (!Number.isFinite(e.travelSpeedMmMin) || e.travelSpeedMmMin <= 0) {
    throw new Error('Velocidade de deslocamento inválida.');
  }
  if (!Number.isFinite(e.sMin) || !Number.isFinite(e.sMax)) {
    throw new Error('Potência inválida.');
  }
  if (e.sMin < 0 || e.sMax < 0)
    throw new Error('Potência não pode ser negativa.');
  if (e.sMin > e.sMax) throw new Error('S-min não pode ser maior que S-max.');
  if (e.sMax > MAX_S)
    throw new Error(`S-max acima do limite suportado pelo GRBL (${MAX_S}).`);
  if (e.mode !== 'M3' && e.mode !== 'M4')
    throw new Error('Modo de laser inválido (M3/M4).');
  if (
    opts.algorithm !== 'line' &&
    opts.algorithm !== 'dither' &&
    opts.algorithm !== 'vector'
  ) {
    throw new Error('Algoritmo inválido (line/dither/vector).');
  }
  if (
    opts.simplifyPx !== undefined &&
    (!Number.isFinite(opts.simplifyPx) || opts.simplifyPx < 0)
  ) {
    throw new Error('Suavização inválida.');
  }
  if (
    opts.passes !== undefined &&
    (!Number.isInteger(opts.passes) || opts.passes < 1 || opts.passes > 99)
  ) {
    throw new Error('Número de passadas inválido (use um inteiro de 1 a 99).');
  }
}

/**
 * Pipeline completo: RGBA -> cinza -> ajustes -> reamostragem -> (dither) -> G-code.
 * Função pura: não faz I/O e pode ser testada isoladamente.
 */
export function imageToGcode(
  rgba: Uint8ClampedArray | Uint8Array,
  imgWidth: number,
  imgHeight: number,
  opts: ImageToGcodeOptions,
): GcodeResult {
  validateOptions(opts);

  if (opts.algorithm === 'vector') {
    return vectorToGcode(rgba, imgWidth, imgHeight, opts);
  }

  const geom = computeScanGeometry(opts.geometry);
  const gray = applyAdjust(toGrayscale(rgba, imgWidth, imgHeight), opts.adjust);
  let grid = sampleGrid(gray, imgWidth, imgHeight, opts.geometry, geom);
  if (opts.algorithm === 'dither') {
    grid = floydSteinberg(grid, geom.cols, geom.rows);
  }
  return emitGcode(grid, geom, opts);
}

interface Point {
  x: number;
  y: number;
}

function emitGcode(
  grid: Float32Array,
  geom: ScanGeometry,
  opts: ImageToGcodeOptions,
): GcodeResult {
  const g = opts.geometry;
  const e = opts.engrave;
  const gap = opts.gapThresholdMm ?? DEFAULT_GAP_MM;
  const passes = opts.passes ?? 1;
  const cols = geom.cols;
  const halfDot = geom.halfDot;
  const pitch = geom.pitch;

  const out: string[] = ['G21', 'G90', 'G94', 'M5'];

  let g1Mm = 0;
  let g0Mm = 0;
  let burnedMm = 0;
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

  const point = (rowCoord: number, scanCoord: number): Point =>
    geom.direction === 'h'
      ? { x: scanCoord, y: rowCoord }
      : { x: rowCoord, y: scanCoord };

  /** S da potência de escurecimento (0..1) — sempre dentro de [sMin, sMax]. */
  const powerS = (darkness: number): number => {
    const value = e.sMin + (e.sMax - e.sMin) * darkness;
    const rounded = Math.round(value);
    return Math.min(e.sMax, Math.max(e.sMin, rounded));
  };

  // Uma passada por iteração (RF-GC-6): cada passada tem estado modal próprio,
  // recomeça da origem do arquivo e termina com `M5` (laser desligado no
  // retorno). Os totais (`g0Mm`, `g1Mm`, `segments`, `bounds`) são acumulados.
  for (let pass = 0; pass < passes; pass++) {
    let lastF: number | null = null;
    let lastS: number | null = 0; // modal inicial do GRBL é S0
    let armed = false;
    let cursor: Point = { x: g.offsetX, y: g.offsetY };

    /** Deslocamento com laser desligado. */
    const travel = (to: Point): void => {
      const dist = Math.hypot(to.x - cursor.x, to.y - cursor.y);
      g0Mm += dist;
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

    /** Emite um trecho [cursor -> to] com um valor de amostra fixo. */
    const emitRun = (to: Point, value: number, runLength: number): void => {
      const s = value < 1 ? powerS(1 - value) : 0;

      if (s > 0) {
        out.push(
          `G1 X${f(to.x)} Y${f(to.y)}${s === lastS ? '' : ` S${s}`}${
            e.speedMmMin === lastF ? '' : ` F${f(e.speedMmMin)}`
          }`,
        );
        lastS = s;
        lastF = e.speedMmMin;
        segments++;
        g1Mm += runLength;
        burnedMm += runLength;
      } else if (runLength >= gap) {
        travel(to); // trecho longo em branco: pula com G0 (laser desligado)
        return;
      } else {
        out.push(
          `G1 X${f(to.x)} Y${f(to.y)}${lastS === 0 ? '' : ' S0'}${
            e.speedMmMin === lastF ? '' : ` F${f(e.speedMmMin)}`
          }`,
        );
        lastS = 0;
        lastF = e.speedMmMin;
        segments++;
        g1Mm += runLength;
      }

      cursor = { ...to };
      track(to.x, to.y);
    };

    for (let r = 0; r < geom.rows; r++) {
      const rowCoord = geom.rowStart + r * geom.rowStep;
      // Início da linha = borda da área (centro da 1ª amostra - metade do ponto).
      travel(point(rowCoord, geom.scanStart - halfDot));

      let c = 0;
      while (c < cols) {
        const value = grid[r * cols + c]!;
        let cEnd = c;
        while (cEnd + 1 < cols && grid[r * cols + cEnd + 1] === value) cEnd++;

        const endScan = geom.scanStart + cEnd * pitch + halfDot;
        const cursorScan = geom.direction === 'h' ? cursor.x : cursor.y;
        emitRun(
          point(rowCoord, endScan),
          value,
          Math.abs(endScan - cursorScan),
        );
        c = cEnd + 1;
      }
    }

    out.push('M5');
  }

  // Invariante: nenhuma coordenada fora da área de trabalho.
  assertWorkArea(bounds, g);

  const gcode = `${out.join('\n')}\n`;
  const estimatedSec =
    (g1Mm / e.speedMmMin +
      g0Mm / (e.travelSpeedMmMin || TRAVEL_ESTIMATE_MMPM)) *
      60 || 0;

  const stats: GcodeStats = {
    rows: geom.rows,
    cols: geom.cols,
    segments,
    bytes: new TextEncoder().encode(gcode).length,
    linesPerMm: opts.geometry.linesPerMm,
    burnedMm,
    travelMm: g0Mm + (g1Mm - burnedMm),
    estimatedSec,
    bounds: { ...bounds },
  };

  return { gcode, stats, grid };
}
