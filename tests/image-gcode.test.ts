import { describe, expect, it } from 'vitest';
import { imageToGcode, validateOptions } from '../src/shared/image/gcode';
import { computeScanGeometry, sampleGrid } from '../src/shared/image/raster';
import { toGrayscale } from '../src/shared/image/adjust';
import type { ImageToGcodeOptions } from '../src/shared/image/types';

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

/** Imagem em degradê horizontal (preto -> branco). */
const gradient = (w: number, h: number): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = Math.round((x / Math.max(1, w - 1)) * 255);
      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = 255;
    }
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
  algorithm: 'line',
  ...o,
});

const lines = (gcode: string): string[] => gcode.trimEnd().split('\n');
const all = (gcode: string, re: RegExp): number[] =>
  [...gcode.matchAll(re)].map((m) => Number(m[1]));

describe('computeScanGeometry', () => {
  it('inserção do ponto mantém a área gravada dentro do retângulo', () => {
    const geom = computeScanGeometry({
      widthMm: 10,
      heightMm: 20,
      offsetX: 0,
      offsetY: 0,
      linesPerMm: 5,
      direction: 'h',
      dotSizeMm: 0.08,
    });

    expect(geom.pitch).toBeCloseTo(0.2, 9);
    expect(geom.halfDot).toBeCloseTo(0.04, 9);

    // Início exatamente na borda (centro - metade do ponto).
    expect(geom.scanStart - geom.halfDot).toBeCloseTo(0, 9);
    expect(geom.rowStart - geom.halfDot).toBeCloseTo(0, 9);

    // Fim (último centro + metade do ponto) nunca passa da borda.
    const lastScan =
      geom.scanStart + (geom.cols - 1) * geom.pitch + geom.halfDot;
    const lastRow = geom.rowStart + (geom.rows - 1) * geom.pitch + geom.halfDot;
    expect(lastScan).toBeLessThanOrEqual(10 + 1e-9);
    expect(lastRow).toBeLessThanOrEqual(20 + 1e-9);
    expect(lastScan).toBeGreaterThan(9.5);
    expect(lastRow).toBeGreaterThan(19.5);
  });

  it('ponto 0 usa a área inteira e direção v troca os eixos', () => {
    const base = {
      widthMm: 10,
      heightMm: 20,
      offsetX: 0,
      offsetY: 0,
      linesPerMm: 2,
      dotSizeMm: 0,
    };
    const h = computeScanGeometry({ ...base, direction: 'h' });
    const v = computeScanGeometry({ ...base, direction: 'v' });

    // pitch 0.5 mm -> 21 amostras em 10 mm, 41 em 20 mm.
    expect(h.rows).toBe(41); // varre ao longo de Y (20 mm)
    expect(h.cols).toBe(21);
    // Em varredura vertical as linhas correm ao longo de X (10 mm).
    expect(v.rows).toBe(21);
    expect(v.cols).toBe(41);
    expect(h.pitch).toBeCloseTo(0.5, 9);
    expect(h.halfDot).toBe(0);
  });

  it('área menor que o ponto não extrapola', () => {
    const geom = computeScanGeometry({
      widthMm: 0.05,
      heightMm: 0.05,
      offsetX: 0,
      offsetY: 0,
      linesPerMm: 10,
      direction: 'h',
      dotSizeMm: 0.08,
    });
    const end = geom.scanStart + (geom.cols - 1) * geom.pitch + geom.halfDot;
    expect(end).toBeLessThanOrEqual(0.05 + 1e-9);
  });

  it('valida entradas', () => {
    const valid = {
      widthMm: 10,
      heightMm: 10,
      offsetX: 0,
      offsetY: 0,
      linesPerMm: 2,
      direction: 'h' as const,
      dotSizeMm: 0,
    };
    expect(() => computeScanGeometry({ ...valid, linesPerMm: 0 })).toThrow(
      /Linhas\/mm/,
    );
    expect(() => computeScanGeometry({ ...valid, widthMm: -1 })).toThrow(
      /Largura/,
    );
    expect(() => computeScanGeometry({ ...valid, dotSizeMm: -1 })).toThrow(
      /ponto/,
    );
  });
});

describe('sampleGrid', () => {
  it('reamostra no espaço físico (mm -> pixels) com bilinear', () => {
    // 2x2: topo-esquerdo preto, demais brancos.
    const rgba = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    ]);
    const gray = toGrayscale(rgba, 2, 2);
    const geometry = {
      widthMm: 1,
      heightMm: 1,
      offsetX: 0,
      offsetY: 0,
      linesPerMm: 1,
      direction: 'h' as const,
      dotSizeMm: 0,
    };
    const geom = computeScanGeometry(geometry);
    const grid = sampleGrid(gray, 2, 2, geometry, geom);

    expect(geom.rows).toBe(2);
    expect(geom.cols).toBe(2);
    expect(grid[0]).toBeCloseTo(0, 5);
    expect(grid[1]).toBeCloseTo(1, 5);
    expect(grid[2]).toBeCloseTo(1, 5);
    expect(grid[3]).toBeCloseTo(1, 5);
  });

  it('imagem plana resulta em grade plana', () => {
    const gray = toGrayscale(solid(8, 8, 128, 128, 128), 8, 8);
    const geometry = {
      widthMm: 4,
      heightMm: 4,
      offsetX: 0,
      offsetY: 0,
      linesPerMm: 3,
      direction: 'h' as const,
      dotSizeMm: 0,
    };
    const grid = sampleGrid(
      gray,
      8,
      8,
      geometry,
      computeScanGeometry(geometry),
    );
    expect(Array.from(grid).every((v) => Math.abs(v - grid[0]!) < 1e-6)).toBe(
      true,
    );
  });
});

describe('imageToGcode', () => {
  it('cabeçalho, rodapé e deslocamentos seguros', () => {
    const { gcode } = imageToGcode(solid(10, 10, 0, 0, 0), 10, 10, options());
    const ls = lines(gcode);

    expect(ls[0]).toBe('G21'); // milímetros
    expect(ls[1]).toBe('G90'); // absoluto
    expect(ls[2]).toBe('G94'); // feed mm/min
    expect(ls[3]).toBe('M5'); // laser desligado no início
    expect(ls.at(-1)).toBe('M5'); // e no fim

    // Todo G0 vem logo após um M5 (nunca desloca com o laser armado).
    for (let i = 1; i < ls.length; i++) {
      if (ls[i]!.startsWith('G0')) expect(ls[i - 1]).toBe('M5');
    }

    // Nunca emitir F em G0 (quebraria o feed da próxima gravação).
    for (const line of ls) {
      if (line.startsWith('G0')) expect(line).not.toMatch(/\sF/);
    }
  });

  it('toda coordenada fica dentro da área de trabalho', () => {
    const geometry = {
      widthMm: 10,
      heightMm: 20,
      offsetX: 5,
      offsetY: 3,
      linesPerMm: 4,
      direction: 'h' as const,
      dotSizeMm: 0.08,
    };
    const { gcode, stats } = imageToGcode(
      gradient(24, 24),
      24,
      24,
      options({ geometry, algorithm: 'dither' }),
    );

    for (const m of gcode.matchAll(/X(-?[\d.]+)/g)) {
      const v = Number(m[1]);
      expect(v).toBeGreaterThanOrEqual(geometry.offsetX - 1e-9);
      expect(v).toBeLessThanOrEqual(geometry.offsetX + geometry.widthMm + 1e-9);
    }
    for (const m of gcode.matchAll(/Y(-?[\d.]+)/g)) {
      const v = Number(m[1]);
      expect(v).toBeGreaterThanOrEqual(geometry.offsetY - 1e-9);
      expect(v).toBeLessThanOrEqual(
        geometry.offsetY + geometry.heightMm + 1e-9,
      );
    }

    expect(stats.bounds.xMin).toBeGreaterThanOrEqual(geometry.offsetX - 1e-9);
    expect(stats.bounds.xMax).toBeLessThanOrEqual(
      geometry.offsetX + geometry.widthMm + 1e-9,
    );
    expect(stats.bounds.yMax).toBeLessThanOrEqual(
      geometry.offsetY + geometry.heightMm + 1e-9,
    );
  });

  it('posições com no máximo 3 decimais (precisão do DRO)', () => {
    const { gcode } = imageToGcode(gradient(32, 32), 32, 32, options());
    for (const m of gcode.matchAll(/[XY](-?[\d.]+)/g)) {
      const [, raw] = m;
      const decimals = raw!.includes('.') ? raw!.split('.')[1]!.length : 0;
      expect(decimals).toBeLessThanOrEqual(3);
    }
  });

  it('S sempre dentro de {0} ∪ [sMin, sMax]', () => {
    const { gcode, stats } = imageToGcode(
      gradient(32, 8),
      32,
      8,
      options({
        engrave: {
          speedMmMin: 1500,
          travelSpeedMmMin: 5000,
          sMin: 120,
          sMax: 430,
          mode: 'M4',
        },
      }),
    );

    const values = all(gcode, /S(\d+)/g);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) {
      expect(v === 0 || (v >= 120 && v <= 430)).toBe(true);
    }
    expect(Math.max(...values)).toBeLessThanOrEqual(430);
    expect(stats.segments).toBeGreaterThan(0);
  });

  it('imagem preta grava; imagem branca não grava', () => {
    const black = imageToGcode(solid(10, 10, 0, 0, 0), 10, 10, options());
    expect(black.stats.burnedMm).toBeGreaterThan(9);
    expect(all(black.gcode, /S(\d+)/g).every((v) => v === 1000)).toBe(true);

    const white = imageToGcode(solid(10, 10, 255, 255, 255), 10, 10, options());
    expect(white.stats.burnedMm).toBe(0);
    expect(all(white.gcode, /S(\d+)/g).every((v) => v === 0)).toBe(true);
    expect(white.gcode).toContain('G0 '); // pula a linha em branco
  });

  it('trecho branco longo vira G0; trecho curto continua no feed', () => {
    const longGap = imageToGcode(
      solid(10, 10, 255, 255, 255),
      10,
      10,
      options(),
    );
    // 10 mm de branco em cada linha (gap >= 1 mm) -> desloca, além da entrada de linha.
    expect(
      lines(longGap.gcode).filter((l) => l.startsWith('G0')).length,
    ).toBeGreaterThanOrEqual(longGap.stats.rows * 2);

    // Gap acima de qualquer linha: sobram só os deslocamentos de entrada de linha.
    const shortGap = imageToGcode(
      solid(10, 10, 255, 255, 255),
      10,
      10,
      options({ gapThresholdMm: 100 }),
    );
    expect(lines(shortGap.gcode).filter((l) => l.startsWith('G0')).length).toBe(
      shortGap.stats.rows,
    );
    // ...e o restante da linha é feito com G1 no feed de gravação (S modal 0).
    const shortLines = lines(shortGap.gcode).filter((l) => l.startsWith('G1'));
    expect(shortLines.length).toBeGreaterThan(0);
    expect(all(shortGap.gcode, /S(\d+)/g).every((v) => v === 0)).toBe(true);
  });

  it('modo M4 arma M4; modo M3 arma M3 S0', () => {
    const m4 = imageToGcode(solid(10, 10, 0, 0, 0), 10, 10, options()).gcode;
    expect(m4).toMatch(/\nM4\n/);
    expect(m4).not.toContain('M3');

    const m3 = imageToGcode(
      solid(10, 10, 0, 0, 0),
      10,
      10,
      options({
        engrave: {
          speedMmMin: 1000,
          travelSpeedMmMin: 5000,
          sMin: 0,
          sMax: 1000,
          mode: 'M3',
        },
      }),
    ).gcode;
    expect(m3).toMatch(/\nM3 S0\n/);
    expect(m3).not.toContain('M4');
    expect(m3).toContain('S1000');
  });

  it('dithering gera grade binária e line-to-line mantém tons', () => {
    const dither = imageToGcode(
      solid(20, 20, 128, 128, 128),
      20,
      20,
      options({ algorithm: 'dither' }),
    );
    expect(Array.from(dither.grid).every((v) => v === 0 || v === 1)).toBe(true);

    const line = imageToGcode(
      gradient(20, 20),
      20,
      20,
      options({ algorithm: 'line' }),
    );
    const distinct = new Set(
      Array.from(line.grid).map((v) => Math.round(v * 1000)),
    );
    expect(distinct.size).toBeGreaterThan(5); // mantém os tons de cinza
  });

  it('estatísticas de dimensões, tempo e tamanho', () => {
    const { stats, gcode } = imageToGcode(
      gradient(20, 10),
      20,
      10,
      options({ geometry: { ...options().geometry, dotSizeMm: 0 } }),
    );

    // pitch 0.5 mm, área 10x10 sem ponto -> 21x21.
    expect(stats.rows).toBe(21);
    expect(stats.cols).toBe(21);
    expect(stats.linesPerMm).toBe(2);
    expect(stats.bytes).toBeGreaterThan(100);
    expect(stats.bytes).toBe(new TextEncoder().encode(gcode).length);
    expect(stats.estimatedSec).toBeGreaterThan(0);
    expect(stats.travelMm).toBeGreaterThan(0);
  });

  it('valida opções com mensagens amigáveis', () => {
    expect(() =>
      validateOptions(
        options({ geometry: { ...options().geometry, widthMm: 0 } }),
      ),
    ).toThrow(/Largura/);
    expect(() =>
      validateOptions(
        options({ engrave: { ...options().engrave, sMin: 900, sMax: 100 } }),
      ),
    ).toThrow(/S-min/);
    expect(() =>
      validateOptions(
        options({ engrave: { ...options().engrave, speedMmMin: 0 } }),
      ),
    ).toThrow(/Velocidade/);
    expect(() =>
      validateOptions(
        options({ engrave: { ...options().engrave, sMax: 99999 } }),
      ),
    ).toThrow(/32767/);
    expect(() =>
      validateOptions(options({ algorithm: 'nope' as 'line' })),
    ).toThrow(/Algoritmo/);
    expect(() => validateOptions(options())).not.toThrow();
  });

  it('não altera o buffer RGBA de entrada', () => {
    const img = gradient(8, 8);
    const before = Uint8ClampedArray.from(img);
    imageToGcode(img, 8, 8, options());
    expect(Array.from(img)).toEqual(Array.from(before));
  });
});

describe('passadas (RF-GC-6)', () => {
  it('repete a queima N vezes mantendo o laser desligado no retorno', () => {
    const single = imageToGcode(solid(10, 10, 0, 0, 0), 10, 10, options());
    const triple = imageToGcode(
      solid(10, 10, 0, 0, 0),
      10,
      10,
      options({ passes: 3 }),
    );

    // Queima e segmentos crescem ~3x (mesma geometria, mesmo grid).
    expect(triple.stats.burnedMm).toBeCloseTo(single.stats.burnedMm * 3, 6);
    expect(triple.stats.segments).toBe(single.stats.segments * 3);

    // O cabeçalho desliga o laser e a última linha também (fim da última passada).
    expect(lines(triple.gcode)[3]).toBe('M5'); // cabeçalho
    expect(lines(triple.gcode).at(-1)).toBe('M5'); // última passada
    // Cada passada acrescenta seus próprios M5 (rearmes + fechamento).
    expect(
      lines(triple.gcode).filter((l) => l === 'M5').length,
    ).toBeGreaterThan(lines(single.gcode).filter((l) => l === 'M5').length);

    // Invariante: todo G0 é precedido por M5 (inclusive o retorno entre passadas).
    const ls = lines(triple.gcode);
    for (let i = 1; i < ls.length; i++) {
      if (ls[i]!.startsWith('G0')) expect(ls[i - 1]).toBe('M5');
    }

    // O retorno entre passadas entra no tempo estimado.
    expect(triple.stats.travelMm).toBeGreaterThan(single.stats.travelMm);
    expect(triple.stats.estimatedSec).toBeGreaterThan(
      single.stats.estimatedSec,
    );
  });

  it('passes=1 é idêntico ao comportamento anterior (sem regressão)', () => {
    const implicit = imageToGcode(gradient(12, 12), 12, 12, options());
    const explicit = imageToGcode(
      gradient(12, 12),
      12,
      12,
      options({ passes: 1 }),
    );
    expect(explicit.gcode).toBe(implicit.gcode);
    expect(explicit.stats).toEqual(implicit.stats);
  });

  it('funciona no modo vetor', () => {
    const geo = { ...options().geometry, offsetX: 1, offsetY: 1 };
    const single = imageToGcode(
      solid(16, 16, 0, 0, 0),
      16,
      16,
      options({ algorithm: 'vector', geometry: geo }),
    );
    const double = imageToGcode(
      solid(16, 16, 0, 0, 0),
      16,
      16,
      options({ algorithm: 'vector', geometry: geo, passes: 2 }),
    );
    expect(single.stats.contours).toBeGreaterThan(0);
    expect(double.stats.burnedMm).toBeCloseTo(single.stats.burnedMm * 2, 6);
    expect(lines(double.gcode).filter((l) => l === 'M5').length).toBe(1 + 2);
  });

  it('valida o número de passadas', () => {
    expect(() => validateOptions(options({ passes: 0 }))).toThrow(/passadas/);
    expect(() => validateOptions(options({ passes: -1 }))).toThrow(/passadas/);
    expect(() => validateOptions(options({ passes: 1.5 }))).toThrow(/passadas/);
    expect(() => validateOptions(options({ passes: 100 }))).toThrow(/passadas/);
    expect(() => validateOptions(options({ passes: 99 }))).not.toThrow();
  });
});
