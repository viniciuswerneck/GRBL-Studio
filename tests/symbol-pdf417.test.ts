/**
 * PDF417 (RF-SYM-7) — o encoder é conferido de duas formas:
 *
 * 1. **Decodificação real**: a matriz é rasterizada (alguns px/módulo, quiet
 *    zone de 2 módulos) e lida de volta pelo `PDF417Reader` do
 *    `@zxing/library` — cobre Numeric, Byte (901/924), Latin-1 e vários níveis
 *    de EC/larguras.
 * 2. **Estrutura**: descritor de comprimento, síndromes de Reed–Solomon em
 *    GF(929), indicadores de linha, start/stop e erros tipados.
 */

import { describe, expect, it } from 'vitest';
import {
  BinaryBitmap,
  HybridBinarizer,
  PDF417Reader,
  RGBLuminanceSource,
} from '@zxing/library';
import {
  PDF417_QUIET_ZONE_MODULES,
  PDF417_START_PATTERN,
  PDF417_STOP_PATTERN,
  Pdf417Error,
  encodePdf417,
  pdf417EcCodewords,
  pdf417TotalModules,
} from '../src/shared/symbol/pdf417';
import { pdf417GridToGcode, pdf417ToGcode } from '../src/shared/symbol/gcode';

/** Rasteriza a matriz (retangular) em luminância; 0 = escuro. */
function rasterize(
  matrix: boolean[][],
  scale = 4,
  quiet = PDF417_QUIET_ZONE_MODULES,
): { luminance: Uint8ClampedArray; width: number; height: number } {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const width = (cols + quiet * 2) * scale;
  const height = (rows + quiet * 2) * scale;
  const luminance = new Uint8ClampedArray(width * height).fill(255);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!matrix[r][c]) continue;
      for (let dy = 0; dy < scale; dy++) {
        const y = (r + quiet) * scale + dy;
        for (let dx = 0; dx < scale; dx++) {
          luminance[y * width + (c + quiet) * scale + dx] = 0;
        }
      }
    }
  }
  return { luminance, width, height };
}

/** Decodifica de verdade (detector + RS do ZXing). */
function decode(matrix: boolean[][], scale = 4): string | null {
  const { luminance, width, height } = rasterize(matrix, scale);
  const source = new RGBLuminanceSource(luminance, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  try {
    return new PDF417Reader().decode(bitmap).getText();
  } catch {
    return null;
  }
}

/** Síndromes de Reed–Solomon em GF(929): todas zero ⇒ EC correto. */
function syndromes(codewords: ReadonlyArray<number>, k: number): number[] {
  const gfPow = (base: number, exp: number) => {
    let r = 1;
    for (let i = 0; i < exp; i++) r = (r * base) % 929;
    return r;
  };
  const out: number[] = [];
  for (let i = 1; i <= k; i++) {
    const x = gfPow(3, i);
    let acc = 0;
    for (const cw of codewords) acc = (acc * x + cw) % 929;
    out.push(acc);
  }
  return out;
}

describe('encodePdf417 — decodificação real', () => {
  it('decodifica conteúdo alfanumérico (Byte)', () => {
    const result = encodePdf417('GRBL-STUDIO-001');
    expect(decode(result.matrix)).toBe('GRBL-STUDIO-001');
  });

  it('decodifica conteúdo só de dígitos (Numeric)', () => {
    const result = encodePdf417('12345678901234567890');
    expect(decode(result.matrix)).toBe('12345678901234567890');
  });

  it('decodifica comprimentos que exercitam 901 e 924', () => {
    // 5 bytes (901 direto), 6 bytes (924), 7 bytes (901 misto), 16 bytes.
    for (const text of ['ABCDE', 'ABCDEF', 'ABCDEFG', 'ABCDEFGHIJKLMNOP']) {
      const result = encodePdf417(text);
      expect(decode(result.matrix), text).toBe(text);
    }
  });

  it('decodifica um número de série longo (Numeric, > 44 dígitos)', () => {
    const digits = '9'.repeat(50);
    const result = encodePdf417(digits);
    expect(decode(result.matrix)).toBe(digits);
  });

  it('decodifica acentos Latin-1', () => {
    const result = encodePdf417('Ação e Café');
    expect(decode(result.matrix)).toBe('Ação e Café');
  });

  it('rejeita caracteres fora do ISO-8859-1', () => {
    expect(() => encodePdf417('emoji 🚀')).toThrow(Pdf417Error);
    expect(() => encodePdf417('travessão —')).toThrow(Pdf417Error);
  });

  it('respeita colunas e níveis de EC', () => {
    for (const eccLevel of [0, 2, 5]) {
      for (const columns of ['auto', 4, 8] as const) {
        const text = 'ETIQUETA-0001';
        const result = encodePdf417(text, { eccLevel, columns });
        expect(result.eccLevel, `${eccLevel}/${columns}`).toBe(eccLevel);
        if (columns !== 'auto') expect(result.columns).toBe(columns);
        expect(decode(result.matrix), `${eccLevel}/${columns}`).toBe(text);
      }
    }
  });
});

describe('encodePdf417 — estrutura', () => {
  it('codifica o descritor de comprimento no primeiro codeword', () => {
    const result = encodePdf417('TESTE');
    expect(result.codewords[0]).toBe(result.dataCodewords);
    expect(result.codewords.length).toBe(result.totalCodewords);
    expect(result.rows * result.columns).toBe(result.totalCodewords);
    expect(result.dataCodewords + result.ecCodewords).toBe(
      result.totalCodewords,
    );
  });

  it('gera codewords de EC com síndromes nulas em GF(929)', () => {
    for (const eccLevel of [0, 1, 2, 3]) {
      const result = encodePdf417('SINDROME-42', { eccLevel });
      expect(syndromes(result.codewords, pdf417EcCodewords(eccLevel))).toEqual(
        new Array(pdf417EcCodewords(eccLevel)).fill(0),
      );
    }
  });

  it('monta as linhas com start, indicadores, stop e largura certa', () => {
    const result = encodePdf417('LINHA');
    const width = pdf417TotalModules(result.columns);
    expect(result.matrix).toHaveLength(result.rows);
    for (const row of result.matrix) expect(row).toHaveLength(width);

    // start (17 bits) + indicador esquerdo (17) no começo da primeira linha.
    const first = result.matrix[0];
    const firstBits = first.slice(0, 17);
    const startBits = Array.from(
      { length: 17 },
      (_, i) => ((PDF417_START_PATTERN >> (16 - i)) & 1) === 1,
    );
    expect(firstBits).toEqual(startBits);

    // stop (18 bits) no fim.
    const stopBits = first.slice(width - 18);
    const expectedStop = Array.from(
      { length: 18 },
      (_, i) => ((PDF417_STOP_PATTERN >> (17 - i)) & 1) === 1,
    );
    expect(stopBits).toEqual(expectedStop);
  });

  it('distribui os indicadores por linha em três clusters', () => {
    const result = encodePdf417('CLUSTER-1-2-3');
    expect(result.rows).toBeGreaterThanOrEqual(3);
    // As três primeiras linhas usam clusters distintos: o 1º codeword de dados
    // muda entre elas (cluster 0/1/2).
    const dataStart = 17 + 17;
    const seg = result.matrix.map((row) =>
      row.slice(dataStart, dataStart + 17).join(''),
    );
    expect(seg[0]).not.toBe(seg[1]);
    expect(seg[1]).not.toBe(seg[2]);
  });

  it('é determinístico', () => {
    const a = encodePdf417('DETERMINISTICO');
    const b = encodePdf417('DETERMINISTICO');
    expect(a.matrix).toEqual(b.matrix);
  });

  it('rejeita conteúdo vazio e colunas inválidas', () => {
    expect(() => encodePdf417('')).toThrow(Pdf417Error);
    expect(() => encodePdf417('X', { columns: 0 })).toThrow(Pdf417Error);
    expect(() => encodePdf417('X', { columns: 99 })).toThrow(Pdf417Error);
  });

  it('expõe a largura total pela norma', () => {
    expect(pdf417TotalModules(1)).toBe(86);
    expect(pdf417TotalModules(2)).toBe(103);
  });
});

describe('pdf417ToGcode / pdf417GridToGcode', () => {
  const gcodeParams = {
    feed: 1000,
    sMax: 1000,
    powerPercent: 100,
    mode: 'M4' as const,
    eccLevel: 2,
  };

  it('gera G-code com os invariantes de segurança', () => {
    const result = pdf417ToGcode('ETIQUETA-01', gcodeParams);
    expect(result.widthMm).toBeGreaterThan(0);
    expect(result.heightMm).toBeGreaterThan(0);
    expect(result.pdf417.rows).toBeGreaterThanOrEqual(3);
    expect(result.linesPerModule).toBeGreaterThan(0);
    expect(result.gcode).toContain('G21');
    expect(result.gcode).toContain('G90');
    expect(result.gcode).toContain('G94');
    expect(result.gcode.trimEnd().endsWith('G0 X0 Y0')).toBe(true);

    let armed = false;
    for (const line of result.gcode.split('\n')) {
      if (line.startsWith('M3 S') || line.startsWith('M4 S')) armed = true;
      else if (line.trim() === 'M5') armed = false;
      else if (line.startsWith('G0')) expect(armed).toBe(false);
    }
  });

  it('posiciona vários PDF417 em grade num só programa', () => {
    const single = pdf417ToGcode('A1', gcodeParams);
    const grid = pdf417GridToGcode(['A1', 'A2', 'A3', 'A4'], {
      ...gcodeParams,
      columns: 2,
      gapXMm: 6,
      gapYMm: 6,
    });
    expect(grid.count).toBe(4);
    expect(grid.columns).toBe(2);
    expect(grid.rows).toBe(2);
    expect(grid.cellWidthMm).toBeCloseTo(single.widthMm, 6);
    expect(grid.widthMm).toBeCloseTo(2 * single.widthMm + 6, 6);
    expect(grid.gcode.split('\n').filter((l) => l === 'G21')).toHaveLength(1);
    expect(grid.gcode).toContain('; [1] A1');
  });
});
