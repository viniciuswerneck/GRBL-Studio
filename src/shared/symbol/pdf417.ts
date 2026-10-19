/**
 * PDF417 (ISO/IEC 15438) — módulo puro (sem DOM, sem máquina).
 *
 * Camada de alto nível (conteúdo → codewords) + estrutura do símbolo
 * (linhas/colunas, indicadores de linha, start/stop) + correção de erro
 * Reed–Solomon em GF(929). A saída é uma **matriz booleana retangular**
 * (`true` = barra), que o pipeline de varredura (`mask.ts` → `gcode.ts`)
 * transforma em G-code.
 *
 * Compaction implementada nesta versão: **Numeric** (902, para conteúdo só de
 * dígitos — séries/números de série) e **Byte** (901/924, ISO-8859-1). O
 * modo **Text** (900, mais denso para maiúsculas) fica para uma próxima
 * iteração; sem ele o símbolo ainda é válido e legível.
 *
 * Padrões de codeword: `pdf417.tables.ts` (gerado, conferido por decodificação
 * real no teste com `@zxing/library`).
 */

import { PDF417_CODEWORDS } from './pdf417.tables';

/** Nível de correção de erro (0…8): `2^(nível+1)` codewords de EC. */
export type Pdf417EccLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Pdf417Options {
  /** Nível de correção de erro. Padrão 2 (8 codewords de EC). */
  eccLevel?: number;
  /** Colunas de dados (1…30) ou `'auto'` (padrão). */
  columns?: number | 'auto';
}

export interface Pdf417Result {
  /** `matrix[linha][coluna]`; `true` = barra. Primeira linha no topo. */
  matrix: boolean[][];
  rows: number;
  /** Colunas de **dados** (sem os indicadores/start/stop). */
  columns: number;
  eccLevel: Pdf417EccLevel;
  ecCodewords: number;
  dataCodewords: number;
  totalCodewords: number;
  /** Todos os codewords (dados + EC), na ordem de gravação — para testes. */
  codewords: number[];
  /** Indicadores de linha por linha (para testes/inspeção). */
  rowIndicators: Array<{ left: number; right: number }>;
}

export type Pdf417ErrorCode =
  | 'empty'
  | 'too-long'
  | 'bad-options'
  | 'bad-chars';

export class Pdf417Error extends Error {
  readonly code: Pdf417ErrorCode;
  constructor(code: Pdf417ErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'Pdf417Error';
    this.code = code;
  }
}

// --------------------------------------------------------------- constantes

/** Padrão *start* (17 módulos, 81111113). */
export const PDF417_START_PATTERN = 0x1fea8;
/** Padrão *stop* (18 módulos, 711311121). */
export const PDF417_STOP_PATTERN = 0x3fa29;
/** Módulos por codeword. */
export const PDF417_MODULES_PER_CODEWORD = 17;
export const PDF417_MIN_ROWS = 3;
export const PDF417_MAX_ROWS = 90;
export const PDF417_MIN_COLUMNS = 1;
export const PDF417_MAX_COLUMNS = 30;
/** Máximo de codewords (dados + EC) no símbolo. */
export const PDF417_MAX_CODEWORDS = 928;
/** Quiet zone mínima da norma (módulos por lado). */
export const PDF417_QUIET_ZONE_MODULES = 2;

const GF = 929;
const EC_LATCH = 902;
const BYTE_LATCH = 901;
const BYTE_LATCH_6 = 924;
const PAD = 900;

/** Número de codewords de EC para um nível (2, 4, 8 … 512). */
export function pdf417EcCodewords(level: number): number {
  const l = Math.max(0, Math.min(8, Math.floor(level)));
  return 2 << l; // 2^(l+1)
}

/** Largura total do símbolo em módulos (há `columns` colunas de dados). */
export function pdf417TotalModules(columns: number): number {
  return PDF417_MODULES_PER_CODEWORD * columns + 69;
}

// ---------------------------------------------------------------- compaction

/**
 * Bytes ISO-8859-1 (Latin-1). O PDF417 assume o ECI padrão ISO-8859-1 quando
 * não há ECI; codificar em UTF-8 sairia ilegível (mojibake) nos leitores.
 * Caracteres fora do Latin-1 são rejeitados com `bad-chars`.
 */
function latin1Bytes(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0xff) {
      throw new Pdf417Error(
        'bad-chars',
        `Caractere fora do ISO-8859-1: ${JSON.stringify(ch)}.`,
      );
    }
    out.push(code);
  }
  return out;
}

function bytesToBigInt(bytes: ReadonlyArray<number>): bigint {
  let value = 0n;
  for (const b of bytes) value = value * 256n + BigInt(b);
  return value;
}

/** Valor → `k` codewords base 900, mais significativo primeiro (padding 0). */
function base900(value: bigint, k: number): number[] {
  const out = new Array<number>(k).fill(0);
  let v = value;
  for (let j = k - 1; j >= 0; j--) {
    out[j] = Number(v % 900n);
    v /= 900n;
  }
  return out;
}

/** Valor → codewords base 900 mínimos (sem zeros à esquerda). */
function base900Minimal(value: bigint): number[] {
  const out: number[] = [];
  let v = value;
  while (v > 0n) {
    out.unshift(Number(v % 900n));
    v /= 900n;
  }
  if (out.length === 0) out.push(0);
  return out;
}

/**
 * Numeric Compaction (902). Cada grupo de até 44 dígitos vira um número
 * `'1' + dígitos` em base 900 (o `1` inicial é removido na decodificação).
 * Grupos de 44 dígitos ocupam exatamente 15 codewords.
 */
function compactNumeric(digits: string): number[] {
  const out = [EC_LATCH];
  let i = 0;
  while (digits.length - i > 44) {
    out.push(...base900(BigInt(`1${digits.slice(i, i + 44)}`), 15));
    i += 44;
  }
  const rest = digits.slice(i);
  if (rest.length > 0) out.push(...base900Minimal(BigInt(`1${rest}`)));
  return out;
}

/**
 * Byte Compaction. Grupos cheios de 6 bytes → 5 codewords em base 900.
 * - Resto de 1…5 bytes → **901**: o grupo final sai como um codeword por byte.
 * - Sem resto (múltiplo de 6) → **924**: só grupos base 900.
 */
function compactBytes(bytes: ReadonlyArray<number>): number[] {
  const out: number[] = [];
  const n = bytes.length;
  const rest = n % 6;
  if (n >= 6 && rest === 0) {
    out.push(BYTE_LATCH_6);
    for (let i = 0; i < n; i += 6) {
      out.push(...base900(bytesToBigInt(bytes.slice(i, i + 6)), 5));
    }
    return out;
  }
  out.push(BYTE_LATCH);
  const full = n - rest;
  for (let i = 0; i < full; i += 6) {
    out.push(...base900(bytesToBigInt(bytes.slice(i, i + 6)), 5));
  }
  for (let i = full; i < n; i++) out.push(bytes[i]);
  return out;
}

function compactData(text: string): number[] {
  if (text.length === 0) {
    throw new Pdf417Error('empty', 'Informe um conteúdo para o PDF417.');
  }
  if (/^[0-9]+$/.test(text)) return compactNumeric(text);
  return compactBytes(latin1Bytes(text));
}

// ------------------------------------------------------------ correção de erro

/** `base^exp` em GF(929). */
function gfPow(base: number, exp: number): number {
  let r = 1;
  for (let i = 0; i < exp; i++) r = (r * base) % GF;
  return r;
}

/**
 * Gerador de Reed–Solomon `∏_{i=1..k}(x − 3^i)` em GF(929), monic e
 * **mais significativo primeiro** (comprimento `k+1`, `g[0] = 1`).
 */
function generatorPoly(k: number): number[] {
  let g = [1];
  for (let i = 1; i <= k; i++) {
    const root = gfPow(3, i);
    const neg = (GF - root) % GF;
    const next = new Array<number>(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] = (next[j] + g[j]) % GF;
      next[j + 1] = (next[j + 1] + neg * g[j]) % GF;
    }
    g = next;
  }
  return g;
}

/** Resto de `(dados · x^k) / gerador` → os `k` codewords de EC (negados). */
function computeEc(data: ReadonlyArray<number>, k: number): number[] {
  const gen = generatorPoly(k);
  const rem = [...data, ...new Array<number>(k).fill(0)];
  for (let i = 0; i + k < rem.length; i++) {
    const coef = rem[i];
    if (coef === 0) continue;
    for (let j = 0; j <= k; j++) {
      rem[i + j] = (((rem[i + j] - coef * gen[j]) % GF) + GF) % GF;
    }
  }
  // `C = D·x^k − R`, com `R = (D·x^k) mod g`, para `C ≡ 0 (mod g)`.
  return rem.slice(rem.length - k).map((v) => (GF - v) % GF);
}

// ------------------------------------------------------------------ estrutura

function rowsFor(columns: number, needed: number): number {
  return Math.max(PDF417_MIN_ROWS, Math.ceil(needed / columns));
}

function chooseDimensions(
  needed: number,
  ecCodewords: number,
  columnsOpt: number | 'auto' | undefined,
): { rows: number; columns: number } {
  const fits = (rows: number, columns: number) => {
    if (columns < PDF417_MIN_COLUMNS || columns > PDF417_MAX_COLUMNS)
      return false;
    if (rows > PDF417_MAX_ROWS) return false;
    const total = rows * columns;
    if (total > PDF417_MAX_CODEWORDS) return false;
    return total - ecCodewords >= needed;
  };

  if (columnsOpt !== undefined && columnsOpt !== 'auto') {
    const columns = Math.floor(columnsOpt);
    if (
      !Number.isFinite(columns) ||
      columns < 1 ||
      columns > PDF417_MAX_COLUMNS
    ) {
      throw new Pdf417Error('bad-options', 'Colunas fora de 1…30.');
    }
    const rows = rowsFor(columns, needed + ecCodewords);
    if (!fits(rows, columns)) {
      throw new Pdf417Error('too-long', 'Conteúdo longo demais para o PDF417.');
    }
    return { rows, columns };
  }

  let best: { rows: number; columns: number; padding: number } | null = null;
  for (let columns = 1; columns <= PDF417_MAX_COLUMNS; columns++) {
    const rows = rowsFor(columns, needed + ecCodewords);
    if (!fits(rows, columns)) continue;
    const padding = rows * columns - ecCodewords - needed;
    if (
      !best ||
      rows < best.rows ||
      (rows === best.rows && padding < best.padding) ||
      (rows === best.rows && padding === best.padding && columns < best.columns)
    ) {
      best = { rows, columns, padding };
    }
  }
  if (!best)
    throw new Pdf417Error('too-long', 'Conteúdo longo demais para o PDF417.');
  return { rows: best.rows, columns: best.columns };
}

/** Indicadores de linha (esquerdo/direito) da linha `row`. */
function rowIndicators(
  row: number,
  rows: number,
  columns: number,
  ecLevel: number,
): { left: number; right: number } {
  const base = Math.floor(row / 3) * 30;
  const rowsD3 = Math.floor((rows - 1) / 3);
  const rowsM3 = (rows - 1) % 3;
  const cluster = row % 3;
  if (cluster === 0) {
    return { left: base + rowsD3, right: base + (columns - 1) };
  }
  if (cluster === 1) {
    return { left: base + ecLevel * 3 + rowsM3, right: base + rowsD3 };
  }
  return { left: base + (columns - 1), right: base + ecLevel * 3 + rowsM3 };
}

function pushBits(bits: boolean[], pattern: number, length: number): void {
  for (let i = length - 1; i >= 0; i--) bits.push(((pattern >> i) & 1) === 1);
}

/**
 * Texto → codewords + matriz do **PDF417**. Puro e determinístico.
 * Lança `Pdf417Error` (`empty`, `too-long`, `bad-options`).
 */
export function encodePdf417(
  text: string,
  options: Pdf417Options = {},
): Pdf417Result {
  const ecLevel = Math.max(
    0,
    Math.min(8, Math.floor(options.eccLevel ?? 2)),
  ) as Pdf417EccLevel;
  const ecCodewords = pdf417EcCodewords(ecLevel);

  const payload = compactData(text);
  const needed = 1 + payload.length; // + descritor de comprimento
  const { rows, columns } = chooseDimensions(
    needed,
    ecCodewords,
    options.columns,
  );

  const totalCodewords = rows * columns;
  const dataCount = totalCodewords - ecCodewords;
  const data = new Array<number>(dataCount).fill(PAD);
  data[0] = dataCount; // descritor = nº de codewords de dados (inclui a si)
  for (let i = 0; i < payload.length; i++) data[i + 1] = payload[i];

  const ec = computeEc(data, ecCodewords);
  const codewords = [...data, ...ec];

  const indicators: Array<{ left: number; right: number }> = [];
  const matrix: boolean[][] = [];
  for (let row = 0; row < rows; row++) {
    const cluster = row % 3;
    const ind = rowIndicators(row, rows, columns, ecLevel);
    indicators.push(ind);
    const bits: boolean[] = [];
    pushBits(bits, PDF417_START_PATTERN, 17);
    pushBits(bits, PDF417_CODEWORDS[ind.left][cluster], 17);
    for (let col = 0; col < columns; col++) {
      const cw = codewords[row * columns + col];
      pushBits(bits, PDF417_CODEWORDS[cw][cluster], 17);
    }
    pushBits(bits, PDF417_CODEWORDS[ind.right][cluster], 17);
    pushBits(bits, PDF417_STOP_PATTERN, 18);
    matrix.push(bits);
  }

  return {
    matrix,
    rows,
    columns,
    eccLevel: ecLevel,
    ecCodewords,
    dataCodewords: dataCount,
    totalCodewords,
    codewords,
    rowIndicators: indicators,
  };
}
