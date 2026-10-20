/**
 * Encoder **Aztec** (ISO/IEC 24778) — módulo puro, sem DOM e sem dependência
 * de runtime (ADR-11).
 *
 * Cobre o necessário para a ferramenta de símbolos 2D (RF-SYM-7): texto em
 * **Latin-1**, símbolos **compactos** (1–4 camadas) e **normais** (4–32
 * camadas), **Reed–Solomon** sobre GF(2⁴/2⁶/2⁸/2¹⁰/2¹²), mensagem de modo
 * com 4 bits por palavra, "bull's eye" central, marcas de alinhamento e a
 * matriz de dados em 4 blocos por camada (2 *upright* + 2 *rotated*).
 *
 * As **tabelas da norma** (caractere → código, *latch* e *shift*) são
 * **geradas** em `aztec.tables.ts` (`scripts/gen-aztec-tables.mjs`); aqui só
 * está o algoritmo.
 *
 * O encoder de alto nível é o de Frank Yellin (o mesmo do ZXing): um conjunto
 * de estados, um por modo alcançável, com **latch** (mudança definitiva de
 * tabela), **shift** (mudança temporária) e **binary shift** (byte cru). O
 * estado de menor custo vence; o resultado é o menor símbolo possível para o
 * conteúdo.
 *
 * A **quiet zone** do Aztec é de 0 módulo (a norma não exige nenhuma): quem
 * chama decide (o pipeline 2D usa 1 módulo, como no Data Matrix).
 */

import {
  AZTEC_CHAR_MAP_PACKED,
  AZTEC_LATCH_TABLE,
  AZTEC_MODE,
  AZTEC_SHIFT_TABLE,
} from './aztec.tables';

// ------------------------------------------------------------------- erros

export type AztecErrorCode =
  /** Conteúdo vazio. */
  | 'empty'
  /** Conteúdo maior que o maior símbolo Aztec (32 camadas). */
  | 'too-long'
  /** Caractere fora do Latin-1 (o Aztec do ZXing também é Latin-1). */
  | 'bad-chars'
  /** Número de camadas forçado que não comporta o conteúdo. */
  | 'layers';

export class AztecError extends Error {
  readonly code: AztecErrorCode;
  constructor(code: AztecErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AztecError';
    this.code = code;
  }
}

// -------------------------------------------------------------- constantes

/** Modos (tabelas) do Aztec, na ordem da ISO/IEC 24778. */
const MODE_UPPER = AZTEC_MODE.UPPER;
const MODE_DIGIT = AZTEC_MODE.DIGIT;
const MODE_PUNCT = AZTEC_MODE.PUNCT;

/** Código do *binary shift* (CTRL_BS) nas tabelas UPPER/LOWER/MIXED. */
const BINARY_SHIFT_CODE = 31;

/** Máximo de camadas de um símbolo Aztec. */
export const AZTEC_MAX_LAYERS = 32;

/** Máximo de camadas de um símbolo **compacto**. */
export const AZTEC_MAX_COMPACT_LAYERS = 4;

/**
 * Mínimo de correção de erro recomendado pela norma: 23 % das palavras de
 * dados **mais 3 palavras** (ISO/IEC 24778:2008).
 */
export const AZTEC_MIN_ECC_PERCENT = 23;

/** Correção de erro usada por padrão (a mesma do ZXing). */
export const AZTEC_DEFAULT_ECC_PERCENT = 33;

/**
 * A tabela de caracteres empacotada (2 dígitos por caractere) é aberta uma
 * vez: `CHAR_MAP[modo][byte]` = o código do caractere (0 = ausente).
 */
const CHAR_MAP: readonly (readonly number[])[] = AZTEC_CHAR_MAP_PACKED.map(
  (row) => {
    const out = new Array<number>(256);
    for (let i = 0; i < 256; i += 1) {
      out[i] = Number(row.slice(i * 2, i * 2 + 2));
    }
    return out;
  },
);

// -------------------------------------------------------------- GF(2^n) / RS

interface AztecField {
  /** Nº de elementos do campo (2ⁿ). */
  readonly size: number;
  /** `exp[i] = αⁱ` (duplicado para somar log sem módulo). */
  readonly exp: Int32Array;
  /** `log[αⁱ] = i`. */
  readonly log: Int32Array;
}

/**
 * Constrói o campo de Galois GF(2ⁿ) com o polinômio primitivo dado.
 * `primitive` traz o bit de xⁿ implícito (ex.: `0x12D` = x⁸+x⁵+x³+x²+1).
 */
function buildField(primitive: number, size: number): AztecField {
  const order = size - 1;
  const exp = new Int32Array(order * 2);
  const log = new Int32Array(size);
  let x = 1;
  for (let i = 0; i < order; i += 1) {
    exp[i] = x;
    log[x] = i;
    x <<= 1;
    if (x & size) x ^= primitive;
  }
  for (let i = order; i < order * 2; i += 1) exp[i] = exp[i - order];
  return { size, exp, log };
}

/**
 * Campos usados pelo Aztec (ISO/IEC 24778):
 *
 * | palavras | polinômio primitivo   | campo |
 * | :--- | :--- | :--- |
 * | 4 (modo) | `0x13` (x⁴+x+1) | GF(16) |
 * | 6 | `0x43` (x⁶+x+1) | GF(64) |
 * | 8 | `0x12D` (x⁸+x⁵+x³+x²+1) | GF(256) |
 * | 10 | `0x409` (x¹⁰+x³+1) | GF(1024) |
 * | 12 | `0x1069` (x¹²+x⁶+x⁵+x³+1) | GF(4096) |
 */
const FIELDS: Readonly<Record<number, AztecField>> = {
  4: buildField(0x13, 16),
  6: buildField(0x43, 64),
  8: buildField(0x12d, 256),
  10: buildField(0x409, 1024),
  12: buildField(0x1069, 4096),
};

function gfMul(field: AztecField, a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return field.exp[field.log[a] + field.log[b]];
}

/**
 * Polinômio gerador `∏(x + αⁱ)`, `i = 1…degree` (o Aztec usa a base 1, como
 * o Data Matrix). Coeficiente líder 1.
 */
function rsGenerator(field: AztecField, degree: number): Int32Array {
  let poly = Int32Array.from([1]);
  for (let i = 0; i < degree; i += 1) {
    const next = new Int32Array(poly.length + 1);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(field, poly[j], field.exp[i + 1]);
    }
    poly = next;
  }
  return poly;
}

/** Resto da divisão das palavras pelos gerador (as palavras de correção). */
function rsRemainder(
  field: AztecField,
  data: readonly number[],
  gen: Int32Array,
): number[] {
  const ecCount = gen.length - 1;
  const rem = new Array<number>(ecCount).fill(0);
  for (const word of data) {
    const factor = word ^ rem[0];
    for (let i = 0; i < ecCount - 1; i += 1) rem[i] = rem[i + 1];
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let i = 0; i < ecCount; i += 1) {
        rem[i] ^= gfMul(field, gen[i + 1], factor);
      }
    }
  }
  return rem;
}

// ------------------------------------------------- encoder de alto nível

/**
 * Cadeia de bits imutável: cada estado aponta para o anterior, então os
 * candidatos do algoritmo de estados não copiam o conteúdo (o texto pode ter
 * milhares de bits).
 */
interface BitNode {
  readonly prev: BitNode | null;
  readonly bits: number[];
}

/** Estado do encoder: bits escritos, tabela atual e *binary shift* pendente. */
interface EncoderState {
  readonly node: BitNode | null;
  /** Tabela atual (modo). */
  readonly mode: number;
  /** Bytes do *binary shift* ainda não escritos (o custo já está no total). */
  readonly binary: readonly number[];
  /** Bits escritos **+** o custo estimado do *binary shift* pendente. */
  readonly bitCount: number;
}

function appendValue(
  node: BitNode | null,
  value: number,
  count: number,
): BitNode {
  const bits: number[] = new Array(count);
  for (let i = 0; i < count; i += 1) {
    bits[i] = (value >>> (count - 1 - i)) & 1;
  }
  return { prev: node, bits };
}

/** Acréscenta o **código do caractere** (5 bits; 4 na tabela DIGIT). */
function appendCharCode(
  node: BitNode | null,
  mode: number,
  code: number,
): BitNode {
  return appendValue(node, code, mode === MODE_DIGIT ? 4 : 5);
}

/** Nº de bits de um código de caractere na tabela. */
function charCodeBits(mode: number): number {
  return mode === MODE_DIGIT ? 4 : 5;
}

/**
 * Custo (em bits) de um *binary shift* com `count` bytes: 10 bits de cabeçalho
 * (controle + comprimento) por bloco de até 31 bytes, mais 8 bits por byte.
 */
function binaryCost(count: number): number {
  if (count <= 0) return 0;
  const blocks = Math.ceil(count / 31);
  return blocks * 10 + count * 8;
}

/**
 * Escreve o *binary shift* pendente: para cada bloco de até 31 bytes, o
 * código de controle (CTRL_BS), o comprimento (5 bits) e os bytes crus.
 *
 * O bloco é limitado a 31 bytes porque é o que o *decodificador* da norma lê
 * em 5 bits (o formato estendido existe, mas nem todo leitor o implementa).
 */
function flushBinary(state: EncoderState): EncoderState {
  if (state.binary.length === 0) return state;
  let node = state.node;
  for (let offset = 0; offset < state.binary.length; offset += 31) {
    const block = state.binary.slice(offset, offset + 31);
    node = appendValue(node, BINARY_SHIFT_CODE, 5);
    node = appendValue(node, block.length, 5);
    for (const byte of block) node = appendValue(node, byte, 8);
  }
  return { node, mode: state.mode, binary: [], bitCount: state.bitCount };
}

/** Muda de tabela **definitivamente** (latch) e escreve o caractere. */
function latchAndAppend(
  state: EncoderState,
  mode: number,
  code: number,
): EncoderState {
  const base = flushBinary(state);
  const [bits, value] = AZTEC_LATCH_TABLE[base.mode][mode];
  let node = appendValue(base.node, value, bits);
  node = appendCharCode(node, mode, code);
  return {
    node,
    mode,
    binary: [],
    bitCount: base.bitCount + bits + charCodeBits(mode),
  };
}

/** Muda de tabela **temporariamente** (shift) e escreve o caractere. */
function shiftAndAppend(
  state: EncoderState,
  mode: number,
  code: number,
): EncoderState {
  const base = flushBinary(state);
  const shiftCode = AZTEC_SHIFT_TABLE[base.mode][mode];
  let node = appendValue(base.node, shiftCode, 5);
  node = appendCharCode(node, mode, code);
  return {
    node,
    mode: base.mode,
    binary: [],
    bitCount: base.bitCount + 5 + charCodeBits(mode),
  };
}

/**
 * Acrescenta um byte em *binary shift*. O shift só existe nas tabelas
 * UPPER/LOWER/MIXED: de PUNCT ou DIGIT o encoder trava (latch) em UPPER
 * primeiro — e a partir daí fica lá.
 */
function addBinaryShiftChar(state: EncoderState, byte: number): EncoderState {
  let node = state.node;
  let mode = state.mode;
  let bitCount = state.bitCount;
  if (mode === MODE_PUNCT || mode === MODE_DIGIT) {
    const [bits, value] = AZTEC_LATCH_TABLE[mode][MODE_UPPER];
    node = appendValue(node, value, bits);
    bitCount += bits;
    mode = MODE_UPPER;
  }
  const binary = [...state.binary, byte];
  bitCount += binaryCost(binary.length) - binaryCost(state.binary.length);
  return { node, mode, binary, bitCount };
}

/**
 * Um estado é melhor (ou igual) que outro quando, mesmo trocando de tabela
 * para a do outro, ele não fica mais caro. É o filtro que mantém o conjunto
 * de estados pequeno (o algoritmo é de Frank Yellin).
 */
function isBetterThanOrEqualTo(a: EncoderState, b: EncoderState): boolean {
  let cost = a.bitCount + AZTEC_LATCH_TABLE[a.mode][b.mode][0];
  if (a.binary.length < b.binary.length) {
    cost += binaryCost(b.binary.length) - binaryCost(a.binary.length);
  } else if (a.binary.length > b.binary.length && b.binary.length > 0) {
    cost += 10;
  }
  return cost <= b.bitCount;
}

/** Remove os estados dominados pelos novos. */
function simplify(states: EncoderState[]): EncoderState[] {
  const result: EncoderState[] = [];
  for (const candidate of states) {
    let keep = true;
    for (const kept of [...result]) {
      if (isBetterThanOrEqualTo(kept, candidate)) {
        keep = false;
        break;
      }
      if (isBetterThanOrEqualTo(candidate, kept)) {
        const at = result.indexOf(kept);
        if (at >= 0) result.splice(at, 1);
      }
    }
    if (keep) result.push(candidate);
  }
  return result;
}

/**
 * Pares de pontuação que a norma codifica em **um** código da tabela PUNCT:
 * `"\r\n"`, `". "`, `", "` e `": "`. Devolve 0 quando não há par.
 */
function punctPair(bytes: readonly number[], index: number): number {
  const current = bytes[index];
  const next = index + 1 < bytes.length ? bytes[index + 1] : -1;
  if (current === 0x0d && next === 0x0a) return 2;
  if (current === 0x2e && next === 0x20) return 3;
  if (current === 0x2c && next === 0x20) return 4;
  if (current === 0x3a && next === 0x20) return 5;
  return 0;
}

/** Candidatos para um caractere (ignorando o *binary shift* já iniciado). */
function statesForChar(
  states: readonly EncoderState[],
  char: number,
): EncoderState[] {
  const out: EncoderState[] = [];
  for (const state of states) {
    const inCurrent = CHAR_MAP[state.mode][char] > 0;
    for (let mode = 0; mode <= MODE_PUNCT; mode += 1) {
      const code = CHAR_MAP[mode][char];
      if (code <= 0) continue;
      // Travar (latch) só compensa se o caractere não está na tabela atual —
      // exceto DIGIT, cujos códigos custam 4 bits (menos que os 5 da atual).
      if (!inCurrent || mode === state.mode || mode === MODE_DIGIT) {
        out.push(latchAndAppend(state, mode, code));
      }
      // Um shift temporário nunca ajuda se o caractere já está na tabela.
      if (!inCurrent && AZTEC_SHIFT_TABLE[state.mode][mode] >= 0) {
        out.push(shiftAndAppend(state, mode, code));
      }
    }
    // *Binary shift*: continua o bloco em curso ou começa um (só quando o
    // caractere não existe na tabela atual).
    if (state.binary.length > 0 || CHAR_MAP[state.mode][char] === 0) {
      out.push(addBinaryShiftChar(state, char));
    }
  }
  return simplify(out);
}

/** Candidatos para um par de pontuação (`. `, `, `, `: `, `\r\n`). */
function statesForPair(
  states: readonly EncoderState[],
  pairCode: number,
  first: number,
  second: number,
): EncoderState[] {
  const out: EncoderState[] = [];
  for (const state of states) {
    const base = flushBinary(state);
    // 1) trava na tabela PUNCT e escreve o par.
    {
      const [bits, value] = AZTEC_LATCH_TABLE[base.mode][MODE_PUNCT];
      let node = appendValue(base.node, value, bits);
      node = appendCharCode(node, MODE_PUNCT, pairCode);
      out.push({
        node,
        mode: MODE_PUNCT,
        binary: [],
        bitCount: base.bitCount + bits + 5,
      });
    }
    // 2) shift temporário para PUNCT (só a partir de outra tabela).
    if (
      base.mode !== MODE_PUNCT &&
      AZTEC_SHIFT_TABLE[base.mode][MODE_PUNCT] >= 0
    ) {
      let node = appendValue(
        base.node,
        AZTEC_SHIFT_TABLE[base.mode][MODE_PUNCT],
        5,
      );
      node = appendCharCode(node, MODE_PUNCT, pairCode);
      out.push({
        node,
        mode: base.mode,
        binary: [],
        bitCount: base.bitCount + 5 + 5,
      });
    }
    // 3) ". " e ", " também cabem na tabela DIGIT (4 bits por código).
    if (pairCode === 3 || pairCode === 4) {
      const [bits, value] = AZTEC_LATCH_TABLE[base.mode][MODE_DIGIT];
      let node = appendValue(base.node, value, bits);
      node = appendCharCode(node, MODE_DIGIT, 16 - pairCode);
      node = appendCharCode(node, MODE_DIGIT, 1);
      out.push({
        node,
        mode: MODE_DIGIT,
        binary: [],
        bitCount: base.bitCount + bits + 4 + 4,
      });
    }
    // 4) bytes crus, se já estava num bloco de *binary shift*.
    if (state.binary.length > 0) {
      out.push(addBinaryShiftChar(addBinaryShiftChar(state, first), second));
    }
  }
  return simplify(out);
}

/** Texto (Latin-1) → bits de dados (sem *stuffing*). */
function encodeHighLevel(bytes: readonly number[]): number[] {
  let states: EncoderState[] = [
    { node: null, mode: MODE_UPPER, binary: [], bitCount: 0 },
  ];
  let index = 0;
  while (index < bytes.length) {
    const pair = punctPair(bytes, index);
    if (pair > 0) {
      states = statesForPair(states, pair, bytes[index], bytes[index + 1]);
      index += 2;
    } else {
      states = statesForChar(states, bytes[index]);
      index += 1;
    }
  }
  let best: EncoderState = states[0];
  for (const state of states) {
    if (state.bitCount < best.bitCount) best = state;
  }
  const flushed = flushBinary(best);
  const bits: number[] = [];
  const chunks: number[][] = [];
  for (let node = flushed.node; node; node = node.prev) chunks.push(node.bits);
  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    for (const bit of chunks[i]) bits.push(bit);
  }
  return bits;
}

// ------------------------------------------------- stuffing e check words

/**
 * *Stuffing* de bits (ISO/IEC 24778): uma palavra não pode ter os `n−1`
 * primeiros bits iguais — o *decodificador* usaria isso como escape. O
 * encoder substitui o último bit por um bit fixo e devolve esse bit para o
 * começo da próxima palavra.
 */
function stuffBits(bits: readonly number[], wordSize: number): number[] {
  const out: number[] = [];
  const mask = (1 << wordSize) - 2;
  const n = bits.length;
  for (let i = 0; i < n; i += wordSize) {
    let word = 0;
    for (let j = 0; j < wordSize; j += 1) {
      // O fim do conteúdo é preenchido com 1 (o padding da norma).
      if (i + j >= n || bits[i + j] === 1) word |= 1 << (wordSize - 1 - j);
    }
    let stuffed: number;
    if ((word & mask) === mask) {
      stuffed = word & mask;
      i -= 1; // o bit trocado volta para a próxima palavra
    } else if ((word & mask) === 0) {
      stuffed = word | 1;
      i -= 1;
    } else {
      stuffed = word;
    }
    for (let b = wordSize - 1; b >= 0; b -= 1) out.push((stuffed >> b) & 1);
  }
  return out;
}

/** Converte bits em palavras (MSB primeiro). */
function bitsToWords(bits: readonly number[], wordSize: number): number[] {
  const words: number[] = [];
  for (let i = 0; i < bits.length; i += wordSize) {
    let value = 0;
    for (let j = 0; j < wordSize; j += 1) {
      value |= (bits[i + j] ?? 0) << (wordSize - 1 - j);
    }
    words.push(value);
  }
  return words;
}

/**
 * Palavras de dados + palavras de correção (Reed–Solomon) + o *padding* que
 * completa a última palavra do símbolo.
 */
function generateCheckWords(
  bits: readonly number[],
  totalBits: number,
  wordSize: number,
): number[] {
  const field = FIELDS[wordSize];
  if (!field) throw new AztecError('too-long', `palavra de ${wordSize} bits`);
  const messageSizeInWords = bits.length / wordSize;
  const totalWords = Math.floor(totalBits / wordSize);
  const words = bitsToWords(bits, wordSize);
  while (words.length < totalWords) words.push(0);

  const gen = rsGenerator(field, totalWords - messageSizeInWords);
  const ec = rsRemainder(field, words.slice(0, messageSizeInWords), gen);
  // As palavras de correção ocupam o lugar do padding (o resto do símbolo).
  for (let i = 0; i < ec.length; i += 1) {
    words[messageSizeInWords + i] = ec[i];
  }

  // O primeiro bloco pode começar no meio de uma palavra (o resto do bits).
  const startPad = totalBits % wordSize;
  const out: number[] = new Array(startPad).fill(0);
  for (const word of words) {
    for (let i = wordSize - 1; i >= 0; i -= 1) out.push((word >> i) & 1);
  }
  return out;
}

/** Nº de bits por palavra de dados, conforme as camadas. */
function wordSizeFor(layers: number): number {
  if (layers <= 2) return 6;
  if (layers <= 8) return 8;
  if (layers <= 22) return 10;
  return 12;
}

/** Bits totais de um símbolo (dados + correção) com `layers` camadas. */
function totalBitsInLayer(layers: number, compact: boolean): number {
  return ((compact ? 88 : 112) + 16 * layers) * layers;
}

// ------------------------------------------------------------- a matriz

/** Desenha o "bull's eye" (o alvo central) do Aztec. */
function drawBullsEye(matrix: boolean[][], center: number, size: number): void {
  for (let i = 0; i < size; i += 2) {
    for (let j = center - i; j <= center + i; j += 1) {
      matrix[center - i][j] = true;
      matrix[center + i][j] = true;
      matrix[j][center - i] = true;
      matrix[j][center + i] = true;
    }
  }
  matrix[center - size][center - size] = true;
  matrix[center - size][center - size + 1] = true;
  matrix[center - size + 1][center - size] = true;
  matrix[center - size][center + size] = true;
  matrix[center - size + 1][center + size] = true;
  matrix[center + size - 1][center + size] = true;
}

/**
 * Escreve a mensagem de modo (camadas + tamanho) nas quatro pontas do
 * "bull's eye".
 */
function drawModeMessage(
  matrix: boolean[][],
  compact: boolean,
  matrixSize: number,
  modeMessage: readonly number[],
): void {
  const center = Math.floor(matrixSize / 2);
  if (compact) {
    for (let i = 0; i < 7; i += 1) {
      const offset = center - 3 + i;
      if (modeMessage[i] === 1) matrix[center - 5][offset] = true;
      if (modeMessage[i + 7] === 1) matrix[offset][center + 5] = true;
      if (modeMessage[20 - i] === 1) matrix[center + 5][offset] = true;
      if (modeMessage[27 - i] === 1) matrix[offset][center - 5] = true;
    }
  } else {
    for (let i = 0; i < 10; i += 1) {
      const offset = center - 5 + i + Math.floor(i / 5);
      if (modeMessage[i] === 1) matrix[center - 7][offset] = true;
      if (modeMessage[i + 10] === 1) matrix[offset][center + 7] = true;
      if (modeMessage[29 - i] === 1) matrix[center + 7][offset] = true;
      if (modeMessage[39 - i] === 1) matrix[offset][center - 7] = true;
    }
  }
}

// ------------------------------------------------------------------- API

export interface AztecOptions {
  /**
   * Correção de erro em **%** das palavras de dados (mínimo 23 % pela norma).
   * Padrão 33 %.
   */
  eccPercent?: number;
  /**
   * Número de camadas forçado: positivo = símbolo **normal**, negativo =
   * **compacto**, `0` = automático (padrão).
   */
  layers?: number;
}

export interface AztecResult {
  /** `matrix[row][col]`, `row 0` no topo; `true` = módulo escuro. */
  matrix: boolean[][];
  /** Lado do símbolo em módulos (sem a quiet zone). */
  size: number;
  /** Camadas de dados do símbolo. */
  layers: number;
  /** Símbolo compacto (≤ 4 camadas). */
  compact: boolean;
  /** Palavras de dados (com o *stuffing*). */
  codeWords: number;
  /** Palavras de correção de erro. */
  eccCodewords: number;
  /** Bits por palavra de dados. */
  wordSize: number;
  /** Bytes do conteúdo (Latin-1). */
  byteLength: number;
}

/** Converte o texto em bytes Latin-1 (o Aztec do ZXing também é Latin-1). */
function toLatin1(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code > 0xff) {
      throw new AztecError(
        'bad-chars',
        `caractere fora do Latin-1 na posição ${i} (U+${code
          .toString(16)
          .toUpperCase()
          .padStart(4, '0')})`,
      );
    }
    bytes.push(code);
  }
  return bytes;
}

/**
 * Texto → símbolo Aztec. Puro: nenhuma dependência de DOM ou de máquina.
 *
 * @throws {AztecError} `empty` (conteúdo vazio), `bad-chars` (fora do
 * Latin-1), `too-long` (maior que 32 camadas) ou `layers` (camadas forçadas
 * que não comportam o conteúdo).
 */
export function encodeAztec(
  text: string,
  options: AztecOptions = {},
): AztecResult {
  if (text.length === 0) throw new AztecError('empty', 'conteúdo vazio');
  const bytes = toLatin1(text);

  const eccPercent =
    Number.isFinite(options.eccPercent) && (options.eccPercent as number) > 0
      ? Math.min(
          90,
          Math.max(AZTEC_MIN_ECC_PERCENT, options.eccPercent as number),
        )
      : AZTEC_DEFAULT_ECC_PERCENT;
  const userLayers = Number.isFinite(options.layers)
    ? Math.trunc(options.layers as number)
    : 0;

  const dataBits = encodeHighLevel(bytes);
  const eccBits = Math.trunc((dataBits.length * eccPercent) / 100) + 11;
  const totalSizeBits = dataBits.length + eccBits;

  let compact: boolean;
  let layers: number;
  let totalBits: number;
  let wordSize: number;
  let stuffed: number[];

  if (userLayers !== 0) {
    compact = userLayers < 0;
    layers = Math.abs(userLayers);
    const max = compact ? AZTEC_MAX_COMPACT_LAYERS : AZTEC_MAX_LAYERS;
    if (layers < 1 || layers > max) {
      throw new AztecError('layers', `camadas fora do intervalo (1…${max})`);
    }
    totalBits = totalBitsInLayer(layers, compact);
    wordSize = wordSizeFor(layers);
    stuffed = stuffBits(dataBits, wordSize);
    const usable = totalBits - (totalBits % wordSize);
    if (stuffed.length + eccBits > usable) {
      throw new AztecError(
        'layers',
        `o conteúdo não cabe em ${layers} camadas${compact ? ' compactas' : ''}`,
      );
    }
    if (compact && stuffed.length > wordSize * 64) {
      throw new AztecError('layers', 'o conteúdo não cabe no símbolo compacto');
    }
  } else {
    wordSize = 0;
    stuffed = [];
    for (let i = 0; ; i += 1) {
      if (i > AZTEC_MAX_LAYERS) {
        throw new AztecError(
          'too-long',
          'conteúdo maior que o maior símbolo Aztec (32 camadas)',
        );
      }
      compact = i <= 3;
      layers = compact ? i + 1 : i;
      totalBits = totalBitsInLayer(layers, compact);
      if (totalSizeBits > totalBits) continue;
      if (stuffed.length === 0 || wordSize !== wordSizeFor(layers)) {
        wordSize = wordSizeFor(layers);
        stuffed = stuffBits(dataBits, wordSize);
      }
      const usable = totalBits - (totalBits % wordSize);
      // O formato compacto só comporta 64 palavras de dados.
      if (compact && stuffed.length > wordSize * 64) continue;
      if (stuffed.length + eccBits <= usable) break;
    }
  }

  const messageBits = generateCheckWords(stuffed, totalBits, wordSize);
  const messageSizeInWords = stuffed.length / wordSize;

  // --- mensagem de modo (camadas + número de palavras de dados)
  const modeBits: number[] = [];
  if (compact) {
    modeBits.push(...bitsOfValue(layers - 1, 2));
    modeBits.push(...bitsOfValue(messageSizeInWords - 1, 6));
  } else {
    modeBits.push(...bitsOfValue(layers - 1, 5));
    modeBits.push(...bitsOfValue(messageSizeInWords - 1, 11));
  }
  const modeMessage = generateCheckWords(modeBits, compact ? 28 : 40, 4);

  // --- geometria da matriz
  const baseMatrixSize = (compact ? 11 : 14) + layers * 4;
  const alignmentMap = new Int32Array(baseMatrixSize);
  let matrixSize: number;
  if (compact) {
    matrixSize = baseMatrixSize;
    for (let i = 0; i < alignmentMap.length; i += 1) alignmentMap[i] = i;
  } else {
    matrixSize =
      baseMatrixSize +
      1 +
      2 * Math.floor((Math.floor(baseMatrixSize / 2) - 1) / 15);
    const origCenter = Math.floor(baseMatrixSize / 2);
    const center = Math.floor(matrixSize / 2);
    for (let i = 0; i < origCenter; i += 1) {
      const newOffset = i + Math.floor(i / 15);
      alignmentMap[origCenter - i - 1] = center - newOffset - 1;
      alignmentMap[origCenter + i] = center + newOffset + 1;
    }
  }

  const matrix: boolean[][] = Array.from({ length: matrixSize }, () =>
    new Array<boolean>(matrixSize).fill(false),
  );

  // --- dados: 4 blocos por camada (2 *upright* + 2 *rotated*)
  let rowOffset = 0;
  for (let i = 0; i < layers; i += 1) {
    const rowSize = (layers - i) * 4 + (compact ? 9 : 12);
    for (let j = 0; j < rowSize; j += 1) {
      const columnOffset = j * 2;
      for (let k = 0; k < 2; k += 1) {
        if (messageBits[rowOffset + columnOffset + k] === 1) {
          matrix[alignmentMap[i * 2 + j]][alignmentMap[i * 2 + k]] = true;
        }
        if (messageBits[rowOffset + rowSize * 2 + columnOffset + k] === 1) {
          matrix[alignmentMap[baseMatrixSize - 1 - i * 2 - k]][
            alignmentMap[i * 2 + j]
          ] = true;
        }
        if (messageBits[rowOffset + rowSize * 4 + columnOffset + k] === 1) {
          matrix[alignmentMap[baseMatrixSize - 1 - i * 2 - j]][
            alignmentMap[baseMatrixSize - 1 - i * 2 - k]
          ] = true;
        }
        if (messageBits[rowOffset + rowSize * 6 + columnOffset + k] === 1) {
          matrix[alignmentMap[i * 2 + k]][
            alignmentMap[baseMatrixSize - 1 - i * 2 - j]
          ] = true;
        }
      }
    }
    rowOffset += rowSize * 8;
  }

  drawModeMessage(matrix, compact, matrixSize, modeMessage);

  // --- bull's eye e marcas de alinhamento
  const center = Math.floor(matrixSize / 2);
  if (compact) {
    drawBullsEye(matrix, center, 5);
  } else {
    drawBullsEye(matrix, center, 7);
    for (
      let i = 0, j = 0;
      i < Math.floor(baseMatrixSize / 2) - 1;
      i += 15, j += 16
    ) {
      for (let k = Math.floor(matrixSize / 2) % 2; k < matrixSize; k += 2) {
        matrix[k][center - j] = true;
        matrix[k][center + j] = true;
        matrix[center - j][k] = true;
        matrix[center + j][k] = true;
      }
    }
  }

  const totalWords = Math.floor(totalBits / wordSize);
  return {
    matrix,
    size: matrixSize,
    layers,
    compact,
    codeWords: messageSizeInWords,
    eccCodewords: totalWords - messageSizeInWords,
    wordSize,
    byteLength: bytes.length,
  };
}

/** Bits de um valor (MSB primeiro). */
function bitsOfValue(value: number, count: number): number[] {
  const bits: number[] = [];
  for (let i = count - 1; i >= 0; i -= 1) bits.push((value >> i) & 1);
  return bits;
}
