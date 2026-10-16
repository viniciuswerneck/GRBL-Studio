import { describe, expect, it } from 'vitest';
import {
  polygonArea,
  simplifyContour,
  traceContours,
} from '../src/shared/image/contour';
import { imageToGcode, validateOptions } from '../src/shared/image/gcode';
import type { ImageToGcodeOptions } from '../src/shared/image/types';

/** Máscara legível: 'X' = matéria (1), '.' = fundo (0). */
const mask = (rows: string[]): Uint8Array => {
  const h = rows.length;
  const w = rows[0]!.length;
  const out = new Uint8Array(w * h);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      out[y * w + x] = ch === 'X' ? 1 : 0;
    });
  });
  return out;
};

/** Imagem RGBA branca (255) com um retângulo preto em [x0..x1) × [y0..y1). */
const withRect = (
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
    }
  }
  return out;
};

/** Imagem RGBA sólida. */
const solid = (w: number, h: number, v: number): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
};

const options = (
  o: Partial<ImageToGcodeOptions> = {},
): ImageToGcodeOptions => ({
  adjust: {
    brightness: 0,
    contrast: 0,
    whiteClip: 0,
    invert: false,
    blackWhite: false,
    bwThreshold: 0.5,
  },
  geometry: {
    widthMm: 10,
    heightMm: 10,
    offsetX: 0,
    offsetY: 0,
    linesPerMm: 2,
    direction: 'h',
    dotSizeMm: 0.08,
  },
  engrave: {
    speedMmMin: 1000,
    travelSpeedMmMin: 5000,
    sMin: 0,
    sMax: 1000,
    mode: 'M4',
  },
  algorithm: 'vector',
  simplifyPx: 0.5,
  ...o,
});

const lines = (gcode: string): string[] => gcode.trimEnd().split('\n');

describe('traceContours', () => {
  it('pixel único vira um quadrado fechado de 4 pontos', () => {
    const contours = traceContours(Uint8Array.of(1), 1, 1);
    expect(contours).toHaveLength(1);
    expect(contours[0]!).toHaveLength(4);
    expect(polygonArea(contours[0]!)).toBe(1);
  });

  it('bloco 2x2 vira um laço só, com a área do bloco', () => {
    const contours = traceContours(mask(['XX', 'XX']), 2, 2);
    expect(contours).toHaveLength(1);
    expect(contours[0]!).toHaveLength(8); // cantos + vértices intermediários
    expect(polygonArea(contours[0]!)).toBe(4);
  });

  it('buraco gera um contorno interno separado', () => {
    const contours = traceContours(mask(['XXX', 'X.X', 'XXX']), 3, 3);
    expect(contours).toHaveLength(2); // externo + furo
    const areas = contours.map(polygonArea).sort((a, b) => a - b);
    expect(areas).toEqual([1, 9]);
  });

  it('canto de sela: dois pixels na diagonal ficam em laços separados', () => {
    for (const grid of [
      ['X.', '.X'],
      ['.X', 'X.'],
    ]) {
      const contours = traceContours(mask(grid), 2, 2);
      expect(contours).toHaveLength(2);
      for (const c of contours) {
        expect(c).toHaveLength(4); // cada laço é o quadrado do seu pixel
        expect(polygonArea(c)).toBe(1);
      }
    }
  });

  it('matéria encostada na borda fecha contra a borda da imagem', () => {
    // Bloco 2x1 no canto superior esquerdo de uma máscara 4x3.
    const contours = traceContours(mask(['XX..', '....', '....']), 4, 3);
    expect(contours).toHaveLength(1);
    const block = contours[0]!;
    expect(polygonArea(block)).toBe(2);
    // Contorno = retângulo [0,2] x [0,1] encostado na borda superior.
    expect(Math.min(...block.map((p) => p.x))).toBe(0);
    expect(Math.max(...block.map((p) => p.x))).toBe(2);
    expect(Math.min(...block.map((p) => p.y))).toBe(0);
    expect(Math.max(...block.map((p) => p.y))).toBe(1);
  });

  it('máscara vazia não gera contorno', () => {
    expect(traceContours(mask(['...', '...']), 3, 2)).toHaveLength(0);
  });
});

describe('simplifyContour', () => {
  it('remove vértices colineares do degrau de 1 px', () => {
    const rect = traceContours(mask(['XXXXXXXXXX']), 10, 1); // retângulo 10x1
    const raw = rect[0]!;
    expect(polygonArea(raw)).toBe(10);

    const simple = simplifyContour(raw, 0.5);
    expect(simple.length).toBeLessThan(raw.length);
    expect(simple.length).toBeLessThanOrEqual(5); // quatro cantos (às vezes + 1 âncora)
    expect(polygonArea(simple)).toBe(10); // só remove colineares: área preservada
  });

  it('epsilon 0 ou laço minúsculo preserva o original', () => {
    const square = traceContours(mask(['XX', 'XX']), 2, 2)[0]!;
    expect(simplifyContour(square, 0)).toEqual(square);
    expect(simplifyContour(square, -1)).toEqual(square);
  });
});

describe('imageToGcode (vector)', () => {
  it('contorno em mm mapeia o canto de pixel exatamente para a área pedida', () => {
    // Bloco preto 4x4 px em [2..6) x [2..6) de uma imagem 8x8.
    const img = withRect(8, 8, 2, 2, 6, 6);
    const geometry = {
      widthMm: 10,
      heightMm: 20,
      offsetX: 5,
      offsetY: 3,
      linesPerMm: 2,
      direction: 'h' as const,
      dotSizeMm: 0.08,
    };
    const { gcode, stats } = imageToGcode(img, 8, 8, options({ geometry }));

    // 2/8 * 10 + 5 = 7,5  |  6/8 * 10 + 5 = 12,5  |  y: 8 e 18.
    const xs = new Set(allCoords(gcode, /X(-?[\d.]+)/g));
    const ys = new Set(allCoords(gcode, /Y(-?[\d.]+)/g));
    expect([...xs].sort((a, b) => a - b)).toEqual([7.5, 12.5]);
    expect([...ys].sort((a, b) => a - b)).toEqual([8, 18]);

    expect(stats.contours).toBe(1);
    expect(stats.segments).toBe(4); // n pontos -> n G1 (o último fecha o contorno)
    expect(stats.bounds.xMin).toBeCloseTo(7.5, 9);
    expect(stats.bounds.xMax).toBeCloseTo(12.5, 9);
    expect(stats.bounds.yMin).toBeCloseTo(8, 9);
    expect(stats.bounds.yMax).toBeCloseTo(18, 9);
    expect(stats.burnedMm).toBeCloseTo(2 * (5 + 10), 6); // perímetro 2*(5+10) mm
  });

  it('contorno ocupa exatamente o retângulo de trabalho', () => {
    const geometry = {
      ...options().geometry,
      widthMm: 8,
      heightMm: 4,
      offsetX: 1,
      offsetY: 2,
    };
    const { gcode } = imageToGcode(solid(8, 8, 0), 8, 8, options({ geometry }));
    for (const m of gcode.matchAll(/X(-?[\d.]+)/g)) {
      const v = Number(m[1]);
      expect(v).toBeGreaterThanOrEqual(1 - 1e-9);
      expect(v).toBeLessThanOrEqual(9 + 1e-9);
    }
    for (const m of gcode.matchAll(/Y(-?[\d.]+)/g)) {
      const v = Number(m[1]);
      expect(v).toBeGreaterThanOrEqual(2 - 1e-9);
      expect(v).toBeLessThanOrEqual(6 + 1e-9);
    }
    expect(gcode).toContain('G0 X1 Y2'); // canto exato do retângulo
    expect(gcode).toContain('G1 X9 Y6');
  });

  it('invariantes: cabeçalho, M5 antes de G0, sem F em G0, 3 decimais', () => {
    const { gcode } = imageToGcode(
      withRect(16, 16, 3, 3, 12, 13),
      16,
      16,
      options(),
    );
    const ls = lines(gcode);

    expect(ls[0]).toBe('G21');
    expect(ls[1]).toBe('G90');
    expect(ls[2]).toBe('G94');
    expect(ls[3]).toBe('M5');
    expect(ls.at(-1)).toBe('M5');

    for (let i = 1; i < ls.length; i++) {
      if (ls[i]!.startsWith('G0')) expect(ls[i - 1]).toBe('M5');
    }
    for (const line of ls) {
      if (line.startsWith('G0')) expect(line).not.toMatch(/\sF/);
    }
    for (const m of gcode.matchAll(/[XY](-?[\d.]+)/g)) {
      const decimals = m[1]!.includes('.') ? m[1]!.split('.')[1]!.length : 0;
      expect(decimals).toBeLessThanOrEqual(3);
    }
  });

  it('corta sempre a s-max; M3 nasce com S0 e M4 não', () => {
    const m4 = imageToGcode(solid(8, 8, 0), 8, 8, options()).gcode;
    expect(m4).toMatch(/\nM4\n/);
    expect(m4).not.toContain('M3');
    expect(
      [...m4.matchAll(/S(\d+)/g)]
        .map((m) => Number(m[1]))
        .every((v) => v === 1000),
    ).toBe(true);

    const m3 = imageToGcode(
      solid(8, 8, 0),
      8,
      8,
      options({
        engrave: {
          speedMmMin: 1000,
          travelSpeedMmMin: 5000,
          sMin: 0,
          sMax: 700,
          mode: 'M3',
        },
      }),
    ).gcode;
    expect(m3).toMatch(/\nM3 S0\n/);
    expect(m3).not.toContain('M4');
    expect(m3).toContain('S700');
  });

  it('imagem branca não gera movimento; imagem invertida corta o retângulo inteiro', () => {
    const white = imageToGcode(solid(8, 8, 255), 8, 8, options());
    expect(
      lines(white.gcode).filter(
        (l) => l.startsWith('G0') || l.startsWith('G1'),
      ),
    ).toHaveLength(0);
    expect(white.stats.contours).toBe(0);
    expect(white.stats.burnedMm).toBe(0);
    expect(white.stats.travelMm).toBe(0);
    expect(Number.isFinite(white.stats.bounds.xMin)).toBe(true); // sem Infinity no stats

    const inverted = imageToGcode(
      solid(8, 8, 255),
      8,
      8,
      options({ adjust: { ...options().adjust, invert: true } }),
    );
    expect(inverted.stats.contours).toBe(1);
    expect(inverted.stats.burnedMm).toBeCloseTo(4 * 10, 6); // perímetro do retângulo 10x10
  });

  it('ilhote de 1 px é ruído de limiar e não vira contorno', () => {
    // Um preto de 1 px (área 1 < 2 px²) e um bloco 2x2 (área 2, válido).
    const single = imageToGcode(withRect(8, 8, 0, 0, 1, 1), 8, 8, options());
    expect(single.stats.contours).toBe(0);

    const block = imageToGcode(withRect(8, 8, 4, 4, 6, 6), 8, 8, options());
    expect(block.stats.contours).toBe(1);
  });

  it('grade de preview é binária (0 = recorte, 1 = fundo)', () => {
    const { grid } = imageToGcode(
      withRect(16, 16, 4, 4, 12, 12),
      16,
      16,
      options(),
    );
    expect(Array.from(grid).every((v) => v === 0 || v === 1)).toBe(true);
    expect(Array.from(grid).some((v) => v === 0)).toBe(true);
    expect(Array.from(grid).some((v) => v === 1)).toBe(true);
  });

  it('funciona com "preto e branco (limiar)" ligado (já binarizado)', () => {
    const adjust = { ...options().adjust, blackWhite: true, bwThreshold: 0.5 };
    const { stats } = imageToGcode(solid(8, 8, 100), 8, 8, options({ adjust })); // cinza 0,39
    expect(stats.contours).toBe(1);
    expect(stats.bounds.xMax).toBeCloseTo(10, 9); // contorno = área inteira
  });

  it('suavização reduz segmentos de um contorno serrilhado', () => {
    // Degraus de 1 px na borda direita: sem suavização há mais vértices.
    const img = withRect(16, 16, 2, 2, 9, 14);
    for (let y = 3; y < 13; y += 2) {
      // pinta o "degrau" (1 px) saindo do retângulo
      const i = (y * 16 + 9) * 4;
      img[i] = 0;
      img[i + 1] = 0;
      img[i + 2] = 0;
    }
    const rough = imageToGcode(img, 16, 16, options({ simplifyPx: 0 }));
    const smooth = imageToGcode(img, 16, 16, options({ simplifyPx: 2 }));
    expect(smooth.stats.segments).toBeLessThan(rough.stats.segments);
    expect(smooth.stats.contours).toBe(1);
  });

  it('valida a suavização com mensagem amigável', () => {
    expect(() => validateOptions(options({ simplifyPx: -1 }))).toThrow(
      /Suavização/,
    );
    expect(() => validateOptions(options({ simplifyPx: NaN }))).toThrow(
      /Suavização/,
    );
    expect(() => validateOptions(options({ simplifyPx: 0 }))).not.toThrow();
    expect(() =>
      validateOptions(options({ algorithm: 'vector' })),
    ).not.toThrow();
  });
});

/** Extrai todos os números de uma lista de matchers. */
function allCoords(gcode: string, re: RegExp): number[] {
  return [...gcode.matchAll(re)].map((m) => Number(m[1]));
}
