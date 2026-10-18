/**
 * Fontes vetoriais single-stroke (estilo Hershey) para gravação a laser.
 *
 * Fontes single-stroke são ideais para laser/CNC: cada letra é um conjunto de
 * linhas (sem preenchimento), o que produz gravação rápida e limpa. Este
 * módulo embute uma fonte "Simplex" (maiúsculas, dígitos e pontuação básica)
 * e expõe `textToShapes()` para converter texto em formas vetoriais.
 *
 * A estrutura permite adicionar outras fontes (ex.: "Script", "Gothic") sem
 * mudar a API: basta registrar em `FONTS` e escolher pelo id.
 */

export interface FontGlyph {
  /** Largura do avanço (em unidades de fonte, altura = 1). */
  advance: number;
  /** Traços: cada traço é uma polilinha de pontos [x, y]. */
  strokes: Array<Array<[number, number]>>;
}

export interface VectorFont {
  id: string;
  name: string;
  /** Altura da linha de base (1 unidade). */
  height: number;
  glyphs: Record<string, FontGlyph>;
  /** Glifo usado para caracteres não mapeados. */
  fallback: string;
}

/** Fonte Simplex (maiúsculas + dígitos + pontuação). Coordenadas em unidades
 *  de fonte; altura total ≈ 1.0, baseline em y=0, ascendente positivo. */
const SIMPLEX_GLYPHS: Record<string, FontGlyph> = {
  ' ': { advance: 0.4, strokes: [] },
  A: {
    advance: 0.7,
    strokes: [
      [
        [0.05, 0],
        [0.35, 1],
        [0.65, 0],
      ],
      [
        [0.18, 0.45],
        [0.52, 0.45],
      ],
    ],
  },
  B: {
    advance: 0.7,
    strokes: [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0, 1],
        [0.4, 1],
        [0.55, 0.85],
        [0.55, 0.6],
        [0.4, 0.45],
        [0, 0.45],
      ],
      [
        [0, 0.45],
        [0.4, 0.45],
        [0.55, 0.3],
        [0.55, 0.15],
        [0.4, 0],
        [0, 0],
      ],
    ],
  },
  C: {
    advance: 0.7,
    strokes: [
      [
        [0.6, 0.1],
        [0.45, 0],
        [0.15, 0],
        [0, 0.15],
        [0, 0.85],
        [0.15, 1],
        [0.45, 1],
        [0.6, 0.9],
      ],
    ],
  },
  D: {
    advance: 0.7,
    strokes: [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0, 1],
        [0.4, 1],
        [0.6, 0.8],
        [0.6, 0.2],
        [0.4, 0],
        [0, 0],
      ],
    ],
  },
  E: {
    advance: 0.6,
    strokes: [
      [
        [0.6, 0],
        [0, 0],
        [0, 1],
        [0.6, 1],
      ],
      [
        [0, 0.5],
        [0.45, 0.5],
      ],
    ],
  },
  F: {
    advance: 0.6,
    strokes: [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0, 1],
        [0.6, 1],
      ],
      [
        [0, 0.5],
        [0.45, 0.5],
      ],
    ],
  },
  G: {
    advance: 0.7,
    strokes: [
      [
        [0.6, 0.1],
        [0.45, 0],
        [0.15, 0],
        [0, 0.15],
        [0, 0.85],
        [0.15, 1],
        [0.45, 1],
        [0.6, 0.9],
        [0.6, 0.5],
        [0.4, 0.5],
      ],
    ],
  },
  H: {
    advance: 0.7,
    strokes: [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0.6, 0],
        [0.6, 1],
      ],
      [
        [0, 0.5],
        [0.6, 0.5],
      ],
    ],
  },
  I: {
    advance: 0.3,
    strokes: [
      [
        [0.15, 0],
        [0.15, 1],
      ],
    ],
  },
  J: {
    advance: 0.5,
    strokes: [
      [
        [0.4, 1],
        [0.4, 0.15],
        [0.3, 0],
        [0.15, 0],
        [0, 0.15],
      ],
    ],
  },
  K: {
    advance: 0.7,
    strokes: [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0.6, 1],
        [0, 0.45],
      ],
      [
        [0.2, 0.65],
        [0.6, 0],
      ],
    ],
  },
  L: {
    advance: 0.6,
    strokes: [
      [
        [0, 1],
        [0, 0],
        [0.6, 0],
      ],
    ],
  },
  M: {
    advance: 0.8,
    strokes: [
      [
        [0, 0],
        [0, 1],
        [0.4, 0.5],
        [0.8, 1],
        [0.8, 0],
      ],
    ],
  },
  N: {
    advance: 0.7,
    strokes: [
      [
        [0, 0],
        [0, 1],
        [0.6, 0],
        [0.6, 1],
      ],
    ],
  },
  O: {
    advance: 0.7,
    strokes: [
      [
        [0.15, 0],
        [0.45, 0],
        [0.6, 0.15],
        [0.6, 0.85],
        [0.45, 1],
        [0.15, 1],
        [0, 0.85],
        [0, 0.15],
        [0.15, 0],
      ],
    ],
  },
  P: {
    advance: 0.6,
    strokes: [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0, 1],
        [0.45, 1],
        [0.6, 0.85],
        [0.6, 0.6],
        [0.45, 0.45],
        [0, 0.45],
      ],
    ],
  },
  Q: {
    advance: 0.7,
    strokes: [
      [
        [0.15, 0],
        [0.45, 0],
        [0.6, 0.15],
        [0.6, 0.85],
        [0.45, 1],
        [0.15, 1],
        [0, 0.85],
        [0, 0.15],
        [0.15, 0],
      ],
      [
        [0.35, 0.6],
        [0.65, 0.2],
      ],
    ],
  },
  R: {
    advance: 0.7,
    strokes: [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0, 1],
        [0.45, 1],
        [0.6, 0.85],
        [0.6, 0.6],
        [0.45, 0.45],
        [0, 0.45],
      ],
      [
        [0.3, 0.45],
        [0.6, 0],
      ],
    ],
  },
  S: {
    advance: 0.6,
    strokes: [
      [
        [0.55, 0.05],
        [0.45, 0],
        [0.1, 0],
        [0, 0.1],
        [0, 0.35],
        [0.1, 0.45],
        [0.45, 0.45],
        [0.55, 0.55],
        [0.55, 0.9],
        [0.45, 1],
        [0.1, 1],
        [0, 0.95],
      ],
    ],
  },
  T: {
    advance: 0.6,
    strokes: [
      [
        [0, 1],
        [0.6, 1],
      ],
      [
        [0.3, 1],
        [0.3, 0],
      ],
    ],
  },
  U: {
    advance: 0.7,
    strokes: [
      [
        [0, 1],
        [0, 0.15],
        [0.15, 0],
        [0.45, 0],
        [0.6, 0.15],
        [0.6, 1],
      ],
    ],
  },
  V: {
    advance: 0.7,
    strokes: [
      [
        [0, 1],
        [0.3, 0],
        [0.6, 1],
      ],
    ],
  },
  W: {
    advance: 0.9,
    strokes: [
      [
        [0, 1],
        [0.2, 0],
        [0.4, 0.6],
        [0.6, 0],
        [0.8, 1],
      ],
    ],
  },
  X: {
    advance: 0.7,
    strokes: [
      [
        [0, 0],
        [0.6, 1],
      ],
      [
        [0, 1],
        [0.6, 0],
      ],
    ],
  },
  Y: {
    advance: 0.7,
    strokes: [
      [
        [0, 1],
        [0.3, 0.5],
      ],
      [
        [0.6, 1],
        [0.3, 0.5],
        [0.3, 0],
      ],
    ],
  },
  Z: {
    advance: 0.6,
    strokes: [
      [
        [0, 1],
        [0.6, 1],
      ],
      [
        [0.6, 1],
        [0, 0],
      ],
      [
        [0, 0],
        [0.6, 0],
      ],
    ],
  },
  '0': {
    advance: 0.6,
    strokes: [
      [
        [0.15, 0],
        [0.45, 0],
        [0.6, 0.15],
        [0.6, 0.85],
        [0.45, 1],
        [0.15, 1],
        [0, 0.85],
        [0, 0.15],
        [0.15, 0],
      ],
    ],
  },
  '1': {
    advance: 0.4,
    strokes: [
      [
        [0.2, 0],
        [0.2, 1],
        [0.1, 0.85],
      ],
    ],
  },
  '2': {
    advance: 0.6,
    strokes: [
      [
        [0, 0.1],
        [0.1, 0],
        [0.5, 0],
        [0.6, 0.1],
        [0.6, 0.4],
        [0, 1],
        [0.6, 1],
      ],
    ],
  },
  '3': {
    advance: 0.6,
    strokes: [
      [
        [0, 0],
        [0.5, 0],
        [0.6, 0.1],
        [0.6, 0.4],
        [0.5, 0.5],
        [0.1, 0.5],
      ],
      [
        [0.5, 0.5],
        [0.6, 0.6],
        [0.6, 0.9],
        [0.5, 1],
        [0, 1],
      ],
    ],
  },
  '4': {
    advance: 0.6,
    strokes: [
      [
        [0.5, 0],
        [0.5, 1],
      ],
      [
        [0, 0.6],
        [0.6, 0.6],
      ],
    ],
  },
  '5': {
    advance: 0.6,
    strokes: [
      [
        [0.6, 0],
        [0, 0],
        [0, 0.45],
        [0.5, 0.45],
        [0.6, 0.55],
        [0.6, 0.9],
        [0.5, 1],
        [0, 1],
      ],
    ],
  },
  '6': {
    advance: 0.6,
    strokes: [
      [
        [0.5, 0],
        [0.15, 0],
        [0, 0.15],
        [0, 0.85],
        [0.15, 1],
        [0.45, 1],
        [0.6, 0.85],
        [0.6, 0.55],
        [0.45, 0.45],
        [0.15, 0.45],
        [0, 0.55],
      ],
    ],
  },
  '7': {
    advance: 0.6,
    strokes: [
      [
        [0, 1],
        [0.6, 1],
        [0, 0],
      ],
    ],
  },
  '8': {
    advance: 0.6,
    strokes: [
      [
        [0.15, 0],
        [0.45, 0],
        [0.6, 0.15],
        [0.6, 0.4],
        [0.45, 0.5],
        [0.15, 0.5],
        [0, 0.4],
        [0, 0.15],
        [0.15, 0],
      ],
      [
        [0.15, 0.5],
        [0.45, 0.5],
        [0.6, 0.6],
        [0.6, 0.85],
        [0.45, 1],
        [0.15, 1],
        [0, 0.85],
        [0, 0.6],
        [0.15, 0.5],
      ],
    ],
  },
  '9': {
    advance: 0.6,
    strokes: [
      [
        [0.15, 0.45],
        [0.45, 0.45],
        [0.6, 0.35],
        [0.6, 0.15],
        [0.45, 0],
        [0.15, 0],
        [0, 0.15],
        [0, 0.35],
        [0.15, 0.45],
      ],
      [
        [0.6, 0.35],
        [0.6, 0.85],
        [0.45, 1],
        [0.15, 1],
        [0, 0.85],
      ],
    ],
  },
  '.': {
    advance: 0.3,
    strokes: [
      [
        [0.1, 0],
        [0.15, 0.05],
        [0.1, 0.1],
        [0.05, 0.05],
        [0.1, 0],
      ],
    ],
  },
  ',': {
    advance: 0.3,
    strokes: [
      [
        [0.15, 0.1],
        [0.1, 0],
        [0.05, 0.05],
        [0.1, 0.1],
      ],
      [
        [0.1, 0],
        [0.1, -0.15],
      ],
    ],
  },
  '-': {
    advance: 0.4,
    strokes: [
      [
        [0, 0.5],
        [0.4, 0.5],
      ],
    ],
  },
  '/': {
    advance: 0.4,
    strokes: [
      [
        [0, 0],
        [0.4, 1],
      ],
    ],
  },
  ':': {
    advance: 0.3,
    strokes: [
      [
        [0.1, 0.2],
        [0.15, 0.25],
        [0.1, 0.3],
        [0.05, 0.25],
        [0.1, 0.2],
      ],
      [
        [0.1, 0.7],
        [0.15, 0.75],
        [0.1, 0.8],
        [0.05, 0.75],
        [0.1, 0.7],
      ],
    ],
  },
  '!': {
    advance: 0.3,
    strokes: [
      [
        [0.1, 0.3],
        [0.15, 1],
      ],
      [
        [0.1, 0],
        [0.15, 0.05],
        [0.1, 0.1],
        [0.05, 0.05],
        [0.1, 0],
      ],
    ],
  },
  '?': {
    advance: 0.5,
    strokes: [
      [
        [0.1, 0.5],
        [0.1, 0.85],
        [0.2, 1],
        [0.4, 1],
        [0.5, 0.9],
        [0.5, 0.7],
        [0.3, 0.5],
      ],
      [
        [0.3, 0],
        [0.35, 0.05],
        [0.3, 0.1],
        [0.25, 0.05],
        [0.3, 0],
      ],
    ],
  },
  '(': {
    advance: 0.4,
    strokes: [
      [
        [0.3, 0],
        [0.15, 0.15],
        [0.1, 0.4],
        [0.1, 0.6],
        [0.15, 0.85],
        [0.3, 1],
      ],
    ],
  },
  ')': {
    advance: 0.4,
    strokes: [
      [
        [0.1, 0],
        [0.25, 0.15],
        [0.3, 0.4],
        [0.3, 0.6],
        [0.25, 0.85],
        [0.1, 1],
      ],
    ],
  },
};

const SIMPLEX: VectorFont = {
  id: 'simplex',
  name: 'Simplex (single-stroke)',
  height: 1,
  glyphs: SIMPLEX_GLYPHS,
  fallback: '?',
};

/** Catálogo de fontes disponíveis. */
export const FONTS: VectorFont[] = [SIMPLEX];

export const DEFAULT_FONT = 'simplex';

export function getFont(id: string): VectorFont {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

export interface TextToShapesOptions {
  text: string;
  fontId?: string;
  /** Tamanho da letra (altura) em mm. */
  size: number;
  /** Posição do canto inferior esquerdo do texto. */
  x: number;
  y: number;
  /** Espaçamento entre letras (em unidades de fonte). */
  letterSpacing?: number;
}

/**
 * Converte texto em formas vetoriais (uma forma por letra, fechada=false).
 * Cada glifo vira um conjunto de polilinhas (strokes) escaladas.
 */
export interface TextShape {
  kind: 'text';
  points: Array<{ x: number; y: number }>;
  closed: boolean;
}

/**
 * Ligações/dígrafos que o NFD não decompõe e que têm equivalente no alfabeto
 * do traço único.
 */
const LIGATURES: Record<string, string> = {
  Ø: 'O',
  Đ: 'D',
  Ł: 'L',
  Æ: 'AE',
  Œ: 'OE',
  ß: 'SS',
};

/**
 * Normaliza um caractere para o alfabeto da fonte single-stroke (A–Z, 0–9 e
 * pontuação): remove acentos (`ção` → `CAO`) e resolve dígrafos comuns.
 */
export function glyphKey(ch: string): string {
  const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const upper = base.toUpperCase();
  return LIGATURES[upper] ?? upper;
}

/**
 * Caracteres do texto sem glifo na fonte single-stroke (viram `?`). Serve para
 * avisar o usuário em vez de gravar um `?` silencioso.
 */
export function unsupportedChars(text: string, fontId?: string): string[] {
  const font = getFont(fontId ?? DEFAULT_FONT);
  const out: string[] = [];
  for (const ch of text) {
    if (ch === ' ' || ch === '\t') continue;
    const key = glyphKey(ch);
    if (font.glyphs[key]) continue;
    // Dígrafos (AE/OE/SS) são aceitos quando todos os glifos existem.
    if (key.length > 1 && [...key].every((c) => font.glyphs[c])) continue;
    if (!out.includes(ch)) out.push(ch);
  }
  return out;
}

export function textToShapes(opts: TextToShapesOptions): TextShape[] {
  const font = getFont(opts.fontId ?? DEFAULT_FONT);
  const scale = opts.size / font.height;
  const shapes: TextShape[] = [];
  let cx = opts.x;
  const cy = opts.y;
  const emit = (key: string): void => {
    const glyph = font.glyphs[key] ?? font.glyphs[font.fallback];
    if (!glyph) return;
    for (const stroke of glyph.strokes) {
      const pts = stroke.map(([gx, gy]) => ({
        x: cx + gx * scale,
        y: cy + (1 - gy) * scale, // fonte y-up -> canvas y-down
      }));
      if (pts.length >= 2) {
        shapes.push({ kind: 'text', points: pts, closed: false });
      }
    }
    cx += (glyph.advance + (opts.letterSpacing ?? 0.1)) * scale;
  };
  for (const ch of opts.text) {
    const key = glyphKey(ch);
    if (font.glyphs[key]) emit(key);
    else if (key.length > 1)
      for (const c of key) emit(c); // dígrafos
    else emit(key); // sem glifo -> fallback (`?`)
  }
  return shapes;
}

/** Lista de ids/nomes de fontes (para o seletor da UI). */
export function fontOptions(): Array<{ id: string; name: string }> {
  return FONTS.map((f) => ({ id: f.id, name: f.name }));
}
