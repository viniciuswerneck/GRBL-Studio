/**
 * Tabelas dos códigos de barras 1D — **arquivo gerado**, não editar à mão.
 *
 * Gerado por `scripts/gen-barcode-tables.mjs` a partir do `jsbarcode`
 * (MIT, **apenas devDependency**): os padrões são os dados das normas
 * ISO/IEC 15417 (Code 128), 15420 (EAN/UPC) e 16388 (Code 39). O encoder é
 * próprio — este arquivo é só dado, como `qr.tables.ts`.
 *
 * Invariantes conferidas na geração: 107 padrões Code 128 (11 módulos,
 * 13 no stop), Code 39 com 9 elementos e exatamente 3 largos por caractere,
 * EAN/UPC com L/G/R de 7 módulos e a tabela de paridade do EAN-13.
 */

/**
 * Code 128 (ISO/IEC 15417): padrões de 11 módulos por valor. Os índices
 * 0–102 são valores de dados (0–95 por conjunto, 96–102 códigos especiais e
 * de troca de conjunto), 103/104/105 são os starts (A/B/C) e 106 o stop.
 */
export const CODE128_PATTERNS: readonly string[] = [
  '11011001100',
  '11001101100',
  '11001100110',
  '10010011000',
  '10010001100',
  '10001001100',
  '10011001000',
  '10011000100',
  '10001100100',
  '11001001000',
  '11001000100',
  '11000100100',
  '10110011100',
  '10011011100',
  '10011001110',
  '10111001100',
  '10011101100',
  '10011100110',
  '11001110010',
  '11001011100',
  '11001001110',
  '11011100100',
  '11001110100',
  '11101101110',
  '11101001100',
  '11100101100',
  '11100100110',
  '11101100100',
  '11100110100',
  '11100110010',
  '11011011000',
  '11011000110',
  '11000110110',
  '10100011000',
  '10001011000',
  '10001000110',
  '10110001000',
  '10001101000',
  '10001100010',
  '11010001000',
  '11000101000',
  '11000100010',
  '10110111000',
  '10110001110',
  '10001101110',
  '10111011000',
  '10111000110',
  '10001110110',
  '11101110110',
  '11010001110',
  '11000101110',
  '11011101000',
  '11011100010',
  '11011101110',
  '11101011000',
  '11101000110',
  '11100010110',
  '11101101000',
  '11101100010',
  '11100011010',
  '11101111010',
  '11001000010',
  '11110001010',
  '10100110000',
  '10100001100',
  '10010110000',
  '10010000110',
  '10000101100',
  '10000100110',
  '10110010000',
  '10110000100',
  '10011010000',
  '10011000010',
  '10000110100',
  '10000110010',
  '11000010010',
  '11001010000',
  '11110111010',
  '11000010100',
  '10001111010',
  '10100111100',
  '10010111100',
  '10010011110',
  '10111100100',
  '10011110100',
  '10011110010',
  '11110100100',
  '11110010100',
  '11110010010',
  '11011011110',
  '11011110110',
  '11110110110',
  '10101111000',
  '10100011110',
  '10001011110',
  '10111101000',
  '10111100010',
  '11110101000',
  '11110100010',
  '10111011110',
  '10111101110',
  '11101011110',
  '11110101110',
  '11010000100', // start A
  '11010010000', // start B
  '11010011100', // start C
  '1100011101011', // stop (13 módulos)
];

/** Índices dos códigos de controle/fim do Code 128. */
export const CODE128_START = { A: 103, B: 104, C: 105 } as const;
export const CODE128_STOP = 106;
/** Módulo do dígito verificador do Code 128 (mod 103). */
export const CODE128_MODULO = 103;

/**
 * Code 39 (ISO/IEC 16388): 9 elementos por caractere (`w` largo, `n`
 * estreito), incluindo `*` (start/stop). O gap entre caracteres é sempre um
 * `n` e não faz parte do padrão.
 */
export const CODE39_PATTERNS: Readonly<Record<string, string>> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  '*': 'nwnnwnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
};

/** EAN/UPC (ISO/IEC 15420): 10 dígitos nos conjuntos L, G e R (7 módulos). */
export const EAN_L: readonly string[] = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];

export const EAN_G: readonly string[] = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];

export const EAN_R: readonly string[] = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];

/** EAN-13: paridade dos 6 dígitos da esquerda, pelo primeiro dígito. */
export const EAN13_PARITY: readonly string[] = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

/** Guardas: lado (início/fim) e centro dos símbolos EAN/UPC. */
export const EAN_SIDE_BIN = '101';
export const EAN_MIDDLE_BIN = '01010';
