/**
 * Gera `src/shared/symbol/aztec.tables.ts` a partir da implementação de
 * referência (`@zxing/library`, Apache-2.0) — devDependency usada só para
 * testes/cross-check.
 *
 * Por que gerar em vez de digitar: são 5 tabelas de 256 posições (os字符 das
 * tabelas UPPER/LOWER/DIGIT/MIXED/PUNCT da ISO/IEC 24778), a tabela de
 * *latch* (5×5, com o caminho de bits) e a de *shift* (5×5). Digitar de
 * memória é a receita para um símbolo "com cara de válido" que não lê.
 *
 * As tabelas são **dados da norma** (não algoritmo): o encoder em
 * `src/shared/symbol/aztec.ts` é próprio e a saída é conferida contra a
 * decodificação real pelo `AztecReader` do ZXing.
 *
 * Uso: `node scripts/gen-aztec-tables.mjs`
 */
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const zxing = resolve(
  root,
  'node_modules/@zxing/library/esm/core/aztec/encoder',
);

// O pacote do ZXing usa importações sem extensão (estilo "bundler"), que o
// Node ESM não resolve: empacotamos os três módulos com o esbuild (que já é
// devDependency) e importamos o bundle.
const tmp = mkdtempSync(resolve(tmpdir(), 'grbl-aztec-tables-'));
const entry = resolve(tmp, 'entry.js');
const bundle = resolve(tmp, 'bundle.mjs');
writeFileSync(
  entry,
  [
    `export { CHAR_MAP } from ${JSON.stringify(resolve(zxing, 'CharMap.js'))};`,
    `export { LATCH_TABLE } from ${JSON.stringify(resolve(zxing, 'LatchTable.js'))};`,
    `export { SHIFT_TABLE } from ${JSON.stringify(resolve(zxing, 'ShiftTable.js'))};`,
  ].join('\n'),
  'utf8',
);
await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundle,
  logLevel: 'silent',
});

const { CHAR_MAP, LATCH_TABLE, SHIFT_TABLE } = await import(
  pathToFileURL(bundle).href
);
rmSync(tmp, { recursive: true, force: true });

/** Ordem das tabelas na norma (a mesma do encoder de referência). */
export const MODE_NAMES = ['UPPER', 'LOWER', 'DIGIT', 'MIXED', 'PUNCT'];

if (CHAR_MAP.length !== 5 || CHAR_MAP[0].length !== 256) {
  throw new Error('CHAR_MAP inesperada');
}
if (LATCH_TABLE.length !== 5) {
  throw new Error('tabela de latch inesperada');
}
// A tabela de shift é 6×6 na referência (o 6º modo é o BINARY, fora do
// alcance dos *shifts* de caractere): só as 5 primeiras linhas interessam.
if (SHIFT_TABLE.length < 5) {
  throw new Error('tabela de shift inesperada');
}

// Cada linha: 256 valores de 2 dígitos (00 = ausente na tabela). O formato
// "empacotado" mantém o arquivo gerado legível (5 linhas) — o decoder em
// `aztec.ts` abre as linhas uma vez, no carregamento do módulo.
const charRows = CHAR_MAP.map((row) => {
  const cells = [];
  for (let i = 0; i < 256; i += 1) {
    cells.push(String(row[i]).padStart(2, '0'));
  }
  return `  '${cells.join('')}',`;
});

// Latch: `bits` (nº de bits) e `code` (os bits empacotados, MSB primeiro).
const latchRows = LATCH_TABLE.map((row) => {
  const cells = [];
  for (let i = 0; i < 5; i += 1) {
    const entry = row[i];
    const bits = entry >>> 16;
    const code = entry & 0xffff;
    cells.push(`[${bits}, ${code}]`);
  }
  return `  [${cells.join(', ')}],`;
});

// Shift: o código de 5 bits (-1 = não existe shift para essa tabela).
const shiftRows = SHIFT_TABLE.map((row) => {
  const cells = [];
  for (let i = 0; i < 5; i += 1) cells.push(String(row[i]));
  return `  [${cells.join(', ')}],`;
});

const out = `/**
 * Tabelas da **ISO/IEC 24778** (Aztec) — **geradas** por
 * \`scripts/gen-aztec-tables.mjs\` a partir da implementação de referência
 * (\`@zxing/library\`, Apache-2.0). **Não editar à mão.**
 *
 * - \`AZTEC_CHAR_MAP[modo][byte]\`: o código do caractere na tabela (0 = ausente).
 * - \`AZTEC_LATCH_TABLE[origem][destino]\`: \`[bits, código]\` da mudança
 *   **definitiva** de tabela (o valor 0 = "já está nessa tabela").
 * - \`AZTEC_SHIFT_TABLE[origem][destino]\`: o código de 5 bits da mudança
 *   **temporária** (-1 = não existe).
 *
 * A ordem das tabelas é \`UPPER, LOWER, DIGIT, MIXED, PUNCT\`.
 */

/** Ordem das tabelas (índice do modo). */
export const AZTEC_MODES = ['UPPER', 'LOWER', 'DIGIT', 'MIXED', 'PUNCT'] as const;

/** Índice de cada tabela em \`AZTEC_CHAR_MAP\`/\`AZTEC_LATCH_TABLE\`. */
export const AZTEC_MODE = {
  UPPER: 0,
  LOWER: 1,
  DIGIT: 2,
  MIXED: 3,
  PUNCT: 4,
} as const;

/** Caractere → código na tabela, **empacotado** (2 dígitos por caractere). */
export const AZTEC_CHAR_MAP_PACKED: readonly string[] = [
${charRows.join('\n')}
];

/** Mudança **definitiva** de tabela: \`[nº de bits, bits empacotados]\`. */
export const AZTEC_LATCH_TABLE: readonly (readonly [number, number])[][] = [
${latchRows.join('\n')}
];

/** Mudança **temporária** de tabela (5 bits; -1 = não existe). */
export const AZTEC_SHIFT_TABLE: readonly number[][] = [
${shiftRows.join('\n')}
];
`;

mkdirSync(resolve(root, 'src/shared/symbol'), { recursive: true });
writeFileSync(resolve(root, 'src/shared/symbol/aztec.tables.ts'), out, 'utf8');
console.log('src/shared/symbol/aztec.tables.ts gerado');
