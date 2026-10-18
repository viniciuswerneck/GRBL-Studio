/**
 * Preenchimento por varredura (scanline fill) para gravação a laser.
 *
 * Recebe uma máscara binária (1 = dentro da forma) — obtida no renderer ao
 * desenhar o texto preenchido num `<canvas>` — e devolve segmentos horizontais
 * que cobrem a região. É o mesmo princípio do pipeline de imagem, mas o
 * resultado é **geometria** (segmentos), que serve ao G-code vetorial do
 * desenho: assim um texto pode ser gravado cheio ("preto"), e não só contornado.
 *
 * Módulo puro e testável: nada de DOM aqui.
 */

export interface HatchOptions {
  /** Espaçamento entre linhas de varredura (px). */
  spacingPx: number;
  /** Deslocamento vertical da primeira linha (px). Padrão: `spacingPx / 2`. */
  phasePx?: number;
  /** Comprimento mínimo de um segmento (px) — descarta ruído/pontas. Padrão 2. */
  minRunPx?: number;
}

export interface HatchSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Varre a máscara linha a linha e devolve um segmento por trecho contínuo.
 * Coordenadas em px (o chamador converte para mm).
 */
export function maskToHatchLines(
  mask: ArrayLike<number>,
  width: number,
  height: number,
  opts: HatchOptions,
): HatchSegment[] {
  const w = Math.max(0, Math.floor(width));
  const h = Math.max(0, Math.floor(height));
  const spacing = Math.max(1, Math.round(opts.spacingPx));
  const phase = Number.isFinite(opts.phasePx)
    ? Math.max(0, opts.phasePx as number)
    : spacing / 2;
  const minRun = Math.max(1, Math.floor(opts.minRunPx ?? 2));
  const out: HatchSegment[] = [];
  if (w === 0 || h === 0) return out;

  let row = Math.floor(phase);
  for (; row < h; row += spacing) {
    const base = row * w;
    const y = row + 0.5; // centro da linha de varredura
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const on = x < w && mask[base + x] > 0;
      if (on) {
        if (start < 0) start = x;
      } else if (start >= 0) {
        if (x - start >= minRun) out.push({ x0: start, y0: y, x1: x, y1: y });
        start = -1;
      }
    }
  }
  return out;
}

/**
 * Alterna a direção dos segmentos a cada linha de varredura (ida/volta),
 * reduzindo os deslocamentos `G0` entre trechos — mesma ideia do zig-zague do
 * pipeline de imagem.
 */
export function zigzagHatch(segments: HatchSegment[]): HatchSegment[] {
  const rows: HatchSegment[][] = [];
  for (const s of segments) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last[0].y0 - s.y0) < 1e-9) last.push(s);
    else rows.push([s]);
  }
  const out: HatchSegment[] = [];
  rows.forEach((group, i) => {
    if (i % 2 === 0) {
      out.push(...group);
      return;
    }
    // Linha ímpar: começa pelo último trecho, de trás para frente, para o
    // deslocamento entre linhas ser o menor possível.
    for (let k = group.length - 1; k >= 0; k--) {
      const s = group[k];
      out.push({ x0: s.x1, y0: s.y0, x1: s.x0, y1: s.y1 });
    }
  });
  return out;
}
