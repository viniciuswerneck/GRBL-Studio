/**
 * Encoder **QR Code** (ISO/IEC 18004) — módulo puro, sem DOM e sem dependência
 * de runtime (ADR-11).
 *
 * Cobre o necessário para a ferramenta (RF-SYM-1): modos **numérico**,
 * **alfanumérico** e **byte/UTF-8** (com auto-seleção pelo conteúdo), versões
 * **1–40**, níveis de correção **L/M/Q/H** (menor versão que couber, ou versão
 * fixa), **Reed–Solomon** em GF(256) com primitivo `0x11D`, intercalação de
 * blocos, as **8 máscaras** com avaliação de penalidade (ou máscara fixa, para
 * reprodutibilidade) e formato/versão em **BCH**.
 *
 * As tabelas de blocos EC e de *alignment patterns* vêm de `qr.tables.ts`
 * (geradas a partir da implementação de referência e conferidas em
 * `tests/qr.test.ts`, inclusive por decodificação real com `jsqr`).
 */

import { ALIGNMENT_POSITIONS, RS_BLOCKS } from './qr.tables';

export type QrEcc = 'L' | 'M' | 'Q' | 'H';
export type QrMode = 'numeric' | 'alphanumeric' | 'byte';

export type QrErrorCode = 'empty' | 'too-long' | 'bad-version';

/** Erro do encoder: a UI traduz pelo `code` (padrão "nenhuma lógica na UI"). */
export class QrError extends Error {
  constructor(
    readonly code: QrErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'QrError';
  }
}

export interface QrOptions {
  /** Nível de correção. Padrão `M`. */
  ecc?: QrEcc;
  /** Versão fixa (1–40) ou `auto` (menor que couber). Padrão `auto`. */
  version?: number | 'auto';
  /** Máscara fixa (0–7) ou `auto` (menor penalidade). Padrão `auto`. */
  mask?: number | 'auto';
}

export interface QrResult {
  /** `matrix[row][col]` com `row 0` no **topo**; `true` = módulo escuro. */
  matrix: boolean[][];
  version: number;
  ecc: QrEcc;
  mask: number;
  /** Módulos por lado (`17 + 4 · version`). */
  size: number;
  mode: QrMode;
  /** Bytes UTF-8 do conteúdo (para o cabeçalho do G-code). */
  byteLength: number;
}

const ECC_INDEX: Record<QrEcc, number> = { L: 0, M: 1, Q: 2, H: 3 };
/** Bits do formato (o padrão usa esta ordem, não a dos índices). */
const ECC_BITS: Record<QrEcc, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

const ALNUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const MODE_INDICATOR: Record<QrMode, number> = {
  numeric: 0b0001,
  alphanumeric: 0b0010,
  byte: 0b0100,
};

// --------------------------------------------------------------- GF(256) / RS

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** Polinômio gerador de grau `degree` (coeficiente líder primeiro). */
function rsGenerator(degree: number): Uint8Array {
  let poly = Uint8Array.from([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** Resto da divisão de `data` pelo gerador de grau `ecCount` (codewords EC). */
function rsRemainder(data: Uint8Array, gen: Uint8Array): Uint8Array {
  const ecCount = gen.length - 1;
  const rem = new Uint8Array(ecCount);
  for (const byte of data) {
    const factor = byte ^ rem[0];
    for (let i = 0; i < ecCount - 1; i++) rem[i] = rem[i + 1];
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let i = 0; i < ecCount; i++) {
        rem[i] ^= gfMul(gen[i + 1], factor);
      }
    }
  }
  return rem;
}

// ------------------------------------------------------------ modo/capacidade

const NUMERIC_RE = /^[0-9]+$/;
/** O alfabeto do modo alfanumérico (43 caracteres). */
const ALNUM_RE = /^[0-9A-Z $%*+\-./:]+$/;

function pickMode(text: string): QrMode {
  if (NUMERIC_RE.test(text)) return 'numeric';
  if (ALNUM_RE.test(text)) return 'alphanumeric';
  return 'byte';
}

function countBits(mode: QrMode, version: number): number {
  const group = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  if (mode === 'numeric') return [10, 12, 14][group];
  if (mode === 'alphanumeric') return [9, 11, 13][group];
  return [8, 16, 16][group];
}

function payloadBits(mode: QrMode, text: string, bytes: number): number {
  if (mode === 'numeric') {
    const n = text.length;
    return 10 * Math.floor(n / 3) + [0, 4, 7][n % 3];
  }
  if (mode === 'alphanumeric') {
    const n = text.length;
    return 11 * Math.floor(n / 2) + 6 * (n % 2);
  }
  return 8 * bytes;
}

/** Blocos EC da versão/nível: `[total, dados]` por bloco. */
function rsBlockList(
  version: number,
  ecc: QrEcc,
): Array<{ total: number; data: number }> {
  const groups = RS_BLOCKS[(version - 1) * 4 + ECC_INDEX[ecc]];
  const out: Array<{ total: number; data: number }> = [];
  for (const [count, total, data] of groups) {
    for (let i = 0; i < count; i++) out.push({ total, data });
  }
  return out;
}

/** Codewords de dados disponíveis (sem os de correção). */
function dataCodewords(version: number, ecc: QrEcc): number {
  return rsBlockList(version, ecc).reduce((n, b) => n + b.data, 0);
}

// -------------------------------------------------------------- bit buffer

class BitBuffer {
  private readonly bits: number[] = [];
  push(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length(): number {
    return this.bits.length;
  }
  /** Fecha em bytes (terminador + pad 0xEC/0x11) e devolve as codewords. */
  toCodewords(capacity: number): Uint8Array {
    const maxBits = capacity * 8;
    if (this.bits.length > maxBits) {
      throw new QrError('too-long', 'o conteúdo não cabe na versão escolhida');
    }
    // Terminador: até 4 zeros (o que couber).
    const terminator = Math.min(4, maxBits - this.bits.length);
    for (let i = 0; i < terminator; i++) this.bits.push(0);
    while (this.bits.length % 8 !== 0) this.bits.push(0);

    const out = new Uint8Array(capacity);
    for (let i = 0; i < this.bits.length / 8; i++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) byte = (byte << 1) | this.bits[i * 8 + b];
      out[i] = byte;
    }
    const pad = [0xec, 0x11];
    for (let i = this.bits.length / 8; i < capacity; i++) {
      out[i] = pad[(i - this.bits.length / 8) % 2];
    }
    return out;
  }
}

function encodePayload(
  mode: QrMode,
  text: string,
  bytes: Uint8Array,
  buf: BitBuffer,
): void {
  if (mode === 'numeric') {
    for (let i = 0; i < text.length; i += 3) {
      const chunk = text.slice(i, i + 3);
      const bits = chunk.length === 3 ? 10 : chunk.length === 2 ? 7 : 4;
      buf.push(Number.parseInt(chunk, 10), bits);
    }
  } else if (mode === 'alphanumeric') {
    for (let i = 0; i < text.length; i += 2) {
      const a = ALNUM_CHARS.indexOf(text[i]);
      if (i + 1 < text.length) {
        buf.push(a * 45 + ALNUM_CHARS.indexOf(text[i + 1]), 11);
      } else {
        buf.push(a, 6);
      }
    }
  } else {
    for (const byte of bytes) buf.push(byte, 8);
  }
}

// ------------------------------------------------------------------ matriz

/** As 8 máscaras do padrão (`true` = inverte o módulo). */
const MASKS: ReadonlyArray<(row: number, col: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** BCH(15,5) do formato + máscara `0x5412` (ISO/IEC 18004 §8.9). */
function formatBits(ecc: QrEcc, mask: number): number {
  const data = (ECC_BITS[ecc] << 3) | mask;
  let bch = data << 10;
  while (bitLength(bch) - bitLength(0b10100110111) >= 0) {
    bch ^= 0b10100110111 << (bitLength(bch) - bitLength(0b10100110111));
  }
  return ((data << 10) | bch) ^ 0b101010000010010;
}

/** BCH(18,6) da versão (v ≥ 7), sem XOR. */
function versionBits(version: number): number {
  const G18 = 0b1111100100101;
  let bch = version << 12;
  while (bitLength(bch) >= bitLength(G18)) {
    bch ^= G18 << (bitLength(bch) - bitLength(G18));
  }
  return (version << 12) | bch;
}

function bitLength(value: number): number {
  let n = 0;
  let v = value;
  while (v !== 0) {
    n++;
    v >>>= 1;
  }
  return n;
}

interface BuiltMatrix {
  size: number;
  dark: boolean[][];
}

/**
 * Monta a matriz: padrões fixos, dados em zigue-zague, máscara aplicada só nos
 * módulos de dados e informação de formato (real ou provisória, `withFormat`).
 */
function buildMatrix(
  version: number,
  ecc: QrEcc,
  codewords: Uint8Array,
  mask: number,
  withFormat: boolean,
): BuiltMatrix {
  const size = 17 + 4 * version;
  const dark: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );
  const fn: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );
  const set = (row: number, col: number, value: boolean): void => {
    dark[row][col] = value;
    fn[row][col] = true;
  };
  const reserve = (row: number, col: number): void => {
    fn[row][col] = true;
  };

  // Finder patterns + separadores (brancos).
  const finder = (row: number, col: number): void => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const ring =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6));
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        set(rr, cc, ring || core);
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  // Alignment patterns (pulando os que caem sobre os finders). Vêm **antes** do
  // timing: a partir da v7 há alinhamentos sobre a linha/coluna 6 (o padrão
  // passa por eles) — se o timing fosse desenhado primeiro, o alinhamento
  // "colidiria" e seria omitido, gerando um símbolo que não lê.
  const positions = ALIGNMENT_POSITIONS[version - 1];
  for (const r of positions) {
    for (const c of positions) {
      if (fn[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  // Timing patterns (linha/coluna 6), sem sobrescrever o que já existe.
  for (let i = 8; i < size - 8; i++) {
    if (!fn[6][i]) set(6, i, i % 2 === 0);
    if (!fn[i][6]) set(i, 6, i % 2 === 0);
  }

  // Módulo escuro fixo.
  set(size - 8, 8, true);

  // Reserva das áreas de formato e de versão (os dados não entram aqui).
  for (let i = 0; i < 15; i++) {
    if (i < 6) reserve(i, 8);
    else if (i < 8) reserve(i + 1, 8);
    else reserve(size - 15 + i, 8);

    if (i < 8) reserve(8, size - 1 - i);
    else if (i < 9) reserve(8, 15 - i);
    else reserve(8, 14 - i);
  }
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      reserve(Math.floor(i / 3), (i % 3) + size - 11);
      reserve((i % 3) + size - 11, Math.floor(i / 3));
    }
  }

  // Dados em zigue-zague (2 colunas por vez, subindo/descendo), com a máscara.
  const maskFn = MASKS[mask];
  let row = size - 1;
  let inc = -1;
  let byteIndex = 0;
  let bitIndex = 7;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (;;) {
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (fn[row][cc]) continue;
        let bit = false;
        if (byteIndex < codewords.length) {
          bit = ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
        }
        dark[row][cc] = bit !== maskFn(row, cc);
        bitIndex--;
        if (bitIndex < 0) {
          byteIndex++;
          bitIndex = 7;
        }
      }
      row += inc;
      if (row < 0 || row >= size) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }

  if (withFormat) {
    const bits = formatBits(ecc, mask);
    for (let i = 0; i < 15; i++) {
      const on = ((bits >>> i) & 1) === 1;
      if (i < 6) dark[i][8] = on;
      else if (i < 8) dark[i + 1][8] = on;
      else dark[size - 15 + i][8] = on;

      if (i < 8) dark[8][size - 1 - i] = on;
      else if (i < 9) dark[8][15 - i] = on;
      else dark[8][14 - i] = on;
    }
    if (version >= 7) {
      const vbits = versionBits(version);
      for (let i = 0; i < 18; i++) {
        const on = ((vbits >>> i) & 1) === 1;
        dark[Math.floor(i / 3)][(i % 3) + size - 11] = on;
        dark[(i % 3) + size - 11][Math.floor(i / 3)] = on;
      }
    }
  }

  return { size, dark };
}

/** Penalidade da máscara (ISO/IEC 18004 §8.8.2, as 4 regras). */
function penalty(dark: boolean[][], size: number): number {
  let score = 0;

  // Regra 1: sequências de 5+ módulos iguais.
  const runScore = (length: number): number =>
    length >= 5 ? 3 + (length - 5) : 0;
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (dark[r][c] === dark[r][c - 1]) run++;
      else {
        score += runScore(run);
        run = 1;
      }
    }
    score += runScore(run);
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (dark[r][c] === dark[r - 1][c]) run++;
      else {
        score += runScore(run);
        run = 1;
      }
    }
    score += runScore(run);
  }

  // Regra 2: blocos 2×2 da mesma cor.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = dark[r][c];
      if (
        v === dark[r][c + 1] &&
        v === dark[r + 1][c] &&
        v === dark[r + 1][c + 1]
      ) {
        score += 3;
      }
    }
  }

  // Regra 3: padrão 1:1:3:1:1 com 4 módulos claros de um dos lados.
  const PATTERNS = [0b10111010000, 0b00001011101];
  const matches = (get: (i: number) => boolean, start: number): boolean => {
    for (const pattern of PATTERNS) {
      let ok = true;
      for (let k = 0; k < 11; k++) {
        const bit = (pattern >>> (10 - k)) & 1;
        if (get(start + k) !== (bit === 1)) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      if (matches((i) => dark[r][i], c)) score += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      if (matches((i) => dark[i][c], r)) score += 40;
    }
  }

  // Regra 4: desequilíbrio claro/escuro (5% = 10 pontos).
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (dark[r][c]) darkCount++;
  }
  const percent = (darkCount * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

// ------------------------------------------------------------------ público

/** Menor versão em que o conteúdo cabe (ou a versão pedida, validando). */
export function qrVersionFor(
  text: string,
  ecc: QrEcc = 'M',
  minVersion = 1,
): number {
  const mode = pickMode(text);
  const bytes = new TextEncoder().encode(text).length;
  const need = payloadBits(mode, text, bytes);
  for (let version = Math.max(1, minVersion); version <= 40; version++) {
    const capacity = dataCodewords(version, ecc) * 8;
    if (4 + countBits(mode, version) + need <= capacity) return version;
  }
  throw new QrError(
    'too-long',
    `o conteúdo é longo demais para um QR Code (versão 40, nível ${ecc})`,
  );
}

/** Quantos bytes UTF-8 cabem no maior QR (v40) neste nível de correção. */
export function qrMaxBytes(ecc: QrEcc = 'M'): number {
  const capacity = dataCodewords(40, ecc) * 8;
  return Math.floor((capacity - 4 - 16) / 8);
}

/** Codifica `text` e devolve a matriz + metadados. Lança {@link QrError}. */
export function encodeQr(text: string, opts: QrOptions = {}): QrResult {
  if (text.length === 0) {
    throw new QrError('empty', 'informe um conteúdo para gerar o QR Code');
  }
  const ecc = opts.ecc ?? 'M';
  const bytesArray = new TextEncoder().encode(text);
  const mode = pickMode(text);

  let version: number;
  if (opts.version === undefined || opts.version === 'auto') {
    version = qrVersionFor(text, ecc);
  } else {
    version = Math.floor(opts.version);
    if (!Number.isFinite(version) || version < 1 || version > 40) {
      throw new QrError(
        'bad-version',
        'a versão do QR Code deve estar entre 1 e 40',
      );
    }
    const capacity = dataCodewords(version, ecc) * 8;
    const need =
      4 + countBits(mode, version) + payloadBits(mode, text, bytesArray.length);
    if (need > capacity) {
      throw new QrError('too-long', 'o conteúdo não cabe na versão escolhida');
    }
  }

  // Dados + correção de erro (blocos intercalados).
  const blocks = rsBlockList(version, ecc);
  const capacity = blocks.reduce((n, b) => n + b.data, 0);
  const full = new BitBuffer();
  full.push(MODE_INDICATOR[mode], 4);
  full.push(
    mode === 'byte' ? bytesArray.length : text.length,
    countBits(mode, version),
  );
  encodePayload(mode, text, bytesArray, full);
  const codewords = full.toCodewords(capacity);

  const gen = rsGenerator(blocks[0].total - blocks[0].data);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (const block of blocks) {
    const chunk = codewords.slice(offset, offset + block.data);
    offset += block.data;
    dataBlocks.push(chunk);
    ecBlocks.push(rsRemainder(chunk, gen));
  }
  const maxData = Math.max(...dataBlocks.map((b) => b.length));
  const ecLength = gen.length - 1;
  const interleaved: number[] = [];
  for (let i = 0; i < maxData; i++) {
    for (const block of dataBlocks)
      if (i < block.length) interleaved.push(block[i]);
  }
  for (let i = 0; i < ecLength; i++) {
    for (const block of ecBlocks) interleaved.push(block[i]);
  }

  const data = Uint8Array.from(interleaved);
  let mask: number;
  if (opts.mask === undefined || opts.mask === 'auto') {
    let best = 0;
    let bestScore = Infinity;
    for (let m = 0; m < 8; m++) {
      const candidate = buildMatrix(version, ecc, data, m, false);
      const score = penalty(candidate.dark, candidate.size);
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }
    mask = best;
  } else {
    mask = Math.floor(opts.mask);
    if (!Number.isFinite(mask) || mask < 0 || mask > 7) {
      throw new QrError('bad-version', 'a máscara deve estar entre 0 e 7');
    }
  }

  const built = buildMatrix(version, ecc, data, mask, true);
  return {
    matrix: built.dark,
    version,
    ecc,
    mask,
    size: built.size,
    mode,
    byteLength: bytesArray.length,
  };
}
