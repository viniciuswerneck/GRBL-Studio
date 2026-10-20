/**
 * Editor de G-code (P1.10) — realce (syntax highlight), resumo e edições
 * reversíveis.
 *
 * Funções **puras**, sem I/O e sem DOM: o renderer é JS puro e consome este
 * módulo pelo bundle `public/gcodeEditor.js` (`GRBL_GCODE_EDITOR`).
 *
 * O realce é um **tokenizador de linha** (cada palavra do dialeto é
 * classificada para a UI colorir). Nada aqui interpreta o programa: quem
 * entende o movimento é `preview.ts` e quem valida é `preflight.ts`.
 *
 * Especificação: `docs/PLANO_PREMIUM.md` §4 (P1.10) e `docs/ROADMAP.md`.
 */

import { buildPreamble } from './resume';

/** Classe de um trecho da linha — a UI decide a cor de cada uma. */
export type GcodeTokenKind =
  | 'comment'
  | 'code'
  | 'axis'
  | 'feed'
  | 'power'
  | 'tool'
  | 'line'
  | 'number'
  | 'plain';

export interface GcodeToken {
  kind: GcodeTokenKind;
  text: string;
}

/** Letras de coordenada — inclui os centros de arco `I`/`J`/`K`. */
const AXIS_LETTERS = 'XYZIJK';

/** Palavra `letra` + número, aceita **colada** (`G1X10.5F300`). Sticky: o
 *  `lastIndex` é posicionado a cada uso, então não há varredura desnecessária. */
const WORD_RE = /([A-Za-z])(-?(?:\d+\.?\d*|\.\d+))/y;

/** Número solto (sem letra) — raro, mas existe (`%`, linhas de dados). */
const NUMBER_RE = /(-?(?:\d+\.?\d*|\.\d+))/y;

/** Classe de uma palavra `letra` + valor. */
function wordKind(letter: string): GcodeTokenKind {
  const upper = letter.toUpperCase();
  if (upper === 'G' || upper === 'M') return 'code';
  if (AXIS_LETTERS.includes(upper)) return 'axis';
  if (upper === 'F') return 'feed';
  if (upper === 'S') return 'power';
  if (upper === 'T') return 'tool';
  if (upper === 'N') return 'line';
  return 'number';
}

/**
 * Quebra a linha em trechos classificados. Comentários são `(...)` (com
 * aninhamento, como o GRBL aceita) e `; …` até o fim da linha.
 *
 * Um `(` sem fechamento comenta **o resto da linha** — é o que o parser do
 * GRBL faz, então o realce mostra o mesmo que a máquina veria.
 */
export function tokenizeGcodeLine(line: string): GcodeToken[] {
  const out: GcodeToken[] = [];
  let pending = '';
  let depth = 0;

  const flush = (kind: GcodeTokenKind): void => {
    if (pending) {
      out.push({ kind, text: pending });
      pending = '';
    }
  };

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (depth > 0) {
      pending += ch;
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) flush('comment');
      }
      continue;
    }

    if (ch === ';') {
      flush('plain');
      // `; …` comenta o resto da linha.
      out.push({ kind: 'comment', text: line.slice(i) });
      return out;
    }

    if (ch === '(') {
      flush('plain');
      depth = 1;
      pending = ch;
      continue;
    }

    WORD_RE.lastIndex = i;
    const word = WORD_RE.exec(line);
    if (word && word.index === i) {
      flush('plain');
      out.push({ kind: wordKind(word[1]), text: word[0] });
      i += word[0].length - 1;
      continue;
    }

    NUMBER_RE.lastIndex = i;
    const number = NUMBER_RE.exec(line);
    if (number && number.index === i) {
      flush('plain');
      out.push({ kind: 'number', text: number[0] });
      i += number[0].length - 1;
      continue;
    }

    pending += ch;
  }

  // Parêntese aberto sem fechamento: o resto é comentário (como o GRBL lê).
  flush(depth > 0 ? 'comment' : 'plain');
  return out;
}

// ------------------------------------------------------------------- resumo

export interface GcodeSummary {
  /** Total de linhas. */
  lines: number;
  /** Linhas sem nenhum comando (vazias ou só de comentário). */
  comments: number;
  /** Linhas com pelo menos um comando. */
  commands: number;
  /** Movimentos de gravação/corte (`G1`/`G2`/`G3`). */
  moves: number;
  /** Deslocamentos rápidos (`G0`). */
  rapids: number;
  /** Maior potência pedida (`S`), quando houver. */
  maxS: number | null;
}

/**
 * Remove os comentários (mesmo critério do GRBL: `;` até o fim e `(...)`,
 * inclusive aninhados). Varredura sem alocação de tokens — o resumo roda em
 * arquivos de 100 mil linhas e precisa ser barato.
 */
function stripComments(line: string): string {
  let out = '';
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (depth > 0) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      continue;
    }
    if (ch === ';') break;
    if (ch === '(') {
      depth = 1;
      continue;
    }
    out += ch;
  }
  return out;
}

/** Palavra `letra` + valor em texto **sem comentários** (varredura global). */
const SUMMARY_WORD_RE = /([A-Za-z])\s*(-?(?:\d+\.?\d*|\.\d+))/g;

/** Resumo do programa para a barra de status do editor. */
export function summarizeGcode(lines: readonly string[]): GcodeSummary {
  const summary: GcodeSummary = {
    lines: lines.length,
    comments: 0,
    commands: 0,
    moves: 0,
    rapids: 0,
    maxS: null,
  };

  for (const line of lines) {
    const clean = stripComments(line);
    let hasCommand = false;
    SUMMARY_WORD_RE.lastIndex = 0;
    let match: RegExpExecArray | null = SUMMARY_WORD_RE.exec(clean);
    while (match) {
      hasCommand = true;
      const letter = match[1].toUpperCase();
      const value = Number(match[2]);
      if (Number.isFinite(value)) {
        if (letter === 'S') {
          if (summary.maxS === null || value > summary.maxS)
            summary.maxS = value;
        } else if (letter === 'G') {
          if (value === 0) summary.rapids++;
          else if (value === 1 || value === 2 || value === 3) summary.moves++;
        }
      }
      match = SUMMARY_WORD_RE.exec(clean);
    }
    if (hasCommand) summary.commands++;
    else summary.comments++;
  }

  return summary;
}

// ---------------------------------------------------------------- edições

/** Uma edição **reversível** — o editor guarda a pilha para o "Desfazer". */
export type GcodeEdit =
  | { kind: 'set'; index: number; before: string; after: string }
  | { kind: 'insert'; index: number; after: string }
  | { kind: 'remove'; index: number; before: string };

const clampIndex = (lines: readonly string[], index: number): number => {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(Math.trunc(index), lines.length));
};

/** Aplica a edição devolvendo uma **nova** lista (não muta a de entrada). */
export function applyEdit(lines: readonly string[], edit: GcodeEdit): string[] {
  const out = [...lines];
  if (edit.kind === 'set') {
    const index = clampIndex(out, edit.index);
    if (index >= out.length) return out;
    out[index] = edit.after;
    return out;
  }
  if (edit.kind === 'insert') {
    out.splice(clampIndex(out, edit.index), 0, edit.after);
    return out;
  }
  const index = clampIndex(out, edit.index);
  if (index >= out.length) return out;
  out.splice(index, 1);
  return out;
}

/** Desfaz a edição — inverso exato de `applyEdit`. */
export function revertEdit(
  lines: readonly string[],
  edit: GcodeEdit,
): string[] {
  if (edit.kind === 'set') {
    const out = [...lines];
    const index = clampIndex(out, edit.index);
    if (index >= out.length) return out;
    out[index] = edit.before;
    return out;
  }
  if (edit.kind === 'insert') {
    const out = [...lines];
    const index = clampIndex(out, edit.index);
    if (index >= out.length) return out;
    out.splice(index, 1);
    return out;
  }
  const out = [...lines];
  out.splice(clampIndex(out, edit.index), 0, edit.before);
  return out;
}

// ----------------------------------------------------------------- trecho

export interface GcodeRange {
  /** Primeira linha do trecho (0-based, inclusive). */
  start: number;
  /** Última linha do trecho (0-based, inclusive). */
  end: number;
}

/** Normaliza um intervalo: dentro dos limites e com `start ≤ end`. */
export function normalizeRange(
  lines: readonly string[],
  from: number,
  to: number,
): GcodeRange {
  const last = Math.max(0, lines.length - 1);
  const a = Math.max(0, Math.min(Math.trunc(from) || 0, last));
  const b = Math.max(0, Math.min(Math.trunc(to) || 0, last));
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

/**
 * Programa de um **trecho**: o preâmbulo que reafirma o estado modal até ali
 * (`resume.buildPreamble`) + as linhas do intervalo. É o que permite reenviar
 * um pedaço do arquivo com segurança — sem o preâmbulo, o laser sairia com as
 * unidades/offsets/modais que estivessem valendo na máquina.
 */
export function buildSnippet(
  lines: readonly string[],
  from: number,
  to: number,
): string[] {
  const range = normalizeRange(lines, from, to);
  const before = lines.slice(0, range.start);
  const snippet = lines.slice(range.start, range.end + 1);
  if (range.start === 0) return snippet;
  return [...buildPreamble([...before]), ...snippet];
}
