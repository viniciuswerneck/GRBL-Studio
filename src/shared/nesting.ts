/**
 * Encaixe de peças na chapa (**nesting**) — P3.7 / “Nesting simples” do roadmap.
 *
 * Recebe a **caixa** de cada peça (largura × altura, em mm) e a chapa, e devolve
 * onde colocar cada canto superior esquerdo, podendo girar a peça 90°.
 *
 * O algoritmo é **MaxRects** com a heurística *best area fit*: mantém uma lista
 * de retângulos livres, escolhe o que deixa a **menor sobra de área** e fatia os
 * livres que a peça atravessou. Empates preferem **não girar** (girar só quando
 * rende algo) e, depois, a menor sobra no lado curto. É a mesma família que o
 * LightBurn e o Deepnest usam como base para caixas — rápido (milhares de peças
 * em ms) e melhor que a grade simples porque aproveita os vãos entre peças
 * grandes.
 *
 * Regras de ouro:
 * - **Espaçamento** (`gapMm`) é folga entre peças: a peça ocupa `w + gap`
 *   (idem em Y) e o encaixe seguinte nunca invade essa faixa.
 * - **Margem** (`marginMm`) afasta tudo da borda da chapa.
 * - Peça maior que a área útil (nas duas orientações, se girar for permitido)
 *   volta em `unplaced` — **nunca** é cortada nem sai da chapa.
 * - A rotação é aplicada **só na geometria** (o chamador gira os pontos); aqui
 *   só dizemos se a peça deve entrar girada (`rotated`).
 *
 * Módulo puro: sem DOM, sem bundle, sem IPC.
 */

/** Uma peça a encaixar: id estável do chamador + caixa em mm. */
export interface NestPart {
  id: string;
  widthMm: number;
  heightMm: number;
}

export interface NestOptions {
  /** Largura da chapa (eixo X), em mm. */
  sheetWidthMm: number;
  /** Altura da chapa (eixo Y), em mm. */
  sheetHeightMm: number;
  /** Borda livre em todos os lados. Padrão 0. */
  marginMm?: number;
  /** Folga entre peças (aplicada à direita e embaixo de cada peça). Padrão 0. */
  gapMm?: number;
  /** Tenta girar 90° quando couber melhor. Padrão verdadeiro. */
  allowRotate?: boolean;
}

/** Onde a peça ficou: canto superior esquerdo na chapa. */
export interface NestPlacement {
  id: string;
  xMm: number;
  yMm: number;
  /** Largura **depois** da rotação. */
  widthMm: number;
  /** Altura **depois** da rotação. */
  heightMm: number;
  /** A peça entra girada 90° (o chamador gira a geometria). */
  rotated: boolean;
}

export interface NestResult {
  placements: NestPlacement[];
  /** Ids que não couberam (na ordem de entrada). */
  unplaced: string[];
  /** Ocupação real (do canto da margem até a última peça), em mm. */
  usedWidthMm: number;
  usedHeightMm: number;
  /** Área das peças ÷ área útil da chapa (0…1). */
  utilization: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Erro de folga aceito ao comparar floats (mm). */
const EPS = 1e-9;

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w - EPS &&
    b.x < a.x + a.w - EPS &&
    a.y < b.y + b.h - EPS &&
    b.y < a.y + a.h - EPS
  );
}

/** `inner` está totalmente contido em `outer`? */
function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x - EPS &&
    inner.y >= outer.y - EPS &&
    inner.x + inner.w <= outer.x + outer.w + EPS &&
    inner.y + inner.h <= outer.y + outer.h + EPS
  );
}

function sameRect(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.x - b.x) < EPS &&
    Math.abs(a.y - b.y) < EPS &&
    Math.abs(a.w - b.w) < EPS &&
    Math.abs(a.h - b.h) < EPS
  );
}

/**
 * Remove retângulos livres contidos em outro (o clássico “prune” do MaxRects).
 * Sem isso a lista cresce sem limite e o encaixe fica lento.
 */
function pruneFreeRects(free: Rect[]): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < free.length; i++) {
    const a = free[i];
    if (a.w <= EPS || a.h <= EPS) continue;
    let contained = false;
    for (let j = 0; j < free.length && !contained; j++) {
      if (i === j) continue;
      const b = free[j];
      if (contains(b, a)) {
        // Empate: mantém o primeiro para o resultado ser determinístico.
        if (!sameRect(a, b) || j < i) contained = true;
      }
    }
    if (!contained) out.push(a);
  }
  return out;
}

interface Candidate {
  free: Rect;
  widthMm: number;
  heightMm: number;
  rotated: boolean;
  /** Espaço ocupado (peça + folga). */
  usedW: number;
  usedH: number;
  leftoverArea: number;
  shortSide: number;
  longSide: number;
}

/**
 * Encaixa as peças na chapa. Nunca lança: entradas inválidas viram “não coube”.
 */
export function nestParts(
  parts: ReadonlyArray<NestPart>,
  options: NestOptions,
): NestResult {
  const sheetW = finite(options?.sheetWidthMm);
  const sheetH = finite(options?.sheetHeightMm);
  const margin = clamp(finite(options?.marginMm), 0, 10_000);
  const gap = clamp(finite(options?.gapMm), 0, 10_000);
  const allowRotate = options?.allowRotate !== false;

  const usableW = sheetW - margin * 2;
  const usableH = sheetH - margin * 2;
  const usableArea = usableW > 0 && usableH > 0 ? usableW * usableH : 0;

  const placements: NestPlacement[] = [];
  const unplaced: string[] = [];
  const list = Array.isArray(parts) ? parts : [];

  // Peças válidas, das maiores para as menores (área e depois o maior lado):
  // encaixar o que é grande primeiro é o que evita fragmentar a chapa.
  const valid: Array<{ id: string; w: number; h: number; area: number }> = [];
  for (const part of list) {
    const id = typeof part?.id === 'string' ? part.id : String(part?.id ?? '');
    const w = finite(part?.widthMm);
    const h = finite(part?.heightMm);
    if (!(w > EPS) || !(h > EPS)) {
      unplaced.push(id);
      continue;
    }
    valid.push({ id, w, h, area: w * h });
  }
  const order = valid
    .map((part, index) => ({ ...part, index }))
    .sort(
      (a, b) =>
        b.area - a.area ||
        Math.max(b.w, b.h) - Math.max(a.w, a.h) ||
        a.index - b.index,
    );

  if (usableArea <= 0) {
    return {
      placements,
      unplaced: [...unplaced, ...order.map((p) => p.id)],
      usedWidthMm: 0,
      usedHeightMm: 0,
      utilization: 0,
    };
  }

  let free: Rect[] = [{ x: margin, y: margin, w: usableW, h: usableH }];
  let maxX = margin;
  let maxY = margin;
  let placedArea = 0;

  for (const part of order) {
    let best: Candidate | null = null;
    const orientations: Array<{ w: number; h: number; rotated: boolean }> = [
      { w: part.w, h: part.h, rotated: false },
    ];
    if (allowRotate && Math.abs(part.w - part.h) > EPS) {
      orientations.push({ w: part.h, h: part.w, rotated: true });
    }
    for (const o of orientations) {
      const usedW = o.w + gap;
      const usedH = o.h + gap;
      for (const rect of free) {
        if (rect.w + EPS < usedW || rect.h + EPS < usedH) continue;
        const leftoverArea = rect.w * rect.h - usedW * usedH;
        const shortSide = Math.min(rect.w - usedW, rect.h - usedH);
        const longSide = Math.max(rect.w - usedW, rect.h - usedH);
        // Menor sobra de área; no empate, não girar; depois o encaixe mais justo
        // no lado curto e, por fim, no lado longo (determinístico).
        const better =
          !best ||
          leftoverArea < best.leftoverArea - EPS ||
          (Math.abs(leftoverArea - best.leftoverArea) <= EPS &&
            ((!o.rotated && best.rotated) ||
              (o.rotated === best.rotated &&
                (shortSide < best.shortSide - EPS ||
                  (Math.abs(shortSide - best.shortSide) <= EPS &&
                    longSide < best.longSide - EPS)))));
        if (better) {
          best = {
            free: rect,
            widthMm: o.w,
            heightMm: o.h,
            rotated: o.rotated,
            usedW,
            usedH,
            leftoverArea,
            shortSide,
            longSide,
          };
        }
      }
    }
    if (!best) {
      unplaced.push(part.id);
      continue;
    }

    const { free: rect } = best;
    placements.push({
      id: part.id,
      xMm: rect.x,
      yMm: rect.y,
      widthMm: best.widthMm,
      heightMm: best.heightMm,
      rotated: best.rotated,
    });
    placedArea += part.area;
    maxX = Math.max(maxX, rect.x + best.widthMm);
    maxY = Math.max(maxY, rect.y + best.heightMm);

    const usedRect: Rect = {
      x: rect.x,
      y: rect.y,
      w: best.usedW,
      h: best.usedH,
    };
    const next: Rect[] = [];
    for (const fr of free) {
      if (!intersects(fr, usedRect)) {
        next.push(fr);
        continue;
      }
      // Fatia o livre que a peça atravessou nos quatro lados possíveis.
      if (usedRect.x > fr.x + EPS) {
        next.push({
          x: fr.x,
          y: fr.y,
          w: usedRect.x - fr.x,
          h: fr.h,
        });
      }
      const usedRight = usedRect.x + usedRect.w;
      const frRight = fr.x + fr.w;
      if (usedRight < frRight - EPS) {
        next.push({ x: usedRight, y: fr.y, w: frRight - usedRight, h: fr.h });
      }
      if (usedRect.y > fr.y + EPS) {
        next.push({
          x: fr.x,
          y: fr.y,
          w: fr.w,
          h: usedRect.y - fr.y,
        });
      }
      const usedBottom = usedRect.y + usedRect.h;
      const frBottom = fr.y + fr.h;
      if (usedBottom < frBottom - EPS) {
        next.push({
          x: fr.x,
          y: usedBottom,
          w: fr.w,
          h: frBottom - usedBottom,
        });
      }
    }
    free = pruneFreeRects(next);
  }

  // A ordem de saída segue a entrada (quem chama casa peça ↔ entidade).
  const byId = new Map(placements.map((p) => [p.id, p]));
  const ordered: NestPlacement[] = [];
  const seen = new Set<string>();
  for (const part of list) {
    const id = typeof part?.id === 'string' ? part.id : String(part?.id ?? '');
    const p = byId.get(id);
    if (p && !seen.has(id)) {
      ordered.push(p);
      seen.add(id);
    }
  }

  return {
    placements: ordered,
    unplaced,
    usedWidthMm: Math.max(0, maxX - margin),
    usedHeightMm: Math.max(0, maxY - margin),
    utilization: usableArea > 0 ? placedArea / usableArea : 0,
  };
}
