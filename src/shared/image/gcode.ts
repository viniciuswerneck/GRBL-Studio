/**
 * Emissor de G-code: imagem -> linhas de varredura (RF-IMG-4/5/7/9).
 *
 * Regras de segurança (AGENTS.md + DESIGN.md 3.2):
 *  - Toda posição gerada fica **dentro** da área de trabalho (validado ao final).
 *  - `S` sempre dentro de [sMin, sMax] (e abaixo de 32767, limite do GRBL).
 *  - `M5` antes de um `G0` **quando o laser estava ligado** e rearme do modo
 *    logo depois (o modal do GRBL sobrevive aos `G0`, então deslocamentos
 *    consecutivos custam um único `G0`).
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
import { centerlineToGcode } from './centerline';
import { vectorToGcode } from './vector';

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
  const adaptive = e.adaptiveSpeed ?? 1;
  if (!Number.isFinite(adaptive) || adaptive < 1 || adaptive > 5)
    throw new Error('Velocidade adaptativa inválida (use 1 a 5).');
  if (
    opts.algorithm !== 'line' &&
    opts.algorithm !== 'dither' &&
    opts.algorithm !== 'vector' &&
    opts.algorithm !== 'centerline'
  ) {
    throw new Error('Algoritmo inválido (line/dither/vector/centerline).');
  }
  if (
    opts.minBranchPx !== undefined &&
    (!Number.isFinite(opts.minBranchPx) ||
      opts.minBranchPx < 0 ||
      opts.minBranchPx > 500)
  ) {
    throw new Error('Ramo mínimo inválido (use 0 a 500 px).');
  }
  if (
    opts.centerlineMaxDim !== undefined &&
    (!Number.isFinite(opts.centerlineMaxDim) ||
      opts.centerlineMaxDim < 32 ||
      opts.centerlineMaxDim > 4000)
  ) {
    throw new Error('Resolução do centerline inválida (use 32 a 4000 px).');
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
  if (opts.algorithm === 'centerline') {
    return centerlineToGcode(rgba, imgWidth, imgHeight, opts);
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
  const passes = opts.passes ?? 1;
  const zigzag = opts.bidirectional ?? true;
  const cols = geom.cols;
  const halfDot = geom.halfDot;
  const pitch = geom.pitch;

  const out: string[] = ['G21', 'G90', 'G94', 'M5'];

  let g1Mm = 0;
  let g0Mm = 0;
  let burnedMm = 0;
  let segments = 0;
  let g1Sec = 0;
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

  // Retângulo do desenho como `bounds` inicial: linhas inteiramente brancas são
  // puladas, mas a área de gravação (enquadramento, centro, preview) não muda.
  for (const rc of [
    geom.rowStart,
    geom.rowStart + (geom.rows - 1) * geom.rowStep,
  ]) {
    for (const sc of [
      geom.scanStart - halfDot,
      geom.scanStart + (cols - 1) * pitch + halfDot,
    ]) {
      const corner = point(rc, sc);
      track(corner.x, corner.y);
    }
  }

  /** S da potência de escurecimento (0..1) — sempre dentro de [sMin, sMax]. */
  const powerS = (darkness: number): number => {
    const value = e.sMin + (e.sMax - e.sMin) * darkness;
    const rounded = Math.round(value);
    return Math.min(e.sMax, Math.max(e.sMin, rounded));
  };

  /**
   * Feed do trecho conforme a claridade (RF-IMG-10): branco anda até
   * `speed * adaptiveSpeed`, preto mantém a velocidade de gravação. A
   * claridade é quantizada para o `F` mudar só em degraus (arquivo menor).
   */
  const adaptive = e.adaptiveSpeed ?? 1;
  const ADAPTIVE_STEPS = 8;
  const feedFor = (whiteness: number): number => {
    if (adaptive <= 1) return e.speedMmMin;
    const w = Math.max(0, Math.min(1, whiteness));
    const q = Math.round(w * ADAPTIVE_STEPS) / ADAPTIVE_STEPS;
    return Math.round(e.speedMmMin * (1 + q * (adaptive - 1)));
  };

  // Uma passada por iteração (RF-GC-6): cada passada tem estado modal próprio,
  // recomeça da origem do arquivo e termina com `M5` (laser desligado no
  // retorno). Os totais (`g0Mm`, `g1Mm`, `segments`, `bounds`) são acumulados.
  for (let pass = 0; pass < passes; pass++) {
    // Marca a passada (RF-GC-6) para o preview colorir cada uma por vez.
    if (passes > 1) out.push(`; pass ${pass + 1}/${passes}`);
    let lastF: number | null = null;
    let lastS: number | null = 0; // modal inicial do GRBL é S0
    let laserOn = false; // último comando de queima deixou o laser ligado
    let needArm = true; // precisa reenviar M4/M3 antes do próximo G1
    let cursor: Point = { x: g.offsetX, y: g.offsetY };

    /**
     * Deslocamento com laser desligado.
     *
     * `M5` só é enviado se o laser estava ligado e o modo (`M4`/`M3 S0`) só é
     * rearmado depois de um `M5`: o modal do GRBL permanece válido entre os
     * `G0`. Assim, deslocamentos consecutivos sem queima entre eles (margem
     * branca no fim de uma linha e no início da seguinte) custam **um único
     * `G0`**.
     */
    const travel = (to: Point): void => {
      const dist = Math.hypot(to.x - cursor.x, to.y - cursor.y);
      g0Mm += dist;
      if (laserOn) {
        out.push('M5');
        laserOn = false;
        needArm = true;
      }
      out.push(`G0 X${f(to.x)} Y${f(to.y)}`);
      cursor = { ...to };
      track(to.x, to.y);

      // Rearme: M4 é dinâmico (seguro parado); M3 precisa nascer com S0 para
      // não acender o laser antes do movimento.
      if (needArm) {
        if (e.mode === 'M4') {
          out.push('M4');
        } else {
          out.push('M3 S0');
          lastS = 0;
        }
        needArm = false;
      }
    };

    /**
     * S/feed de uma amostra (brancura 0..1). `s = 0` = branco, desloca com G0.
     */
    const shot = (value: number): { s: number; feed: number } =>
      value < 1
        ? { s: powerS(1 - value), feed: feedFor(value) }
        : { s: 0, feed: 0 };

    /** Emite um trecho [cursor -> to] com `S`/`F` já calculados. */
    const emitRun = (
      to: Point,
      s: number,
      feed: number,
      runLength: number,
    ): void => {
      if (s > 0) {
        out.push(
          `G1 X${f(to.x)} Y${f(to.y)}${s === lastS ? '' : ` S${s}`}${
            feed === lastF ? '' : ` F${f(feed)}`
          }`,
        );
        lastS = s;
        lastF = feed;
        laserOn = true;
        segments++;
        g1Mm += runLength;
        burnedMm += runLength;
        g1Sec += (runLength / feed) * 60;
      } else {
        // Fundo branco (s = 0): ignora a queima e desloca com G0 (laser
        // desligado), sem gastar tempo em G1.
        travel(to);
        return;
      }

      cursor = { ...to };
      track(to.x, to.y);
    };

    for (let r = 0; r < geom.rows; r++) {
      const rowCoord = geom.rowStart + r * geom.rowStep;

      // Trechos da linha: amostras consecutivas que resultam no **mesmo `S` e
      // `F`** viram um único `G1` (o degradê contínuo não vira milhares de
      // linhas: menos bytes, menos tempo de serial).
      const runs: { c0: number; c1: number; s: number; feed: number }[] = [];
      for (let c = 0; c < cols; ) {
        const here = shot(grid[r * cols + c]!);
        let cEnd = c;
        while (cEnd + 1 < cols) {
          const next = shot(grid[r * cols + cEnd + 1]!);
          if (next.s !== here.s || next.feed !== here.feed) break;
          cEnd++;
        }
        runs.push({ c0: c, c1: cEnd, s: here.s, feed: here.feed });
        c = cEnd + 1;
      }

      // Linha inteira branca (margem): nem desloca até ela.
      if (runs.length === 1 && runs[0]!.s === 0) continue;

      // Varredura em zigue-zague (ida e volta): evita o `G0` de retorno em
      // cada linha — praticamente dobra a velocidade em imagens largas.
      const reverse = zigzag && r % 2 === 1;
      const scanAt = (c: number): number => geom.scanStart + c * pitch;
      const entry = reverse ? scanAt(cols - 1) + halfDot : scanAt(0) - halfDot;
      // Entra na linha pela borda correspondente (centro da 1ª amostra ± metade
      // do ponto) e percorre os trechos, invertendo a ordem no retorno.
      travel(point(rowCoord, entry));

      const from = reverse ? runs.length - 1 : 0;
      const to = reverse ? -1 : runs.length;
      const step = reverse ? -1 : 1;
      for (let i = from; i !== to; i += step) {
        const run = runs[i]!;
        const endScan = reverse
          ? scanAt(run.c0) - halfDot
          : scanAt(run.c1) + halfDot;
        const cursorScan = geom.direction === 'h' ? cursor.x : cursor.y;
        emitRun(
          point(rowCoord, endScan),
          run.s,
          run.feed,
          Math.abs(endScan - cursorScan),
        );
      }
    }

    out.push('M5');
  }

  // Invariante: nenhuma coordenada fora da área de trabalho.
  assertWorkArea(bounds, g);

  const gcode = `${out.join('\n')}\n`;
  const estimatedSec =
    g1Sec + (g0Mm / (e.travelSpeedMmMin || TRAVEL_ESTIMATE_MMPM)) * 60 || 0;

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
