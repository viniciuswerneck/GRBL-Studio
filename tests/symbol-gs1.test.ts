/**
 * Validação dos **AIs do GS1-128** (RF-SYM-2) — módulo `gs1.ts`.
 *
 * Cobre o conjunto mínimo documentado, o formato de cada AI, a **posição** dos
 * erros, a regra "AI desconhecida não bloqueia" e a integração com
 * `encodeBarcode('gs1-128')` (o `^` continua sendo o FNC1).
 */

import { describe, expect, it } from 'vitest';
import { encodeBarcode, validateGs1 } from '../src/shared/symbol/barcode';
import {
  CODE128_FNC1,
  encodeCode128,
} from '../src/shared/symbol/barcode/code128';

describe('validateGs1 — AIs aceitos', () => {
  it('aceita um valor válido de cada AI documentado', () => {
    const validContents = [
      `00${'0'.repeat(17)}1`, // 00 SSCC-18 (18 dígitos)
      '0109501101530003', // 01  GTIN-14
      '0209501101530003', // 02  GTIN-14
      '10LOTE123', // 10  lote
      '11250101', // 11  data
      '13250101', // 13  data
      '15250101', // 15  data
      '17250101', // 17  data
      '172501010930', // 17  data + hora
      '2012', // 20  2 dígitos
      '21SERIE1', // 21  1–20
      '240ABC', // 240 até 30
      '241ABC',
      '242ABC',
      '250ABC',
      '251ABC',
      '3103000123', // 310n peso/medida (6 dígitos)
      '3169000001',
      '400PEDIDO1', // 400 até 30
      '4109501101530003', // 410 GLN (13)
      '4129501101530003',
      '4149501101530003',
      '422076', // 422 país (3)
    ];
    for (const content of validContents) {
      expect(validateGs1(content), content).toEqual({ ok: true, errors: [] });
    }
  });

  it('aceita campos separados por ^ e AIs fixos em sequência', () => {
    expect(validateGs1('0109501101530003^10ABC123')).toEqual({
      ok: true,
      errors: [],
    });
    expect(validateGs1('010950110153000317250101')).toEqual({
      ok: true,
      errors: [],
    });
    expect(validateGs1('')).toEqual({ ok: true, errors: [] });
  });

  it('aceita 29 de fevereiro em ano bissexto', () => {
    expect(validateGs1('17240229')).toEqual({ ok: true, errors: [] });
  });

  it('AI desconhecida não bloqueia (apenas ignora o restante)', () => {
    expect(validateGs1('99XYZ')).toEqual({ ok: true, errors: [] });
    expect(validateGs1('10ABC^99XYZ')).toEqual({ ok: true, errors: [] });
    // O que veio antes da AI desconhecida continua sendo validado.
    expect(validateGs1('2012^99XYZ')).toEqual({ ok: true, errors: [] });
  });
});

describe('validateGs1 — erros, com posição', () => {
  const expectError = (
    content: string,
    code: string,
    position: number,
  ): void => {
    expect(validateGs1(content)).toEqual({
      ok: false,
      errors: [{ code, position }],
    });
  };

  it('comprimento inválido → bad-length', () => {
    expectError('00123', 'bad-length', 0); // 00 com menos de 18
    expectError('10', 'bad-length', 0); // 10 sem valor
    expectError(`10${'A'.repeat(21)}`, 'bad-length', 0); // 10 com 21
    expectError('201', 'bad-length', 0); // 20 com 1 dígito
    expectError('42207', 'bad-length', 0); // 422 com 2 dígitos
    expectError('201^99XYZ', 'bad-length', 0); // truncado pelo FNC1
  });

  it('caractere inválido no valor → bad-chars', () => {
    expectError('019501101530003A', 'bad-chars', 0); // dígito esperado, letra
    expectError('10LOTE$', 'bad-chars', 0); // fora do alfanumérico
    expectError('31030001A3', 'bad-chars', 0); // peso/medida só dígitos
  });

  it('data impossível → bad-date (mês 13, dia absurdo, 29/02 não bissexto)', () => {
    expectError('17251301', 'bad-date', 0); // mês 13
    expectError('17250230', 'bad-date', 0); // 30 de fevereiro
    expectError('17250229', 'bad-date', 0); // 29/02 em 2025 (não bissexto)
    expectError('172501012530', 'bad-date', 0); // hora 25
  });

  it('a posição aponta para o AI, mesmo com campos antes', () => {
    expect(validateGs1('10ABC^17251301')).toEqual({
      ok: false,
      errors: [{ code: 'bad-date', position: 6 }],
    });
    expect(validateGs1('2012^10LOTE$')).toEqual({
      ok: false,
      errors: [{ code: 'bad-chars', position: 5 }],
    });
  });
});

describe('validateGs1 — integração com a fachada', () => {
  it('o ^ continua sendo o FNC1 em encodeBarcode(gs1-128)', () => {
    const content = '0109501101530003^10ABC123';
    expect(validateGs1(content).ok).toBe(true);
    expect(encodeBarcode(content, { symbology: 'gs1-128' }).data).toBe(content);
    // Um FNC1 após o start e outro no separador.
    const ref = encodeCode128(content, { gs1: true });
    expect(
      ref.values.slice(0, -2).filter((value) => value === CODE128_FNC1),
    ).toHaveLength(2);
  });
});
