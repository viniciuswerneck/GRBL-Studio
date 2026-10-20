/**
 * Encaixe na chapa (nesting) — MaxRects: caixas dentro da chapa, sem sobrepor,
 * com margem/folga/rotação, e a “cola” para a geometria do editor.
 */
import { describe, expect, it } from 'vitest';
import type { Shape } from '../src/shared/design';
import { type Bounds, placeEntities } from '../src/shared/designEditor';
import { nestParts } from '../src/shared/nesting';

function overlaps(a: Bounds, b: Bounds): boolean {
  return (
    a.minX < b.maxX - 1e-9 &&
    b.minX < a.maxX - 1e-9 &&
    a.minY < b.maxY - 1e-9 &&
    b.minY < a.maxY - 1e-9
  );
}

describe('nestParts', () => {
  it('encaixa quatro peças iguais numa chapa exata', () => {
    const parts = [1, 2, 3, 4].map((n) => ({
      id: `p${n}`,
      widthMm: 50,
      heightMm: 50,
    }));
    const out = nestParts(parts, { sheetWidthMm: 100, sheetHeightMm: 100 });
    expect(out.unplaced).toEqual([]);
    expect(out.placements).toHaveLength(4);
    expect(out.usedWidthMm).toBeCloseTo(100, 6);
    expect(out.usedHeightMm).toBeCloseTo(100, 6);
    expect(out.utilization).toBeCloseTo(1, 6);
    for (let i = 0; i < out.placements.length; i++) {
      for (let j = i + 1; j < out.placements.length; j++) {
        const a = out.placements[i];
        const b = out.placements[j];
        expect(
          overlaps(
            {
              minX: a.xMm,
              minY: a.yMm,
              maxX: a.xMm + a.widthMm,
              maxY: a.yMm + a.heightMm,
            },
            {
              minX: b.xMm,
              minY: b.yMm,
              maxX: b.xMm + b.widthMm,
              maxY: b.yMm + b.heightMm,
            },
          ),
        ).toBe(false);
      }
    }
  });

  it('respeita a folga entre peças', () => {
    const parts = [
      { id: 'a', widthMm: 50, heightMm: 50 },
      { id: 'b', widthMm: 50, heightMm: 50 },
    ];
    // Sem folga cabem as duas lado a lado (100 mm).
    expect(
      nestParts(parts, { sheetWidthMm: 105, sheetHeightMm: 100 }).placements,
    ).toHaveLength(2);
    // Com 10 mm de folga seriam 110 mm: só uma cabe.
    const tight = nestParts(parts, {
      sheetWidthMm: 105,
      sheetHeightMm: 100,
      gapMm: 10,
    });
    expect(tight.placements).toHaveLength(1);
    expect(tight.unplaced).toEqual(['b']);
  });

  it('gira 90° só quando é preciso (e só se permitido)', () => {
    const parts = [
      { id: 'tira', widthMm: 80, heightMm: 30 },
      { id: 'tira2', widthMm: 80, heightMm: 30 },
    ];
    const rotated = nestParts(parts, {
      sheetWidthMm: 32,
      sheetHeightMm: 170,
      allowRotate: true,
    });
    expect(rotated.unplaced).toEqual([]);
    expect(rotated.placements[0].rotated).toBe(true);
    expect(rotated.placements[0].widthMm).toBe(30);
    expect(rotated.placements[0].heightMm).toBe(80);
    // Sem rotação, 80 mm não cabem em 32 mm de largura.
    const fixed = nestParts(parts, {
      sheetWidthMm: 32,
      sheetHeightMm: 170,
      allowRotate: false,
    });
    expect(fixed.placements).toHaveLength(0);
    expect(fixed.unplaced).toEqual(['tira', 'tira2']);
  });

  it('não gira quando a peça já cabe na orientação original', () => {
    const out = nestParts(
      [
        { id: 'a', widthMm: 25, heightMm: 20 },
        { id: 'b', widthMm: 17.5, heightMm: 15 },
      ],
      {
        sheetWidthMm: 150,
        sheetHeightMm: 130,
        marginMm: 5,
        gapMm: 3,
        allowRotate: true,
      },
    );
    expect(out.placements.map((p) => p.rotated)).toEqual([false, false]);
    expect(out.placements[0]).toMatchObject({ xMm: 5, yMm: 5 });
  });

  it('peça maior que a chapa não é encaixada (nem cortada)', () => {
    const out = nestParts(
      [
        { id: 'grande', widthMm: 120, heightMm: 20 },
        { id: 'ok', widthMm: 50, heightMm: 50 },
      ],
      { sheetWidthMm: 100, sheetHeightMm: 100 },
    );
    expect(out.unplaced).toEqual(['grande']);
    expect(out.placements.map((p) => p.id)).toEqual(['ok']);
  });

  it('a margem afasta tudo da borda', () => {
    const out = nestParts([{ id: 'p', widthMm: 80, heightMm: 80 }], {
      sheetWidthMm: 100,
      sheetHeightMm: 100,
      marginMm: 10,
    });
    expect(out.placements[0]).toMatchObject({ xMm: 10, yMm: 10 });
    expect(out.usedWidthMm).toBeCloseTo(80, 6);
    const tooBig = nestParts([{ id: 'p', widthMm: 85, heightMm: 10 }], {
      sheetWidthMm: 100,
      sheetHeightMm: 100,
      marginMm: 10,
    });
    expect(tooBig.unplaced).toEqual(['p']);
  });

  it('descarta peças inválidas e não quebra com chapa vazia', () => {
    const out = nestParts(
      [
        { id: 'zero', widthMm: 0, heightMm: 10 },
        { id: 'neg', widthMm: -5, heightMm: 10 },
        { id: 'nan', widthMm: Number.NaN, heightMm: 10 },
        { id: 'ok', widthMm: 10, heightMm: 10 },
      ],
      { sheetWidthMm: 100, sheetHeightMm: 100 },
    );
    expect(out.unplaced).toEqual(['zero', 'neg', 'nan']);
    expect(out.placements.map((p) => p.id)).toEqual(['ok']);

    const empty = nestParts([{ id: 'p', widthMm: 10, heightMm: 10 }], {
      sheetWidthMm: 0,
      sheetHeightMm: 100,
    });
    expect(empty.placements).toEqual([]);
    expect(empty.unplaced).toEqual(['p']);
    expect(empty.utilization).toBe(0);
  });

  it('normaliza margem/folga negativas e é determinístico', () => {
    const parts = [
      { id: 'a', widthMm: 30, heightMm: 20 },
      { id: 'b', widthMm: 20, heightMm: 30 },
      { id: 'c', widthMm: 15, heightMm: 15 },
    ];
    const opts = {
      sheetWidthMm: 60,
      sheetHeightMm: 60,
      marginMm: -10,
      gapMm: -5,
    };
    const a = nestParts(parts, opts);
    const b = nestParts(parts, opts);
    expect(a).toEqual(b);
    // Margem negativa vira 0: a primeira peça encosta na origem.
    expect(a.placements[0].xMm).toBe(0);
    expect(a.placements[0].yMm).toBe(0);
  });

  it('mantém a ordem de saída igual à de entrada e mede o aproveitamento', () => {
    const parts = [
      { id: 'z', widthMm: 20, heightMm: 20 },
      { id: 'a', widthMm: 80, heightMm: 60 },
      { id: 'm', widthMm: 40, heightMm: 40 },
    ];
    const out = nestParts(parts, { sheetWidthMm: 200, sheetHeightMm: 100 });
    expect(out.placements.map((p) => p.id)).toEqual(['z', 'a', 'm']);
    const area = 20 * 20 + 80 * 60 + 40 * 40;
    expect(out.utilization).toBeCloseTo(area / (200 * 100), 6);
  });

  it('nunca sobrepõe peças de tamanhos variados', () => {
    const parts = Array.from({ length: 24 }, (_, i) => ({
      id: `p${i}`,
      // Tamanhos pseudo-aleatórios determinísticos.
      widthMm: 10 + ((i * 37) % 45),
      heightMm: 8 + ((i * 53) % 50),
    }));
    const out = nestParts(parts, {
      sheetWidthMm: 300,
      sheetHeightMm: 200,
      marginMm: 5,
      gapMm: 3,
    });
    for (const p of out.placements) {
      expect(p.xMm).toBeGreaterThanOrEqual(5 - 1e-9);
      expect(p.yMm).toBeGreaterThanOrEqual(5 - 1e-9);
      expect(p.xMm + p.widthMm).toBeLessThanOrEqual(295 + 1e-9);
      expect(p.yMm + p.heightMm).toBeLessThanOrEqual(195 + 1e-9);
    }
    for (let i = 0; i < out.placements.length; i++) {
      for (let j = i + 1; j < out.placements.length; j++) {
        const a = out.placements[i];
        const b = out.placements[j];
        // A folga de 3 mm vale para a direita/embaixo; o teste checa que não há
        // sobreposição real entre as peças.
        expect(
          overlaps(
            {
              minX: a.xMm,
              minY: a.yMm,
              maxX: a.xMm + a.widthMm,
              maxY: a.yMm + a.heightMm,
            },
            {
              minX: b.xMm,
              minY: b.yMm,
              maxX: b.xMm + b.widthMm,
              maxY: b.yMm + b.heightMm,
            },
          ),
        ).toBe(false);
      }
    }
  });
});

describe('placeEntities', () => {
  const square = (x: number, y: number, w: number, h: number): Shape => ({
    kind: 'rect',
    closed: true,
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
  });

  const boundsOf = (shapes: Shape[], indices: number[]): Bounds => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const i of indices) {
      for (const p of shapes[i].points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    return { minX, minY, maxX, maxY };
  };

  it('move a entidade para o canto pedido', () => {
    const shapes = [square(0, 0, 10, 5)];
    const out = placeEntities(shapes, [[0]], [{ x: 50, y: 60 }]);
    expect(boundsOf(out, [0])).toEqual({
      minX: 50,
      minY: 60,
      maxX: 60,
      maxY: 65,
    });
    // Não muta a lista original.
    expect(shapes[0].points[0]).toEqual({ x: 0, y: 0 });
  });

  it('gira 90° antes de mover (troca largura/altura)', () => {
    const shapes = [square(0, 0, 20, 10)];
    const out = placeEntities(
      shapes,
      [[0]],
      [{ x: 100, y: 40, rotated: true }],
    );
    expect(boundsOf(out, [0])).toEqual({
      minX: 100,
      minY: 40,
      maxX: 110,
      maxY: 60,
    });
  });

  it('preserva as demais propriedades da forma', () => {
    const shapes = [{ ...square(0, 0, 10, 10), name: 'Peça', layer: 'l2' }];
    const out = placeEntities(shapes, [[0]], [{ x: 5, y: 5 }]);
    expect(out[0].name).toBe('Peça');
    expect(out[0].layer).toBe('l2');
    expect(out[0].closed).toBe(true);
  });

  it('não mexe em alvo inválido nem em listas desencontradas', () => {
    const shapes = [square(0, 0, 10, 10)];
    expect(placeEntities(shapes, [[0]], [{ x: Number.NaN, y: 0 }])[0]).toEqual(
      shapes[0],
    );
    expect(placeEntities(shapes, [[0]], [])[0]).toEqual(shapes[0]);
  });
});
