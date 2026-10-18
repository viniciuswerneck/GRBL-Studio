import { describe, expect, it } from 'vitest';
import { maskToHatchLines, zigzagHatch } from '../src/shared/hatch';

/** Máscara de teste: 1 onde `fills` contém (x, y). */
function makeMask(
  w: number,
  h: number,
  fills: Array<[number, number]>,
): Uint8Array {
  const m = new Uint8Array(w * h);
  for (const [x, y] of fills) m[y * w + x] = 1;
  return m;
}

function solid(w: number, h: number): Uint8Array {
  return new Uint8Array(w * h).fill(1);
}

describe('maskToHatchLines', () => {
  it('cobre um quadrado cheio com linhas a cada 2 px', () => {
    const segs = maskToHatchLines(solid(4, 4), 4, 4, {
      spacingPx: 2,
      phasePx: 0,
    });
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ x0: 0, y0: 0.5, x1: 4, y1: 0.5 });
    expect(segs[1]).toEqual({ x0: 0, y0: 2.5, x1: 4, y1: 2.5 });
  });

  it('respeita o deslocamento da primeira linha (phase)', () => {
    const segs = maskToHatchLines(solid(4, 4), 4, 4, {
      spacingPx: 2,
      phasePx: 1,
    });
    expect(segs.map((s) => s.y0)).toEqual([1.5, 3.5]);
  });

  it('gera um segmento por trecho contínuo (buraco no meio)', () => {
    // duas colunas cheias (x=0..1 e x=4..5) em duas linhas
    const mask = makeMask(6, 2, [
      [0, 0],
      [1, 0],
      [4, 0],
      [5, 0],
      [0, 1],
      [1, 1],
      [4, 1],
      [5, 1],
    ]);
    const segs = maskToHatchLines(mask, 6, 2, { spacingPx: 1, phasePx: 0 });
    expect(segs.map((s) => [s.x0, s.x1])).toEqual([
      [0, 2],
      [4, 6],
      [0, 2],
      [4, 6],
    ]);
  });

  it('descarta trechos menores que minRunPx', () => {
    const mask = makeMask(6, 1, [
      [0, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ]);
    const segs = maskToHatchLines(mask, 6, 1, {
      spacingPx: 1,
      phasePx: 0,
      minRunPx: 3,
    });
    expect(segs).toEqual([{ x0: 3, y0: 0.5, x1: 6, y1: 0.5 }]);
  });

  it('nunca devolve segmentos fora da máscara', () => {
    const segs = maskToHatchLines(solid(3, 7), 3, 7, { spacingPx: 3 });
    for (const s of segs) {
      expect(s.x0).toBeGreaterThanOrEqual(0);
      expect(s.x1).toBeLessThanOrEqual(3);
      expect(s.y0).toBeGreaterThan(0);
      expect(s.y0).toBeLessThan(7);
    }
    expect(segs.map((s) => s.y0)).toEqual([1.5, 4.5]);
  });

  it('é tolerante a máscara vazia e dimensões nulas', () => {
    expect(maskToHatchLines(new Uint8Array(0), 0, 0, { spacingPx: 2 })).toEqual(
      [],
    );
    expect(maskToHatchLines(new Uint8Array(4), 4, 1, { spacingPx: 2 })).toEqual(
      [],
    );
  });

  it('arredonda o espaçamento para baixo de 1 px', () => {
    const segs = maskToHatchLines(solid(2, 3), 2, 3, { spacingPx: 0.2 });
    expect(segs.map((s) => s.y0)).toEqual([0.5, 1.5, 2.5]);
  });
});

describe('zigzagHatch', () => {
  it('inverte a direção a cada linha', () => {
    const segs = [
      { x0: 0, y0: 0.5, x1: 4, y1: 0.5 },
      { x0: 0, y0: 1.5, x1: 4, y1: 1.5 },
    ];
    expect(zigzagHatch(segs)).toEqual([
      { x0: 0, y0: 0.5, x1: 4, y1: 0.5 },
      { x0: 4, y0: 1.5, x1: 0, y1: 1.5 },
    ]);
  });

  it('mantém a ordem dos trechos dentro da mesma linha', () => {
    const segs = [
      { x0: 0, y0: 0.5, x1: 1, y1: 0.5 },
      { x0: 3, y0: 0.5, x1: 4, y1: 0.5 },
      { x0: 0, y0: 1.5, x1: 1, y1: 1.5 },
      { x0: 3, y0: 1.5, x1: 4, y1: 1.5 },
    ];
    expect(zigzagHatch(segs)).toEqual([
      { x0: 0, y0: 0.5, x1: 1, y1: 0.5 },
      { x0: 3, y0: 0.5, x1: 4, y1: 0.5 },
      { x0: 4, y0: 1.5, x1: 3, y1: 1.5 },
      { x0: 1, y0: 1.5, x1: 0, y1: 1.5 },
    ]);
  });
});
