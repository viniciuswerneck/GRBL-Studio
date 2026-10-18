/**
 * Encoder **Code 128** (ISO/IEC 15417) — módulo puro, sem DOM.
 *
 * Conjuntos **A/B/C** com **troca automática** (C para sequências de dígitos),
 * start 103/104/105, stop 106 (13 módulos) e dígito verificador **mod 103**. Os
 * padrões de módulos vêm de `tables.ts` (gerados a partir da implementação de
 * referência e conferidos no teste por cross-check com o `jsbarcode`).
 *
 * Só ASCII 0–127 é aceito (o FNC4 de alfabeto estendido fica fora do escopo).
 */

import {
  CODE128_MODULO,
  CODE128_PATTERNS,
  CODE128_START,
  CODE128_STOP,
} from './tables';
import { BarcodeError } from './error';

export type Code128Charset = 'A' | 'B' | 'C';

export interface Code128Options {
  /** Conjunto fixo (`A`/`B`/`C`) ou `auto` (troca pelo conteúdo). Padrão `auto`. */
  charset?: 'auto' | Code128Charset;
}

export interface Code128Result {
  /** Padrões de módulos concatenados (`1` = barra). */
  modules: string;
  /** Valores codificados: start, dados, verificação e stop. */
  values: number[];
  /** Valor do dígito verificador (`mod 103`). */
  check: number;
  /** Conjuntos usados, na ordem em que aparecem. */
  charsets: Code128Charset[];
}

/** Troca de conjunto: `SWITCH[atual][destino]`. */
const SWITCH: Record<Code128Charset, Record<Code128Charset, number>> = {
  A: { A: 0, B: 100, C: 99 },
  B: { A: 101, B: 0, C: 99 },
  C: { A: 101, B: 100, C: 0 },
};

/** Valor de `ch` no conjunto A ou B, ou `null` se o caractere não couber. */
function valueIn(set: 'A' | 'B', ch: string): number | null {
  const code = ch.codePointAt(0) ?? 0;
  if (set === 'A') {
    if (code >= 32 && code <= 95) return code - 32;
    if (code >= 0 && code <= 31) return code + 64;
    return null;
  }
  if (code >= 32 && code <= 127) return code - 32;
  return null;
}

/** Conjunto de letras natural para `ch` (A só é necessário p/ controle). */
function letterSetFor(ch: string): 'A' | 'B' {
  return (ch.codePointAt(0) ?? 0) < 32 ? 'A' : 'B';
}

const isDigit = (ch: string): boolean => ch >= '0' && ch <= '9';

/** Quantidade de dígitos consecutivos a partir de `pos`. */
function digitRun(text: string, pos: number): number {
  let n = 0;
  while (pos + n < text.length && isDigit(text[pos + n])) n++;
  return n;
}

/** Sequência de valores (sem verificação nem stop) + conjuntos usados. */
function encodeAuto(text: string): {
  values: number[];
  charsets: Code128Charset[];
} {
  const values: number[] = [];
  const charsets: Code128Charset[] = [];

  const push = (set: Code128Charset, value: number): void => {
    if (charsets[charsets.length - 1] !== set) charsets.push(set);
    values.push(value);
  };

  const leading = digitRun(text, 0);
  let set: Code128Charset =
    leading >= 4 || (leading === text.length && leading % 2 === 0)
      ? 'C'
      : letterSetFor(text[0] ?? 'A');
  values.push(CODE128_START[set]);
  charsets.push(set);

  let i = 0;
  while (i < text.length) {
    if (set === 'C') {
      if (digitRun(text, i) >= 2) {
        values.push(Number.parseInt(text.slice(i, i + 2), 10));
        i += 2;
        continue;
      }
      // Sem par de dígitos: volta para letras (o próximo laço resolve).
      const next = letterSetFor(text[i]);
      push(next, SWITCH.C[next]);
      set = next;
      continue;
    }

    const run = digitRun(text, i);
    // Vale a pena ir para C com 4+ dígitos (poupa 1 símbolo por par extra) ou,
    // no fim do dado e com contagem par, já com 2 dígitos.
    const toC =
      run >= 4 || (run >= 2 && i + run === text.length && run % 2 === 0);
    if (toC) {
      push('C', SWITCH[set].C);
      set = 'C';
      continue;
    }

    const value = valueIn(set, text[i]);
    if (value === null) {
      const next = set === 'A' ? 'B' : 'A';
      push(next, SWITCH[set][next]);
      set = next;
      continue;
    }
    push(set, value);
    i += 1;
  }

  return { values, charsets };
}

/** Valor de `ch` no conjunto fixo (erro se não couber). */
function encodeFixed(
  text: string,
  charset: Code128Charset,
): { values: number[]; charsets: Code128Charset[] } {
  const values: number[] = [CODE128_START[charset]];
  const charsets: Code128Charset[] = [charset];
  if (charset === 'C') {
    if (text.length % 2 !== 0) {
      throw new BarcodeError(
        'bad-length',
        'no conjunto C o conteúdo precisa ter um número par de dígitos',
      );
    }
    for (let i = 0; i < text.length; i += 2) {
      const pair = text.slice(i, i + 2);
      if (!isDigit(pair[0]) || !isDigit(pair[1])) {
        throw new BarcodeError(
          'bad-chars',
          'o conjunto C só aceita dígitos (pares)',
        );
      }
      values.push(Number.parseInt(pair, 10));
    }
    return { values, charsets };
  }
  for (const ch of text) {
    const value = valueIn(charset, ch);
    if (value === null) {
      throw new BarcodeError(
        'bad-chars',
        `o caractere "${ch}" não existe no conjunto ${charset}`,
      );
    }
    values.push(value);
  }
  return { values, charsets };
}

/**
 * Codifica `text` em Code 128 e devolve os módulos + valores. Lança
 * {@link BarcodeError} (`empty`, `bad-chars`, `bad-length`).
 */
export function encodeCode128(
  text: string,
  opts: Code128Options = {},
): Code128Result {
  if (text.length === 0) {
    throw new BarcodeError(
      'empty',
      'informe um conteúdo para o código de barras',
    );
  }
  for (const ch of text) {
    if ((ch.codePointAt(0) ?? 0) > 127) {
      throw new BarcodeError(
        'bad-chars',
        `o Code 128 aceita apenas ASCII: "${ch}" está fora`,
      );
    }
  }

  const charset = opts.charset ?? 'auto';
  const { values, charsets } =
    charset === 'auto' ? encodeAuto(text) : encodeFixed(text, charset);

  // Dígito verificador: start × 1 + Σ posição × valor (posição 1-based).
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += i * values[i];
  const check = sum % CODE128_MODULO;

  const full = [...values, check, CODE128_STOP];
  const modules = full.map((v) => CODE128_PATTERNS[v]).join('');

  return { modules, values: full, check, charsets };
}
