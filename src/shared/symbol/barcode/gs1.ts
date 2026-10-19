/**
 * Validação dos **Application Identifiers (AI)** do **GS1-128** — módulo puro,
 * sem DOM.
 *
 * O encoder (`encodeCode128` com `gs1: true`) só codifica bytes: o `^` marca os
 * **FNC1** que separam os campos. Aqui validamos a **estrutura** do conteúdo —
 * a sequência de AIs e o formato do valor de cada um.
 *
 * O conjunto de AIs coberto é **mínimo e documentado** (ver {@link GS1_AIS}).
 * Um AI **desconhecido não bloqueia**: a leitura para e o restante é ignorado
 * (`ok: true`), porque o dicionário completo do GS1 fica com quem chama.
 *
 * O `position` de cada erro é o índice (0-based) do **AI** dentro de `content`.
 */

/**
 * Erros possíveis de {@link validateGs1} no campo `code`.
 * - `bad-length`: valor com tamanho fora do permitido pelo AI;
 * - `bad-chars`: valor fora do conjunto (dígitos ou alfanumérico) do AI;
 * - `bad-date`: data AAMMDD (ou hora HHMM) impossível no calendário.
 */
export type Gs1ErrorCode = 'bad-length' | 'bad-chars' | 'bad-date';

export interface Gs1Validation {
  ok: boolean;
  errors: { code: string; position: number }[];
}

/** Formato esperado do valor de um AI. */
type Gs1FieldSpec =
  | { type: 'digits'; length: number }
  | { type: 'alnum'; min: number; max: number }
  | { type: 'date' }
  | { type: 'dateTime' };

/** Dias de cada mês (o bissexto é tratado em `daysInMonth`). */
const DAYS_PER_MONTH = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
] as const;

/**
 * Dicionário **mínimo** de AIs válidos neste módulo. Os comprimentos seguem a
 * tabela do GS1 General Specifications:
 *
 * | AI              | Valor                                              |
 * | :-------------- | :------------------------------------------------- |
 * | `00`            | SSCC-18 (18 dígitos)                               |
 * | `01` / `02`     | GTIN-14 (14 dígitos)                               |
 * | `10`            | lote (1–20 alfanumérico)                           |
 * | `11/13/15`      | data AAMMDD (6 dígitos)                            |
 * | `17`            | data AAMMDD ou AAMMDDHHMM (hora opcional)          |
 * | `20`            | 2 dígitos                                          |
 * | `21`            | 1–20 alfanumérico                                  |
 * | `240–242/250/251`| 1–30 alfanumérico                                 |
 * | `310n`–`316n`   | peso/medida (6 dígitos)                            |
 * | `400`           | 1–30 alfanumérico                                  |
 * | `410/412/414`   | GLN (13 dígitos)                                   |
 * | `422`           | país de origem (3 dígitos)                         |
 */
const GS1_AIS: Record<string, Gs1FieldSpec> = {
  '00': { type: 'digits', length: 18 },
  '01': { type: 'digits', length: 14 },
  '02': { type: 'digits', length: 14 },
  '10': { type: 'alnum', min: 1, max: 20 },
  '11': { type: 'date' },
  '13': { type: 'date' },
  '15': { type: 'date' },
  '17': { type: 'dateTime' },
  '20': { type: 'digits', length: 2 },
  '21': { type: 'alnum', min: 1, max: 20 },
  '240': { type: 'alnum', min: 1, max: 30 },
  '241': { type: 'alnum', min: 1, max: 30 },
  '242': { type: 'alnum', min: 1, max: 30 },
  '250': { type: 'alnum', min: 1, max: 30 },
  '251': { type: 'alnum', min: 1, max: 30 },
  '400': { type: 'alnum', min: 1, max: 30 },
  '410': { type: 'digits', length: 13 },
  '412': { type: 'digits', length: 13 },
  '414': { type: 'digits', length: 13 },
  '422': { type: 'digits', length: 3 },
};

// 310n–316n: peso/medida com 6 dígitos (o `n` é o indicador decimal).
for (let prefix = 310; prefix <= 316; prefix++) {
  for (let decimal = 0; decimal <= 9; decimal++) {
    GS1_AIS[`${prefix}${decimal}`] = { type: 'digits', length: 6 };
  }
}

/**
 * Conjunto alfanumérico aceito. A norma GS1 usa `[0-9A-Z]`; aqui aceitamos
 * minúsculas também (decisão a revisar — não quebra a validação, só é mais
 * permissivo que a especificação).
 */
const ALNUM = /^[0-9A-Za-z]+$/;

const isDigits = (value: string): boolean => /^[0-9]+$/.test(value);

/** Ano bissexto no calendário gregoriano. */
function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeap(year)) return 29;
  return DAYS_PER_MONTH[month - 1];
}

/** AAMMDD válido (ano interpretado como 20AA). */
function isDate(value: string): boolean {
  if (value.length !== 6 || !isDigits(value)) return false;
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(2000 + Number(value.slice(0, 2)), month);
}

/** HHMM válido. */
function isTime(value: string): boolean {
  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(2, 4));
  return hours <= 23 && minutes <= 59;
}

/**
 * Lê um campo de tamanho fixo a partir de `start`, parando no FNC1 (`^`) se ele
 * vier antes do fim: assim um campo truncado gera `bad-length`, não `bad-chars`.
 */
function readFixed(
  content: string,
  start: number,
  length: number,
): { value: string; next: number } {
  const separator = content.indexOf('^', start);
  const end =
    separator >= 0 && separator < start + length ? separator : start + length;
  return { value: content.slice(start, end), next: end };
}

/** AI na posição `index`, tentando o mais longo (4, 3 e 2 dígitos). */
function matchAi(
  content: string,
  index: number,
): { ai: string; spec: Gs1FieldSpec } | null {
  for (const length of [4, 3, 2]) {
    const ai = content.slice(index, index + length);
    if (ai.length === length && Object.hasOwn(GS1_AIS, ai)) {
      return { ai, spec: GS1_AIS[ai] };
    }
  }
  return null;
}

/** Valida o valor de um AI e registra o erro em `errors`. */
function validateField(
  spec: Gs1FieldSpec,
  value: string,
  position: number,
  errors: { code: string; position: number }[],
): void {
  const fail = (code: Gs1ErrorCode): void => {
    errors.push({ code, position });
  };

  switch (spec.type) {
    case 'digits':
      if (value.length !== spec.length) fail('bad-length');
      else if (!isDigits(value)) fail('bad-chars');
      return;
    case 'alnum':
      if (value.length < spec.min || value.length > spec.max) {
        fail('bad-length');
      } else if (!ALNUM.test(value)) fail('bad-chars');
      return;
    case 'date':
      if (value.length !== 6) fail('bad-length');
      else if (!isDigits(value)) fail('bad-chars');
      else if (!isDate(value)) fail('bad-date');
      return;
    case 'dateTime':
      if (value.length !== 6 && value.length !== 10) fail('bad-length');
      else if (!isDigits(value)) fail('bad-chars');
      else if (!isDate(value.slice(0, 6))) fail('bad-date');
      else if (value.length === 10 && !isTime(value.slice(6, 10))) {
        fail('bad-date');
      }
      return;
  }
}

/**
 * Valida a sequência de AIs de `content` (o mesmo texto aceito por
 * `encodeBarcode('gs1-128')`, com `^` como separador FNC1). Devolve `ok` e a
 * lista de erros com o `code` e a `position` de cada um.
 *
 * AIs fora do dicionário mínimo são **ignorados** (não geram erro).
 */
export function validateGs1(content: string): Gs1Validation {
  const errors: { code: string; position: number }[] = [];
  let i = 0;

  while (i < content.length) {
    // `^` é o FNC1 (separador de campo): apenas avança.
    if (content[i] === '^') {
      i += 1;
      continue;
    }

    const match = matchAi(content, i);
    // AI desconhecida: não bloqueia, apenas para de validar.
    if (!match) break;

    const position = i;
    const dataStart = i + match.ai.length;
    let value: string;

    if (match.spec.type === 'digits') {
      const read = readFixed(content, dataStart, match.spec.length);
      value = read.value;
      i = read.next;
    } else if (match.spec.type === 'date') {
      // Data fixa AAMMDD (6 dígitos).
      const read = readFixed(content, dataStart, 6);
      value = read.value;
      i = read.next;
    } else {
      // Variável (`alnum`, `dateTime`): vai até o próximo `^` ou o fim.
      const separator = content.indexOf('^', dataStart);
      const end = separator < 0 ? content.length : separator;
      value = content.slice(dataStart, end);
      i = end;
    }

    validateField(match.spec, value, position, errors);
  }

  return { ok: errors.length === 0, errors };
}
