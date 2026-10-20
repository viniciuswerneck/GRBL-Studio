/**
 * Aztec (RF-SYM-7) — o encoder é conferido de três formas:
 *
 * 1. **Matriz × matriz**: o mesmo conteúdo é codificado pela implementação de
 *    referência (ZXing) e comparado **bit a bit**. A comparação usa o
 *    *encoder* do ZXing (que recebe **bytes**), não o *writer*: o writer do
 *    pacote JS converte o texto em **UTF-8**, e o Aztec é byte-a-byte (o
 *    resultado seria "Ã§" no lugar de "ç" — bug do port, não da norma).
 * 2. **Decodificação real**: a matriz é rasterizada e lida de volta pelo
 *    `AztecCodeReader` do `@zxing/library` — o que prova que um leitor de
 *    verdade entende o símbolo.
 * 3. **Estrutura/erros**: camadas, mensagem de modo, determinismo e os erros
 *    tipados (`empty`, `bad-chars`, `too-long`, `layers`).
 */

import { describe, expect, it } from 'vitest';
import {
  BarcodeFormat,
  BinaryBitmap,
  AztecCodeReader,
  AztecCodeWriter,
  AztecEncoder,
  HybridBinarizer,
  RGBLuminanceSource,
} from '@zxing/library';
import {
  AztecError,
  AZTEC_MAX_LAYERS,
  encodeAztec,
} from '../src/shared/symbol/aztec';

/** Bytes Latin-1 do conteúdo (o mesmo que o encoder do ZXing recebe). */
const latin1 = (text: string): number[] =>
  [...text].map((char) => char.charCodeAt(0));

/** Matriz da referência (ZXing), a partir dos **bytes**. */
const reference = (text: string): boolean[][] => {
  const code = (
    AztecEncoder as unknown as {
      encode: (
        data: number[],
        eccPercent: number,
        layers: number,
      ) => { getMatrix: () => { get: (x: number, y: number) => boolean } };
    }
  ).encode(latin1(text), 33, 0);
  const matrix = code.getMatrix();
  const out: boolean[][] = [];
  for (let y = 0; y < matrix.getHeight(); y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < matrix.getWidth(); x += 1) row.push(matrix.get(x, y));
    out.push(row);
  }
  return out;
};

/** Matriz da referência pelo *writer* (string → UTF-8 no port do ZXing). */
const referenceWriter = (text: string): boolean[][] => {
  const matrix = new AztecCodeWriter().encode(text, BarcodeFormat.AZTEC, 0, 0);
  const out: boolean[][] = [];
  for (let y = 0; y < matrix.getHeight(); y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < matrix.getWidth(); x += 1) row.push(matrix.get(x, y));
    out.push(row);
  }
  return out;
};

/** Rasteriza a matriz em luminância (0 = escuro) com a quiet zone pedida. */
const rasterize = (
  matrix: boolean[][],
  scale = 8,
  quiet = 2,
): { luminance: Uint8ClampedArray; side: number } => {
  const size = matrix.length;
  const side = (size + quiet * 2) * scale;
  const luminance = new Uint8ClampedArray(side * side).fill(255);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!matrix[row][col]) continue;
      for (let dy = 0; dy < scale; dy += 1) {
        const y = (row + quiet) * scale + dy;
        for (let dx = 0; dx < scale; dx += 1) {
          luminance[y * side + (col + quiet) * scale + dx] = 0;
        }
      }
    }
  }
  return { luminance, side };
};

/** Decodifica de verdade (detector + RS + modo alto do ZXing). */
const decode = (matrix: boolean[][], scale = 8, quiet = 2): string | null => {
  const { luminance, side } = rasterize(matrix, scale, quiet);
  const source = new RGBLuminanceSource(luminance, side, side);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  try {
    return new AztecCodeReader().decode(bitmap).getText();
  } catch {
    return null;
  }
};

const asRows = (matrix: boolean[][]): string[] =>
  matrix.map((row) => row.map((cell) => (cell ? '1' : '0')).join(''));

const CONTENTS = [
  'A',
  'HELLO',
  'https://exemplo.com',
  '1234567890',
  'ABC abc 123',
  'Obrigado!',
  'ponta-brava, maçã e coração',
  'A'.repeat(40),
  '0123456789'.repeat(12),
  'x'.repeat(300),
];

describe('Aztec (RF-SYM-7)', () => {
  it('gera a mesma matriz da referência (ZXing, bytes Latin-1)', () => {
    for (const text of CONTENTS) {
      const mine = encodeAztec(text).matrix;
      const theirs = reference(text);
      expect(mine.length, `tamanho de "${text.slice(0, 20)}"`).toBe(
        theirs.length,
      );
      expect(asRows(mine)).toEqual(asRows(theirs));
    }
  });

  it('o leitor real devolve o conteúdo original', () => {
    for (const text of CONTENTS) {
      const result = encodeAztec(text);
      expect(decode(result.matrix), `conteúdo de "${text.slice(0, 20)}"`).toBe(
        text,
      );
    }
  });

  it('acrescenta acentos Latin-1 (byte a byte, sem UTF-8)', () => {
    const text = 'Ação, coração e preço: R$ 12,50';
    const result = encodeAztec(text);
    expect(decode(result.matrix)).toBe(text);
    // O writer do ZXing-JS converte para UTF-8 e grava 2 bytes por acento:
    // a matriz sai diferente (e o leitor devolve "Ã§" no lugar de "ç").
    expect(asRows(result.matrix)).not.toEqual(asRows(referenceWriter(text)));
  });

  it('escolhe o menor símbolo que cabe (compacto quando possível)', () => {
    const small = encodeAztec('A');
    expect(small.compact).toBe(true);
    expect(small.layers).toBeLessThanOrEqual(4);

    const big = encodeAztec('A'.repeat(400));
    expect(big.compact).toBe(false);
    expect(big.layers).toBeGreaterThan(4);
    expect(big.layers).toBeLessThanOrEqual(AZTEC_MAX_LAYERS);
  });

  it('respeita as camadas forçadas', () => {
    const forced = encodeAztec('GRBL STUDIO', { layers: -2 });
    expect(forced.compact).toBe(true);
    expect(forced.layers).toBe(2);
    expect(decode(forced.matrix)).toBe('GRBL STUDIO');

    const normal = encodeAztec('GRBL STUDIO', { layers: 5 });
    expect(normal.compact).toBe(false);
    expect(normal.layers).toBe(5);
    expect(decode(normal.matrix)).toBe('GRBL STUDIO');
  });

  it('é determinístico', () => {
    const a = encodeAztec('GRBL Studio');
    const b = encodeAztec('GRBL Studio');
    expect(a.matrix).toEqual(b.matrix);
    expect(a.size).toBe(b.size);
  });

  it('rejeita conteúdo vazio, fora do Latin-1 e grande demais', () => {
    expect(() => encodeAztec('')).toThrow(AztecError);
    try {
      encodeAztec('');
    } catch (err) {
      expect((err as AztecError).code).toBe('empty');
    }

    try {
      encodeAztec('emoji 🎯');
    } catch (err) {
      expect((err as AztecError).code).toBe('bad-chars');
    }

    try {
      encodeAztec('A'.repeat(5000));
    } catch (err) {
      expect((err as AztecError).code).toBe('too-long');
    }

    try {
      encodeAztec('A'.repeat(500), { layers: -1 });
    } catch (err) {
      expect((err as AztecError).code).toBe('layers');
    }
  });
});
