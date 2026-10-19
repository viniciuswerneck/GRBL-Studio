/**
 * Encoder **Code 93** (AIM USS-93) — puro, sem DOM.
 *
 * 47 símbolos de 9 módulos (43 básicos + 4 de shift), start/stop próprios e
 * **dois** verificadores obrigatórios: **C** (pesos 1–20, mod 47) e **K**
 * (pesos 1–15 sobre os dados + C, mod 47). O símbolo termina com uma barra de
 * terminação de 1 módulo.
 *
 * O **alfabeto básico** (maiúsculas, dígitos e `- . espaço $ / + %`) usa um
 * símbolo por caractere. O restante do **ASCII 0–127** é codificado em
 * *Full ASCII* por um par **shift + base**: `($)` (controle `0x01`–`0x1A`),
 * `(%)` (`0x00`, `0x1B`–`0x1F` e parte da pontuação), `(/)` (pontuação `!`–`:`,
 * fora do básico) e `(+)` (minúsculas). Os verificadores C/K cobrem os símbolos
 * **já expandidos**, inclusive os shifts.
 *
 * Caracteres fora do ASCII 0–127 são recusados (`bad-chars`). O HRI mostra o
 * texto do usuário, **sem** os verificadores (eles são símbolos internos, não
 * caracteres do conteúdo).
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
const MAX_ASCII = 0x7f;

/** Valor do símbolo base `A` no alfabeto básico (referência dos shifts). */
const LETTER_A_VALUE = CODE93_ALPHABET.indexOf('A');

/**
 * Índices dos quatro símbolos de **shift** na tabela gerada (43–46). Cada um
 * desloca a leitura para uma faixa do ASCII que não cabe no alfabeto básico.
 */
const SHIFT = {
  /** `($)` — caracteres de controle `0x01`–`0x1A` (mapeados em `A`–`Z`). */
  dollar: CODE93_SYMBOLS.indexOf('($)'),
  /** `(%)` — `0x00`, controle `0x1B`–`0x1F` e pontuação `;`–`_`, `{`–`\x7F`. */
  percent: CODE93_SYMBOLS.indexOf('(%)'),
  /** `(/)` — pontuação `!`–`:` que não pertence ao alfabeto básico. */
  slash: CODE93_SYMBOLS.indexOf('(/)'),
  /** `(+)` — minúsculas `a`–`z` (mapeadas em `A`–`Z`). */
  plus: CODE93_SYMBOLS.indexOf('(+)'),
} as const;

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

/**
 * Valores de símbolo (0–46) de um caractere ASCII (0–127) em **Full ASCII**.
 * O alfabeto básico rende um símbolo; os demais, um par shift + base segundo a
 * tabela da norma. Fora do ASCII 0–127, erro de `bad-chars`.
 */
function asciiSymbolValues(ch: string): number[] {
  const basic = CODE93_ALPHABET.indexOf(ch);
  if (basic >= 0) return [basic];

  const code = ch.codePointAt(0) ?? -1;
  if (code < 0 || code > MAX_ASCII) {
    throw new BarcodeError(
      'bad-chars',
      `o caractere "${ch}" está fora do ASCII (0–127) do Code 93 Full ASCII`,
    );
  }

  const base = LETTER_A_VALUE;
  // 0x00 → (%)U.
  if (code === 0x00) return [SHIFT.percent, base + 20];
  // 0x01–0x1A → ($)A–Z; 0x1B–0x1F → (%)A–E.
  if (code <= 0x1a) return [SHIFT.dollar, base + (code - 0x01)];
  if (code <= 0x1f) return [SHIFT.percent, base + (code - 0x1b)];
  // 0x21–0x3A (fora do básico) → (/)A–Z (cobre ! " # & ' ( ) * , :).
  if (code <= 0x3a) return [SHIFT.slash, base + (code - 0x21)];
  // 0x3B–0x3F → (%)F–J; 0x40 (@) → (%)V.
  if (code <= 0x3f) return [SHIFT.percent, base + 5 + (code - 0x3b)];
  if (code === 0x40) return [SHIFT.percent, base + 21];
  // 0x5B–0x5F → (%)K–O; 0x60 (`) → (%)W.
  if (code <= 0x5f) return [SHIFT.percent, base + 10 + (code - 0x5b)];
  if (code === 0x60) return [SHIFT.percent, base + 22];
  // 0x61–0x7A → (+)A–Z (minúsculas).
  if (code <= 0x7a) return [SHIFT.plus, base + (code - 0x61)];
  // 0x7B–0x7E → (%)P–S; 0x7F → (%)T.
  if (code <= 0x7e) return [SHIFT.percent, base + 15 + (code - 0x7b)];
  return [SHIFT.percent, base + 19];
}

/** Valores 0–46 do conteúdo, em Full ASCII (ASCII 0–127). */
function symbolValues(data: string): number[] {
  const values: number[] = [];
  for (const ch of data) values.push(...asciiSymbolValues(ch));
  return values;
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
 * Codifica `text` em Code 93 **Full ASCII** (ASCII 0–127). Lança
 * {@link BarcodeError} (`empty`, `bad-chars`).
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
