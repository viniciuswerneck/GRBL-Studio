import { describe, expect, it } from 'vitest';
import {
  applyAdjust,
  toGrayscale,
  validateAdjust,
} from '../src/shared/image/adjust';
import { floydSteinberg, threshold } from '../src/shared/image/dither';
import type { AdjustOptions } from '../src/shared/image/types';

const base = (o: Partial<AdjustOptions> = {}): AdjustOptions => ({
  brightness: 0,
  contrast: 0,
  whiteClip: 0,
  invert: false,
  blackWhite: false,
  bwThreshold: 0.5,
  ...o,
});

/** Imagem sólida (r, g, b, a) em RGBA. */
const solid = (
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = a;
  }
  return out;
};

describe('toGrayscale', () => {
  it('preto vira 0 e branco vira 1', () => {
    expect(toGrayscale(solid(1, 1, 0, 0, 0), 1, 1)[0]).toBe(0);
    expect(toGrayscale(solid(1, 1, 255, 255, 255), 1, 1)[0]).toBe(1);
  });

  it('usa luminância Rec.709', () => {
    expect(toGrayscale(solid(1, 1, 255, 0, 0), 1, 1)[0]).toBeCloseTo(0.2126, 4);
    expect(toGrayscale(solid(1, 1, 0, 255, 0), 1, 1)[0]).toBeCloseTo(0.7152, 4);
  });

  it('fundo transparente vira branco (não grava o fundo)', () => {
    // PNG de logo: RGB preto com alfa 0.
    expect(toGrayscale(new Uint8ClampedArray([0, 0, 0, 0]), 1, 1)[0]).toBe(1);
    // Meio transparente sobre preto -> meio termo.
    expect(
      toGrayscale(new Uint8ClampedArray([0, 0, 0, 128]), 1, 1)[0],
    ).toBeCloseTo(1 - 128 / 255, 5);
  });

  it('rejeita buffer RGBA pequeno', () => {
    expect(() => toGrayscale(new Uint8ClampedArray(4), 2, 2)).toThrow(/RGBA/);
  });

  it('rejeita dimensão inválida', () => {
    expect(() => toGrayscale(new Uint8ClampedArray(0), 0, 0)).toThrow();
  });
});

describe('applyAdjust', () => {
  it('brilho aditivo', () => {
    expect(
      applyAdjust(new Float32Array([0.5]), base({ brightness: 0.2 }))[0],
    ).toBeCloseTo(0.7, 5);
  });

  it('contraste estica em torno do meio cinza', () => {
    expect(
      applyAdjust(new Float32Array([0.6]), base({ contrast: 1 }))[0],
    ).toBeCloseTo(0.7, 5);
    expect(
      applyAdjust(new Float32Array([0.4]), base({ contrast: -1 }))[0],
    ).toBeCloseTo(0.5, 5);
  });

  it('clampa em 0..1', () => {
    expect(
      applyAdjust(new Float32Array([0.9]), base({ brightness: 1 }))[0],
    ).toBe(1);
    expect(
      applyAdjust(new Float32Array([0.1]), base({ brightness: -1 }))[0],
    ).toBe(0);
  });

  it('white clip transforma quase-branco em branco puro', () => {
    expect(
      applyAdjust(new Float32Array([0.98]), base({ whiteClip: 0.9 }))[0],
    ).toBe(1);
    expect(
      applyAdjust(new Float32Array([0.5]), base({ whiteClip: 0.9 }))[0],
    ).toBeCloseTo(0.5, 5);
  });

  it('inversão espelha o valor', () => {
    expect(
      applyAdjust(new Float32Array([0.25]), base({ invert: true }))[0],
    ).toBeCloseTo(0.75, 5);
  });

  it('B&W usa o limiar configurado', () => {
    const opts = base({ blackWhite: true, bwThreshold: 0.6 });
    expect(applyAdjust(new Float32Array([0.7]), opts)[0]).toBe(1);
    expect(applyAdjust(new Float32Array([0.4]), opts)[0]).toBe(0);
  });

  it('não modifica o buffer de entrada', () => {
    const src = new Float32Array([0.3, 0.8]);
    const before = Float32Array.from(src);
    applyAdjust(src, base({ invert: true, brightness: 0.5 }));
    expect(Array.from(src)).toEqual(Array.from(before));
  });

  it('valida faixas', () => {
    expect(() => validateAdjust(base({ contrast: 2 }))).toThrow(/Contraste/);
    expect(() => validateAdjust(base({ brightness: -2 }))).toThrow(/Brilho/);
    expect(() => validateAdjust(base({ whiteClip: 1.5 }))).toThrow(
      /White clip/,
    );
    expect(() => validateAdjust(base({ bwThreshold: -0.1 }))).toThrow(
      /limiar/i,
    );
    expect(() => validateAdjust(base())).not.toThrow();
  });
});

describe('threshold', () => {
  it('separa acima/abaixo do limiar', () => {
    const out = threshold(new Float32Array([0.2, 0.5, 0.9]), 0.5);
    expect(Array.from(out)).toEqual([0, 1, 1]);
  });
});

describe('floydSteinberg', () => {
  const make = (w: number, h: number, v: number): Float32Array =>
    new Float32Array(w * h).fill(v);

  it('imagem 100% branca permanece branca', () => {
    const out = floydSteinberg(make(8, 8, 1), 8, 8);
    expect(Array.from(out).every((v) => v === 1)).toBe(true);
  });

  it('imagem 100% preta permanece preta', () => {
    const out = floydSteinberg(make(8, 8, 0), 8, 8);
    expect(Array.from(out).every((v) => v === 0)).toBe(true);
  });

  it('produz apenas 0 e 1', () => {
    const out = floydSteinberg(make(16, 16, 0.37), 16, 16);
    expect(Array.from(out).every((v) => v === 0 || v === 1)).toBe(true);
  });

  it('cinza médio rende ~50% de pretos', () => {
    const out = floydSteinberg(make(32, 32, 0.5), 32, 32);
    const blacks = Array.from(out).filter((v) => v === 0).length;
    expect(blacks / out.length).toBeGreaterThan(0.4);
    expect(blacks / out.length).toBeLessThan(0.6);
  });

  it('não altera o buffer de entrada', () => {
    const src = make(4, 4, 0.75); // 0.75 é exato em ponto flutuante
    floydSteinberg(src, 4, 4);
    expect(Array.from(src).every((v) => v === 0.75)).toBe(true);
  });

  it('rejeita dimensões incompatíveis', () => {
    expect(() => floydSteinberg(make(4, 4, 0.5), 8, 8)).toThrow();
  });
});
