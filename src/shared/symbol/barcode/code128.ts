/**
 * Encoder **Code 128** (ISO/IEC 15417) — módulo puro, sem DOM.
 *
 * Conjuntos **A/B/C** com **troca automática** (C para sequências de dígitos),
 * start 103/104/105, stop 106 (13 módulos) e dígito verificador **mod 103**. Os
 * padrões de módulos vêm de `tables.ts` (gerados a partir da implementação de
 * referência e conferidos no teste por cross-check com o `jsbarcode`).
 *
 * Com `gs1: true` o encoder gera **GS1-128**: insere o **FNC1** (valor 102)
 * logo após o start e trata `^` no conteúdo como FNC1 (separador de campo).
 * A validação dos **AIs** (Application Identifiers) fica **fora do escopo** —
 * o módulo só codifica os bytes; quem chama conhece o dicionário GS1.
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

/** Valor do **FNC1** no Code 128 (igual nos três conjuntos). */
export const CODE128_FNC1 = 102;

export interface Code128Options {
  /** Conjunto fixo (`A`/`B`/`C`) ou `auto` (troca pelo conteúdo). Padrão `auto`. */
  charset?: 'auto' | Code128Charset;
  /**
   * Modo **GS1-128**: FNC1 após o start e `^` no conteúdo vira FNC1. Padrão
   * falso. Não valida AIs (ver o cabeçalho do módulo).
   */
  gs1?: boolean;
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
  /** `true` quando o símbolo é GS1-128 (tem FNC1). */
  gs1: boolean;
}

/** Troca de conjunto: `SWITCH[atual][destino]`. */
const SWITCH: Record<Code128Charset, Record<Code128Charset, number>> = {
  A: { A: 0, B: 100, C: 99 },
  B: { A: 101, B: 0, C: 99 },
  C: { A: 101, B: 100, C: 0 },
};

/** Item do conteúdo: um caractere ASCII ou um FNC1 (separador GS1). */
type Token = { kind: 'char'; ch: string } | { kind: 'fnc1' };

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

/**
 * Conteúdo → tokens. No modo GS1 o primeiro token é **sempre** FNC1 e cada `^`
 * do texto vira FNC1; fora do modo GS1, `^` é um caractere comum do conjunto B.
 */
function tokenize(text: string, gs1: boolean): Token[] {
  const tokens: Token[] = [];
  if (gs1) tokens.push({ kind: 'fnc1' });
  for (const ch of text) {
    tokens.push(ch === '^' && gs1 ? { kind: 'fnc1' } : { kind: 'char', ch });
  }
  return tokens;
}

/** Quantidade de dígitos consecutivos a partir de `pos` (FNC1 interrompe). */
function digitRun(tokens: readonly Token[], pos: number): number {
  let n = 0;
  while (pos + n < tokens.length) {
    const token = tokens[pos + n];
    if (token.kind !== 'char' || !isDigit(token.ch)) break;
    n++;
  }
  return n;
}

/**
 * Sequência de valores (sem verificação nem stop) + conjuntos usados, com
 * troca automática. Os FNC1 são emitidos como 102 em qualquer conjunto.
 */
function encodeAuto(
  text: string,
  gs1: boolean,
): {
  values: number[];
  charsets: Code128Charset[];
} {
  const tokens = tokenize(text, gs1);
  const values: number[] = [];
  const charsets: Code128Charset[] = [];

  const push = (set: Code128Charset, value: number): void => {
    if (charsets[charsets.length - 1] !== set) charsets.push(set);
    values.push(value);
  };

  const firstChar = tokens.findIndex((token) => token.kind === 'char');
  const dataChars = tokens.filter((token) => token.kind === 'char').length;
  const leading = firstChar < 0 ? 0 : digitRun(tokens, firstChar);
  const first = firstChar < 0 ? undefined : tokens[firstChar];
  let set: Code128Charset =
    leading >= 4 || (leading === dataChars && leading % 2 === 0)
      ? 'C'
      : letterSetFor(first?.kind === 'char' ? first.ch : 'A');
  values.push(CODE128_START[set]);
  charsets.push(set);

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.kind === 'fnc1') {
      push(set, CODE128_FNC1);
      i += 1;
      continue;
    }

    if (set === 'C') {
      if (digitRun(tokens, i) >= 2) {
        const second = tokens[i + 1];
        if (second.kind !== 'char') {
          throw new BarcodeError('bad-chars', 'par de dígitos inválido');
        }
        values.push(Number.parseInt(token.ch + second.ch, 10));
        i += 2;
        continue;
      }
      // Sem par de dígitos: volta para letras (o próximo laço resolve).
      const next = letterSetFor(token.ch);
      push(next, SWITCH.C[next]);
      set = next;
      continue;
    }

    const run = digitRun(tokens, i);
    // Vale a pena ir para C com 4+ dígitos (poupa 1 símbolo por par extra) ou,
    // no fim do dado e com contagem par, já com 2 dígitos.
    const toC =
      run >= 4 || (run >= 2 && i + run === tokens.length && run % 2 === 0);
    if (toC) {
      push('C', SWITCH[set].C);
      set = 'C';
      continue;
    }

    const value = valueIn(set, token.ch);
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
  gs1: boolean,
): { values: number[]; charsets: Code128Charset[] } {
  const tokens = tokenize(text, gs1);
  const values: number[] = [CODE128_START[charset]];
  const charsets: Code128Charset[] = [charset];
  if (charset === 'C') {
    for (let i = 0; i < tokens.length; ) {
      const token = tokens[i];
      if (token.kind === 'fnc1') {
        values.push(CODE128_FNC1);
        i += 1;
        continue;
      }
      const next = tokens[i + 1];
      if (!isDigit(token.ch)) {
        throw new BarcodeError(
          'bad-chars',
          'o conjunto C só aceita dígitos (pares)',
        );
      }
      if (next?.kind !== 'char' || !isDigit(next.ch)) {
        throw new BarcodeError(
          'bad-length',
          'no conjunto C o conteúdo precisa ter um número par de dígitos',
        );
      }
      values.push(Number.parseInt(token.ch + next.ch, 10));
      i += 2;
    }
    return { values, charsets };
  }
  for (const token of tokens) {
    if (token.kind === 'fnc1') {
      values.push(CODE128_FNC1);
      continue;
    }
    const value = valueIn(charset, token.ch);
    if (value === null) {
      throw new BarcodeError(
        'bad-chars',
        `o caractere "${token.ch}" não existe no conjunto ${charset}`,
      );
    }
    values.push(value);
  }
  return { values, charsets };
}

/**
 * Codifica `text` em Code 128 (ou GS1-128 com `gs1: true`) e devolve os
 * módulos + valores. Lança {@link BarcodeError} (`empty`, `bad-chars`,
 * `bad-length`).
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

  const gs1 = opts.gs1 === true;
  if (gs1 && text.replace(/\^/g, '').length === 0) {
    throw new BarcodeError(
      'empty',
      'informe o conteúdo GS1 (os "^" são separadores FNC1)',
    );
  }

  const charset = opts.charset ?? 'auto';
  const { values, charsets } =
    charset === 'auto'
      ? encodeAuto(text, gs1)
      : encodeFixed(text, charset, gs1);

  // Dígito verificador: start × 1 + Σ posição × valor (posição 1-based).
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += i * values[i];
  const check = sum % CODE128_MODULO;

  const full = [...values, check, CODE128_STOP];
  const modules = full.map((v) => CODE128_PATTERNS[v]).join('');

  return { modules, values: full, check, charsets, gs1 };
}
