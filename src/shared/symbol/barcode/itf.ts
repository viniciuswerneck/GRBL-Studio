/**
 * Encoder **ITF-14** (Interleaved 2 of 5, ISO/IEC 16390 + GS1) — puro, sem DOM.
 *
 * O ITF entrelaça pares de dígitos: as barras vêm do primeiro e os espaços do
 * segundo (5 elementos cada, sempre 2 largos). O ITF-14 usa **14 dígitos**: 13
 * de dados + verificador **mod 10 GS1**, que é calculado quando o usuário
 * informa 13 dígitos e conferido quando informa 14 (erro `check-digit` com o
 * esperado × o informado).
 *
 * As larguras (1 estreito / 3 largo) e as guardas vêm de `tables.ts`. A norma
 * exige quiet zone de 10 módulos por lado, X-dimension ≥ 0,5 mm e altura
 * ≥ 12 mm (ver `BARCODE_SPECS`).
 */

import { eanCheckDigit } from './ean';
import { BarcodeError, checkDigitError } from './error';
import { ITF_BINARIES, ITF_END_BIN, ITF_START_BIN } from './tables';

export interface Itf14Result {
  /** Módulos do símbolo completo (`1` = barra), sem a quiet zone. */
  modules: string;
  /** 14 dígitos com o verificador. */
  data: string;
  /** Texto legível (HRI): os 14 dígitos. */
  hri: string;
  /** Dígito verificador mod 10 GS1. */
  checkDigit: number;
}

/**
 * Dígito verificador **mod 10 GS1** do ITF-14: pesos 3 e 1 da direita para a
 * esquerda sobre os 13 dígitos de dados (a mesma conta do EAN-13).
 */
export function itf14CheckDigit(payload: string): number {
  return eanCheckDigit(payload);
}

/**
 * Codifica `text` como ITF-14. Aceita 13 dígitos (calcula o verificador) ou 14
 * (confere). Lança {@link BarcodeError} (`empty`, `bad-chars`, `bad-length`,
 * `check-digit`).
 */
export function encodeItf14(text: string): Itf14Result {
  if (text.length === 0) {
    throw new BarcodeError(
      'empty',
      'informe um conteúdo para o código de barras',
    );
  }
  if (!/^\d+$/.test(text)) {
    const bad = [...text].find((ch) => !/\d/.test(ch)) ?? text;
    throw new BarcodeError(
      'bad-chars',
      `o ITF-14 só aceita dígitos: "${bad}" é inválido`,
    );
  }
  if (text.length !== 13 && text.length !== 14) {
    throw new BarcodeError(
      'bad-length',
      `o ITF-14 precisa de 13 dígitos (o verificador é calculado) ou 14 (conferido); informado ${text.length}`,
    );
  }

  const payload = text.slice(0, 13);
  const check = itf14CheckDigit(payload);
  if (text.length === 14) {
    const given = Number(text[13]);
    if (given !== check) throw checkDigitError(String(check), String(given));
  }
  const data = payload + String(check);

  // 14 dígitos → 7 pares; cada par entrelaça 5 barras com 5 espaços.
  let encoded = '';
  for (let i = 0; i < data.length; i += 2) {
    const bars = ITF_BINARIES[Number(data[i])];
    const spaces = ITF_BINARIES[Number(data[i + 1])];
    for (let k = 0; k < 5; k++) {
      encoded += bars[k] === '1' ? '111' : '1';
      encoded += spaces[k] === '1' ? '000' : '0';
    }
  }

  return {
    modules: ITF_START_BIN + encoded + ITF_END_BIN,
    data,
    hri: data,
    checkDigit: check,
  };
}
