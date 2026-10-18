/**
 * Encoder **Code 39** (ISO/IEC 16388) — módulo puro, sem DOM.
 *
 * 43 caracteres, `*` de start/stop, gap `n` entre caracteres, razão
 * largo:estreito **2:1 ou 3:1** e caractere de verificação **mod 43** opcional.
 * As larguras (`n`/`w`, 9 elementos por caractere) vêm de `tables.ts`.
 *
 * O texto é normalizado para maiúsculas (o Code 39 é um alfabeto unissex); a
 * UI avisa quando isso muda o dado.
 */

import { CODE39_PATTERNS } from './tables';
import { BarcodeError } from './error';

export type Code39Ratio = 2 | 3;

/** Ordem canônica dos 43 caracteres (os valores do `mod 43`). */
export const CODE39_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';

export interface Code39Options {
  /** Razão entre elemento largo e estreito. Padrão `3`. */
  ratio?: Code39Ratio;
  /** Acrescenta o caractere de verificação mod 43. Padrão falso. */
  checksum?: boolean;
}

export interface Code39Result {
  /** Módulos do símbolo completo (`1` = barra), com os `*` de start/stop. */
  modules: string;
  /** Conteúdo entre os `*` (com o caractere de verificação, se houver). */
  data: string;
  /** Texto legível (HRI) — sem os `*`. */
  hri: string;
  /** Caractere de verificação (`mod 43`), quando usado. */
  checkChar?: string;
}

/** Caractere de verificação mod 43 (soma dos valores, resto 43). */
export function code39CheckChar(data: string): string {
  let sum = 0;
  for (const ch of data) {
    const value = CODE39_ALPHABET.indexOf(ch);
    if (value < 0) {
      throw new BarcodeError(
        'bad-chars',
        `o caractere "${ch}" não existe no Code 39`,
      );
    }
    sum += value;
  }
  return CODE39_ALPHABET[sum % 43];
}

/** Padrão `n`/`w` de um caractere → módulos (`1` barra, `0` espaço). */
function patternToModules(pattern: string, ratio: number): string {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const bit = i % 2 === 0 ? '1' : '0';
    out += bit.repeat(pattern[i] === 'w' ? ratio : 1);
  }
  return out;
}

/**
 * Codifica `text` em Code 39. Lança {@link BarcodeError} (`empty`,
 * `bad-chars`, `bad-option`).
 */
export function encodeCode39(
  text: string,
  opts: Code39Options = {},
): Code39Result {
  const ratio = opts.ratio ?? 3;
  if (ratio !== 2 && ratio !== 3) {
    throw new BarcodeError('bad-option', 'a razão do Code 39 deve ser 2 ou 3');
  }
  if (text.length === 0) {
    throw new BarcodeError(
      'empty',
      'informe um conteúdo para o código de barras',
    );
  }

  const upper = text.toUpperCase();
  const checkChar = opts.checksum ? code39CheckChar(upper) : undefined;
  const data = checkChar ? upper + checkChar : upper;

  // Monta a sequência: `*` (gap) c1 (gap) c2 … (gap) `*`, sem gap no fim.
  const modules: string[] = [`*`, ...data, `*`].map((ch) => {
    const pattern = CODE39_PATTERNS[ch];
    if (!pattern) {
      throw new BarcodeError(
        'bad-chars',
        `o caractere "${ch}" não existe no Code 39`,
      );
    }
    return patternToModules(pattern, ratio);
  });

  return {
    modules: modules.join('0'),
    data,
    hri: data,
    checkChar,
  };
}
