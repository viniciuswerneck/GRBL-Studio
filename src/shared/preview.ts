/**
 * Parser de G-code para o preview 2D (RF-PRV-1/2/4/5).
 *
 * Função pura, sem I/O. Entrada: texto de G-code; saída: segmentos de
 * movimento em **milímetros** (já convertidos de polegadas) e a área
 * alcançada. Suporta o essencial do GRBL:
 *
 *  - `G0`/`G1` (linear) e `G2`/`G3` (arco, por `I/J` ou `R`).
 *  - `G20`/`G21` (polegadas/mm), `G90`/`G91` (absoluto/relativo),
 *    `G90.1`/`G91.1` (centro de arco absoluto/relativo).
 *  - `G92` (redefine a posição atual sem mover), `F`, `S`, `M3`/`M4`/`M5`.
 *  - Comentários `( ... )` e `; ...`, números de linha `N`, `%`.
 *
 * Movimentos são agregados na lista plana `moves`; cada movimento guarda o
 * índice da linha de origem (`line`, 0-based) para o preview acompanhar a
 * execução a partir do progresso do job (RF-PRV-5).
 */

import type { GrblStatus } from './types';

export interface PreviewBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** Vetor XYZ simples (mm). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Offset de trabalho neutro (sem G92/G54). */
export const ZERO_OFFSET: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Posição de trabalho (mm) a partir de um status do GRBL (RF-PRV-3).
 *
 * O GRBL reporta **só `MPos` ou só `WPos`** (nunca os dois) e manda o `WCO`
 * apenas de vez em quando (~10–30 relatórios). Como `WPos = MPos − WCO`, o
 * chamador precisa guardar o `wco` devolvido e passá-lo como `prevWco` na
 * próxima chamada — sem esse cache, um relatório sem `WCO` daria a posição de
 * máquina e a cruz do preview “saltaria”.
 */
export function workPosition(
  status: Pick<GrblStatus, 'mpos' | 'wpos' | 'wco'>,
  prevWco: Vec3 = ZERO_OFFSET,
): { pos: Vec3 | null; wco: Vec3 } {
  const wco = status.wco ?? prevWco;
  if (status.wpos) return { pos: status.wpos, wco };
  if (!status.mpos) return { pos: null, wco };
  const { mpos } = status;
  return {
    pos: { x: mpos.x - wco.x, y: mpos.y - wco.y, z: mpos.z - wco.z },
    wco,
  };
}

/** Trecho reto do caminho (arcos são subdivididos em vários). */
export interface PreviewMove {
  /** `true` para `G0` (deslocamento), `false` para queima/corte (`G1`/`G2`/`G3`). */
  rapid: boolean;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Índice (0-based) da linha fonte que gerou o movimento. */
  line: number;
  /** Passada (0-based) a que o movimento pertence (RF-GC-6). */
  pass?: number;
  /** Feed modal vigente (mm/min) quando o movimento foi gerado (RF-GC-2/5). */
  feed?: number;
  /** Potência `S` modal no movimento — o preview usa como intensidade (RF-PRV-5). */
  s?: number;
}

export interface ParsedProgram {
  moves: PreviewMove[];
  /** Área alcançada (mm). `null` se não houver nenhum movimento. */
  bounds: PreviewBounds | null;
  /** Total de linhas consideradas (inclui vazias/comentário). */
  totalLines: number;
  /** Comprimento queimado (mm), para estatística do preview. */
  cutMm: number;
}

/** Passo alvo da subdivisão de arcos (mm por segmento). */
const ARC_STEP_MM = 0.5;
const MAX_ARC_SEGMENTS = 1024;

const MM_PER_INCH = 25.4;

/** Remove comentários `( ... )` (não aninhados) e `; ...`. */
function stripComments(raw: string): string {
  let out = '';
  let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === ';' && depth === 0) break;
    if (c === '(') {
      depth++;
      continue;
    }
    if (c === ')') {
      if (depth > 0) depth--;
      continue;
    }
    if (depth === 0) out += c;
  }
  return out.trim();
}

/** Marca de passada emitida pelo gerador (`; pass 2/3`). Lida na linha crua
 * (antes de remover comentários) para o preview colorir cada passada — sem a
 * marca, `pass` fica 0 (arquivo de passada única ou G-code de terceiros). */
const PASS_MARKER = /^[;(]\s*pass\s+(\d+)/i;

function passFromMarker(rawLine: string): number | null {
  const m = PASS_MARKER.exec(rawLine.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) && n > 0 ? n - 1 : null;
}

interface Word {
  letter: string;
  value: number;
}

/** Tokeniza palavras `letra número` (ex.: `G1`, `X-2.5`, `S1000`). */
function tokenize(line: string): Word[] {
  const words: Word[] = [];
  const re = /([A-Za-z])\s*(-?\d*\.?\d+)/g;
  let m = re.exec(line);
  while (m !== null) {
    const value = Number(m[2]);
    if (Number.isFinite(value)) {
      words.push({ letter: m[1]!.toUpperCase(), value });
    }
    m = re.exec(line);
  }
  return words;
}

/** Estado modal do interpretador. */
interface Modal {
  scale: number; // 1 (mm) ou 25.4 (polegadas -> mm)
  absolute: boolean; // G90/G91
  arcCenterAbsolute: boolean; // G90.1/G91.1
  motion: number; // 0..3 (modal; padrão G0)
  x: number;
  y: number;
  /** Feed modal vigente (mm/min), 0 = não definido (RF-GC-2/5). */
  feed: number;
  /** Potência `S` modal (0..max), usada como intensidade no preview. */
  power: number;
  /** Passada corrente (0-based) marcada por `; pass N` (RF-GC-6). */
  pass: number;
}

/**
 * Centro do arco. `I/J` são offsets a partir do início (ou absolutos em
 * `G90.1`); a forma `R` calcula o centro pelo raio e sentido.
 */
function arcCenter(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  i: number | undefined,
  j: number | undefined,
  r: number | undefined,
  cw: boolean,
  absoluteCenter: boolean,
): { cx: number; cy: number; radius: number } | null {
  if (i !== undefined || j !== undefined) {
    const cx = (absoluteCenter ? 0 : x0) + (i ?? 0);
    const cy = (absoluteCenter ? 0 : y0) + (j ?? 0);
    const radius = Math.hypot(x0 - cx, y0 - cy);
    if (radius === 0) return null;
    return { cx, cy, radius };
  }
  if (r !== undefined && r !== 0) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    const absR = Math.abs(r);
    if (d === 0 || d > 2 * absR) {
      // Raio pequeno demais: degenera em reta (trata como centro no meio).
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, radius: d / 2 || 1 };
    }
    const h = Math.sqrt(Math.max(0, absR * absR - (d / 2) * (d / 2)));
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    // Sinal define de que lado fica o centro (regra do GRBL/LinuxCNC).
    const sign = cw === r > 0 ? -1 : 1;
    const nx = -dy / d;
    const ny = dx / d;
    return { cx: mx + sign * h * nx, cy: my + sign * h * ny, radius: absR };
  }
  return null;
}

/** Interpola um arco em segmentos retos, anexando em `moves`. */
function emitArc(
  moves: PreviewMove[],
  cx: number,
  cy: number,
  radius: number,
  a0: number,
  a1: number,
  cw: boolean,
  line: number,
  feed: number,
  power: number,
  pass: number,
  cutMm: { value: number },
  track: (x: number, y: number) => void,
): void {
  let sweep = a1 - a0;
  if (cw) {
    while (sweep >= 0) sweep -= 2 * Math.PI;
    while (sweep < -2 * Math.PI) sweep += 2 * Math.PI;
  } else {
    while (sweep <= 0) sweep += 2 * Math.PI;
    while (sweep > 2 * Math.PI) sweep -= 2 * Math.PI;
  }
  const arcLen = Math.abs(sweep) * radius;
  const steps = Math.max(
    2,
    Math.min(MAX_ARC_SEGMENTS, Math.ceil(arcLen / ARC_STEP_MM)),
  );
  let px = cx + radius * Math.cos(a0);
  let py = cy + radius * Math.sin(a0);
  track(px, py);
  for (let k = 1; k <= steps; k++) {
    const t = a0 + (sweep * k) / steps;
    const nx = cx + radius * Math.cos(t);
    const ny = cy + radius * Math.sin(t);
    moves.push({
      rapid: false,
      x0: px,
      y0: py,
      x1: nx,
      y1: ny,
      line,
      pass,
      feed,
      s: power,
    });
    cutMm.value += Math.hypot(nx - px, ny - py);
    track(nx, ny);
    px = nx;
    py = ny;
  }
}

/**
 * Interpreta o texto e devolve os movimentos em mm.
 * Tolerante a linhas malformadas: palavras desconhecidas são ignoradas.
 */
export function parseGcode(text: string): ParsedProgram {
  const rawLines = String(text).split(/\r?\n/);
  const moves: PreviewMove[] = [];
  const cutMm = { value: 0 };

  let bounds: PreviewBounds | null = null;
  const track = (x: number, y: number): void => {
    if (!bounds) {
      bounds = { xMin: x, xMax: x, yMin: y, yMax: y };
      return;
    }
    if (x < bounds.xMin) bounds.xMin = x;
    if (x > bounds.xMax) bounds.xMax = x;
    if (y < bounds.yMin) bounds.yMin = y;
    if (y > bounds.yMax) bounds.yMax = y;
  };

  const st: Modal = {
    scale: 1,
    absolute: true,
    arcCenterAbsolute: false,
    motion: 0,
    x: 0,
    y: 0,
    feed: 0,
    power: 0,
    pass: 0,
  };

  for (let line = 0; line < rawLines.length; line++) {
    const markedPass = passFromMarker(rawLines[line]!);
    if (markedPass !== null) st.pass = markedPass;

    const clean = stripComments(rawLines[line]!);
    if (clean === '' || clean === '%') continue;

    const words = tokenize(clean);
    if (words.length === 0) continue;

    let motion: number | null = null;
    let hasX = false;
    let hasY = false;
    let wx: number | undefined;
    let wy: number | undefined;
    let i: number | undefined;
    let j: number | undefined;
    let r: number | undefined;

    for (const w of words) {
      switch (w.letter) {
        case 'G': {
          const g = w.value;
          if (g === 0 || g === 1 || g === 2 || g === 3) {
            motion = g;
          } else if (g === 20) {
            st.scale = MM_PER_INCH;
          } else if (g === 21) {
            st.scale = 1;
          } else if (g === 90) {
            st.absolute = true;
          } else if (g === 91) {
            st.absolute = false;
          } else if (g === 90.1) {
            st.arcCenterAbsolute = true;
          } else if (g === 91.1) {
            st.arcCenterAbsolute = false;
          }
          // G92 é tratado fora do switch (depende dos eixos).
          break;
        }
        case 'X':
          hasX = true;
          wx = w.value;
          break;
        case 'Y':
          hasY = true;
          wy = w.value;
          break;
        case 'I':
          i = w.value;
          break;
        case 'J':
          j = w.value;
          break;
        case 'R':
          r = w.value;
          break;
        case 'F':
          st.feed = w.value * st.scale;
          break;
        case 'S':
          st.power = w.value;
          break;
        default:
          break;
      }
    }

    // G92 redefine a posição atual (sem movimento) — ex.: G92 X0 Y0.
    const isG92 = words.some((w) => w.letter === 'G' && w.value === 92);
    if (isG92) {
      if (hasX && wx !== undefined) st.x = wx * st.scale;
      if (hasY && wy !== undefined) st.y = wy * st.scale;
      continue;
    }

    if (motion !== null) st.motion = motion;

    // Sem deslocamento nem arco: nada a fazer.
    if (
      !hasX &&
      !hasY &&
      i === undefined &&
      j === undefined &&
      r === undefined
    ) {
      continue;
    }

    const x0 = st.x;
    const y0 = st.y;
    const tx =
      hasX && wx !== undefined
        ? st.absolute
          ? wx * st.scale
          : x0 + wx * st.scale
        : st.x;
    const ty =
      hasY && wy !== undefined
        ? st.absolute
          ? wy * st.scale
          : y0 + wy * st.scale
        : st.y;
    const mode = st.motion;
    const rapid = mode === 0;

    if (rapid || mode === 1) {
      if (tx !== x0 || ty !== y0) {
        moves.push({
          rapid,
          x0,
          y0,
          x1: tx,
          y1: ty,
          line,
          pass: st.pass,
          feed: st.feed,
          s: st.power,
        });
        const len = Math.hypot(tx - x0, ty - y0);
        if (!rapid) cutMm.value += len;
        track(x0, y0);
        track(tx, ty);
      }
    } else {
      const center = arcCenter(
        x0,
        y0,
        tx,
        ty,
        i === undefined ? undefined : i * st.scale,
        j === undefined ? undefined : j * st.scale,
        r === undefined ? undefined : r * st.scale,
        mode === 2,
        st.arcCenterAbsolute,
      );
      if (center) {
        const a0 = Math.atan2(y0 - center.cy, x0 - center.cx);
        const a1 = Math.atan2(ty - center.cy, tx - center.cx);
        emitArc(
          moves,
          center.cx,
          center.cy,
          center.radius,
          a0,
          a1,
          mode === 2,
          line,
          st.feed,
          st.power,
          st.pass,
          cutMm,
          track,
        );
      } else {
        moves.push({
          rapid: false,
          x0,
          y0,
          x1: tx,
          y1: ty,
          line,
          pass: st.pass,
          feed: st.feed,
          s: st.power,
        });
        cutMm.value += Math.hypot(tx - x0, ty - y0);
        track(x0, y0);
        track(tx, ty);
      }
    }

    st.x = tx;
    st.y = ty;
  }

  return { moves, bounds, totalLines: rawLines.length, cutMm: cutMm.value };
}

/** Parâmetros do cálculo de tempo estimado (RF-GC-2/5). */
export interface EstimateOptions {
  /** Velocidade dos deslocamentos `G0` (mm/min). Padrão 5000. */
  rapidSpeedMmMin?: number;
  /** Feed usado quando o G-code não declara `F` (mm/min). Padrão 1000. */
  defaultFeedMmMin?: number;
}

/**
 * Tempo estimado (segundos) para percorrer o programa — soma o tempo de cada
 * movimento respeitando o feed modal. Função pura; serve tanto para o rótulo
 * do arquivo (RF-GC-2) quanto para o tempo restante durante o job (RF-GC-5).
 */
export function estimateSeconds(
  program: ParsedProgram,
  options: EstimateOptions = {},
): number {
  const rapidSpeed = options.rapidSpeedMmMin ?? 5000;
  const fallback = options.defaultFeedMmMin ?? 1000;
  let seconds = 0;
  for (const move of program.moves) {
    const length = Math.hypot(move.x1 - move.x0, move.y1 - move.y0);
    if (!Number.isFinite(length) || length <= 0) continue;
    let speed = move.rapid
      ? rapidSpeed
      : move.feed && move.feed > 0
        ? move.feed
        : fallback;
    if (!Number.isFinite(speed) || speed <= 0) speed = fallback;
    seconds += (length / speed) * 60;
  }
  return seconds;
}
