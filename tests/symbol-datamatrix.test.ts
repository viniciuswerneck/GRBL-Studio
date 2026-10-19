/**
 * Data Matrix ECC200 (RF-SYM-1) — o encoder é conferido de três formas:
 *
 * 1. **Vetor da norma**: `123456` em 10×10 contra a matriz publicada/gerada
 *    pela implementação de referência (ZXing).
 * 2. **Decodificação real**: a matriz é rasterizada (10 px/módulo, quiet zone
 *    de 1 módulo) e lida de volta pelo `DataMatrixReader` do `@zxing/library`,
 *    cobrindo tamanhos de 10×10 até 144×144, acentos Latin-1 e blocos EC
 *    intercalados.
 * 3. **Estrutura/erros**: bordas de descoberta, quiet zone, determinismo e os
 *    erros tipados (`empty`, `too-long`, `bad-chars`).
 */

import { describe, expect, it } from 'vitest';
import {
  BarcodeFormat,
  BinaryBitmap,
  DataMatrixReader,
  DataMatrixWriter,
  HybridBinarizer,
  RGBLuminanceSource,
} from '@zxing/library';
import {
  DATA_MATRIX_QUIET_ZONE,
  DATA_MATRIX_SIZES,
  DataMatrixError,
  dataMatrixSizeFor,
  encodeDataMatrix,
} from '../src/shared/symbol/datamatrix';

/** Matriz do símbolo `123456` em 10×10 (ISO/IEC 16022 / referência ZXing). */
const ISO_123456_10 = [
  '1010101010',
  '1100101101',
  '1100000100',
  '1100011101',
  '1100001000',
  '1000001111',
  '1110110000',
  '1111011001',
  '1001110100',
  '1111111111',
].map((row) => [...row].map((ch) => ch === '1'));

/** Rasteriza a matriz em luminância (0 = escuro) com a quiet zone pedida. */
const rasterize = (
  matrix: boolean[][],
  scale = 10,
  quiet = DATA_MATRIX_QUIET_ZONE,
): { luminance: Uint8ClampedArray; side: number } => {
  const size = matrix.length;
  const side = (size + quiet * 2) * scale;
  const luminance = new Uint8ClampedArray(side * side).fill(255);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!matrix[row][col]) continue;
      for (let dy = 0; dy < scale; dy++) {
        const y = (row + quiet) * scale + dy;
        for (let dx = 0; dx < scale; dx++) {
          luminance[y * side + (col + quiet) * scale + dx] = 0;
        }
      }
    }
  }
  return { luminance, side };
};

/** Decodifica de verdade (detector + RS + modo ASCII do ZXing). */
const decode = (matrix: boolean[][], scale = 10): string | null => {
  const { luminance, side } = rasterize(matrix, scale);
  const source = new RGBLuminanceSource(luminance, side, side);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  try {
    return new DataMatrixReader().decode(bitmap).getText();
  } catch {
    return null;
  }
};

/** Matriz produzida pela referência (ZXing), só para o cross-check. */
const referenceMatrix = (text: string): boolean[][] => {
  const matrix = new DataMatrixWriter().encode(
    text,
    BarcodeFormat.DATA_MATRIX,
    0,
    0,
  );
  return Array.from({ length: matrix.getHeight() }, (_, row) =>
    Array.from({ length: matrix.getWidth() }, (_, col) => matrix.get(col, row)),
  );
};

describe('encodeDataMatrix — vetor conhecido da norma', () => {
  it('"123456" gera o 10×10 de 3 dados + 5 EC', () => {
    const result = encodeDataMatrix('123456');
    expect(result.size).toBe(10);
    expect(result.widthModules).toBe(10);
    expect(result.heightModules).toBe(10);
    expect(result.dataCodewords).toBe(3);
    expect(result.eccBlocks).toBe(1);
    expect(result.matrix).toEqual(ISO_123456_10);
  });

  it('a matriz do 10×10 coincide com a referência (ZXing)', () => {
    expect(encodeDataMatrix('123456').matrix).toEqual(
      referenceMatrix('123456'),
    );
  });

  it('o par de dígitos compacta o modo ASCII', () => {
    // 6 dígitos = 3 codewords; 6 letras = 6 codewords (não cabem em 10×10).
    expect(encodeDataMatrix('123456').size).toBe(10);
    expect(encodeDataMatrix('ABCDEF').size).toBe(14);
    expect(() => encodeDataMatrix('ABCDEF', { size: 10 })).toThrow(
      DataMatrixError,
    );
  });
});

describe('encodeDataMatrix — decodificação real (ZXing)', () => {
  const payloads: Array<{
    text: string;
    size: number;
    blocks: number;
    note: string;
  }> = [
    { text: '123456', size: 10, blocks: 1, note: '10×10 mínimo' },
    { text: 'HELLO', size: 12, blocks: 1, note: '12×12' },
    { text: 'Ação', size: 14, blocks: 1, note: '14×14 Latin-1' },
    {
      text: 'Grbl Stúdio',
      size: 16,
      blocks: 1,
      note: '16×16 Latin-1 no limite',
    },
    {
      text: 'DATA MATRIX 2026 - GRBL STUDIO ECC200',
      size: 24,
      blocks: 1,
      note: '24×24',
    },
    { text: 'X'.repeat(62), size: 32, blocks: 1, note: '32×32 no limite' },
    {
      text: 'D'.repeat(200),
      size: 52,
      blocks: 2,
      note: '52×52 com 2 blocos intercalados',
    },
    {
      text: 'm'.repeat(1000),
      size: 120,
      blocks: 6,
      note: '120×120 com 6 blocos',
    },
    {
      text: 'Z'.repeat(1558),
      size: 144,
      blocks: 10,
      note: '144×144 com 10 blocos (2 de 155 dados)',
    },
  ];

  for (const { text, size, blocks, note } of payloads) {
    it(`${note}: "${text.slice(0, 18)}${text.length > 18 ? '…' : ''}"`, () => {
      const result = encodeDataMatrix(text);
      expect(result.size).toBe(size);
      expect(result.eccBlocks).toBe(blocks);
      expect(decode(result.matrix)).toBe(text);
    });
  }

  it('acentos Latin-1 (Upper Shift) decodificam', () => {
    for (const text of [
      'Ação',
      'café',
      'Grbl Stúdio',
      'São Paulo - 2026',
      'áéíóú ç ã õ ü',
    ]) {
      expect(decode(encodeDataMatrix(text).matrix)).toBe(text);
    }
  });

  it('o mesmo conteúdo decodifica em todos os tamanhos que o comportam', () => {
    for (const { size } of DATA_MATRIX_SIZES) {
      const text = 'DM';
      const result = encodeDataMatrix(text, { size });
      expect(result.size).toBe(size);
      expect(decode(result.matrix)).toBe(text);
    }
    // 24 decodificações (até 144×144) com o ZXing: sob instrumentação de
    // cobertura passa dos 5 s padrão — não é regressão, é custo do teste.
  }, 30_000);
});

describe('encodeDataMatrix — estrutura', () => {
  it('a matriz é quadrada, booleana e tem o tamanho anunciado', () => {
    for (const { size } of DATA_MATRIX_SIZES) {
      const result = encodeDataMatrix('A', { size });
      expect(result.matrix).toHaveLength(size);
      for (const row of result.matrix) expect(row).toHaveLength(size);
      expect(result.widthModules).toBe(size);
      expect(result.heightModules).toBe(size);
    }
  });

  it('bordas: topo alternado, esquerda/base sólidas, direita alternada', () => {
    const sizes = new Set([10, 16, 32, 52, 144]);
    for (const symbol of DATA_MATRIX_SIZES.filter((s) => sizes.has(s.size))) {
      const { size, dataRegion: region, regions } = symbol;
      const dataSide = region * regions;
      const { matrix } = encodeDataMatrix('A', { size });

      for (let col = 0; col < size; col++) {
        expect(matrix[0][col]).toBe(col % 2 === 0);
        expect(matrix[size - 1][col]).toBe(true);
      }
      for (let row = 0; row < size; row++) {
        expect(matrix[row][0]).toBe(true);
      }
      // A borda direita alterna pela linha global de dados.
      for (let y = 0; y < dataSide; y++) {
        const symbolRow = y + 1 + 2 * Math.floor(y / region);
        expect(matrix[symbolRow][size - 1]).toBe(y % 2 === 0);
      }
    }
  });

  it('a quiet zone é 1 módulo e não entra na matriz', () => {
    expect(DATA_MATRIX_QUIET_ZONE).toBe(1);
    const result = encodeDataMatrix('123456');
    expect(result.size).toBe(result.matrix.length);
    // A matriz começa na borda de descoberta (sem margem branca).
    expect(result.matrix[0][0]).toBe(true);
  });

  it('é determinístico e reporta a capacidade do símbolo', () => {
    const a = encodeDataMatrix('determinismo 123');
    const b = encodeDataMatrix('determinismo 123');
    expect(a.matrix).toEqual(b.matrix);
    for (const symbol of DATA_MATRIX_SIZES) {
      expect(symbol.size).toBe(
        symbol.dataRegion * symbol.regions + 2 * symbol.regions,
      );
      expect(symbol.dataCodewords + symbol.eccCodewords).toBe(
        Math.floor((symbol.dataRegion * symbol.regions) ** 2 / 8),
      );
    }
  });
});

describe('encodeDataMatrix — erros tipados', () => {
  const codeOf = (run: () => unknown): string | undefined => {
    try {
      run();
    } catch (error) {
      return error instanceof DataMatrixError ? error.code : undefined;
    }
    return undefined;
  };

  it('conteúdo vazio', () => {
    expect(codeOf(() => encodeDataMatrix(''))).toBe('empty');
  });

  it('texto longo demais para o maior símbolo', () => {
    expect(codeOf(() => encodeDataMatrix('A'.repeat(1559)))).toBe('too-long');
  });

  it('texto que não cabe no tamanho forçado', () => {
    expect(codeOf(() => encodeDataMatrix('A'.repeat(6), { size: 10 }))).toBe(
      'too-long',
    );
  });

  it('tamanho inválido', () => {
    expect(codeOf(() => encodeDataMatrix('A', { size: 11 }))).toBe('bad-size');
  });

  it('caractere fora de Latin-1', () => {
    for (const text of ['汉字', 'emoji 🚀', 'A\u20ac']) {
      expect(codeOf(() => encodeDataMatrix(text))).toBe('bad-chars');
    }
  });

  it('escolhe o menor símbolo que couber', () => {
    expect(dataMatrixSizeFor('123456').size).toBe(10);
    expect(dataMatrixSizeFor('ABCDEF').size).toBe(14);
    expect(dataMatrixSizeFor('A'.repeat(62)).size).toBe(32);
    expect(dataMatrixSizeFor('A', 52).size).toBe(52);
  });
});
