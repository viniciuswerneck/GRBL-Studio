import { describe, expect, it } from 'vitest';
import {
  boundsIntersect,
  distanceToSegment,
  entityIndices,
  expandSelection,
  hitTest,
  pointInPolygon,
  reorderEntities,
  rotatePoint,
  selectionBounds,
  shapeBounds,
  simplifyPolyline,
  unionBounds,
} from '../src/shared/designEditor';
import type { Shape } from '../src/shared/design';

const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<Shape> = {},
): Shape => ({
  kind: 'rect',
  points: [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ],
  closed: true,
  ...extra,
});

describe('shapeBounds / unionBounds / selectionBounds', () => {
  it('calcula a caixa de uma forma', () => {
    expect(shapeBounds(rect(2, 3, 10, 5))).toEqual({
      minX: 2,
      minY: 3,
      maxX: 12,
      maxY: 8,
    });
  });

  it('forma sem pontos não tem caixa', () => {
    expect(shapeBounds({ kind: 'line', points: [], closed: false })).toBeNull();
  });

  it('une caixas', () => {
    const b = unionBounds([
      { minX: 0, minY: 0, maxX: 2, maxY: 2 },
      { minX: -1, minY: 1, maxX: 5, maxY: 4 },
    ]);
    expect(b).toEqual({ minX: -1, minY: 0, maxX: 5, maxY: 4 });
  });

  it('selectionBounds considera só os índices pedidos', () => {
    const shapes = [rect(0, 0, 2, 2), rect(10, 10, 4, 4)];
    expect(selectionBounds(shapes, [1])).toEqual({
      minX: 10,
      minY: 10,
      maxX: 14,
      maxY: 14,
    });
    expect(selectionBounds(shapes, [0, 1])).toEqual({
      minX: 0,
      minY: 0,
      maxX: 14,
      maxY: 14,
    });
    expect(selectionBounds(shapes, [])).toBeNull();
  });

  it('boundsIntersect detecta sobreposição', () => {
    const a = { minX: 0, minY: 0, maxX: 5, maxY: 5 };
    expect(boundsIntersect(a, { minX: 6, minY: 0, maxX: 9, maxY: 5 })).toBe(
      false,
    );
    expect(boundsIntersect(a, { minX: 4, minY: 4, maxX: 9, maxY: 9 })).toBe(
      true,
    );
  });
});

describe('hitTest / pointInPolygon / distanceToSegment', () => {
  it('ponto dentro do polígono', () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(pointInPolygon(poly, 5, 5)).toBe(true);
    expect(pointInPolygon(poly, 15, 5)).toBe(false);
  });

  it('distância ao segmento (inclui projeção)', () => {
    expect(distanceToSegment(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
    expect(distanceToSegment(-2, 0, 0, 0, 10, 0)).toBeCloseTo(2);
  });

  it('seleciona a forma mais ao topo', () => {
    const shapes = [rect(0, 0, 10, 10), rect(5, 5, 10, 10)];
    // Ponto só da segunda (topo).
    expect(hitTest(shapes, 12, 12, 0.5)).toBe(1);
    // Ponto compartilhado -> a mais ao topo.
    expect(hitTest(shapes, 6, 6, 0.5)).toBe(1);
    // Nada.
    expect(hitTest(shapes, 50, 50, 0.5)).toBe(-1);
  });

  it('tolera clique perto da aresta de uma linha', () => {
    const line: Shape = {
      kind: 'line',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      closed: false,
    };
    expect(hitTest([line], 5, 0.3, 0.5)).toBe(0);
    expect(hitTest([line], 5, 3, 0.5)).toBe(-1);
  });
});

describe('grupos / entidades', () => {
  const shapes: Shape[] = [
    rect(0, 0, 1, 1),
    rect(0, 0, 1, 1, { group: 't1' }),
    rect(1, 0, 1, 1, { group: 't1' }),
    rect(5, 5, 1, 1),
  ];

  it('expandSelection traz o grupo inteiro', () => {
    expect(expandSelection(shapes, 0)).toEqual([0]);
    expect(expandSelection(shapes, 1)).toEqual([1, 2]);
    expect(expandSelection(shapes, 2)).toEqual([1, 2]);
  });

  it('entityIndices agrupa e preserva a ordem', () => {
    expect(entityIndices(shapes)).toEqual([[0], [1, 2], [3]]);
  });
});

describe('reorderEntities', () => {
  const shapes: Shape[] = [
    rect(0, 0, 1, 1),
    rect(1, 0, 1, 1),
    rect(2, 0, 1, 1),
    rect(3, 0, 1, 1),
  ];
  const order = (list: Shape[]) => list.map((s) => s.points[0].x);

  it('front / back', () => {
    expect(order(reorderEntities(shapes, new Set([1]), 'front'))).toEqual([
      0, 2, 3, 1,
    ]);
    expect(order(reorderEntities(shapes, new Set([2]), 'back'))).toEqual([
      2, 0, 1, 3,
    ]);
  });

  it('forward / backward movem um nível', () => {
    expect(order(reorderEntities(shapes, new Set([0]), 'forward'))).toEqual([
      1, 0, 2, 3,
    ]);
    expect(order(reorderEntities(shapes, new Set([3]), 'backward'))).toEqual([
      0, 1, 3, 2,
    ]);
  });

  it('mantém as formas do grupo juntas', () => {
    const grouped: Shape[] = [
      rect(0, 0, 1, 1, { group: 'g' }),
      rect(1, 0, 1, 1),
      rect(2, 0, 1, 1, { group: 'g' }),
    ];
    const out = reorderEntities(grouped, new Set([0, 2]), 'front');
    expect(out.map((s) => s.points[0].x)).toEqual([1, 0, 2]);
  });
});

describe('simplifyPolyline / rotatePoint', () => {
  it('remove pontos colineares', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    expect(simplifyPolyline(pts, 0.01)).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it('preserva desvios maiores que a tolerância', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ];
    expect(simplifyPolyline(pts, 0.1)).toHaveLength(3);
    expect(simplifyPolyline(pts, 1.1)).toHaveLength(2);
  });

  it('rotação de 90° em torno da origem', () => {
    const p = rotatePoint({ x: 1, y: 0 }, 0, 0, Math.PI / 2);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
});
