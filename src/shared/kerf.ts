/**
 * **Kerf / folga de corte por camada** — módulo puro.
 *
 * O feixe do laser remove uma faixa de material com a largura do *kerf*
 * (~0,1–0,3 mm) **centrada no caminho**. Sem compensar, a peça sai menor que o
 * desenho (contorno externo) e os furos saem maiores. Aqui a geometria é
 * corrigida **antes** de virar G-code:
 *
 * - contorno **externo** → desloca `kerf/2` para fora (a borda interna do corte
 *   cai exatamente sobre o desenho);
 * - **furo** (contorno dentro de um número ímpar de outros contornos) → desloca
 *   `kerf/2` para dentro.
 *
 * A profundidade é calculada por *even-odd* com um ponto interno de cada
 * contorno, então ilhas dentro de furos (profundidade 2) voltam a crescer. Só
 * contornos **fechados e sem traço grosso** entram na conta: linhas abertas e
 * preenchimentos por traço (`Shape.width`) são gravação, não corte.
 *
 * Se um furo for menor que a folga, ele **colapsa** (o material fecharia o
 * buraco de qualquer jeito): o contorno é omitido e o G-code registra o motivo.
 * Se um contorno externo falhar ao crescer (geometria degenerada), a forma
 * original é mantida — melhor cortar o desenho do que sumir com a peça.
 *
 * Puro e testável: sem DOM, sem IPC, sem bundle próprio (entra no `design.js`).
 */

import { signedArea } from './boolean';
import type { Point } from './design';
import { pointInPolygon } from './designEditor';
import { offsetLoop } from './offset';

/** Teto de sanidade da folga (mm) — acima disso é erro de digitação. */
export const KERF_MAX_MM = 10;

/**
 * Normaliza a folga: não finita ou negativa → 0; acima do teto → limitada.
 * (Negativa não faz sentido físico: seria “engrossar” o feixe.)
 */
export function sanitizeKerf(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(KERF_MAX_MM, n);
}

/**
 * Ponto **dentro** do contorno, usado só para testar contenção.
 *
 * Usa o ponto médio da aresta mais longa deslocado para dentro pelo normal
 * (a distância é minúscula, `1e-3` mm): o meio da maior aresta é o ponto mais
 * longe das outras arestas, então o deslocamento não atravessa a forma mesmo
 * em contornos finos. `null` para polígonos degenerados.
 */
function interiorPoint(points: ReadonlyArray<Point>): Point | null {
  if (points.length < 3) return null;
  const area = signedArea(points as Point[]);
  if (Math.abs(area) < 1e-12) return null;
  let best = 0;
  let bestLen = -1;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > bestLen) {
      bestLen = len;
      best = i;
    }
  }
  if (bestLen <= 0) return null;
  const a = points[best];
  const b = points[(best + 1) % points.length];
  // Normal **externa** (mesma convenção do offset: depende do sentido).
  const s = area >= 0 ? 1 : -1;
  const outX = ((b.y - a.y) / bestLen) * s;
  const outY = (-(b.x - a.x) / bestLen) * s;
  const eps = Math.min(bestLen / 4, 1e-3);
  return {
    x: (a.x + b.x) / 2 - outX * eps,
    y: (a.y + b.y) / 2 - outY * eps,
  };
}

/**
 * Quantos contornos de `loops` envolvem `points` (0 = externo, 1 = furo,
 * 2 = ilha dentro do furo, …). O próprio contorno é ignorado.
 */
export function containmentDepth(
  points: ReadonlyArray<Point>,
  loops: ReadonlyArray<ReadonlyArray<Point>>,
): number {
  const probe = interiorPoint(points);
  if (!probe) return 0;
  let depth = 0;
  for (const loop of loops) {
    if (loop === points) continue;
    if (pointInPolygon(loop, probe.x, probe.y)) depth++;
  }
  return depth;
}

export interface KerfOptions {
  join?: 'miter' | 'round' | 'bevel';
  arcSamples?: number;
}

/**
 * Compensa uma lista de contornos fechados (mesma ordem na saída).
 * `null` na posição = contorno que colapsou com a compensação.
 */
export function compensateKerf(
  loops: ReadonlyArray<ReadonlyArray<Point>>,
  kerf: number,
  options: KerfOptions = {},
): Array<Point[] | null> {
  const k = sanitizeKerf(kerf);
  if (Math.abs(k) < 1e-9) return loops.map((points) => [...points]);
  return loops.map((points) => {
    if (points.length < 3) return [...points];
    const depth = containmentDepth(points, loops);
    // Ímpar = furo (encolhe); par = externo/ilha (cresce).
    const sign = depth % 2 === 0 ? 1 : -1;
    const out = offsetLoop([...points], (sign * k) / 2, {
      join: options.join ?? 'round',
      arcSamples: options.arcSamples ?? 8,
    });
    if (out && out.length >= 3) return out;
    // Furo que colapsa: não existe buraco a cortar. Externo que falha:
    // mantém a geometria original (corta o desenho, não some com a peça).
    return sign < 0 ? null : [...points];
  });
}
