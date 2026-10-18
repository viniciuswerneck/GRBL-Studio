/**
 * Códigos de barras 1D (RF-SYM-2) — o encoder é conferido de três formas:
 *
 * 1. **Cross-check** com o `jsbarcode` (MIT, devDependency): a sequência de
 *    módulos dos conjuntos fixos (Code 128 A/B/C, EAN-13/8, UPC-A, Code 39) tem
 *    de ser idêntica à da biblioteca de referência.
 * 2. **Exemplos das normas**: checksums `mod 103` (Code 128), `mod 10`
 *    (EAN/UPC) e `mod 43` (Code 39), larguras de barra e guardas.
 * 3. **Erros**: dígito verificador (esperado × informado), caracteres
 *    inválidos e comprimento.
 */

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { encodeCode128 } from '../src/shared/symbol/barcode/code128';
import { encodeCode39 } from '../src/shared/symbol/barcode/code39';
import { encodeEan, eanCheckDigit } from '../src/shared/symbol/barcode/ean';
import {
  BARCODE_SPECS,
  BarcodeError,
  encodeBarcode,
  modulesToBars,
} from '../src/shared/symbol/barcode';
import { CODE128_PATTERNS } from '../src/shared/symbol/barcode/tables';

interface RefPart {
  data: string;
}
interface RefEncoder {
  encode(): RefPart | RefPart[];
}
const require = createRequire(import.meta.url);
const JsBarcode = require('jsbarcode') as {
  getModule(name: string): new (data: string, options?: object) => RefEncoder;
};

/** Módulos que o `jsbarcode` produz para `data` no módulo `name`. */
const refModules = (name: string, data: string, options = {}): string => {
  const Encoder = JsBarcode.getModule(name);
  const encoded = new Encoder(data, options).encode();
  const parts = Array.isArray(encoded) ? encoded : [encoded];
  return parts.map((p) => p.data).join('');
};

/**
 * Decodifica o Code 128 (só o que o encoder emite: A/B/C e trocas) — prova, de
 * forma independente, que o símbolo codifica o texto pedido. Confere também o
 * dígito verificador e o stop.
 */
const decodeCode128 = (modules: string): string => {
  const values: number[] = [];
  let i = 0;
  while (i < modules.length) {
    const length = modules.length - i === 13 ? 13 : 11;
    const value = CODE128_PATTERNS.indexOf(modules.slice(i, i + length));
    expect(value).toBeGreaterThanOrEqual(0);
    values.push(value);
    i += length;
  }
  expect(values[values.length - 1]).toBe(106);
  let sum = values[0];
  for (let k = 1; k < values.length - 2; k++) sum += k * values[k];
  expect(values[values.length - 2]).toBe(sum % 103);

  let set: 'A' | 'B' | 'C' =
    values[0] === 103 ? 'A' : values[0] === 104 ? 'B' : 'C';
  let out = '';
  for (let k = 1; k < values.length - 2; k++) {
    const value = values[k];
    if (set === 'C') {
      if (value <= 99) out += String(value).padStart(2, '0');
      else if (value === 100) set = 'B';
      else if (value === 101) set = 'A';
      continue;
    }
    if (value === 99) {
      set = 'C';
      continue;
    }
    if (set === 'A' && value === 100) {
      set = 'B';
      continue;
    }
    if (set === 'B' && value === 101) {
      set = 'A';
      continue;
    }
    if (value >= 96) continue; // FNC/SHIFT (o encoder não emite)
    out += String.fromCharCode(
      set === 'A' && value >= 64 ? value - 64 : value + 32,
    );
  }
  return out;
};

describe('Code 128 (ISO/IEC 15417)', () => {
  it('conjunto B idêntico à referência', () => {
    for (const text of ['GRBL', 'Hello World', 'A1B2C3', 'abcXYZ*+-./']) {
      expect(encodeCode128(text, { charset: 'B' }).modules).toBe(
        refModules('CODE128B', text),
      );
    }
  });

  it('conjunto A idêntico à referência (maiúsculas e controle)', () => {
    for (const text of ['GRBL', 'ABC123', '\x01\x02XYZ']) {
      expect(encodeCode128(text, { charset: 'A' }).modules).toBe(
        refModules('CODE128A', text),
      );
    }
  });

  it('conjunto C idêntico à referência (pares de dígitos)', () => {
    for (const text of ['123456', '0099', '00000000']) {
      expect(encodeCode128(text, { charset: 'C' }).modules).toBe(
        refModules('CODE128C', text),
      );
    }
  });

  it('auto escolhe os conjuntos e volta ao texto original', () => {
    for (const text of [
      'GRBL',
      '123456',
      'ABCD12345678EF',
      'ITEM-000123',
      '0123456789',
      'abc1234def',
      'A1',
      '12345A',
    ]) {
      expect(decodeCode128(encodeCode128(text).modules)).toBe(text);
    }
  });

  it('auto troca para C com sequências de dígitos', () => {
    // "AB" + 4 dígitos: switch para C (99) e dois valores de par.
    const res = encodeCode128('AB1234');
    expect(res.values).toEqual([104, 33, 34, 99, 12, 34, res.check, 106]);
    expect(res.charsets).toEqual(['B', 'C']);
  });

  it('dígito verificador mod 103 (start × 1 + posição × valor)', () => {
    const res = encodeCode128('GRBL', { charset: 'B' });
    // 104 + 1·39 + 2·50 + 3·34 + 4·44 = 521 → 521 mod 103 = 6
    expect(res.check).toBe(6);
    expect(res.values).toEqual([104, 39, 50, 34, 44, 6, 106]);
    // 79 = 6 padrões de 11 + o stop de 13.
    expect(res.modules).toHaveLength(79);
  });

  it('stop tem 13 módulos e o símbolo termina em 11 (barra dupla)', () => {
    expect(encodeCode128('1234').modules.endsWith('1100011101011')).toBe(true);
  });

  it('recusa vazio e caracteres fora do ASCII', () => {
    expect(() => encodeCode128('')).toThrow(BarcodeError);
    expect(() => encodeCode128('ação')).toThrow(/ASCII/);
  });

  it('conjunto C com número ímpar de dígitos é erro', () => {
    expect(() => encodeCode128('123', { charset: 'C' })).toThrow(
      /par de dígitos/,
    );
  });
});

describe('EAN-13 / EAN-8 / UPC-A (ISO/IEC 15420)', () => {
  it('EAN-13 idêntico à referência (95 módulos)', () => {
    const res = encodeEan('590123412345', 'ean13');
    expect(res.modules).toBe(refModules('EAN13', '590123412345'));
    expect(res.modules).toHaveLength(95);
    expect(res.modules.startsWith('101')).toBe(true);
    expect(res.modules.endsWith('101')).toBe(true);
    expect(res.checkDigit).toBe(7);
    expect(res.data).toBe('5901234123457');
    expect(res.hri).toBe('5 901234 123457');
  });

  it('EAN-8 idêntico à referência (67 módulos)', () => {
    const res = encodeEan('9638507', 'ean8');
    expect(res.modules).toBe(refModules('EAN8', '9638507'));
    expect(res.modules).toHaveLength(67);
    expect(res.checkDigit).toBe(4);
    expect(res.hri).toBe('9638 5074');
  });

  it('UPC-A idêntico à referência (95 módulos, paridade LLLLLL)', () => {
    const res = encodeEan('03600029145', 'upca');
    expect(res.modules).toBe(refModules('UPC', '03600029145'));
    expect(res.modules).toHaveLength(95);
    expect(res.checkDigit).toBe(2);
    expect(res.hri).toBe('0 36000 29145 2');
  });

  it('guarda central 01010 no meio do símbolo', () => {
    const res = encodeEan('590123412345', 'ean13');
    expect(res.modules.slice(45, 50)).toBe('01010');
  });

  it('aceita o código já com o dígito verificador correto', () => {
    expect(encodeEan('5901234123457', 'ean13').data).toBe('5901234123457');
    expect(encodeEan('96385074', 'ean8').data).toBe('96385074');
    expect(encodeEan('036000291452', 'upca').data).toBe('036000291452');
  });

  it('dígito verificador errado traz esperado × informado', () => {
    const fail = (): void => {
      encodeEan('5901234123458', 'ean13');
    };
    expect(fail).toThrow(BarcodeError);
    try {
      fail();
    } catch (error) {
      const err = error as BarcodeError;
      expect(err.code).toBe('check-digit');
      expect(err.expected).toBe('7');
      expect(err.given).toBe('8');
      expect(err.message).toContain('esperado 7');
      expect(err.message).toContain('informado 8');
    }
    expect(() => encodeEan('96385075', 'ean8')).toThrow(/esperado 4/);
    expect(() => encodeEan('036000291453', 'upca')).toThrow(/esperado 2/);
  });

  it('recusa caracteres não numéricos e comprimento errado', () => {
    expect(() => encodeEan('59012341234A', 'ean13')).toThrow(/só são aceitos/);
    expect(() => encodeEan('590123', 'ean13')).toThrow(BarcodeError);
    expect(() => encodeEan('', 'ean13')).toThrow(BarcodeError);
  });

  it('eanCheckDigit bate com vetores conhecidos', () => {
    expect(eanCheckDigit('590123412345')).toBe(7);
    expect(eanCheckDigit('9638507')).toBe(4);
    expect(eanCheckDigit('03600029145')).toBe(2);
    expect(eanCheckDigit('000000000000')).toBe(0);
  });
});

describe('Code 39 (ISO/IEC 16388)', () => {
  it('idêntico à referência, sem o gap final', () => {
    for (const text of ['GRBL', 'ABC', 'A', 'CODE39', '12345', 'A-1']) {
      expect(encodeCode39(text, { ratio: 3 }).modules).toBe(
        refModules('CODE39', text).replace(/0+$/, ''),
      );
    }
  });

  it('larguras: 3 elementos largos por caractere e gap de 1 módulo', () => {
    const res = encodeCode39('A', { ratio: 3 });
    // 3 caracteres (`*A*`) × 15 módulos + 2 gaps = 47.
    expect(res.modules).toHaveLength(47);
    // Razão 2:1 estreita o símbolo (3 caracteres × 12 + 2 = 38).
    expect(encodeCode39('A', { ratio: 2 }).modules).toHaveLength(38);
  });

  it('normaliza para maiúsculas', () => {
    expect(encodeCode39('grbl').data).toBe('GRBL');
    expect(encodeCode39('grbl').modules).toBe(encodeCode39('GRBL').modules);
  });

  it('caractere de verificação mod 43', () => {
    // CODE39 → 12+24+13+14+3+9 = 75 → 75 mod 43 = 32 → 'W'
    const res = encodeCode39('CODE39', { checksum: true });
    expect(res.checkChar).toBe('W');
    expect(res.data).toBe('CODE39W');
    expect(res.hri).toBe('CODE39W');
  });

  it('recusa vazio e caracteres fora do alfabeto', () => {
    expect(() => encodeCode39('')).toThrow(BarcodeError);
    expect(() => encodeCode39('A!B')).toThrow(/não existe no Code 39/);
    expect(() => encodeCode39('ação')).toThrow(BarcodeError);
  });
});

describe('encodeBarcode (fachada) e módulos → barras', () => {
  it('devolve barras ordenadas, dentro da largura e sem sobrepor', () => {
    for (const symbology of Object.keys(BARCODE_SPECS) as Array<
      keyof typeof BARCODE_SPECS
    >) {
      const text = BARCODE_SPECS[symbology].example;
      const res = encodeBarcode(text, { symbology });
      expect(res.totalModules).toBeGreaterThan(0);
      expect(res.hri.length).toBeGreaterThan(0);
      let cursor = 0;
      for (const bar of res.bars) {
        expect(bar.w).toBeGreaterThan(0);
        expect(bar.x).toBeGreaterThanOrEqual(cursor);
        cursor = bar.x + bar.w;
      }
      expect(cursor).toBeLessThanOrEqual(res.totalModules);
      // As barras não podem começar nem terminar em módulo de espaço (o
      // símbolo sempre começa e termina com barra).
      expect(res.bars[0].x).toBe(0);
      expect(
        res.bars[res.bars.length - 1].x + res.bars[res.bars.length - 1].w,
      ).toBe(res.totalModules);
    }
  });

  it('reconstrói o símbolo a partir das barras', () => {
    const res = encodeBarcode('590123412345', { symbology: 'ean13' });
    const rebuilt = Array.from({ length: res.totalModules }, () => '0');
    for (const bar of res.bars) {
      for (let i = bar.x; i < bar.x + bar.w; i++) rebuilt[i] = '1';
    }
    expect(rebuilt.join('')).toBe(refModules('EAN13', '590123412345'));
    expect(modulesToBars(rebuilt.join(''))).toEqual(res.bars);
  });

  it('repassa as opções de Code 128 e Code 39', () => {
    expect(encodeBarcode('123456', { symbology: 'code128' }).totalModules).toBe(
      encodeCode128('123456', { charset: 'C' }).modules.length,
    );
    expect(
      encodeBarcode('ABC', { symbology: 'code39', code39Ratio: 2 })
        .totalModules,
    ).toBe(encodeCode39('ABC', { ratio: 2 }).modules.length);
    expect(
      encodeBarcode('ABC', { symbology: 'code39', code39Checksum: true }).data,
    ).toBe(encodeCode39('ABC', { checksum: true }).data);
  });

  it('specs: EAN-13 exige 11 módulos de quiet zone; Code 128, 10', () => {
    expect(BARCODE_SPECS.ean13.quietZoneMinModules).toBe(11);
    expect(BARCODE_SPECS.ean8.quietZoneMinModules).toBe(7);
    expect(BARCODE_SPECS.upca.quietZoneMinModules).toBe(9);
    expect(BARCODE_SPECS.code128.quietZoneMinModules).toBe(10);
    expect(BARCODE_SPECS.code39.quietZoneMinModules).toBe(10);
  });
});
