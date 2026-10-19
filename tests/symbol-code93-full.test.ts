/**
 * Code 93 **Full ASCII** (AIM USS-93) — RF-SYM-2.
 *
 * O alfabeto básico continua idêntico; minúsculas, controle e pontuação entram
 * por um par **shift + base**. A prova é o **cross-check** com o `jsbarcode`
 * (`CODE93FullASCII`, devDependency) para **todo** o ASCII 0–127, além dos
 * verificadores C/K conferidos sobre os símbolos **expandidos**.
 */

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  BARCODE_SPECS,
  BarcodeError,
  CODE93_ALPHABET,
  code93Checks,
  encodeBarcode,
  encodeCode93,
} from '../src/shared/symbol/barcode';
import {
  CODE93_BINARIES,
  CODE93_SYMBOLS,
} from '../src/shared/symbol/barcode/tables';

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

/** Valores dos símbolos (0–47) a partir dos módulos, sem a terminação. */
const decodeSymbols = (modules: string): number[] => {
  const body = modules.endsWith('1') ? modules.slice(0, -1) : modules;
  const values: number[] = [];
  for (let i = 0; i < body.length; i += 9) {
    const value = CODE93_BINARIES.indexOf(body.slice(i, i + 9));
    expect(value, `módulos ${body.slice(i, i + 9)}`).toBeGreaterThanOrEqual(0);
    values.push(value);
  }
  return values;
};

const START_STOP = 47;
const DOLLAR = CODE93_SYMBOLS.indexOf('($)');
const PERCENT = CODE93_SYMBOLS.indexOf('(%)');
const SLASH = CODE93_SYMBOLS.indexOf('(/)');
const PLUS = CODE93_SYMBOLS.indexOf('(+)');
const A_VALUE = CODE93_ALPHABET.indexOf('A');

describe('Code 93 Full ASCII (AIM USS-93)', () => {
  it('o alfabeto básico continua idêntico à referência e aos vetores', () => {
    for (const text of ['GRBL-93', 'TEST93', '0', 'A', 'CODE 93', '-$/+%']) {
      // Igual ao Code 93 básico do jsbarcode e ao Full ASCII (sem shifts nele).
      expect(encodeCode93(text).modules).toBe(refModules('CODE93', text));
      expect(encodeCode93(text).modules).toBe(
        refModules('CODE93FullASCII', text),
      );
    }
    expect(code93Checks('TEST93')).toEqual({ c: '+', k: '6' });
    expect(code93Checks('GRBL-93')).toEqual({ c: 'P', k: 'W' });
  });

  it('codifica todo o ASCII 0–127 igual à referência (Full ASCII)', () => {
    for (let code = 0; code <= 0x7f; code++) {
      const ch = String.fromCharCode(code);
      expect(encodeCode93(ch).modules, `0x${code.toString(16)}`).toBe(
        refModules('CODE93FullASCII', ch),
      );
    }
  });

  it('minúsculas usam o shift (+) e o valor base de A–Z', () => {
    const values = decodeSymbols(encodeCode93('az').modules);
    // start + (+) + A + (+) + Z + C + K + stop
    expect(values.slice(0, 5)).toEqual([
      START_STOP,
      PLUS,
      A_VALUE,
      PLUS,
      A_VALUE + 25,
    ]);
    expect(values.at(-1)).toBe(START_STOP);
  });

  it('controle e pontuação usam os shifts ($), (%) e (/)', () => {
    expect(decodeSymbols(encodeCode93('\u0000').modules).slice(1, 3)).toEqual([
      PERCENT,
      A_VALUE + 20,
    ]);
    expect(decodeSymbols(encodeCode93('\u0001').modules).slice(1, 3)).toEqual([
      DOLLAR,
      A_VALUE,
    ]);
    expect(decodeSymbols(encodeCode93('!').modules).slice(1, 3)).toEqual([
      SLASH,
      A_VALUE,
    ]);
    expect(decodeSymbols(encodeCode93('~').modules).slice(1, 3)).toEqual([
      PERCENT,
      A_VALUE + 18,
    ]);
    expect(decodeSymbols(encodeCode93('@').modules).slice(1, 3)).toEqual([
      PERCENT,
      A_VALUE + 21,
    ]);
  });

  it('os verificadores C/K cobrem os símbolos expandidos (com shifts)', () => {
    const values = decodeSymbols(encodeCode93('a b!').modules);
    const c = values[values.length - 3];
    const k = values[values.length - 2];
    expect(code93Checks('a b!')).toEqual({
      c: CODE93_SYMBOLS[c],
      k: CODE93_SYMBOLS[k],
    });
    // 5 caracteres expandem para 7 símbolos (a, b e ! têm 2 cada).
    expect(values).toHaveLength(1 + 7 + 2 + 1);
  });

  it('data e HRI mostram o texto do usuário (não os símbolos expandidos)', () => {
    const res = encodeCode93('Grbl-93!');
    expect(res.data).toBe('Grbl-93!');
    expect(res.hri).toBe('Grbl-93!');
  });

  it('a fachada encoda Full ASCII pela simbologia code93', () => {
    const res = encodeBarcode('Lote 42', { symbology: 'code93' });
    expect(res.data).toBe('Lote 42');
    expect(res.hri).toBe('Lote 42');
    expect(res.totalModules).toBe(encodeCode93('Lote 42').modules.length);
    expect(BARCODE_SPECS.code93.digitsOnly).toBe(false);
  });

  it('recusa vazio e caracteres fora do ASCII 0–127', () => {
    expect(() => encodeCode93('')).toThrow(/conteúdo/);
    expect(() => encodeCode93('AÇÃO')).toThrow(/fora do ASCII/);
    expect(() => encodeCode93('\u20ac')).toThrow(/fora do ASCII/);
    try {
      encodeCode93('A\u00e9B');
      throw new Error('deveria lançar');
    } catch (error) {
      expect(error).toBeInstanceOf(BarcodeError);
      expect((error as BarcodeError).code).toBe('bad-chars');
    }
  });
});
