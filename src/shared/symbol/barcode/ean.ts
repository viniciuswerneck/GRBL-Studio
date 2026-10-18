/**
 * Encoder **EAN-13 / EAN-8 / UPC-A** (ISO/IEC 15420) — módulo puro, sem DOM.
 *
 * Padrões L/G/R, guardas (`101` / `01010` / `101`), tabela de paridade do
 * EAN-13 e dígito verificador **mod 10**. O UPC-A é o EAN-13 com prefixo `0`
 * (paridade `LLLLLL`), como manda a norma.
 *
 * Aceita o dado com ou sem o dígito verificador: com `n − 1` dígitos ele é
 * calculado; com `n` ele é **conferido** (erro `check-digit` com o esperado × o
 * informado). Os padrões vêm de `tables.ts`.
 */

import {
  EAN13_PARITY,
  EAN_G,
  EAN_L,
  EAN_MIDDLE_BIN,
  EAN_R,
  EAN_SIDE_BIN,
} from './tables';
import { BarcodeError, checkDigitError } from './error';

export type EanSymbology = 'ean13' | 'ean8' | 'upca';

export interface EanResult {
  /** Padrões de módulos (`1` = barra). */
  modules: string;
  /** Conteúdo com o dígito verificador. */
  data: string;
  /** Texto legível (HRI), já agrupado conforme a convenção. */
  hri: string;
  /** Dígito verificador usado. */
  checkDigit: number;
}

interface EanSpec {
  /** Total de dígitos com o verificador. */
  length: number;
  /** Como montar o HRI a partir dos dígitos (já com o verificador). */
  hri: (digits: string) => string;
  /** Como montar os módulos a partir dos dígitos (já com o verificador). */
  modules: (digits: string) => string;
}

const digitsOnly = (text: string): void => {
  if (!/^\d+$/.test(text)) {
    const bad = [...text].find((c) => !/\d/.test(c)) ?? text;
    throw new BarcodeError(
      'bad-chars',
      `só são aceitos dígitos: "${bad}" é inválido`,
    );
  }
};

/** Dígito verificador mod 10 (pesos 3 e 1 da direita para a esquerda). */
export function eanCheckDigit(data: string): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const digit = Number(data[data.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

const leftPattern = (digit: number, parity: 'L' | 'G'): string =>
  parity === 'L' ? EAN_L[digit] : EAN_G[digit];

const SPECS: Record<EanSymbology, EanSpec> = {
  ean13: {
    length: 13,
    hri: (d) => `${d[0]} ${d.slice(1, 7)} ${d.slice(7, 13)}`,
    modules: (d) => {
      const parity = EAN13_PARITY[Number(d[0])];
      let out = EAN_SIDE_BIN;
      for (let i = 1; i <= 6; i++) {
        out += leftPattern(Number(d[i]), parity[i - 1] as 'L' | 'G');
      }
      out += EAN_MIDDLE_BIN;
      for (let i = 7; i <= 12; i++) out += EAN_R[Number(d[i])];
      return out + EAN_SIDE_BIN;
    },
  },
  ean8: {
    length: 8,
    hri: (d) => `${d.slice(0, 4)} ${d.slice(4, 8)}`,
    modules: (d) => {
      let out = EAN_SIDE_BIN;
      for (let i = 0; i <= 3; i++) out += EAN_L[Number(d[i])];
      out += EAN_MIDDLE_BIN;
      for (let i = 4; i <= 7; i++) out += EAN_R[Number(d[i])];
      return out + EAN_SIDE_BIN;
    },
  },
  upca: {
    length: 12,
    hri: (d) => `${d[0]} ${d.slice(1, 6)} ${d.slice(6, 11)} ${d[11]}`,
    modules: (d) => {
      let out = EAN_SIDE_BIN;
      for (let i = 0; i <= 5; i++) out += EAN_L[Number(d[i])];
      out += EAN_MIDDLE_BIN;
      for (let i = 6; i <= 11; i++) out += EAN_R[Number(d[i])];
      return out + EAN_SIDE_BIN;
    },
  },
};

/**
 * Codifica o dado como EAN-13/EAN-8/UPC-A. Lança {@link BarcodeError}
 * (`empty`, `bad-chars`, `bad-length`, `check-digit`).
 */
export function encodeEan(text: string, symbology: EanSymbology): EanResult {
  if (text.length === 0) {
    throw new BarcodeError(
      'empty',
      'informe um conteúdo para o código de barras',
    );
  }
  digitsOnly(text);
  const spec = SPECS[symbology];
  const expected = spec.length;
  if (text.length !== expected - 1 && text.length !== expected) {
    throw new BarcodeError(
      'bad-length',
      `o ${symbology.toUpperCase()} precisa de ${expected - 1} dígitos (o verificador é calculado) ou ${expected} (conferido); informado ${text.length}`,
    );
  }

  const payload = text.slice(0, expected - 1);
  const check = eanCheckDigit(payload);
  if (text.length === expected) {
    const given = Number(text[expected - 1]);
    if (given !== check) {
      throw checkDigitError(String(check), String(given));
    }
  }
  const data = payload + String(check);
  return {
    modules: spec.modules(data),
    data,
    hri: spec.hri(data),
    checkDigit: check,
  };
}
