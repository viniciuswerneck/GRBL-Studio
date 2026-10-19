/**
 * Encoder **Code 93** (AIM USS-93) — puro, sem DOM.
 *
 * 47 símbolos de 9 módulos (43 básicos + 4 de shift), start/stop próprios e
 * **dois** verificadores obrigatórios: **C** (pesos 1–20, mod 47) e **K**
 * (pesos 1–15 sobre os dados + C, mod 47). O símbolo termina com uma barra de
 * terminação de 1 módulo.
 *
 * Esta fase implementa o **alfabeto básico** (maiúsculas, dígitos e
 * `- . espaço $ / + %`). A expansão *Full ASCII* pelos símbolos de shift fica
 * fora do escopo — o texto não é convertido para maiúsculas para não mudar o
 * dado em silêncio. O HRI mostra o texto do usuário, **sem** os verificadores
 * (eles são símbolos internos, não caracteres do conteúdo).
 *
 * A norma pede quiet zone de 10 módulos, X-dimension ≥ 0,19 mm e altura
 * ≥ 5 mm (ver `BARCODE_SPECS`).
 */

import { BarcodeError } from './error';
import { CODE93_BINARIES, CODE93_START_STOP, CODE93_SYMBOLS } from './tables';

/** Alfabeto básico do Code 93 (os valores 0–42 do mod 47). */
export const CODE93_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';

const CODE93_MODULO = 47;
const CHECK_C_MAX_WEIGHT = 20;
const CHECK_K_MAX_WEIGHT = 15;

export interface Code93Result {
  /** Módulos do símbolo completo (`1` = barra), sem a quiet zone. */
  modules: string;
  /** Conteúdo do usuário (sem os verificadores). */
  data: string;
  /** Texto legível (HRI): o conteúdo do usuário. */
  hri: string;
  /** Símbolo do verificador **C** (pesos 1–20). */
  checkC: string;
  /** Símbolo do verificador **K** (pesos 1–15, inclui C). */
  checkK: string;
}

/** Soma ponderada da direita para a esquerda, com pesos cíclicos 1..máx. */
function weightedSum(values: readonly number[], maxWeight: number): number {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const weight = (i % maxWeight) + 1;
    sum += values[values.length - 1 - i] * weight;
  }
  return sum % CODE93_MODULO;
}

/** Valores 0–42 do conteúdo, validando o alfabeto básico. */
function symbolValues(data: string): number[] {
  return [...data].map((ch) => {
    const value = CODE93_ALPHABET.indexOf(ch);
    if (value < 0) {
      throw new BarcodeError(
        'bad-chars',
        `o caractere "${ch}" não existe no Code 93 básico (maiúsculas, dígitos e " -.$/+%")`,
      );
    }
    return value;
  });
}

/**
 * Verificadores **C** e **K** do Code 93 para `data`, como símbolos legíveis
 * (0–46). Útil para a UI e para os testes; `encodeCode93` já os aplica.
 */
export function code93Checks(data: string): { c: string; k: string } {
  const values = symbolValues(data);
  const c = weightedSum(values, CHECK_C_MAX_WEIGHT);
  const k = weightedSum([...values, c], CHECK_K_MAX_WEIGHT);
  return { c: CODE93_SYMBOLS[c], k: CODE93_SYMBOLS[k] };
}

/**
 * Codifica `text` em Code 93 (alfabeto básico). Lança {@link BarcodeError}
 * (`empty`, `bad-chars`).
 */
export function encodeCode93(text: string): Code93Result {
  if (text.length === 0) {
    throw new BarcodeError(
      'empty',
      'informe um conteúdo para o código de barras',
    );
  }

  const values = symbolValues(text);
  const c = weightedSum(values, CHECK_C_MAX_WEIGHT);
  const k = weightedSum([...values, c], CHECK_K_MAX_WEIGHT);

  // start + dados + C + K + stop + barra de terminação.
  const sequence = [CODE93_START_STOP, ...values, c, k, CODE93_START_STOP];
  const modules = `${sequence.map((value) => CODE93_BINARIES[value]).join('')}1`;

  return {
    modules,
    data: text,
    hri: text,
    checkC: CODE93_SYMBOLS[c],
    checkK: CODE93_SYMBOLS[k],
  };
}
