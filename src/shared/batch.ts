/**
 * Lote / dados variáveis (RF-SYM-10) — **módulo puro** (sem DOM, sem máquina).
 *
 * Uma planilha (CSV/TSV colado ou aberto) vira uma **fila de gravação**: cada
 * linha é uma peça. O conteúdo de cada peça sai de um **modelo** com campos —
 * `{1}` (coluna por posição), `{nome}` (coluna pelo cabeçalho), `{i}` (contador
 * de peça, com zero à esquerda em `{i:03}`) e `{total}`.
 *
 * Exemplo: CSV `nome,cargo` + modelo `{nome} - {i:03}` gera, na 7ª peça,
 * `Ana - 007`.
 *
 * Este módulo só produz **texto** (o conteúdo da peça). Quem transforma em
 * G-code é o gerador do símbolo (QR/código de barras), que reusa o mesmo
 * caminho de `RF-SYM-9` — nada de protocolo aqui (AGENTS.md, invariantes).
 *
 * Limites existem para o lote não virar um job gigante: o G-code de cada peça é
 * gerado **na hora de gravar aquela peça** (o lote não guarda todas as peças em
 * memória — RNF-11).
 */

/** Tamanho máximo do arquivo lido no diálogo "Abrir CSV" (4 MB). */
export const BATCH_MAX_FILE_BYTES = 4 * 1024 * 1024;

/** Peças por lote. Acima disso o CSV é truncado (e a UI avisa). */
export const BATCH_MAX_ROWS = 2000;

/** Colunas por linha. Colunas extras são ignoradas. */
export const BATCH_MAX_COLUMNS = 64;

/** Caracteres por célula (um valor gigante não deve virar um job gigante). */
export const BATCH_MAX_CELL_CHARS = 200;

/** Limite do CSV guardado nas preferências para retomar o lote (200 KB). */
export const BATCH_MAX_PREF_CHARS = 200_000;

/** Maior largura de zero à esquerda aceita em `{i:03}`. */
export const BATCH_MAX_SERIAL_WIDTH = 12;

/** Modelo padrão: a primeira coluna. */
export const BATCH_DEFAULT_TEMPLATE = '{1}';

export type BatchDelimiter = ',' | ';' | '\t' | '|';

export const BATCH_DELIMITERS: readonly BatchDelimiter[] = [
  ',',
  ';',
  '\t',
  '|',
];

/** Planilha já normalizada (sem cabeçalho nas `rows`). */
export interface BatchTable {
  delimiter: BatchDelimiter;
  hasHeader: boolean;
  /** Nome de cada coluna (vazio quando não há cabeçalho → use a posição). */
  header: string[];
  /** Linhas de dados, na ordem do arquivo. */
  rows: string[][];
  /** Número de colunas (o maior entre cabeçalho e linhas). */
  width: number;
  /** Linhas descartadas por passar de {@link BATCH_MAX_ROWS}. */
  droppedRows: number;
  /** Células truncadas em {@link BATCH_MAX_CELL_CHARS}. */
  truncatedCells: number;
}

export type BatchTemplateErrorCode =
  | 'empty'
  | 'unclosed'
  | 'bad-column'
  | 'unknown-field'
  | 'bad-counter';

export interface BatchTemplateError {
  code: BatchTemplateErrorCode;
  /** Trecho que causou o erro (`{3}`), para a mensagem da UI. */
  token: string;
}

export type BatchToken =
  | { kind: 'text'; value: string }
  | { kind: 'column'; raw: string; index: number; name?: string }
  | { kind: 'counter'; raw: string; width?: number }
  | { kind: 'total'; raw: string };

export interface BatchTemplate {
  tokens: BatchToken[];
  errors: BatchTemplateError[];
}

export interface BatchRenderContext {
  /** Número da peça (1-based). */
  index: number;
  /** Total de peças do lote (para `{total}`). */
  total: number;
  /** Cabeçalho da planilha (para campos por nome). */
  header?: string[];
}

export interface BatchPiece {
  /** Número da peça (1-based, já com o deslocamento da retomada). */
  index: number;
  /** Índice da linha na planilha (0-based). */
  rowIndex: number;
  /** Conteúdo final da peça (o que vai para o gerador de símbolo). */
  content: string;
  /** Rótulo curto para a lista da UI (`#7 · Ana`). */
  label: string;
}

/** Estado do lote persistido para **retomar** após fechar o app. */
export interface BatchPrefs {
  kind: '2d' | '1d';
  /** CSV original (colado ou aberto) — limitado a {@link BATCH_MAX_PREF_CHARS}. */
  csv: string;
  template: string;
  hasHeader: boolean;
  delimiter: BatchDelimiter;
  /** Próxima peça a gravar (1-based). */
  next: number;
  /** Total de peças quando o lote foi montado. */
  total: number;
}

// ------------------------------------------------------------- planilha

/** Normaliza quebras de linha e remove o BOM (o Excel adora os dois). */
function normalizeText(text: string): string {
  return String(text ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');
}

/**
 * Separador mais provável: conta ocorrências **fora de aspas** nas primeiras
 * linhas e fica com o que aparece em mais linhas (desempate pelo total).
 */
export function detectDelimiter(text: string): BatchDelimiter {
  const lines = normalizeText(text)
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .slice(0, 20);
  let best: BatchDelimiter = ',';
  let bestScore = 0;
  for (const delimiter of BATCH_DELIMITERS) {
    let linesWith = 0;
    let total = 0;
    for (const line of lines) {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') i++;
          else inQuotes = !inQuotes;
        } else if (ch === delimiter && !inQuotes) count++;
      }
      if (count > 0) linesWith++;
      total += count;
    }
    const score = linesWith * 1000 + total;
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }
  return best;
}

/** Divide o texto em células respeitando aspas (`"a,b"` é uma célula). */
function splitCells(
  text: string,
  delimiter: BatchDelimiter,
  maxRows: number,
): { rows: string[][]; dropped: number } {
  const rows: string[][] = [];
  let dropped = 0;
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const pushRow = () => {
    row.push(cell.trim());
    cell = '';
    const line = row;
    row = [];
    // Linha totalmente vazia não é peça (quebra de linha no fim do arquivo).
    if (!line.some((value) => value.length > 0)) return;
    if (rows.length >= maxRows) {
      dropped++;
      return;
    }
    rows.push(line);
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell.trim().length === 0) {
      // Aspa de abertura (ignora espaços antes dela) — `cell` já está limpa.
      cell = '';
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      pushRow();
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) pushRow();
  return { rows, dropped };
}

/** Nome do campo de uma coluna (cabeçalho vazio cai para a posição). */
export function batchFieldName(header: string[], index: number): string {
  const name = header[index];
  return name && name.length > 0 ? name : String(index + 1);
}

/**
 * A primeira linha é cabeçalho quando não há célula vazia nem valor
 * puramente numérico. Com uma linha só não há dados — então não é cabeçalho.
 */
export function detectHasHeader(rows: string[][]): boolean {
  if (rows.length < 2) return false;
  const first = rows[0];
  if (first.length === 0) return false;
  if (first.some((cell) => cell.length === 0)) return false;
  return first.every((cell) => !/^-?\d+([.,]\d+)?$/.test(cell));
}

/**
 * Lê o texto (CSV/TSV) e devolve a planilha normalizada.
 *
 * - separador e cabeçalho são detectados, mas podem ser forçados pela UI;
 * - células são aparadas nas pontas e truncadas em {@link BATCH_MAX_CELL_CHARS};
 * - linhas vazias são descartadas; colunas extras, ignoradas;
 * - acima de {@link BATCH_MAX_ROWS} as linhas sobram ficam em `droppedRows`.
 */
export function parseBatchTable(
  text: string,
  options: { delimiter?: BatchDelimiter; hasHeader?: boolean } = {},
): BatchTable {
  const normalized = normalizeText(text);
  const delimiter = options.delimiter ?? detectDelimiter(normalized);
  // Uma linha a mais que o limite: ela pode ser o cabeçalho.
  const split = splitCells(normalized, delimiter, BATCH_MAX_ROWS + 1);
  const rawRows = split.rows;

  const hasHeader =
    options.hasHeader ?? (rawRows.length > 0 && detectHasHeader(rawRows));

  const headerRow = hasHeader ? (rawRows[0] ?? []) : [];
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;

  let truncatedCells = 0;
  const rows: string[][] = [];
  let droppedRows = split.dropped;
  let width = Math.min(headerRow.length, BATCH_MAX_COLUMNS);

  for (const raw of dataRows) {
    if (rows.length >= BATCH_MAX_ROWS) {
      droppedRows++;
      continue;
    }
    const cells: string[] = [];
    for (let i = 0; i < Math.min(raw.length, BATCH_MAX_COLUMNS); i++) {
      const value = raw[i] ?? '';
      if (value.length > BATCH_MAX_CELL_CHARS) {
        truncatedCells++;
        cells.push(value.slice(0, BATCH_MAX_CELL_CHARS));
      } else {
        cells.push(value);
      }
    }
    width = Math.max(width, cells.length);
    rows.push(cells);
  }

  const header: string[] = [];
  for (let i = 0; i < width; i++) {
    const name = headerRow[i] ?? '';
    if (name.length > BATCH_MAX_CELL_CHARS) {
      truncatedCells++;
      header.push(name.slice(0, BATCH_MAX_CELL_CHARS));
    } else {
      header.push(name);
    }
  }

  return {
    delimiter,
    hasHeader,
    header,
    rows,
    width,
    droppedRows,
    truncatedCells,
  };
}

/** `{1}`…`{n}` de todas as colunas, para a UI listar os campos disponíveis. */
export function batchFields(table: BatchTable): string[] {
  return Array.from({ length: table.width }, (_, i) =>
    table.hasHeader && table.header[i] ? table.header[i] : String(i + 1),
  );
}

/** Número com zero à esquerda (`7`, 3 → `"007"`). */
export function batchSerial(index: number, width?: number): string {
  const value = String(Math.max(0, Math.trunc(index)));
  if (!width || width <= value.length) return value;
  return value.padStart(Math.min(width, BATCH_MAX_SERIAL_WIDTH), '0');
}

// -------------------------------------------------------------- modelo

/**
 * Divide o modelo em tokens. `{{` e `}}` escapam chaves literais; um `{` sem
 * fechamento vira erro `unclosed` (a UI mostra a mensagem, nada quebra).
 */
export function parseBatchTemplate(template: string): BatchTemplate {
  const tokens: BatchToken[] = [];
  const errors: BatchTemplateError[] = [];
  const text = String(template ?? '');
  let buffer = '';

  const flushText = () => {
    if (buffer.length > 0) {
      tokens.push({ kind: 'text', value: buffer });
      buffer = '';
    }
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (text[i + 1] === '{') {
        buffer += '{';
        i++;
        continue;
      }
      const end = text.indexOf('}', i + 1);
      if (end < 0) {
        errors.push({ code: 'unclosed', token: text.slice(i) });
        flushText();
        return { tokens, errors };
      }
      const raw = text.slice(i + 1, end).trim();
      i = end;
      flushText();
      tokens.push(parseFieldToken(raw, errors));
      continue;
    }
    if (ch === '}' && text[i + 1] === '}') {
      buffer += '}';
      i++;
      continue;
    }
    buffer += ch;
  }
  flushText();
  return { tokens, errors };
}

/** Um `{...}` do modelo: contador, total, coluna por posição ou por nome. */
function parseFieldToken(
  raw: string,
  errors: BatchTemplateError[],
): BatchToken {
  const [head, ...rest] = raw.split(':');
  const name = head.trim();
  const tail = rest.join(':').trim();

  if (name.toLowerCase() === 'i' || name.toLowerCase() === 'contador') {
    if (tail.length === 0) return { kind: 'counter', raw };
    const width = Number(tail);
    if (
      !Number.isInteger(width) ||
      width < 1 ||
      width > BATCH_MAX_SERIAL_WIDTH
    ) {
      errors.push({ code: 'bad-counter', token: `{${raw}}` });
      return { kind: 'counter', raw };
    }
    return { kind: 'counter', raw, width };
  }

  if (name.toLowerCase() === 'total') return { kind: 'total', raw };

  if (/^\d+$/.test(name)) {
    const index = Number(name);
    if (index < 1) {
      errors.push({ code: 'bad-column', token: `{${raw}}` });
      return { kind: 'column', raw, index: 0 };
    }
    return { kind: 'column', raw, index: index - 1 };
  }

  if (name.length === 0) {
    errors.push({ code: 'bad-column', token: `{${raw}}` });
    return { kind: 'column', raw, index: 0 };
  }

  // Por nome: resolve na hora de renderizar (o modelo pode ser escrito antes
  // de o CSV ser colado). A validação contra o cabeçalho é em `validateTemplate`.
  return { kind: 'column', raw, index: -1, name: name.toLowerCase() };
}

/**
 * Confere o modelo contra a planilha: coluna fora da faixa, nome inexistente,
 * contador malformado e modelo vazio. `ok` é `false` se houver qualquer erro.
 */
export function validateBatchTemplate(
  template: string,
  table: BatchTable,
): BatchTemplate & { ok: boolean; fields: string[] } {
  const parsed = parseBatchTemplate(template);
  const errors = [...parsed.errors];
  const normalized = String(template ?? '').trim();

  if (normalized.length === 0) {
    errors.push({ code: 'empty', token: '' });
  }

  const names = new Set(
    table.hasHeader
      ? table.header.map((name) => name.trim().toLowerCase())
      : [],
  );

  for (const token of parsed.tokens) {
    if (token.kind !== 'column') continue;
    if (token.name !== undefined) {
      if (!names.has(token.name)) {
        errors.push({ code: 'unknown-field', token: `{${token.raw}}` });
      }
      continue;
    }
    if (token.index < 0 || token.index >= table.width) {
      errors.push({ code: 'bad-column', token: `{${token.raw}}` });
    }
  }

  return {
    tokens: parsed.tokens,
    errors,
    ok: errors.length === 0,
    fields: batchFields(table),
  };
}

/** Posição da coluna pelo nome do cabeçalho (trim + minúsculas), ou `-1`. */
export function batchColumnByName(header: string[], name: string): number {
  const wanted = name.trim().toLowerCase();
  for (let i = 0; i < header.length; i++) {
    if (header[i].trim().toLowerCase() === wanted) return i;
  }
  return -1;
}

/**
 * Conteúdo da peça: aplica o modelo na linha. Campo desconhecido vira vazio
 * (a validação prévia já avisou o usuário).
 */
export function renderBatchContent(
  template: string,
  row: string[],
  context: BatchRenderContext,
): string {
  const { tokens } = parseBatchTemplate(template);
  let out = '';
  for (const token of tokens) {
    if (token.kind === 'text') {
      out += token.value;
      continue;
    }
    if (token.kind === 'counter') {
      out += batchSerial(context.index, token.width);
      continue;
    }
    if (token.kind === 'total') {
      out += String(context.total);
      continue;
    }
    if (token.name !== undefined) {
      const position = batchColumnByName(context.header ?? [], token.name);
      out += position >= 0 ? (row[position] ?? '') : '';
      continue;
    }
    out += row[token.index] ?? '';
  }
  return out;
}

/** Rótulo curto da peça para a lista/contador (`#7 · Ana`). */
export function batchPieceLabel(
  row: string[],
  index: number,
  options: { maxChars?: number } = {},
): string {
  const maxChars = options.maxChars ?? 24;
  const first = row.find((cell) => cell.length > 0) ?? '';
  const label =
    first.length > maxChars ? `${first.slice(0, maxChars - 1)}…` : first;
  return label.length > 0 ? `#${index} · ${label}` : `#${index}`;
}

/**
 * As peças do lote (usado pela prévia da UI e pelos testes). `start` é o
 * número da primeira peça (1-based) — na retomada, o lote continua do `next`.
 */
export function batchPieces(
  table: BatchTable,
  template: string,
  options: { start?: number; count?: number } = {},
): BatchPiece[] {
  const total = table.rows.length;
  const start = Math.max(1, Math.trunc(options.start ?? 1));
  const from = Math.min(start, total + 1) - 1;
  const limit = options.count ?? total;
  const pieces: BatchPiece[] = [];
  for (let i = from; i < total && pieces.length < limit; i++) {
    const index = i + 1;
    pieces.push({
      index,
      rowIndex: i,
      content: renderBatchContent(template, table.rows[i], {
        index,
        total,
        header: table.header,
      }),
      label: batchPieceLabel(table.rows[i], index),
    });
  }
  return pieces;
}

/** Total de peças do lote. */
export function batchTotal(table: BatchTable): number {
  return table.rows.length;
}

/** Nome sugerido do arquivo virtual de uma peça (`lote-007-de-50.gcode`). */
export function batchPieceFileName(
  kind: '2d' | '1d',
  index: number,
  total: number,
): string {
  const digits = String(total).length;
  const serial = batchSerial(index, digits);
  return kind === '2d'
    ? `lote-${serial}-de-${total}.gcode`
    : `lote-barcode-${serial}-de-${total}.gcode`;
}

/**
 * Filtra o que veio do disco para retomar o lote (RF-SYM-10). Devolve
 * `undefined` quando não há lote guardado (`null` limpa o lote) ou quando os
 * dados não fazem sentido.
 */
export function sanitizeBatchPrefs(input: unknown): BatchPrefs | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const kind = raw.kind === '1d' ? '1d' : raw.kind === '2d' ? '2d' : null;
  if (!kind) return undefined;
  if (typeof raw.csv !== 'string' || raw.csv.trim().length === 0)
    return undefined;
  if (raw.csv.length > BATCH_MAX_PREF_CHARS) return undefined;
  const delimiter =
    typeof raw.delimiter === 'string' &&
    (BATCH_DELIMITERS as readonly string[]).includes(raw.delimiter)
      ? (raw.delimiter as BatchDelimiter)
      : undefined;
  if (!delimiter) return undefined;
  const total = Number(raw.total);
  if (!Number.isInteger(total) || total < 1 || total > BATCH_MAX_ROWS)
    return undefined;
  const next = Number(raw.next);
  return {
    kind,
    csv: raw.csv,
    template:
      typeof raw.template === 'string' && raw.template.length <= 500
        ? raw.template
        : BATCH_DEFAULT_TEMPLATE,
    hasHeader: Boolean(raw.hasHeader),
    delimiter,
    next: Number.isInteger(next) && next >= 1 && next <= total ? next : 1,
    total,
  };
}
