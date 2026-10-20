/**
 * Geradores paramétricos (RF-DSN-24): caixa com encaixe (finger joint) e
 * engrenagem de dentes retos.
 *
 * Tudo é **geometria pura** — nada de rede, nada de estado. O resultado são
 * polilinhas fechadas que o editor insere como grupos; o kerf continua sendo
 * aplicado pela camada, como em qualquer contorno.
 *
 * Caixa (medidas **externas** W × D × H, espessura `t`):
 *
 * - frente/fundo: `W × H` com **fendas** nas bordas verticais e na base/tampa;
 * - laterais: `(D − 2t) × H` com **dedos** que atravessam a espessura da
 *   frente/fundo (a soma `t + (D − 2t) + t` fecha a profundidade);
 * - base/tampa: `(W − 2t) × (D − 2t)` com dedos nos quatro lados.
 *
 * Todas as bordas começam e terminam com um **vão** (sem dedo no canto), então
 * os cantos ficam maciços e não há dedo “órfão”. Fenda = dedo + folga.
 */
import type { Point } from './design';

export const BOX_MIN_MM = 20;
export const BOX_MAX_MM = 1200;
export const BOX_THICKNESS_MIN_MM = 0.5;
export const BOX_THICKNESS_MAX_MM = 30;
export const BOX_FINGER_MIN_MM = 2;
export const BOX_FINGER_MAX_MM = 60;
export const BOX_CLEARANCE_MAX_MM = 1;
export const BOX_PANEL_GAP_MM = 6;

export const GEAR_TEETH_MIN = 8;
export const GEAR_TEETH_MAX = 200;
export const GEAR_MODULE_MIN = 0.5;
export const GEAR_MODULE_MAX = 10;
export const GEAR_ANGLE_MIN_DEG = 14.5;
export const GEAR_ANGLE_MAX_DEG = 25;

export type BoxPanelKey =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'bottom'
  | 'top';

export interface BoxOptions {
  /** Largura externa (X), mm. */
  width: number;
  /** Profundidade externa (Y), mm. */
  depth: number;
  /** Altura externa (Z), mm. */
  height: number;
  /** Espessura do material, mm. */
  thickness: number;
  /** Largura de um dedo (a fenda fica um pouco maior), mm. */
  finger: number;
  /** Folga somada à largura da fenda, mm. */
  clearance?: number;
  /** Incluir tampa (senão a caixa sai aberta). */
  top?: boolean;
}

export interface GeneratedPanel {
  key: BoxPanelKey;
  points: Point[];
}

export interface BoxResult {
  panels: GeneratedPanel[];
  /** Caixa ocupada pelo conjunto na chapa, mm. */
  width: number;
  height: number;
  /** `true` quando a tampa entrou no conjunto. */
  top: boolean;
}

export interface GearOptions {
  /** Módulo (mm por dente de diâmetro primitivo). */
  module: number;
  /** Número de dentes. */
  teeth: number;
  /** Ângulo de pressão em graus (padrão 20). */
  pressureAngle?: number;
  /** Diâmetro do furo central (mm); `0` = sem furo. */
  bore?: number;
}

export interface GearResult {
  /** Contorno externo fechado, centrado em (0, 0). */
  points: Point[];
  pitchDiameter: number;
  outerDiameter: number;
  rootDiameter: number;
  bore: number;
}

function finite(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function sanitizeBox(options: Partial<BoxOptions> = {}): BoxOptions {
  const width = clamp(finite(options.width, 120), BOX_MIN_MM, BOX_MAX_MM);
  const depth = clamp(finite(options.depth, 80), BOX_MIN_MM, BOX_MAX_MM);
  const height = clamp(finite(options.height, 60), BOX_MIN_MM, BOX_MAX_MM);
  const thickness = clamp(
    finite(options.thickness, 3),
    BOX_THICKNESS_MIN_MM,
    BOX_THICKNESS_MAX_MM,
  );
  const finger = clamp(
    finite(options.finger, 8),
    BOX_FINGER_MIN_MM,
    BOX_FINGER_MAX_MM,
  );
  const clearance = clamp(
    finite(options.clearance, 0.1),
    0,
    BOX_CLEARANCE_MAX_MM,
  );
  return {
    width,
    depth,
    height,
    thickness,
    finger,
    clearance,
    top: options.top !== false,
  };
}

/**
 * Intervalos dos dedos ao longo de uma borda de comprimento `length`.
 *
 * A contagem é sempre **ímpar** para que a borda comece e termine com um vão;
 * os dedos ficam nos intervalos ímpares. A folga é aplicada depois, só nas
 * fendas (`slotIntervals`).
 */
export function fingerIntervals(
  length: number,
  finger: number,
): Array<[number, number]> {
  if (!(length > 0) || !(finger > 0)) return [];
  const half = Math.max(1, Math.round(length / (2 * finger)));
  const n = 2 * half + 1;
  const pitch = length / n;
  const out: Array<[number, number]> = [];
  for (let i = 1; i < n - 1; i += 2) {
    out.push([i * pitch, (i + 1) * pitch]);
  }
  return out;
}

/** Alarga cada fenda por `clearance` (meia folga de cada lado), sem vazar. */
export function slotIntervals(
  intervals: ReadonlyArray<[number, number]>,
  clearance: number,
  limit: number,
): Array<[number, number]> {
  const pad = Math.max(0, clearance) / 2;
  return intervals.map(([s, e]) => [
    Math.max(0, s - pad),
    Math.min(limit, e + pad),
  ]);
}

type EdgeMode = 'flat' | 'tabs' | 'slots';

interface EdgeSpec {
  mode: EdgeMode;
  /** Posições (na direção canônica) dos dedos ou fendas. */
  intervals: Array<[number, number]>;
  /** Protusão/profundidade em mm. */
  depth: number;
}

const FLAT: EdgeSpec = { mode: 'flat', intervals: [], depth: 0 };

function point(x: number, y: number): Point {
  return { x, y };
}

function samePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
}

/**
 * Constrói uma borda reta de `from` a `to`, trocando os trechos por degraus
 * para fora (`tabs`) ou para dentro (`slots`).
 */
function edgePoints(
  from: Point,
  to: Point,
  spec: EdgeSpec,
  reverse: boolean,
): Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const out: Point[] = [];
  if (length < 1e-9) return out;
  const ux = dx / length;
  const uy = dy / length;
  // Normal externa de um polígono CCW: (dy, -dx) normalizado.
  const nx = uy;
  const ny = -ux;
  const at = (s: number, off: number): Point =>
    point(from.x + ux * s + nx * off, from.y + uy * s + ny * off);

  let list = spec.intervals;
  if (reverse) {
    list = list
      .map(([s, e]): [number, number] => [length - e, length - s])
      .sort((a, b) => a[0] - b[0]);
  }
  if (spec.mode === 'flat' || !list.length) {
    out.push(point(from.x, from.y), point(to.x, to.y));
    return out;
  }
  const off = spec.mode === 'tabs' ? spec.depth : -spec.depth;
  out.push(point(from.x, from.y));
  for (const [s, e] of list) {
    const a = clamp(s, 0, length);
    const b = clamp(e, 0, length);
    if (b - a < 1e-6) continue;
    out.push(at(a, 0), at(a, off), at(b, off), at(b, 0));
  }
  out.push(point(to.x, to.y));
  return out;
}

function panelPoints(
  width: number,
  height: number,
  edges: {
    bottom: EdgeSpec;
    right: EdgeSpec;
    top: EdgeSpec;
    left: EdgeSpec;
  },
): Point[] {
  const p00 = point(0, 0);
  const p10 = point(width, 0);
  const p11 = point(width, height);
  const p01 = point(0, height);
  const raw: Point[] = [
    ...edgePoints(p00, p10, edges.bottom, false),
    ...edgePoints(p10, p11, edges.right, false),
    ...edgePoints(p11, p01, edges.top, true),
    ...edgePoints(p01, p00, edges.left, true),
  ];
  // Remove repetidos consecutivos e o último igual ao primeiro.
  const out: Point[] = [];
  for (const p of raw) {
    if (!out.length || !samePoint(out[out.length - 1], p)) out.push(p);
  }
  while (out.length > 1 && samePoint(out[0], out[out.length - 1])) out.pop();
  return out;
}

function translate(points: Point[], dx: number, dy: number): Point[] {
  return points.map((p) => point(p.x + dx, p.y + dy));
}

/**
 * Painéis da caixa, já deitados na chapa (uma linha, com `BOX_PANEL_GAP_MM`
 * entre eles). A base de todos fica em Y = 0.
 */
export function boxPanels(options: Partial<BoxOptions> = {}): BoxResult {
  const o = sanitizeBox(options);
  const t = o.thickness;
  const withTop = o.top !== false;
  // Dimensões internas: precisam sobrar paredes dos dois lados.
  const innerW = Math.max(1, o.width - 2 * t);
  const innerD = Math.max(1, o.depth - 2 * t);
  const innerH = Math.max(1, o.height);
  const tab = o.finger;

  const verticalTabs = fingerIntervals(innerH, tab);
  const verticalSlots = slotIntervals(verticalTabs, o.clearance ?? 0, innerH);
  const baseFrontTabs = fingerIntervals(innerW, tab);
  const baseSideTabs = fingerIntervals(innerD, tab);
  // As fendas da parede acompanham o dedo da base, deslocadas de `t` (a base
  // está entre as paredes).
  const wallFrontSlots = slotIntervals(
    baseFrontTabs,
    o.clearance ?? 0,
    innerW,
  ).map(([s, e]): [number, number] => [s + t, e + t]);
  const wallSideSlots = slotIntervals(
    baseSideTabs,
    o.clearance ?? 0,
    innerD,
  ).map(([s, e]): [number, number] => [s + t, e + t]);

  const verticalTabEdge: EdgeSpec = {
    mode: 'tabs',
    intervals: verticalTabs,
    depth: t,
  };
  const verticalSlotEdge: EdgeSpec = {
    mode: 'slots',
    intervals: verticalSlots,
    depth: t,
  };
  const wallBottomFront: EdgeSpec = {
    mode: 'slots',
    intervals: wallFrontSlots,
    depth: t,
  };
  const wallBottomSide: EdgeSpec = {
    mode: 'slots',
    intervals: wallSideSlots,
    depth: t,
  };
  const baseTabFront: EdgeSpec = {
    mode: 'tabs',
    intervals: baseFrontTabs,
    depth: t,
  };
  const baseTabSide: EdgeSpec = {
    mode: 'tabs',
    intervals: baseSideTabs,
    depth: t,
  };

  const specs: Array<{
    key: BoxPanelKey;
    w: number;
    h: number;
    edges: Record<'bottom' | 'right' | 'top' | 'left', EdgeSpec>;
  }> = [
    {
      key: 'front',
      w: o.width,
      h: o.height,
      edges: {
        bottom: wallBottomFront,
        right: verticalSlotEdge,
        top: withTop ? wallBottomFront : FLAT,
        left: verticalSlotEdge,
      },
    },
    {
      key: 'back',
      w: o.width,
      h: o.height,
      edges: {
        bottom: wallBottomFront,
        right: verticalSlotEdge,
        top: withTop ? wallBottomFront : FLAT,
        left: verticalSlotEdge,
      },
    },
    {
      key: 'left',
      w: innerD,
      h: o.height,
      edges: {
        bottom: wallBottomSide,
        right: verticalTabEdge,
        top: withTop ? wallBottomSide : FLAT,
        left: verticalTabEdge,
      },
    },
    {
      key: 'right',
      w: innerD,
      h: o.height,
      edges: {
        bottom: wallBottomSide,
        right: verticalTabEdge,
        top: withTop ? wallBottomSide : FLAT,
        left: verticalTabEdge,
      },
    },
    {
      key: 'bottom',
      w: innerW,
      h: innerD,
      edges: {
        bottom: baseTabFront,
        right: baseTabSide,
        top: baseTabFront,
        left: baseTabSide,
      },
    },
  ];
  if (withTop) {
    specs.push({
      key: 'top',
      w: innerW,
      h: innerD,
      edges: {
        bottom: baseTabFront,
        right: baseTabSide,
        top: baseTabFront,
        left: baseTabSide,
      },
    });
  }

  const panels: GeneratedPanel[] = [];
  let x = 0;
  let maxY = 0;
  for (const s of specs) {
    const pts = panelPoints(s.w, s.h, s.edges);
    // Os dedos saem da caixa nominal: o encaixe na chapa usa a caixa real,
    // então um painel nunca invade o vizinho.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxPanelY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxPanelY = Math.max(maxPanelY, p.y);
    }
    panels.push({
      key: s.key,
      points: translate(pts, x - minX, -minY),
    });
    x += maxX - minX + BOX_PANEL_GAP_MM;
    maxY = Math.max(maxY, maxPanelY - minY);
  }
  return {
    panels,
    width: Math.max(0, x - BOX_PANEL_GAP_MM),
    height: maxY,
    top: withTop,
  };
}

export function sanitizeGear(options: Partial<GearOptions> = {}): GearOptions {
  const module = clamp(
    finite(options.module, 2),
    GEAR_MODULE_MIN,
    GEAR_MODULE_MAX,
  );
  const teeth = Math.round(
    clamp(finite(options.teeth, 20), GEAR_TEETH_MIN, GEAR_TEETH_MAX),
  );
  const pressureAngle = clamp(
    finite(options.pressureAngle, 20),
    GEAR_ANGLE_MIN_DEG,
    GEAR_ANGLE_MAX_DEG,
  );
  const bore = Math.max(0, finite(options.bore, 0));
  return { module, teeth, pressureAngle, bore };
}

function involute(angle: number): number {
  return Math.tan(angle) - angle;
}

/**
 * Engrenagem de dentes retos com flanco **evolutente** (perfil de involuta),
 * centrada em (0, 0), com raiz circular entre os dentes. Serve para corte a
 * laser: o contorno já é o externo compensável pelo kerf da camada.
 */
export function gearOutline(options: Partial<GearOptions> = {}): GearResult {
  const o = sanitizeGear(options);
  const m = o.module;
  const z = o.teeth;
  const alpha = ((o.pressureAngle ?? 20) * Math.PI) / 180;
  const r = (m * z) / 2;
  const rb = r * Math.cos(alpha);
  const ra = r + m;
  const rf = Math.max(0.1, r - 1.25 * m);
  const startR = Math.max(rb, rf);
  const invAlpha = involute(alpha);
  const halfAt = (rho: number): number => {
    const ratio = clamp(rb / Math.max(rho, rb), -1, 1);
    return Math.PI / (2 * z) + invAlpha - involute(Math.acos(ratio));
  };
  const tipHalf = Math.max(0.002, halfAt(ra));
  const rootHalf = Math.max(0.001, halfAt(startR));
  const step = (2 * Math.PI) / z;
  const flank = 5;
  const rootArc = 3;
  const points: Point[] = [];
  const push = (rho: number, angle: number): void => {
    points.push(point(Math.cos(angle) * rho, Math.sin(angle) * rho));
  };

  for (let i = 0; i < z; i++) {
    const c = i * step;
    const next = (i + 1) * step;
    // Base do flanco direito (na raiz ou no círculo de base).
    if (startR > rf + 1e-9) push(rf, c - rootHalf);
    for (let k = 0; k <= flank; k++) {
      const rho = startR + ((ra - startR) * k) / flank;
      push(rho, c - Math.max(0.0005, halfAt(rho)));
    }
    // Ponta do dente (arco curto, mantendo o dente com largura mínima).
    push(ra, c - tipHalf);
    push(ra, c + tipHalf);
    for (let k = flank; k >= 0; k--) {
      const rho = startR + ((ra - startR) * k) / flank;
      push(rho, c + Math.max(0.0005, halfAt(rho)));
    }
    // Arco de raiz até o próximo dente.
    const from = c + rootHalf;
    const to = next - rootHalf;
    for (let k = 1; k < rootArc; k++) {
      push(rf, from + ((to - from) * k) / rootArc);
    }
  }
  // Remove repetidos (pontos coincidentes por arredondamento).
  const clean: Point[] = [];
  for (const p of points) {
    const last = clean[clean.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-6) clean.push(p);
  }
  return {
    points: clean,
    pitchDiameter: 2 * r,
    outerDiameter: 2 * ra,
    rootDiameter: 2 * rf,
    bore: o.bore ?? 0,
  };
}
