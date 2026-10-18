import { describe, expect, it } from 'vitest';
import {
  arrayEntities,
  boundsIntersect,
  distanceToSegment,
  distributeEntities,
  entityBounds,
  entityIndices,
  expandSelection,
  hitTest,
  mirrorEntities,
  pointInPolygon,
  reorderEntities,
  rotatePoint,
  selectedEntities,
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

describe('selectedEntities / entityBounds', () => {
  it('agrupa por `group` e ignora entidades fora da seleção', () => {
    const shapes = [
      rect(0, 0, 1, 1, { group: 'a' }),
      rect(2, 0, 1, 1, { group: 'a' }),
      rect(10, 10, 2, 2),
    ];
    const ents = selectedEntities(shapes, new Set([1]));
    expect(ents).toEqual([[0, 1]]);
    expect(entityBounds(shapes, ents[0])).toEqual({
      minX: 0,
      minY: 0,
      maxX: 3,
      maxY: 1,
    });
  });
});

describe('mirrorEntities', () => {
  it('espelha em X em torno do centro da seleção', () => {
    const tri: Shape = {
      kind: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 0 },
      ],
      closed: true,
    };
    const other = rect(6, 0, 2, 2);
    const out = mirrorEntities([tri, other], new Set([0]), 'h');
    expect(out[0].points).toEqual([
      { x: 2, y: 0 },
      { x: 1, y: 2 },
      { x: 0, y: 0 },
    ]);
    // a forma não selecionada é reaproveitada
    expect(out[1]).toBe(other);
  });

  it('espelha em Y em torno do centro da seleção', () => {
    const shapes = [rect(0, 0, 2, 2), rect(0, 8, 2, 2)];
    const out = mirrorEntities(shapes, new Set([0, 1]), 'v');
    expect(shapeBounds(out[0])).toEqual({
      minX: 0,
      minY: 8,
      maxX: 2,
      maxY: 10,
    });
    expect(shapeBounds(out[1])).toEqual({ minX: 0, minY: 0, maxX: 2, maxY: 2 });
  });

  it('sem seleção não muda nada', () => {
    const shapes = [rect(0, 0, 2, 2)];
    expect(mirrorEntities(shapes, new Set(), 'h')[0]).toBe(shapes[0]);
  });
});

describe('distributeEntities', () => {
  it('iguala as folgas na horizontal (pontas fixas)', () => {
    const shapes = [rect(0, 0, 10, 2), rect(15, 0, 10, 2), rect(40, 0, 10, 2)];
    const out = distributeEntities(shapes, new Set([0, 1, 2]), 'h');
    // vão total 50, largura usada 30 -> folga 10
    expect(shapeBounds(out[0])!.minX).toBeCloseTo(0);
    expect(shapeBounds(out[1])!.minX).toBeCloseTo(20);
    expect(shapeBounds(out[2])!.minX).toBeCloseTo(40);
  });

  it('iguala as folgas na vertical usando o grupo como unidade', () => {
    const shapes = [
      rect(0, 0, 2, 4, { group: 'a' }),
      rect(0, 2, 2, 4, { group: 'a' }),
      rect(0, 20, 2, 4),
      rect(0, 60, 2, 4),
    ];
    const out = distributeEntities(shapes, new Set([0, 1, 2, 3]), 'v');
    // entidades: bloco 0..6, 20..24, 60..64 -> vão 64, usado 14, folga 25
    expect(shapeBounds(out[0])!.minY).toBeCloseTo(0);
    expect(shapeBounds(out[1])!.minY).toBeCloseTo(2);
    expect(shapeBounds(out[2])!.minY).toBeCloseTo(31);
    expect(shapeBounds(out[3])!.minY).toBeCloseTo(60);
  });

  it('com menos de 3 entidades não move nada', () => {
    const shapes = [rect(0, 0, 2, 2), rect(30, 0, 2, 2)];
    const out = distributeEntities(shapes, new Set([0, 1]), 'h');
    expect(shapeBounds(out[1])!.minX).toBe(30);
  });
});

describe('arrayEntities', () => {
  it('cria a matriz com o passo pedido, sem copiar a origem', () => {
    const shapes = [rect(0, 0, 2, 2)];
    const out = arrayEntities(shapes, new Set([0]), 2, 2, 10, 5, () => 'g');
    expect(out).toHaveLength(3);
    const xs = out.map((s) => shapeBounds(s)?.minX);
    const ys = out.map((s) => shapeBounds(s)?.minY);
    expect(xs.sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([0, 10, 10]);
    expect(ys.sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([0, 5, 5]);
  });

  it('dá grupo novo a cada cópia de uma entidade agrupada', () => {
    const shapes = [
      rect(0, 0, 2, 2, { group: 'a' }),
      rect(2, 0, 2, 2, { group: 'a' }),
    ];
    let n = 0;
    const out = arrayEntities(
      shapes,
      new Set([0, 1]),
      3,
      1,
      10,
      0,
      () => `g${++n}`,
    );
    expect(out).toHaveLength(4);
    expect(out[0].group).toBe('g1');
    expect(out[1].group).toBe('g1');
    expect(out[2].group).toBe('g2');
    expect(out[3].group).toBe('g2');
  });

  it('matriz 1×1 não cria nada', () => {
    expect(
      arrayEntities([rect(0, 0, 1, 1)], new Set([0]), 1, 1, 5, 5, () => 'g'),
    ).toEqual([]);
  });
});
