/**
 * Gera `src/shared/symbol/qr.tables.ts` a partir da biblioteca de referência
 * (`qrcode-generator`, MIT) — devDependency usada só para testes/cross-check.
 *
 * Por que gerar em vez de digitar: são 160 linhas de blocos EC (40 versões ×
 * 4 níveis) + 40 linhas de posições de alinhamento. Digitar de memória é a
 * receita para um código "com cara de válido" que não lê. Aqui a tabela vem da
 * implementação de referência e ainda é conferida no teste (matriz × matriz).
 *
 * Uso: `node scripts/gen-qr-tables.mjs`
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(
  resolve(root, 'node_modules/qrcode-generator/dist/qrcode.js'),
  'utf8',
);

/** Extrai o literal `[ ... ]` que segue `nome = `. */
function extractArrayLiteral(source, name) {
  const at = source.indexOf(`var ${name} = `);
  if (at < 0) throw new Error(`não achei ${name} na referência`);
  const start = source.indexOf('[', at);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        // eslint-disable-next-line no-new-func
        return new Function(`return ${source.slice(start, i + 1)}`)();
      }
    }
  }
  throw new Error(`literal de ${name} não fechou`);
}

const rsBlocks = extractArrayLiteral(src, 'RS_BLOCK_TABLE');
const align = extractArrayLiteral(src, 'PATTERN_POSITION_TABLE');

if (rsBlocks.length !== 160) {
  throw new Error(
    `RS_BLOCK_TABLE tem ${rsBlocks.length} linhas (esperado 160)`,
  );
}
if (align.length !== 40) {
  throw new Error(
    `PATTERN_POSITION_TABLE tem ${align.length} linhas (esperado 40)`,
  );
}

/**
 * Cada linha é uma sequência de triplos `quantidade, total, dados`. O formato
 * emitido já é o que o Biome (lineWidth 80) mantém — assim regenerar a tabela
 * não cria diff de formatação.
 */
const fmtTriples = (flat) => {
  if (flat.length % 3 !== 0)
    throw new Error(`linha de blocos inválida: ${flat}`);
  const groups = [];
  for (let i = 0; i < flat.length; i += 3) {
    groups.push(`[${flat[i]}, ${flat[i + 1]}, ${flat[i + 2]}]`);
  }
  if (groups.length === 1) return `[${groups[0]}]`;
  // Vários grupos: uma linha por grupo (é o que o Biome mantém).
  return `[\n${groups.map((g) => `    ${g},`).join('\n')}\n  ]`;
};

const rsLines = [];
rsBlocks.forEach((flat, i) => {
  const version = Math.floor(i / 4) + 1;
  const ecc = 'LMQH'[i % 4];
  rsLines.push(`  ${fmtTriples(flat)}, // v${version} ${ecc}`);
});

const alignLines = align.map((row, i) => `  [${row.join(', ')}], // v${i + 1}`);

const out = `/**
 * Tabelas do QR Code (ISO/IEC 18004) — **geradas**, não edite à mão.
 *
 * Geradas por \`scripts/gen-qr-tables.mjs\` a partir da implementação de
 * referência (\`qrcode-generator\`, MIT, devDependency) e conferidas em
 * \`tests/qr.test.ts\` (matriz contra matriz + decodificação real).
 */

/**
 * Estrutura de blocos de correção de erro: índice \`(versão − 1) * 4 + ecc\`
 * (\`L=0, M=1, Q=2, H=3\`). Cada entrada é uma ou duas **grupos** de bloco
 * \`[quantidade, total de codewords, codewords de dados]\`.
 */
export const RS_BLOCKS: ReadonlyArray<
  ReadonlyArray<readonly [number, number, number]>
> = [
${rsLines.join('\n')}
];

/** Posições dos *alignment patterns* por versão (vazio na v1). */
export const ALIGNMENT_POSITIONS: ReadonlyArray<readonly number[]> = [
${alignLines.join('\n')}
];
`;

mkdirSync(resolve(root, 'src/shared/symbol'), { recursive: true });
writeFileSync(resolve(root, 'src/shared/symbol/qr.tables.ts'), out);
console.log(
  `qr.tables.ts gerado: ${rsBlocks.length} linhas de blocos EC, ${align.length} de alinhamento`,
);
