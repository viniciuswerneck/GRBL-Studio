import { describe, expect, it } from 'vitest';
import {
  LIBRARY_DEFAULT_MM,
  LIBRARY_MAX_MM,
  LIBRARY_MIN_MM,
  SHAPE_LIBRARY,
  libraryItem,
  libraryShapes,
  sanitizeLibrarySize,
} from '../src/shared/shapesLibrary';
import {
  STRIP_DEFAULT_GAP_MM,
  STRIP_DEFAULT_SIZES,
  STRIP_MAX_ITEMS,
  STRIP_MAX_MM,
  STRIP_MIN_MM,
  parseStripSizes,
  placeStrip,
  sanitizeStripGap,
  sanitizeStripSize,
  sanitizeStripSpec,
} from '../src/shared/codeTestStrip';

function bbox(points: Array<{ x: number; y: number }>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

describe('biblioteca de símbolos', () => {
  it('tem itens únicos, nomeados por i18n e com pontos finitos', () => {
    const ids = new Set<string>();
    for (const item of SHAPE_LIBRARY) {
      expect(item.id).toMatch(/^[a-z0-9]+$/);
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(item.nameKey.startsWith('design.lib.')).toBe(true);
      expect(item.paths.length).toBeGreaterThan(0);
      for (const path of item.paths) {
        expect(path.points.length).toBeGreaterThanOrEqual(2);
        for (const p of path.points) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
        }
      }
    }
    expect(SHAPE_LIBRARY.length).toBeGreaterThanOrEqual(12);
  });

  it('encontra por id e devolve null para desconhecido', () => {
    expect(libraryItem('star5')?.id).toBe('star5');
    expect(libraryItem('nada')).toBeNull();
    expect(libraryItem(42)).toBeNull();
  });

  it('centra a forma no ponto e encaixa a maior dimensão no tamanho', () => {
    for (const item of SHAPE_LIBRARY) {
      const shapes = libraryShapes(item, 60, 100, 50);
      expect(shapes.length).toBe(item.paths.length);
      const all = shapes.flatMap((s) => s.points);
      const b = bbox(all);
      expect((b.minX + b.maxX) / 2).toBeCloseTo(100, 5);
      expect((b.minY + b.maxY) / 2).toBeCloseTo(50, 5);
      const maxDim = Math.max(b.maxX - b.minX, b.maxY - b.minY);
      expect(maxDim).toBeCloseTo(60, 5);
    }
  });

  it('mantém o traço aberto/fechado de cada caminho', () => {
    const frame = libraryShapes(libraryItem('frame'), 30, 0, 0);
    expect(frame.every((s) => s.closed)).toBe(true);
    const corners = libraryShapes(libraryItem('corners'), 30, 0, 0);
    expect(corners.every((s) => !s.closed)).toBe(true);
  });

  it('inverte o Y (fonte Y para cima, editor Y para baixo)', () => {
    const arrow = libraryShapes(libraryItem('arrow'), 20, 0, 0);
    const pts = arrow[0].points;
    // A ponta (maior Y na fonte) fica com o menor Y no editor.
    const tip = pts.reduce((a, b) => (a.y < b.y ? a : b));
    expect(tip.x).toBeGreaterThan(0);
    // A ponta está a 0,38 do centro na fonte (0,88 − 0,5) × 20 mm.
    expect(tip.y).toBeCloseTo(-7.6, 5);
  });

  it('sanitiza o tamanho', () => {
    expect(sanitizeLibrarySize(50)).toBe(50);
    expect(sanitizeLibrarySize(0)).toBe(LIBRARY_MIN_MM);
    expect(sanitizeLibrarySize(9999)).toBe(LIBRARY_MAX_MM);
    expect(sanitizeLibrarySize('x')).toBe(LIBRARY_DEFAULT_MM);
    expect(libraryShapes(null, 30)).toEqual([]);
  });
});

describe('tira de teste de código', () => {
  it('lê a lista de tamanhos (vírgula/ponto e vírgula), ordena e remove repetidos', () => {
    expect(parseStripSizes('10, 15, 20')).toEqual([10, 15, 20]);
    expect(parseStripSizes('20;10;15;10')).toEqual([10, 15, 20]);
    expect(parseStripSizes([25, '10', 15])).toEqual([10, 15, 25]);
    expect(parseStripSizes('')).toEqual([]);
    expect(parseStripSizes('abc, 10')).toEqual([10]);
    expect(parseStripSizes(42)).toEqual([]);
  });

  it('limita o tamanho e a quantidade de células', () => {
    expect(sanitizeStripSize(1)).toBe(STRIP_MIN_MM);
    expect(sanitizeStripSize(999)).toBe(STRIP_MAX_MM);
    expect(sanitizeStripSize(12.34)).toBe(12.3);
    expect(sanitizeStripSize('x')).toBeNull();
    const many = Array.from({ length: 20 }, (_, i) => 10 + i);
    expect(parseStripSizes(many)).toHaveLength(STRIP_MAX_ITEMS);
  });

  it('sanitiza o espaço entre células', () => {
    expect(sanitizeStripGap(5)).toBe(5);
    expect(sanitizeStripGap(0)).toBe(1);
    expect(sanitizeStripGap(999)).toBe(50);
    expect(sanitizeStripGap('x')).toBe(STRIP_DEFAULT_GAP_MM);
  });

  it('enfileira as células com o espaço pedido, alinhadas pelo topo', () => {
    const plan = placeStrip(
      [
        { widthMm: 10, heightMm: 10 },
        { widthMm: 15, heightMm: 12 },
        { widthMm: 20, heightMm: 8 },
      ],
      5,
    );
    expect(plan.slots.map((s) => s.x)).toEqual([0, 15, 35]);
    expect(plan.slots.every((s) => s.y === 0)).toBe(true);
    expect(plan.widthMm).toBe(55);
    expect(plan.heightMm).toBe(12);
  });

  it('ignora células inválidas e lida com lista vazia', () => {
    expect(placeStrip([], 5)).toEqual({ slots: [], widthMm: 0, heightMm: 0 });
    const plan = placeStrip(
      [
        { widthMm: 0, heightMm: 10 },
        { widthMm: 10, heightMm: 10 },
        { widthMm: Number.NaN, heightMm: 5 },
      ],
      2,
    );
    expect(plan.slots).toHaveLength(1);
    expect(plan.widthMm).toBe(10);
  });

  it('normaliza a especificação guardada no bloco', () => {
    expect(sanitizeStripSpec({ sizes: [10, 20], gapMm: 4 })).toEqual({
      sizes: [10, 20],
      gapMm: 4,
    });
    expect(sanitizeStripSpec({ sizes: [10] })).toBeNull();
    expect(sanitizeStripSpec(null)).toBeNull();
    expect(
      sanitizeStripSpec({ sizes: STRIP_DEFAULT_SIZES, gapMm: 0 })?.gapMm,
    ).toBe(1);
  });
});
