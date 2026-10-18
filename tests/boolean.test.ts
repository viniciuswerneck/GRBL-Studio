import { describe, expect, it } from 'vitest';
import {
  booleanLoops,
  booleanObjects,
  buildLoops,
  covered,
  groupNestedLoops,
  intersectParams,
  loopBounds,
  pointInObject,
  signedArea,
  splitEdges,
  edgesOf,
} from '../src/shared/boolean';
import type { Point } from '../src/shared/design';

const rect = (x: number, y: number, w: number, h: number): Point[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

/** Área total (soma dos módulos) dos contornos do resultado. */
const area = (loops: Point[][]): number =>
  loops.reduce((sum, l) => sum + Math.abs(signedArea(l)), 0);

describe('signedArea / loopBounds / intersectParams', () => {
  it('área assinada e caixa', () => {
    expect(signedArea(rect(0, 0, 10, 10))).toBeCloseTo(100);
    expect(loopBounds(rect(2, 3, 10, 5))).toEqual({
      minX: 2,
      minY: 3,
      maxX: 12,
      maxY: 8,
    });
  });

  it('intersecção de segmentos (parâmetros t/u)', () => {
    const hit = intersectParams(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: -5 },
      { x: 5, y: 5 },
    );
    expect(hit?.t).toBeCloseTo(0.5);
    expect(hit?.u).toBeCloseTo(0.5);
    // paralelos e fora do segmento não contam
    expect(
      intersectParams(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 1 },
        { x: 10, y: 1 },
      ),
    ).toBeNull();
    expect(
      intersectParams(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: -5 },
        { x: 20, y: 5 },
      ),
    ).toBeNull();
  });
});

describe('splitEdges / buildLoops', () => {
  it('parte a aresta no ponto de cruzamento', () => {
    const edges = edgesOf(rect(0, 0, 10, 10));
    const cut = edgesOf([
      { x: 5, y: -5 },
      { x: 5, y: 0 },
      { x: 5, y: 15 },
      { x: 5, y: 15 },
    ]);
    const out = splitEdges(edges, cut);
    // a aresta de baixo (0,0)→(10,0) vira duas, passando por (5,0)
    expect(out.length).toBeGreaterThan(4);
    expect(
      out.some((s) => Math.abs(s.a.x - 0) < 1e-9 && Math.abs(s.b.x - 5) < 1e-9),
    ).toBe(true);
  });

  it('encadeia segmentos em contornos e descarta trechos soltos', () => {
    const segs = [
      { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
      { a: { x: 10, y: 0 }, b: { x: 10, y: 10 } },
      { a: { x: 10, y: 10 }, b: { x: 0, y: 0 } },
      { a: { x: 50, y: 50 }, b: { x: 60, y: 50 } },
    ];
    const loops = buildLoops(segs);
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(3);
  });
});

describe('covered', () => {
  const a = rect(0, 0, 10, 10);
  const b = rect(5, 5, 10, 10);
  const inside = { x: 2, y: 2 };
  const both = { x: 7, y: 7 };
  const onlyB = { x: 12, y: 12 };
  const none = { x: 50, y: 50 };
  const polys = [a, b];

  it('união', () => {
    expect(covered(polys, inside, 'union')).toBe(true);
    expect(covered(polys, both, 'union')).toBe(true);
    expect(covered(polys, none, 'union')).toBe(false);
  });

  it('intersecção', () => {
    expect(covered(polys, both, 'intersection')).toBe(true);
    expect(covered(polys, inside, 'intersection')).toBe(false);
    expect(covered(polys, onlyB, 'intersection')).toBe(false);
  });

  it('subtração (primeiro menos os demais)', () => {
    expect(covered(polys, inside, 'difference')).toBe(true);
    expect(covered(polys, both, 'difference')).toBe(false);
    expect(covered(polys, onlyB, 'difference')).toBe(false);
  });

  it('exclusão (paridade)', () => {
    expect(covered(polys, inside, 'xor')).toBe(true);
    expect(covered(polys, both, 'xor')).toBe(false);
    expect(covered(polys, onlyB, 'xor')).toBe(true);
  });
});

describe('booleanLoops', () => {
  const a = rect(0, 0, 10, 10);
  const b = rect(5, 0, 10, 10); // sobrepõe 5 × 10

  it('união de dois retângulos sobrepostos', () => {
    const loops = booleanLoops([a, b], 'union');
    expect(loops).toHaveLength(1);
    expect(Math.abs(signedArea(loops[0]))).toBeCloseTo(150);
    expect(loopBounds(loops[0])).toEqual({
      minX: 0,
      minY: 0,
      maxX: 15,
      maxY: 10,
    });
  });

  it('intersecção dos mesmos retângulos', () => {
    const loops = booleanLoops([a, b], 'intersection');
    expect(loops).toHaveLength(1);
    expect(area(loops)).toBeCloseTo(50);
    expect(loopBounds(loops[0])).toEqual({
      minX: 5,
      minY: 0,
      maxX: 10,
      maxY: 10,
    });
  });

  it('subtração do primeiro pelo segundo', () => {
    const loops = booleanLoops([a, b], 'difference');
    expect(area(loops)).toBeCloseTo(50);
    expect(loopBounds(loops[0]).maxX).toBeCloseTo(5);
  });

  it('exclusão gera as duas partes não compartilhadas', () => {
    const loops = booleanLoops([a, b], 'xor');
    expect(area(loops)).toBeCloseTo(100);
    expect(loops).toHaveLength(2);
  });

  it('formas idênticas: união mantém, exclusão zera', () => {
    expect(area(booleanLoops([a, rect(0, 0, 10, 10)], 'union'))).toBeCloseTo(
      100,
    );
    expect(booleanLoops([a, rect(0, 0, 10, 10)], 'xor')).toEqual([]);
  });

  it('contida: união devolve a maior, intersecção a menor', () => {
    const inner = rect(2, 2, 4, 4);
    const uni = booleanLoops([a, inner], 'union');
    expect(uni).toHaveLength(1);
    expect(Math.abs(signedArea(uni[0]))).toBeCloseTo(100);
    const inter = booleanLoops([a, inner], 'intersection');
    expect(area(inter)).toBeCloseTo(16);
  });

  it('subtração com furo: contorno externo + buraco', () => {
    const loops = booleanLoops([a, rect(2, 2, 4, 4)], 'difference');
    expect(loops).toHaveLength(2);
    const areas = loops.map((l) => signedArea(l)).sort((x, y) => x - y);
    expect(Math.abs(areas[0])).toBeCloseTo(16);
    expect(areas[1]).toBeCloseTo(100);
    // o buraco tem orientação contrária ao contorno externo
    expect(areas[0] * areas[1]).toBeLessThan(0);
  });

  it('formas separadas: união devolve os dois contornos', () => {
    const loops = booleanLoops([a, rect(20, 0, 10, 10)], 'union');
    expect(loops).toHaveLength(2);
    expect(area(loops)).toBeCloseTo(200);
  });

  it('retângulos colados pela aresta viram um só', () => {
    const loops = booleanLoops([a, rect(10, 0, 10, 10)], 'union');
    expect(loops).toHaveLength(1);
    expect(area(loops)).toBeCloseTo(200);
    expect(loopBounds(loops[0]).maxX).toBeCloseTo(20);
  });

  it('sem formas suficientes devolve vazio', () => {
    expect(booleanLoops([], 'union')).toEqual([]);
    expect(booleanLoops([a], 'difference')).toEqual([]);
    expect(booleanLoops([a], 'intersection')).toEqual([]);
    expect(
      booleanLoops(
        [
          [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        ],
        'union',
      ),
    ).toEqual([]);
  });
});

describe('booleanObjects', () => {
  it('furo do objeto entra por paridade', () => {
    const ring = [rect(0, 0, 10, 10), rect(2, 2, 6, 6)];
    expect(pointInObject(ring, { x: 5, y: 5 })).toBe(false);
    expect(pointInObject(ring, { x: 1, y: 1 })).toBe(true);
    // união do anel com um quadrado que cobre o meio do furo: o furo vira uma
    // moldura e o quadrado vira uma ilha (área 100 − 36 + 16 = 80)
    const loops = booleanObjects([ring, [rect(3, 3, 4, 4)]], 'union');
    expect(loops).toHaveLength(3);
    const sum = loops.reduce((acc, l) => acc + signedArea(l), 0);
    expect(sum).toBeCloseTo(80);
  });

  it('subtrair usando um objeto com furo', () => {
    const loops = booleanObjects(
      [[rect(0, 0, 20, 10)], [rect(5, 0, 10, 10), rect(7, 3, 6, 4)]],
      'difference',
    );
    // 200 menos a moldura (100 − 24 = 76) = 124
    const sum = loops.reduce((acc, l) => acc + signedArea(l), 0);
    expect(sum).toBeCloseTo(124);
  });

  it('sem objetos devolve vazio', () => {
    expect(booleanObjects([], 'union')).toEqual([]);
    expect(booleanObjects([[], []], 'union')).toEqual([]);
  });
});

describe('groupNestedLoops', () => {
  it('agrupa o buraco com o contorno externo', () => {
    const loops = booleanLoops(
      [rect(0, 0, 10, 10), rect(2, 2, 4, 4)],
      'difference',
    );
    const groups = groupNestedLoops(loops);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  it('contornos separados ficam em grupos distintos', () => {
    const loops = [rect(0, 0, 10, 10), rect(30, 0, 10, 10)];
    const groups = groupNestedLoops(loops);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(1);
  });
});
