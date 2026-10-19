/**
 * Encoder **Data Matrix ECC200** (ISO/IEC 16022) — módulo puro, sem DOM e sem
 * dependência de runtime (ADR-11).
 *
 * Cobre o necessário para a ferramenta (RF-SYM-1): modo **ASCII** (texto livre
 * em Latin-1, com o par de dígitos `00`–`99` do próprio modo ASCII), tamanhos
 * **quadrados de 10×10 a 144×144** com a tabela de capacidade/blocos EC da
 * norma, **Reed–Solomon** em GF(256) com primitivo `0x12D`, intercalação de
 * blocos, colocação Utah/cantos (Annex F) e o padrão de descoberta
 * **L sólido + bordas alternadas**.
 *
 * A **quiet zone é de 1 módulo** (menor que a do QR) e não faz parte da matriz
 * devolvida: o chamador a acrescenta (`DATA_MATRIX_QUIET_ZONE`), como no QR.
 *
 * Limitações conscientes desta versão: apenas modo ASCII — **sem C40, Text,
 * X12, EDIFACT ou Base256**; sem símbolos retangulares. Isso mantém o encoder
 * pequeno e determinístico; o texto livre (inclusive acentos Latin-1) continua
 * cabendo, só ocupa mais codewords.
 */

/**
 * ECC200 usa GF(256) com o polinômio primitivo `x⁸ + x⁵ + x³ + x² + 1`
 * (`0x12D`) — **diferente** do `0x11D` do QR Code. Não compartilhe as tabelas.
 */
const GF_PRIMITIVE = 0x12d;

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= GF_PRIMITIVE;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** Polinômio gerador `∏(x − αⁱ)`, `i = 1…degree` (coeficiente líder 1). */
function rsGenerator(degree: number): Uint8Array {
  let poly = Uint8Array.from([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i + 1]);
    }
    poly = next;
  }
  return poly;
}

/** Resto da divisão de `data` pelo gerador (codewords de correção). */
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

// --------------------------------------------------------------- tabela ECC200

export interface DataMatrixSymbolSize {
  /** Lado do símbolo em módulos (sem a quiet zone). */
  readonly size: number;
  /** Lado de **cada região de dados** (sem as duas bordas). */
  readonly dataRegion: number;
  /** Regiões de dados por lado (1, 2, 4 ou 6). */
  readonly regions: number;
  /** Codewords de dados disponíveis (capacidade, já com o padding). */
  readonly dataCodewords: number;
  /** Codewords de correção no total. */
  readonly eccCodewords: number;
  /** Blocos Reed–Solomon intercalados. */
  readonly blocks: number;
}

/**
 * Símbolos **quadrados** do ECC200 (ISO/IEC 16022, Tabela 7). A capacidade
 * total é `(dataRegion · regions)² / 8` codewords, distribuídos entre dados e
 * correção; quando há mais de um bloco, os dados são intercalados em rodízio e
 * a correção também.
 */
export const DATA_MATRIX_SIZES: readonly DataMatrixSymbolSize[] = [
  {
    size: 10,
    dataRegion: 8,
    regions: 1,
    dataCodewords: 3,
    eccCodewords: 5,
    blocks: 1,
  },
  {
    size: 12,
    dataRegion: 10,
    regions: 1,
    dataCodewords: 5,
    eccCodewords: 7,
    blocks: 1,
  },
  {
    size: 14,
    dataRegion: 12,
    regions: 1,
    dataCodewords: 8,
    eccCodewords: 10,
    blocks: 1,
  },
  {
    size: 16,
    dataRegion: 14,
    regions: 1,
    dataCodewords: 12,
    eccCodewords: 12,
    blocks: 1,
  },
  {
    size: 18,
    dataRegion: 16,
    regions: 1,
    dataCodewords: 18,
    eccCodewords: 14,
    blocks: 1,
  },
  {
    size: 20,
    dataRegion: 18,
    regions: 1,
    dataCodewords: 22,
    eccCodewords: 18,
    blocks: 1,
  },
  {
    size: 22,
    dataRegion: 20,
    regions: 1,
    dataCodewords: 30,
    eccCodewords: 20,
    blocks: 1,
  },
  {
    size: 24,
    dataRegion: 22,
    regions: 1,
    dataCodewords: 36,
    eccCodewords: 24,
    blocks: 1,
  },
  {
    size: 26,
    dataRegion: 24,
    regions: 1,
    dataCodewords: 44,
    eccCodewords: 28,
    blocks: 1,
  },
  {
    size: 32,
    dataRegion: 14,
    regions: 2,
    dataCodewords: 62,
    eccCodewords: 36,
    blocks: 1,
  },
  {
    size: 36,
    dataRegion: 16,
    regions: 2,
    dataCodewords: 86,
    eccCodewords: 42,
    blocks: 1,
  },
  {
    size: 40,
    dataRegion: 18,
    regions: 2,
    dataCodewords: 114,
    eccCodewords: 48,
    blocks: 1,
  },
  {
    size: 44,
    dataRegion: 20,
    regions: 2,
    dataCodewords: 144,
    eccCodewords: 56,
    blocks: 1,
  },
  {
    size: 48,
    dataRegion: 22,
    regions: 2,
    dataCodewords: 174,
    eccCodewords: 68,
    blocks: 1,
  },
  {
    size: 52,
    dataRegion: 24,
    regions: 2,
    dataCodewords: 204,
    eccCodewords: 84,
    blocks: 2,
  },
  {
    size: 64,
    dataRegion: 14,
    regions: 4,
    dataCodewords: 280,
    eccCodewords: 112,
    blocks: 2,
  },
  {
    size: 72,
    dataRegion: 16,
    regions: 4,
    dataCodewords: 368,
    eccCodewords: 144,
    blocks: 4,
  },
  {
    size: 80,
    dataRegion: 18,
    regions: 4,
    dataCodewords: 456,
    eccCodewords: 192,
    blocks: 4,
  },
  {
    size: 88,
    dataRegion: 20,
    regions: 4,
    dataCodewords: 576,
    eccCodewords: 224,
    blocks: 4,
  },
  {
    size: 96,
    dataRegion: 22,
    regions: 4,
    dataCodewords: 696,
    eccCodewords: 272,
    blocks: 4,
  },
  {
    size: 104,
    dataRegion: 24,
    regions: 4,
    dataCodewords: 816,
    eccCodewords: 336,
    blocks: 6,
  },
  {
    size: 120,
    dataRegion: 18,
    regions: 6,
    dataCodewords: 1050,
    eccCodewords: 408,
    blocks: 6,
  },
  {
    size: 132,
    dataRegion: 20,
    regions: 6,
    dataCodewords: 1304,
    eccCodewords: 496,
    blocks: 8,
  },
  {
    size: 144,
    dataRegion: 22,
    regions: 6,
    dataCodewords: 1558,
    eccCodewords: 620,
    blocks: 10,
  },
];

/** Quiet zone do Data Matrix em módulos (1 — menor que a do QR). */
export const DATA_MATRIX_QUIET_ZONE = 1;

/** Maior capacidade de dados (símbolo 144×144) em codewords ASCII. */
export const DATA_MATRIX_MAX_CODEWORDS =
  DATA_MATRIX_SIZES[DATA_MATRIX_SIZES.length - 1].dataCodewords;

// ------------------------------------------------------------------- erros/API

export type DataMatrixErrorCode =
  | 'empty'
  | 'too-long'
  | 'bad-chars'
  | 'bad-size';

/** Erro do encoder: a UI traduz pelo `code` (padrão "nenhuma lógica na UI"). */
export class DataMatrixError extends Error {
  constructor(
    readonly code: DataMatrixErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DataMatrixError';
  }
}

export interface DataMatrixOptions {
  /**
   * Força um lado de símbolo (10…144, apenas os quadrados da tabela) ou
   * `'auto'` (o menor que couber). Padrão `'auto'`.
   */
  size?: number | 'auto';
}

export interface DataMatrixResult {
  /** Lado do símbolo em módulos, **sem** a quiet zone. */
  size: number;
  /** `matrix[row][col]`, `row 0` no topo; `true` = módulo escuro. */
  matrix: boolean[][];
  /** Módulos na horizontal (igual a `size`; quadrado). */
  widthModules: number;
  /** Módulos na vertical (igual a `size`; quadrado). */
  heightModules: number;
  /** Quantidade de blocos Reed–Solomon intercalados. */
  eccBlocks: number;
  /** Capacidade de dados do símbolo (codewords, já com o padding). */
  dataCodewords: number;
}

// ------------------------------------------------------------ modo ASCII (S)

const UPPER_SHIFT = 235;
const PAD = 129;

function isDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39;
}

/**
 * Codewords do modo ASCII: `ASCII + 1`, par de dígitos `130 + valor` e
 * `235 + (byte − 128 + 1)` para Latin-1 alto. Qualquer code unit fora de
 * 0–255 (inclusive metades de surrogate) é rejeitado.
 */
function encodeAscii(text: string): Uint8Array {
  const codewords: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0xff) {
      const shown = String.fromCodePoint(text.codePointAt(i) ?? code);
      throw new DataMatrixError(
        'bad-chars',
        `o caractere "${shown}" (posição ${i + 1}) não é Latin-1; ` +
          'o Data Matrix desta versão só codifica 0–255',
      );
    }
    if (isDigit(code) && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (isDigit(next)) {
        codewords.push(130 + (code - 0x30) * 10 + (next - 0x30));
        i++;
        continue;
      }
    }
    if (code >= 0x80) {
      codewords.push(UPPER_SHIFT, code - 0x80 + 1);
    } else {
      codewords.push(code + 1);
    }
  }
  return Uint8Array.from(codewords);
}

/** Completa até a capacidade: 129 e depois o padding pseudoaleatório 253-state. */
function padCodewords(data: Uint8Array, capacity: number): Uint8Array {
  const out = new Uint8Array(capacity);
  out.set(data, 0);
  if (data.length >= capacity) return out;
  out[data.length] = PAD;
  for (let position = data.length + 2; position <= capacity; position++) {
    // `position` é 1-based, como na norma (Annex B.1).
    const pseudo = ((149 * position) % 253) + 1;
    const value = PAD + pseudo;
    out[position - 1] = value > 254 ? value - 254 : value;
  }
  return out;
}

/** Dados + correção, com os blocos intercalados em rodízio (Annex B.2). */
function addErrorCorrection(
  data: Uint8Array,
  symbol: DataMatrixSymbolSize,
): Uint8Array {
  const out = new Uint8Array(symbol.dataCodewords + symbol.eccCodewords);
  out.set(data, 0);
  const ecPerBlock = symbol.eccCodewords / symbol.blocks;
  const gen = rsGenerator(ecPerBlock);
  const ecBlocks: Uint8Array[] = [];
  for (let block = 0; block < symbol.blocks; block++) {
    const chunk: number[] = [];
    for (let i = block; i < data.length; i += symbol.blocks) {
      chunk.push(data[i]);
    }
    ecBlocks.push(rsRemainder(Uint8Array.from(chunk), gen));
  }

  // No 144×144 os dois últimos blocos têm um codeword de dados a menos; a
  // norma (e o decodificador do ZXing) intercala a correção começando por eles
  // (blocos 9 e 10), e não pelo bloco 1.
  const ecStart = symbol.size === 144 ? 8 : 0;
  for (let i = 0; i < ecPerBlock; i++) {
    for (let j = 0; j < symbol.blocks; j++) {
      const block = (j + ecStart) % symbol.blocks;
      out[symbol.dataCodewords + i * symbol.blocks + j] = ecBlocks[block][i];
    }
  }
  return out;
}

// ------------------------------------------------------- colocação (Annex F)

/**
 * Coloca os codewords na "mapping matrix" (regiões de dados concatenadas, sem
 * as bordas) seguindo os padrões *Utah* e os quatro casos de canto da norma.
 * As posições que sobram no canto inferior direito recebem o padrão fixo
 * (dois módulos escuros na diagonal).
 */
function placeCodewords(
  codewords: Uint8Array,
  numCols: number,
  numRows: number,
): boolean[][] {
  /** `-1` = ainda não colocado; `0`/`1` = módulo. */
  const bits: number[][] = Array.from({ length: numRows }, () =>
    new Array<number>(numCols).fill(-1),
  );

  const module = (row: number, col: number, pos: number, bit: number): void => {
    let r = row;
    let c = col;
    if (r < 0) {
      r += numRows;
      c += 4 - ((numRows + 4) % 8);
    }
    if (c < 0) {
      c += numCols;
      r += 4 - ((numCols + 4) % 8);
    }
    bits[r][c] = (codewords[pos] >> (8 - bit)) & 1;
  };

  const utah = (row: number, col: number, pos: number): void => {
    module(row - 2, col - 2, pos, 1);
    module(row - 2, col - 1, pos, 2);
    module(row - 1, col - 2, pos, 3);
    module(row - 1, col - 1, pos, 4);
    module(row - 1, col, pos, 5);
    module(row, col - 2, pos, 6);
    module(row, col - 1, pos, 7);
    module(row, col, pos, 8);
  };

  const corner1 = (pos: number): void => {
    module(numRows - 1, 0, pos, 1);
    module(numRows - 1, 1, pos, 2);
    module(numRows - 1, 2, pos, 3);
    module(0, numCols - 2, pos, 4);
    module(0, numCols - 1, pos, 5);
    module(1, numCols - 1, pos, 6);
    module(2, numCols - 1, pos, 7);
    module(3, numCols - 1, pos, 8);
  };

  const corner2 = (pos: number): void => {
    module(numRows - 3, 0, pos, 1);
    module(numRows - 2, 0, pos, 2);
    module(numRows - 1, 0, pos, 3);
    module(0, numCols - 4, pos, 4);
    module(0, numCols - 3, pos, 5);
    module(0, numCols - 2, pos, 6);
    module(0, numCols - 1, pos, 7);
    module(1, numCols - 1, pos, 8);
  };

  const corner3 = (pos: number): void => {
    module(numRows - 3, 0, pos, 1);
    module(numRows - 2, 0, pos, 2);
    module(numRows - 1, 0, pos, 3);
    module(0, numCols - 2, pos, 4);
    module(0, numCols - 1, pos, 5);
    module(1, numCols - 1, pos, 6);
    module(2, numCols - 1, pos, 7);
    module(3, numCols - 1, pos, 8);
  };

  const corner4 = (pos: number): void => {
    module(numRows - 1, 0, pos, 1);
    module(numRows - 1, numCols - 1, pos, 2);
    module(0, numCols - 3, pos, 3);
    module(0, numCols - 2, pos, 4);
    module(0, numCols - 1, pos, 5);
    module(1, numCols - 3, pos, 6);
    module(1, numCols - 2, pos, 7);
    module(1, numCols - 1, pos, 8);
  };

  const free = (row: number, col: number): boolean => bits[row][col] === -1;

  let pos = 0;
  let row = 4;
  let col = 0;
  do {
    if (row === numRows && col === 0) corner1(pos++);
    if (row === numRows - 2 && col === 0 && numCols % 4 !== 0) corner2(pos++);
    if (row === numRows - 2 && col === 0 && numCols % 8 === 4) corner3(pos++);
    if (row === numRows + 4 && col === 2 && numCols % 8 === 0) corner4(pos++);

    // Varredura diagonal para cima/à direita.
    do {
      if (row < numRows && col >= 0 && free(row, col)) utah(row, col, pos++);
      row -= 2;
      col += 2;
    } while (row >= 0 && col < numCols);
    row += 1;
    col += 3;

    // Varredura diagonal para baixo/à esquerda.
    do {
      if (row >= 0 && col < numCols && free(row, col)) utah(row, col, pos++);
      row += 2;
      col -= 2;
    } while (row < numRows && col >= 0);
    row += 3;
    col += 1;
  } while (row < numRows || col < numCols);

  if (pos !== codewords.length) {
    throw new Error(
      `colocação inconsistente: ${pos} codewords para ${codewords.length}`,
    );
  }

  // Padrão fixo do canto inferior direito (2×2 em xadrez).
  if (bits[numRows - 1][numCols - 1] === -1) {
    bits[numRows - 1][numCols - 1] = 1;
    bits[numRows - 2][numCols - 2] = 1;
  }

  return bits.map((line) => line.map((bit) => bit === 1));
}

/**
 * Monta o símbolo: cada região recebe suas bordas (topo alternado, esquerda
 * sólida, direita alternada, base sólida) e o bloco de dados correspondente.
 */
function buildSymbol(
  mapping: boolean[][],
  symbol: DataMatrixSymbolSize,
): boolean[][] {
  const region = symbol.dataRegion;
  const dataSide = region * symbol.regions;
  const side = symbol.size;
  const dark: boolean[][] = Array.from({ length: side }, () =>
    new Array<boolean>(side).fill(false),
  );

  let matrixY = 0;
  for (let y = 0; y < dataSide; y++) {
    // Borda superior da faixa de regiões: alternada, começando escura.
    if (y % region === 0) {
      for (let x = 0; x < side; x++) dark[matrixY][x] = x % 2 === 0;
      matrixY++;
    }

    let matrixX = 0;
    for (let x = 0; x < dataSide; x++) {
      // Borda esquerda da região: sólida.
      if (x % region === 0) dark[matrixY][matrixX++] = true;
      dark[matrixY][matrixX++] = mapping[y][x];

      // Borda direita da região: alternada pela linha global de dados.
      if (x % region === region - 1) {
        dark[matrixY][matrixX++] = y % 2 === 0;
      }
    }
    matrixY++;

    // Borda inferior da faixa: sólida.
    if (y % region === region - 1) {
      for (let x = 0; x < side; x++) dark[matrixY][x] = true;
      matrixY++;
    }
  }

  return dark;
}

// ------------------------------------------------------------------- público

/** Menor símbolo quadrado em que `text` cabe (ou o tamanho forçado). */
export function dataMatrixSizeFor(
  text: string,
  size: number | 'auto' = 'auto',
): DataMatrixSymbolSize {
  if (text.length === 0) {
    throw new DataMatrixError(
      'empty',
      'informe um conteúdo para gerar o código',
    );
  }
  return chooseSymbol(encodeAscii(text).length, size);
}

function chooseSymbol(
  codewordCount: number,
  size: number | 'auto',
): DataMatrixSymbolSize {
  const found =
    size === 'auto'
      ? DATA_MATRIX_SIZES.find((s) => s.dataCodewords >= codewordCount)
      : DATA_MATRIX_SIZES.find((s) => s.size === size);
  if (!found) {
    if (size !== 'auto') {
      throw new DataMatrixError(
        'bad-size',
        `tamanho ${size} não suportado; use 10…144 (quadrados do ECC200)`,
      );
    }
    throw new DataMatrixError(
      'too-long',
      `o conteúdo é longo demais para um Data Matrix ` +
        `(${codewordCount} codewords; o máximo é ${DATA_MATRIX_MAX_CODEWORDS})`,
    );
  }
  if (found.dataCodewords < codewordCount) {
    throw new DataMatrixError(
      'too-long',
      `o conteúdo não cabe em ${found.size}×${found.size} ` +
        `(${codewordCount} codewords; a capacidade é ${found.dataCodewords})`,
    );
  }
  return found;
}

/** Codifica `text` em ASCII e devolve a matriz + metadados. */
export function encodeDataMatrix(
  text: string,
  opts: DataMatrixOptions = {},
): DataMatrixResult {
  if (text.length === 0) {
    throw new DataMatrixError(
      'empty',
      'informe um conteúdo para gerar o código',
    );
  }
  const data = encodeAscii(text);
  const symbol = chooseSymbol(data.length, opts.size ?? 'auto');
  const padded = padCodewords(data, symbol.dataCodewords);
  const codewords = addErrorCorrection(padded, symbol);
  const mappingSide = symbol.dataRegion * symbol.regions;
  const mapping = placeCodewords(codewords, mappingSide, mappingSide);
  const matrix = buildSymbol(mapping, symbol);

  return {
    size: symbol.size,
    matrix,
    widthModules: symbol.size,
    heightModules: symbol.size,
    eccBlocks: symbol.blocks,
    dataCodewords: symbol.dataCodewords,
  };
}
