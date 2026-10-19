/**
 * Simbologias 1D extras da S2/S3 (RF-SYM-2) — **ITF-14**, **Codabar**,
 * **Code 93** e **GS1-128**.
 *
 * Mesma estratégia do `symbol-barcode.test.ts`: **cross-check** com o
 * `jsbarcode` (MIT, devDependency) para a sequência de módulos, vetores das
 * normas (mod 10 GS1, mod 47 C/K) e erros com *esperado × informado*. No
 * GS1-128 a prova é a **ida e volta**: decodificamos os valores do Code 128 e
 * conferimos que os FNC1 aparecem exatamente nas posições pedidas.
 */

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  BARCODE_SPECS,
  BarcodeError,
  encodeBarcode,
} from '../src/shared/symbol/barcode';
import { encodeCodabar } from '../src/shared/symbol/barcode/codabar';
import {
  CODE128_FNC1,
  encodeCode128,
} from '../src/shared/symbol/barcode/code128';
import {
  code93Checks,
  encodeCode93,
} from '../src/shared/symbol/barcode/code93';
import { encodeItf14, itf14CheckDigit } from '../src/shared/symbol/barcode/itf';
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

/** Valores do Code 128 a partir dos módulos (o stop tem 13 módulos). */
const decodeValues = (modules: string): number[] => {
  const values: number[] = [];
  let i = 0;
  while (i < modules.length) {
    const length = modules.length - i === 13 ? 13 : 11;
    const value = CODE128_PATTERNS.indexOf(modules.slice(i, i + length));
    expect(value).toBeGreaterThanOrEqual(0);
    values.push(value);
    i += length;
  }
  return values;
};

/**
 * Decodifica o Code 128 em tokens (`FNC1` ou um caractere). Prova,
 * independente do encoder, que o texto e os separadores GS1 estão na ordem
 * certa.
 */
const decodeTokens = (modules: string): string[] => {
  const values = decodeValues(modules);
  expect(values[values.length - 1]).toBe(106);
  let set: 'A' | 'B' | 'C' =
    values[0] === 103 ? 'A' : values[0] === 104 ? 'B' : 'C';
  const out: string[] = [];
  for (let k = 1; k < values.length - 2; k++) {
    const value = values[k];
    if (value === CODE128_FNC1) {
      out.push('FNC1');
      continue;
    }
    if (set === 'C') {
      if (value <= 99) out.push(...String(value).padStart(2, '0'));
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
    if (value >= 96) continue; // SHIFT/FNC2-4 (o encoder não emite)
    out.push(
      String.fromCharCode(set === 'A' && value >= 64 ? value - 64 : value + 32),
    );
  }
  return out;
};

describe('ITF-14 (ISO/IEC 16390 + GS1)', () => {
  it('idêntico à referência (135 módulos, 14 dígitos)', () => {
    const res = encodeItf14('0950110153000');
    expect(res.modules).toBe(refModules('ITF14', '0950110153000'));
    // O ITF cru recebe os mesmos 14 dígitos: start 4 + 7 pares × 18 + stop 5.
    expect(res.modules).toBe(refModules('ITF', '09501101530003'));
    expect(res.modules).toHaveLength(135);
  });

  it('calcula o verificador mod 10 com 13 dígitos', () => {
    expect(encodeItf14('0950110153000').data).toBe('09501101530003');
    expect(encodeItf14('0950110153000').checkDigit).toBe(3);
    expect(encodeItf14('1001234500001').data).toBe('10012345000017');
    expect(encodeItf14('0000000000000').checkDigit).toBe(0);
    // 13 dígitos levam ao mesmo símbolo que os 14 já conferidos.
    expect(encodeItf14('0950110153000').modules).toBe(
      encodeItf14('09501101530003').modules,
    );
  });

  it('confere o verificador informado e diz esperado × informado', () => {
    expect(encodeItf14('09501101530003').data).toBe('09501101530003');
    const fail = (): void => {
      encodeItf14('09501101530004');
    };
    expect(fail).toThrow(BarcodeError);
    try {
      fail();
    } catch (error) {
      const err = error as BarcodeError;
      expect(err.code).toBe('check-digit');
      expect(err.expected).toBe('3');
      expect(err.given).toBe('4');
      expect(err.message).toContain('esperado 3');
      expect(err.message).toContain('informado 4');
    }
  });

  it('itf14CheckDigit bate com vetores conhecidos', () => {
    expect(itf14CheckDigit('0950110153000')).toBe(3);
    expect(itf14CheckDigit('1001234500001')).toBe(7);
    expect(itf14CheckDigit('1540014128876')).toBe(3);
    expect(itf14CheckDigit('0000000000000')).toBe(0);
  });

  it('recusa vazio, não numérico e comprimento errado', () => {
    expect(() => encodeItf14('')).toThrow(BarcodeError);
    expect(() => encodeItf14('095011015300A')).toThrow(/só aceita dígitos/);
    expect(() => encodeItf14('123456789012')).toThrow(/13 dígitos/);
    expect(() => encodeItf14('095011015300033')).toThrow(/13 dígitos/);
  });
});

describe('Codabar (AIM USS-Codabar)', () => {
  it('idêntico à referência, com e sem guards explícitos', () => {
    for (const text of ['A40156B', '1234', 'A123456789B', 'C-$:/.+D']) {
      expect(encodeCodabar(text).modules).toBe(refModules('codabar', text));
    }
  });

  it('start/stop padrão A…A quando o texto não traz guards', () => {
    const res = encodeCodabar('1234');
    expect(res.data).toBe('A1234A');
    expect(res.hri).toBe('1234');
    expect(res.modules).toBe(encodeCodabar('A1234A').modules);
  });

  it('HRI não inclui os guards', () => {
    expect(encodeCodabar('A40156B').hri).toBe('40156');
    expect(encodeCodabar('C-$:/.+D').hri).toBe('-$:/.+');
  });

  it('guards A–D e os 16 caracteres de dados são aceitos', () => {
    for (const guard of ['A', 'B', 'C', 'D']) {
      expect(
        encodeCodabar(`${guard}0123456789-$:/.+${guard}`).data,
      ).toHaveLength(18);
    }
  });

  it('normaliza para maiúsculas', () => {
    expect(encodeCodabar('a40156b').modules).toBe(
      encodeCodabar('A40156B').modules,
    );
  });

  it('recusa vazio, guard sem par e caractere fora do alfabeto', () => {
    expect(() => encodeCodabar('')).toThrow(BarcodeError);
    expect(() => encodeCodabar('A')).toThrow(BarcodeError);
    expect(() => encodeCodabar('A1234')).toThrow(/start\/stop explícitos/);
    expect(() => encodeCodabar('123E')).toThrow(/não existe no Codabar/);
    expect(() => encodeCodabar('A12E34B')).toThrow(/não existe no Codabar/);
  });
});

describe('Code 93 (AIM USS-93)', () => {
  it('idêntico à referência (start/stop + C + K + terminação)', () => {
    for (const text of ['GRBL-93', 'TEST93', '0', 'A', 'CODE 93', '-$/+%']) {
      expect(encodeCode93(text).modules).toBe(refModules('CODE93', text));
    }
  });

  it('dois verificadores mod 47: C (1–20) e K (1–15)', () => {
    const res = encodeCode93('TEST93');
    expect(res.checkC).toBe('+');
    expect(res.checkK).toBe('6');
    expect(code93Checks('TEST93')).toEqual({ c: '+', k: '6' });
    expect(code93Checks('GRBL-93')).toEqual({ c: 'P', k: 'W' });
  });

  it('HRI e data mostram o texto do usuário, sem os verificadores', () => {
    const res = encodeCode93('TEST93');
    expect(res.data).toBe('TEST93');
    expect(res.hri).toBe('TEST93');
  });

  it('9 módulos por símbolo + 1 de terminação', () => {
    // start + 5 dados + C + K + stop = 9 símbolos × 9 módulos + 1.
    expect(encodeCode93('TEST93').modules).toHaveLength(91);
    expect(encodeCode93('A').modules).toHaveLength(46);
  });

  it('recusa vazio e caracteres fora do alfabeto básico', () => {
    expect(() => encodeCode93('')).toThrow(BarcodeError);
    expect(() => encodeCode93('abc')).toThrow(/Code 93 básico/);
    expect(() => encodeCode93('A@B')).toThrow(/Code 93 básico/);
    expect(() => encodeCode93('AÇÃO')).toThrow(BarcodeError);
  });
});

describe('GS1-128 (Code 128 + FNC1)', () => {
  it('FNC1 após o start e em cada ^ — ida e volta', () => {
    const text = '0109501101530003^10ABC';
    const res = encodeCode128(text, { gs1: true });
    expect(res.gs1).toBe(true);
    expect(res.values[0]).toBe(105); // 16 dígitos iniciais → start C
    expect(res.values[1]).toBe(CODE128_FNC1);
    // Só os valores de dados (sem verificação/stop) contam FNC1:
    const fnc1 = res.values.slice(0, -2).filter((v) => v === CODE128_FNC1);
    expect(fnc1).toHaveLength(2);
    expect(decodeTokens(res.modules)).toEqual([
      'FNC1',
      ...'0109501101530003',
      'FNC1',
      ...'10ABC',
    ]);
  });

  it('conjuntos fixos idênticos à referência no modo EAN-128', () => {
    for (const text of ['ABC123', 'GRBL']) {
      expect(encodeCode128(text, { charset: 'B', gs1: true }).modules).toBe(
        refModules('CODE128B', text, { ean128: true }),
      );
    }
    for (const text of ['123456', '0099']) {
      expect(encodeCode128(text, { charset: 'C', gs1: true }).modules).toBe(
        refModules('CODE128C', text, { ean128: true }),
      );
    }
  });

  it('^ também vira FNC1 com conjunto fixo', () => {
    const res = encodeCode128('AB^12', { charset: 'B', gs1: true });
    expect(decodeTokens(res.modules)).toEqual([
      'FNC1',
      'A',
      'B',
      'FNC1',
      '1',
      '2',
    ]);
  });

  it('sem gs1 o ^ é um caractere comum (não é FNC1)', () => {
    const res = encodeCode128('A^B', { charset: 'B' });
    expect(res.gs1).toBe(false);
    expect(res.values.slice(1, -2)).toEqual([33, 62, 34]);
    expect(res.values.slice(0, -2)).not.toContain(CODE128_FNC1);
    expect(decodeTokens(res.modules)).toEqual(['A', '^', 'B']);
  });

  it('a fachada liga o modo pela simbologia ou pela opção', () => {
    const text = '0109501101530003^10ABC123';
    const bySymbology = encodeBarcode(text, { symbology: 'gs1-128' });
    const byOption = encodeBarcode(text, {
      symbology: 'code128',
      gs1: true,
    });
    expect(bySymbology.symbology).toBe('gs1-128');
    expect(bySymbology.totalModules).toBe(byOption.totalModules);
    expect(bySymbology.data).toBe(text);
    expect(bySymbology.hri).toBe(text);
  });

  it('recusa conteúdo só com separadores', () => {
    expect(() => encodeCode128('^', { gs1: true })).toThrow(/conteúdo GS1/);
    expect(() => encodeCode128('^^^', { gs1: true })).toThrow(/conteúdo GS1/);
  });
});

describe('BARCODE_SPECS das novas simbologias', () => {
  it('ITF-14: quiet zone 10, X-dim 0,5 mm, altura mínima 12 mm', () => {
    expect(BARCODE_SPECS.itf14).toMatchObject({
      label: 'ITF-14',
      quietZoneMinModules: 10,
      xDimMinMm: 0.5,
      barHeightMinMm: 12,
      digitsOnly: true,
    });
  });

  it('Codabar: quiet zone 10, X-dim 0,19 mm, altura 6,35 mm', () => {
    expect(BARCODE_SPECS.codabar).toMatchObject({
      label: 'Codabar',
      quietZoneMinModules: 10,
      xDimMinMm: 0.19,
      barHeightMinMm: 6.35,
      digitsOnly: false,
    });
  });

  it('Code 93 e GS1-128 têm quiet zone 10 e exemplo válido', () => {
    expect(BARCODE_SPECS.code93.quietZoneMinModules).toBe(10);
    expect(BARCODE_SPECS.code93.example).toBe('GRBL-93');
    expect(BARCODE_SPECS['gs1-128']).toMatchObject({
      label: 'GS1-128',
      quietZoneMinModules: 10,
      digitsOnly: false,
    });
  });

  it('a fachada devolve data/hri e barras coerentes nas novas simbologias', () => {
    const itf = encodeBarcode('0950110153000', { symbology: 'itf14' });
    expect(itf.data).toBe('09501101530003');
    expect(itf.checkDigit).toBe(3);

    const codabar = encodeBarcode('A40156B', { symbology: 'codabar' });
    expect(codabar.data).toBe('A40156B');
    expect(codabar.hri).toBe('40156');

    const code93 = encodeBarcode('TEST93', { symbology: 'code93' });
    expect(code93.data).toBe('TEST93');
    expect(code93.hri).toBe('TEST93');
    expect(code93.totalModules).toBe(91);
  });
});
