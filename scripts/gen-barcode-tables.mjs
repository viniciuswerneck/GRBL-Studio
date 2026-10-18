#!/usr/bin/env node
/**
 * Gera `src/shared/symbol/barcode/tables.ts` a partir de `jsbarcode` (MIT,
 * **devDependency**): as tabelas são *dados da norma* (ISO/IEC 15417, 15420,
 * 16388) que não vale a pena transcrever à mão — e transcrever seria a maior
 * fonte de erro do encoder.
 *
 * A verificação **não** depende deste script: `tests/symbol-barcode.test.ts`
 * reencoda os símbolos e compara o resultado com o `jsbarcode` (cross-check) e
 * com os exemplos das normas. A proveniência fica no cabeçalho do arquivo
 * gerado; se o `jsbarcode` mudar de layout, este script falha alto (asserts).
 *
 * Uso: `node scripts/gen-barcode-tables.mjs`
 */

import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/shared/symbol/barcode/tables.ts');

const JsBarcode = require('jsbarcode');
const code128Const = require('jsbarcode/bin/barcodes/CODE128/constants.js');
const eanConst = require('jsbarcode/bin/barcodes/EAN_UPC/constants.js');

const fail = (msg) => {
  console.error(`gen-barcode-tables: ${msg}`);
  process.exit(1);
};

// ---------------------------------------------------------------- Code 128
// `BARS[valor]` é o padrão de módulos (11 módulos; o stop tem 13).
const BARS = code128Const.BARS;
if (!Array.isArray(BARS) || BARS.length !== 107) {
  fail(`BARS inesperado (${BARS?.length})`);
}
const code128 = BARS.map((n, i) => {
  const s = String(n);
  if (s.length !== (i === 106 ? 13 : 11) || s[0] !== '1') {
    fail(`padrão ${i} inesperado: ${s}`);
  }
  return s;
});

// ----------------------------------------------------------------- Code 39
// O `jsbarcode` expande cada caractere em módulos com a razão 3:1; aqui
// voltamos às **larguras** (`w`/`n`), que são independentes da razão.
const CODE39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
const code39Encoder = JsBarcode.getModule('CODE39');
const runsOf = (modules) => {
  const out = [];
  let run = 1;
  for (let i = 1; i < modules.length; i++) {
    if (modules[i] === modules[i - 1]) run += 1;
    else {
      out.push(modules[i - 1] + String(run));
      run = 1;
    }
  }
  out.push(modules[modules.length - 1] + String(run));
  return out;
};
const code39Pattern = (ch) => {
  const data = new code39Encoder(ch, {}).encode().data;
  // `enc('*') + enc(ch) + gap` → o padrão do caractere começa depois do `*`.
  const first = runsOf(data).slice(0, 9).join('');
  const rest = [...runsOf(data).slice(9)].join('');
  if (first.length !== 18) fail(`* inesperado: ${first}`);
  const [, ...own] = runsOf(data).slice(9);
  const elementRuns = own.slice(0, 9);
  if (elementRuns.length !== 9) fail(`${ch}: ${rest}`);
  const widths = elementRuns.map((r) => {
    const value = Number(r.slice(1));
    if (value === 1) return 'n';
    if (value === 3) return 'w';
    return fail(`${ch}: largura ${value} (esperado 1 ou 3)`);
  });
  const pattern = widths.join('');
  if (pattern.replace(/[nw]/g, '').length !== 0 || pattern.length !== 9) {
    fail(`${ch}: padrão ${pattern}`);
  }
  if ((pattern.match(/w/g) ?? []).length !== 3) {
    fail(`${ch}: ${pattern} não tem 3 elementos largos`);
  }
  return pattern;
};
const code39 = { '*': code39Pattern('*') };
for (const ch of CODE39_CHARS) code39[ch] = code39Pattern(ch);

// -------------------------------------------------------------- EAN / UPC
const BINARIES = eanConst.BINARIES;
const PARITY = eanConst.EAN13_STRUCTURE;
if (!BINARIES || !Array.isArray(BINARIES.L) || BINARIES.L.length !== 10) {
  fail('BINARIES.L inesperado');
}
for (const set of ['L', 'G', 'R']) {
  for (const [i, bits] of BINARIES[set].entries()) {
    if (!/^[01]{7}$/.test(bits)) fail(`${set}${i}: ${bits}`);
  }
}
if (!Array.isArray(PARITY) || PARITY.length !== 10) fail('paridade inesperada');

const quote = (s) => `'${s}'`;
/** Chave de objeto: sem aspas quando é um identificador válido (formato Biome). */
const key = (s) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s) ? s : quote(s));
const orFail = () => fail('formato inesperado');

const lines = [];
lines.push('/**');
lines.push(
  ' * Tabelas dos códigos de barras 1D — **arquivo gerado**, não editar à mão.',
);
lines.push(' *');
lines.push(
  ' * Gerado por `scripts/gen-barcode-tables.mjs` a partir do `jsbarcode`',
);
lines.push(
  ' * (MIT, **apenas devDependency**): os padrões são os dados das normas',
);
lines.push(
  ' * ISO/IEC 15417 (Code 128), 15420 (EAN/UPC) e 16388 (Code 39). O encoder é',
);
lines.push(' * próprio — este arquivo é só dado, como `qr.tables.ts`.');
lines.push(' *');
lines.push(
  ' * Invariantes conferidas na geração: 107 padrões Code 128 (11 módulos,',
);
lines.push(
  ' * 13 no stop), Code 39 com 9 elementos e exatamente 3 largos por caractere,',
);
lines.push(
  ' * EAN/UPC com L/G/R de 7 módulos e a tabela de paridade do EAN-13.',
);
lines.push(' */');
lines.push('');
lines.push('/**');
lines.push(
  ' * Code 128 (ISO/IEC 15417): padrões de 11 módulos por valor. Os índices',
);
lines.push(
  ' * 0–102 são valores de dados (0–95 por conjunto, 96–102 códigos especiais e',
);
lines.push(
  ' * de troca de conjunto), 103/104/105 são os starts (A/B/C) e 106 o stop.',
);
lines.push(' */');
lines.push('export const CODE128_PATTERNS: readonly string[] = [');
for (const [i, p] of code128.entries()) {
  lines.push(
    `  ${quote(p)},${i === 106 ? ' // stop (13 módulos)' : i === 103 ? ' // start A' : i === 104 ? ' // start B' : i === 105 ? ' // start C' : ''}`,
  );
}
lines.push('];');
lines.push('');
lines.push('/** Índices dos códigos de controle/fim do Code 128. */');
lines.push('export const CODE128_START = { A: 103, B: 104, C: 105 } as const;');
lines.push('export const CODE128_STOP = 106;');
lines.push('/** Módulo do dígito verificador do Code 128 (mod 103). */');
lines.push('export const CODE128_MODULO = 103;');
lines.push('');
lines.push('/**');
lines.push(
  ' * Code 39 (ISO/IEC 16388): 9 elementos por caractere (`w` largo, `n`',
);
lines.push(
  ' * estreito), incluindo `*` (start/stop). O gap entre caracteres é sempre um',
);
lines.push(' * `n` e não faz parte do padrão.');
lines.push(' */');
lines.push(
  'export const CODE39_PATTERNS: Readonly<Record<string, string>> = {',
);
for (const [ch, p] of Object.entries(code39)) {
  lines.push(`  ${key(ch)}: ${quote(p)},`);
}
lines.push('};');
lines.push('');
lines.push(
  '/** EAN/UPC (ISO/IEC 15420): 10 dígitos nos conjuntos L, G e R (7 módulos). */',
);
for (const set of ['L', 'G', 'R']) {
  lines.push(`export const EAN_${set}: readonly string[] = [`);
  for (const bits of BINARIES[set]) lines.push(`  ${quote(bits)},`);
  lines.push('];');
  lines.push('');
}
lines.push(
  '/** EAN-13: paridade dos 6 dígitos da esquerda, pelo primeiro dígito. */',
);
lines.push('export const EAN13_PARITY: readonly string[] = [');
for (const p of PARITY) lines.push(`  ${quote(p)},`);
lines.push('];');
lines.push('');
lines.push('/** Guardas: lado (início/fim) e centro dos símbolos EAN/UPC. */');
lines.push(`export const EAN_SIDE_BIN = ${quote(eanConst.SIDE_BIN)};`);
lines.push(`export const EAN_MIDDLE_BIN = ${quote(eanConst.MIDDLE_BIN)};`);
lines.push('');

if (!lines.every((l) => typeof l === 'string')) orFail();

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${lines.join('\n')}`, 'utf8');
console.log(
  `barcode/tables.ts gerado: ${code128.length} padrões Code 128, ` +
    `${Object.keys(code39).length} Code 39, EAN L/G/R + paridade`,
);
