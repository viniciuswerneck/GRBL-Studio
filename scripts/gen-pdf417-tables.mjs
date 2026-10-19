/**
 * Gera `src/shared/symbol/pdf417.tables.ts` a partir da implementação de
 * referência (`@zxing/library`, Apache-2.0, devDependency usada só para
 * testes/cross-check).
 *
 * Por que gerar em vez de digitar: o PDF417 tem **929 codewords × 3 clusters**
 * de padrões de 17 módulos. Digitar isso de memória é a receita para um código
 * "com cara de válido" que não lê. Aqui os padrões vêm da referência e ainda são
 * conferidos no teste (decodificação real + estrutura).
 *
 * A referência traz `SYMBOL_TABLE` (padrões ordenados) e `CODEWORD_TABLE`
 * (codeword de cada padrão). O **cluster** de um padrão sai da fórmula da norma
 * (`(e0 − e2 + e4 − e6) mod 9`, com `e` = largura dos 8 elementos), que resulta
 * em `{0, 3, 6}` — exatamente os três clusters do PDF417.
 *
 * Uso: `node scripts/gen-pdf417-tables.mjs`
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(
  resolve(root, 'node_modules/@zxing/library/esm/core/pdf417/PDF417Common.js'),
  'utf8',
);

/** Extrai um literal `Int32Array.from([ ... ])` que segue `nome = `. */
function extractInt32Array(source, name) {
  const at = source.indexOf(`${name} = Int32Array.from(`);
  if (at < 0) throw new Error(`não achei ${name} na referência`);
  const start = source.indexOf('[', at);
  const end = source.indexOf('])', start);
  if (start < 0 || end < 0) throw new Error(`literal de ${name} não fechou`);
  return source
    .slice(start + 1, end)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
}

const symbolTable = extractInt32Array(src, 'PDF417Common.SYMBOL_TABLE');
const codewordTable = extractInt32Array(src, 'PDF417Common.CODEWORD_TABLE');

if (symbolTable.length !== 929 * 3 || codewordTable.length !== 929 * 3) {
  throw new Error(
    `tabelas com ${symbolTable.length}/${codewordTable.length} entradas (esperado 2787)`,
  );
}

/** Largura dos 8 elementos (barras/espaços) de um padrão de 17 bits. */
function elementWidths(pattern) {
  const widths = [];
  let current = (pattern >> 16) & 1;
  let run = 0;
  for (let i = 16; i >= 0; i--) {
    const bit = (pattern >> i) & 1;
    if (bit === current) run++;
    else {
      widths.push(run);
      current = bit;
      run = 1;
    }
  }
  widths.push(run);
  return widths;
}

/** Cluster (0/3/6) de um padrão, pela fórmula da norma. */
function clusterOf(pattern) {
  const w = elementWidths(pattern);
  return (((w[0] - w[2] + w[4] - w[6]) % 9) + 9) % 9;
}

const CLUSTER_INDEX = { 0: 0, 3: 1, 6: 2 };
const table = Array.from({ length: 929 }, () => [0, 0, 0]);
for (let i = 0; i < symbolTable.length; i++) {
  const pattern = symbolTable[i] & 0x3ffff;
  const codeword = (codewordTable[i] - 1) % 929;
  table[codeword][CLUSTER_INDEX[clusterOf(pattern)]] = pattern;
}

// Todos os 2787 padrões têm de estar presentes, um por (codeword, cluster).
const seen = new Set();
for (const row of table) {
  if (row.some((v) => !v)) throw new Error('codeword sem os 3 clusters');
  for (const v of row) {
    if (seen.has(v)) throw new Error(`padrão duplicado ${v}`);
    seen.add(v);
  }
}
if (seen.size !== 929 * 3) throw new Error('tabela incompleta');

const header = `/**
 * Tabela de padrões do PDF417 (ISO/IEC 15438) — **gerada**, não edite à mão.
 *
 * Gerada por \`scripts/gen-pdf417-tables.mjs\` a partir da implementação de
 * referência (\`@zxing/library\`, Apache-2.0, devDependency) e conferida em
 * \`tests/symbol-pdf417.test.ts\` (decodificação real + estrutura das linhas).
 *
 * \`PDF417_CODEWORDS[codeword][cluster]\` = padrão de 17 módulos (1 = barra) do
 * codeword \`0…928\` no cluster 0, 1 ou 2 (que correspondem aos clusters 0, 3 e
 * 6 da norma; a linha \`r\` do símbolo usa \`cluster = r % 3\`).
 */
export const PDF417_CODEWORDS: ReadonlyArray<
  readonly [number, number, number]
> = [
`;

const body = table.map((row) => `  [${row.join(', ')}],`).join('\n');
const out = `${header}${body}\n];\n`;

writeFileSync(resolve(root, 'src/shared/symbol/pdf417.tables.ts'), out);
console.log(
  `PDF417_CODEWORDS: ${table.length} codewords × 3 clusters escritos.`,
);
