/**
 * Encoder **Codabar** (AIM USS-Codabar) — puro, sem DOM.
 *
 * 20 caracteres: os 16 de dados (`0`–`9`, `-`, `$`, `:`, `/`, `.`, `+`) e os
 * guards `A`–`D` de start/stop. O gap entre caracteres é **um** espaço
 * estreito. Sem start/stop explícito, o conteúdo é envolvido em `A…A` (o
 * padrão); com guards explícitos (`A1234B`), eles são respeitados.
 *
 * O HRI é o conteúdo **sem** os guards, como na referência. O texto é
 * normalizado para maiúsculas (só os guards são letras), como no Code 39.
 *
 * A norma pede quiet zone de 10 módulos, X-dimension ≥ 0,19 mm e altura
 * ≥ 6,35 mm (ver `BARCODE_SPECS`).
 */

import { BarcodeError } from './error';
import { CODABAR_PATTERNS } from './tables';

/** Guards de start/stop do Codabar. */
export type CodabarGuard = 'A' | 'B' | 'C' | 'D';

export interface CodabarResult {
  /** Módulos do símbolo completo (`1` = barra), sem a quiet zone. */
  modules: string;
  /** Conteúdo com os guards de start/stop. */
  data: string;
  /** Texto legível (HRI): o conteúdo sem os guards. */
  hri: string;
}

const BODY_CHARS = '0123456789-$:/.+';
const isGuard = (ch: string): ch is CodabarGuard =>
  ch === 'A' || ch === 'B' || ch === 'C' || ch === 'D';

/**
 * Codifica `text` em Codabar. Aceita só o conteúdo (envolve em `A…A`) ou o
 * conteúdo já com os guards (`A…A`, `A…B`, …). Lança {@link BarcodeError}
 * (`empty`, `bad-chars`, `bad-length`).
 */
export function encodeCodabar(text: string): CodabarResult {
  if (text.length === 0) {
    throw new BarcodeError(
      'empty',
      'informe um conteúdo para o código de barras',
    );
  }

  const upper = text.toUpperCase();
  const explicit = isGuard(upper[0]);
  if (explicit && (upper.length < 3 || !isGuard(upper[upper.length - 1]))) {
    throw new BarcodeError(
      'bad-length',
      'com start/stop explícitos o Codabar precisa de "A…A" (ou B/C/D) com conteúdo entre os guards',
    );
  }

  const start = explicit ? upper[0] : 'A';
  const stop = explicit ? upper[upper.length - 1] : 'A';
  const body = explicit ? upper.slice(1, -1) : upper;

  if (body.length === 0) {
    throw new BarcodeError(
      'empty',
      'informe o conteúdo entre o start e o stop do Codabar',
    );
  }
  const bad = [...body].find((ch) => !BODY_CHARS.includes(ch));
  if (bad !== undefined) {
    throw new BarcodeError(
      'bad-chars',
      `o caractere "${bad}" não existe no Codabar (dados: 0-9 - $ : / . +; guards: A-D)`,
    );
  }

  let modules = '';
  for (const ch of start + body + stop) {
    // O gap entre caracteres é um espaço estreito, inclusive antes do stop.
    if (modules.length > 0) modules += '0';
    modules += CODABAR_PATTERNS[ch];
  }

  return {
    modules,
    data: start + body + stop,
    hri: body,
  };
}
