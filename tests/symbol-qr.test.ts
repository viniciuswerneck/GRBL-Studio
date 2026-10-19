/**
 * QR Code (RF-SYM-1) — o encoder é conferido de três formas:
 *
 * 1. **Matriz contra matriz**: a máscara escolhida pela biblioteca de referência
 *    (`qrcode-generator`, MIT, devDependency) é lida da própria informação de
 *    formato do símbolo dela; reencodando com a mesma máscara, as matrizes têm
 *    de ser idênticas — isso valida RS, intercalação, posicionamento e formato.
 * 2. **Decodificação real**: a matriz é rasterizada e lida de volta pelo `jsqr`
 *    (também devDependency) — vale para UTF-8, todas as máscaras e versões.
 * 3. **Estrutura**: finders, timing, alignment, módulo escuro, formato e versão.
 */

import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import qrcode from 'qrcode-generator';
import {
  QrError,
  encodeQr,
  qrMaxBytes,
  qrVersionFor,
} from '../src/shared/symbol/qr';
import { ALIGNMENT_POSITIONS, RS_BLOCKS } from '../src/shared/symbol/qr.tables';

type Ecc = 'L' | 'M' | 'Q' | 'H';
/** A referência tipa a versão como uma união literal; aqui só validamos 1–40. */
type TypeNumber = Parameters<typeof qrcode>[0];

const referenceMatrix = (
  text: string,
  version: number,
  ecc: Ecc,
  mode?: 'Numeric' | 'Alphanumeric' | 'Byte',
): boolean[][] => {
  const qr = qrcode(version as TypeNumber, ecc);
  qr.addData(text, mode);
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => qr.isDark(r, c)),
  );
};

/** Lê a máscara da informação de formato do símbolo. */
const maskOf = (matrix: boolean[][]): number => {
  const size = matrix.length;
  let bits = 0;
  for (let i = 0; i < 15; i++) {
    const on =
      i < 6
        ? matrix[i][8]
        : i < 8
          ? matrix[i + 1][8]
          : matrix[size - 15 + i][8];
    if (on) bits |= 1 << i;
  }
  // O valor é (dados << 10 | BCH) — a máscara são os 3 bits de dados baixos.
  return ((bits ^ 0b101010000010010) >>> 10) & 7;
};

/** Modo que o encoder deve escolher (mesma regra do módulo). */
const modeOf = (text: string): 'Numeric' | 'Alphanumeric' | 'Byte' =>
  /^[0-9]+$/.test(text)
    ? 'Numeric'
    : /^[0-9A-Z $%*+\-./:]+$/.test(text)
      ? 'Alphanumeric'
      : 'Byte';

/** Bytes de dados que cabem na versão/nível (com folga para o cabeçalho). */
const fitBytes = (version: number, ecc: Ecc): number => {
  const idx = { L: 0, M: 1, Q: 2, H: 3 }[ecc];
  const cap = RS_BLOCKS[(version - 1) * 4 + idx].reduce(
    (n, [count, , data]) => n + count * data,
    0,
  );
  return cap - 3;
};

/** Rasteriza a matriz (módulo de `scale` px + quiet zone) para o decodificador. */
const rasterize = (
  matrix: boolean[][],
  scale = 4,
  quiet = 4,
): { data: Uint8ClampedArray; width: number } => {
  const size = matrix.length;
  const side = (size + quiet * 2) * scale;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!matrix[r][c]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const y = (r + quiet) * scale + dy;
          const x = (c + quiet) * scale + dx;
          const i = (y * side + x) * 4;
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255;
        }
      }
    }
  }
  return { data, width: side };
};

const decode = (matrix: boolean[][]): string | null => {
  const { data, width } = rasterize(matrix);
  return jsQR(data, width, width)?.data ?? null;
};

describe('encodeQr — matriz igual à referência (mesma máscara)', () => {
  const cases: Array<{ text: string; version: number; ecc: Ecc }> = [
    { text: 'HELLO WORLD', version: 1, ecc: 'Q' },
    { text: '0123456789', version: 1, ecc: 'H' },
    { text: 'https://lab.werneck.dev.br', version: 2, ecc: 'M' },
    { text: 'GRBL Studio', version: 3, ecc: 'L' },
    { text: 'x'.repeat(fitBytes(6, 'Q')), version: 6, ecc: 'Q' },
    { text: 'QR CODE 2026 - TESTE 42', version: 5, ecc: 'M' },
    { text: '1234567890123456789012345678901234567890', version: 4, ecc: 'L' },
    { text: 'c'.repeat(fitBytes(7, 'H')), version: 7, ecc: 'H' },
    { text: 'n'.repeat(fitBytes(12, 'M')), version: 12, ecc: 'M' },
    { text: 'y'.repeat(fitBytes(20, 'L')), version: 20, ecc: 'L' },
    { text: 'z'.repeat(fitBytes(33, 'Q')), version: 33, ecc: 'Q' },
  ];

  for (const { text, version, ecc } of cases) {
    it(`v${version} ${ecc} — "${text.slice(0, 16)}${text.length > 16 ? '…' : ''}"`, () => {
      const reference = referenceMatrix(text, version, ecc, modeOf(text));
      const mask = maskOf(reference);
      const mine = encodeQr(text, { ecc, version, mask });
      expect(mine.size).toBe(reference.length);
      expect(mine.mask).toBe(mask);
      expect(mine.matrix).toEqual(reference);
    });
  }
});

describe('encodeQr — decodificação real (jsqr)', () => {
  it('texto alfanumérico', () => {
    expect(decode(encodeQr('HELLO WORLD').matrix)).toBe('HELLO WORLD');
  });

  it('URL', () => {
    const url = 'https://github.com/viniciuswerneck/GRBL-Studio';
    expect(decode(encodeQr(url).matrix)).toBe(url);
  });

  it('acentos e emoji (UTF-8)', () => {
    const text = 'Ação ção — 汉字 🚀';
    expect(decode(encodeQr(text).matrix)).toBe(text);
  });

  it('numérico', () => {
    expect(decode(encodeQr('0123456789012345').matrix)).toBe(
      '0123456789012345',
    );
  });

  it('todas as máscaras fixas decodificam', () => {
    for (let mask = 0; mask < 8; mask++) {
      const res = encodeQr('MASK TEST 123', { version: 3, mask, ecc: 'M' });
      expect(res.mask).toBe(mask);
      expect(decode(res.matrix)).toBe('MASK TEST 123');
    }
  });

  it('versões e níveis variados decodificam', () => {
    // Conteúdo dimensionado para a versão pedida (o limite do nível H é o menor).
    for (const ecc of ['L', 'M', 'Q', 'H'] as Ecc[]) {
      for (const version of [1, 2, 5, 7, 10, 25, 40]) {
        const text = 'A'.repeat(Math.max(1, fitBytes(version, ecc)));
        const res = encodeQr(text, { ecc, version });
        expect(res.version).toBe(version);
        expect(decode(res.matrix)).toBe(text);
      }
    }
    // 28 bitmaps (até 177×177 a 4 px/módulo) para o jsqr: pesado de propósito,
    // mas não pode ser refém da carga da máquina (CI roda em paralelo).
  }, 30_000);

  it('o QR é estável (mesma entrada, mesma matriz)', () => {
    const a = encodeQr('determinismo');
    const b = encodeQr('determinismo');
    expect(a.matrix).toEqual(b.matrix);
    expect(a.mask).toBe(b.mask);
  });

  it('a máscara automática está entre 0 e 7 e o QR decodifica', () => {
    const res = encodeQr('M4 S1000 acelera o código de barras');
    expect(res.mask).toBeGreaterThanOrEqual(0);
    expect(res.mask).toBeLessThanOrEqual(7);
    expect(decode(res.matrix)).toBe('M4 S1000 acelera o código de barras');
  });
});

describe('encodeQr — estrutura do símbolo', () => {
  it('tamanho é 17 + 4·versão', () => {
    for (const version of [1, 2, 7, 14, 40]) {
      const res = encodeQr('A', { version });
      expect(res.size).toBe(17 + 4 * version);
      expect(res.matrix).toHaveLength(res.size);
      expect(res.matrix[0]).toHaveLength(res.size);
    }
  });

  it('finder patterns nos três cantos, com separador branco', () => {
    const m = encodeQr('FINDERS', { version: 2 }).matrix;
    const size = m.length;
    const expectFinder = (row: number, col: number): void => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const ring = r === 0 || r === 6 || c === 0 || c === 6;
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          expect(m[row + r][col + c]).toBe(ring || core);
        }
      }
    };
    expectFinder(0, 0);
    expectFinder(0, size - 7);
    expectFinder(size - 7, 0);
    // Separador: a linha 7 na faixa do finder é clara.
    for (let c = 0; c < 8; c++) {
      expect(m[7][c]).toBe(false);
      expect(m[c][7]).toBe(false);
    }
  });

  it('timing patterns alternam a partir da linha 8', () => {
    const m = encodeQr('TIMING', { version: 5 }).matrix;
    const size = m.length;
    for (let i = 8; i < size - 8; i++) {
      expect(m[6][i]).toBe(i % 2 === 0);
      expect(m[i][6]).toBe(i % 2 === 0);
    }
  });

  it('alignment patterns nas posições da versão (sem sobrepor finders)', () => {
    for (const version of [2, 7, 20]) {
      const m = encodeQr('ALIGN', { version }).matrix;
      const positions = ALIGNMENT_POSITIONS[version - 1];
      let placed = 0;
      for (const r of positions) {
        for (const c of positions) {
          const inFinder =
            (r <= 7 && c <= 7) ||
            (r <= 7 && c >= m.length - 8) ||
            (r >= m.length - 8 && c <= 7);
          // Sobreposição: a área pertence ao finder (não é alignment).
          if (inFinder) continue;
          placed++;
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              expect(m[r + dr][c + dc]).toBe(
                Math.max(Math.abs(dr), Math.abs(dc)) !== 1,
              );
            }
          }
        }
      }
      expect(placed).toBeGreaterThan(0);
    }
  });

  it('módulo escuro fixo e informação de formato', () => {
    const res = encodeQr('FORMAT', { version: 3, ecc: 'Q', mask: 5 });
    const m = res.matrix;
    const size = m.length;
    expect(m[size - 8][8]).toBe(true);

    // Recalcula o formato (BCH 15,5) fora do módulo.
    const eccBits = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 }[res.ecc];
    const data = (eccBits << 3) | res.mask;
    let bch = data << 10;
    const bitLen = (v: number): number => {
      let n = 0;
      while (v !== 0) {
        n++;
        v >>>= 1;
      }
      return n;
    };
    while (bitLen(bch) >= bitLen(0b10100110111)) {
      bch ^= 0b10100110111 << (bitLen(bch) - bitLen(0b10100110111));
    }
    const bits = ((data << 10) | bch) ^ 0b101010000010010;
    for (let i = 0; i < 15; i++) {
      const on = ((bits >>> i) & 1) === 1;
      expect(m[i < 6 ? i : i < 8 ? i + 1 : size - 15 + i][8]).toBe(on);
    }
  });

  it('informação de versão (v ≥ 7) em BCH(18,6)', () => {
    const res = encodeQr('VERSION INFO', { version: 8 });
    const m = res.matrix;
    const size = m.length;
    const G18 = 0b1111100100101;
    const bitLen = (v: number): number => {
      let n = 0;
      while (v !== 0) {
        n++;
        v >>>= 1;
      }
      return n;
    };
    let bch = res.version << 12;
    while (bitLen(bch) >= bitLen(G18))
      bch ^= G18 << (bitLen(bch) - bitLen(G18));
    const bits = (res.version << 12) | bch;
    for (let i = 0; i < 18; i++) {
      const on = ((bits >>> i) & 1) === 1;
      expect(m[Math.floor(i / 3)][(i % 3) + size - 11]).toBe(on);
      expect(m[(i % 3) + size - 11][Math.floor(i / 3)]).toBe(on);
    }
  });
});

describe('encodeQr — seleção de versão e erros', () => {
  it('escolhe a menor versão que cabe', () => {
    expect(qrVersionFor('HELLO WORLD', 'M')).toBe(1);
    expect(encodeQr('HELLO WORLD').version).toBe(1);
    // 11 alfanuméricos não cabem no v1-H (capacidade 10) — vai para o v2.
    expect(qrVersionFor('HELLO WORLD', 'H')).toBe(2);
    expect(encodeQr('HELLO WORLD', { ecc: 'H' }).version).toBe(2);
    // Numérico é mais denso: 17 dígitos ainda cabem no v1-H.
    expect(qrVersionFor('01234567890123456', 'H')).toBe(1);
  });

  it('reporta o modo escolhido', () => {
    expect(encodeQr('12345').mode).toBe('numeric');
    expect(encodeQr('HELLO WORLD').mode).toBe('alphanumeric');
    expect(encodeQr('hello world').mode).toBe('byte');
    expect(encodeQr('ação').mode).toBe('byte');
  });

  it('conteúdo vazio é erro `empty`', () => {
    expect(() => encodeQr('')).toThrowError(QrError);
    try {
      encodeQr('');
    } catch (err) {
      expect((err as QrError).code).toBe('empty');
    }
  });

  it('conteúdo longo demais é erro `too-long`', () => {
    const huge = 'x'.repeat(qrMaxBytes('H') + 1);
    try {
      encodeQr(huge, { ecc: 'H' });
      throw new Error('deveria ter falhado');
    } catch (err) {
      expect((err as QrError).code).toBe('too-long');
    }
  });

  it('versão e máscara inválidas são erro `bad-version`', () => {
    for (const opts of [
      { version: 41 },
      { version: 0 },
      { mask: 8 },
      { mask: -1 },
    ]) {
      try {
        encodeQr('X', opts);
        throw new Error('deveria ter falhado');
      } catch (err) {
        expect((err as QrError).code).toBe('bad-version');
      }
    }
  });

  it('conteúdo que não cabe na versão pedida dá `too-long`', () => {
    try {
      encodeQr('x'.repeat(100), { version: 1, ecc: 'H' });
      throw new Error('deveria ter falhado');
    } catch (err) {
      expect((err as QrError).code).toBe('too-long');
    }
  });

  it('`byteLength` conta bytes UTF-8, não caracteres', () => {
    expect(encodeQr('ação').byteLength).toBe(6);
    expect(encodeQr('abc').byteLength).toBe(3);
  });
});
