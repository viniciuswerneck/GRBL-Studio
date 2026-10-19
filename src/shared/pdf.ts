/**
 * Importação de **PDF vetorial** → contornos em mm (P2.4/RF-DSN-15).
 *
 * O PDF é um envelope: objetos, dicionários e *content streams* (quase sempre
 * comprimidos com *FlateDecode*). Este módulo é puro — o `inflate` é injetado
 * (o main passa `node:zlib`; os testes também), o que o mantém testável sem
 * Electron.
 *
 * Escopo v1, tolerante a arquivos reais:
 * - Objetos por varredura `N G obj … endobj` **e** *object streams* (`/ObjStm`);
 * - Filtros `FlateDecode`, `ASCIIHexDecode` e `ASCII85Decode`;
 * - Operadores de caminho `m l c v y re h`, matriz `cm` com pilha `q/Q`, *Form
 *   XObjects* (`Do`, com `/Matrix` e recursos) e rotação de página (`/Rotate`);
 * - **Texto** (`BT…ET`) e **imagens** são ignorados com aviso — sem conversão
 *   de fontes para curvas, o texto não vira geometria;
 * - Apenas a **primeira página** é importada (o total é reportado).
 */

import {
  contoursToGcode,
  type SvgContour,
  type SvgPoint,
  type SvgToGcodeOptions,
} from './svg';

export interface PdfDocument {
  /** Largura/altura da geometria em mm (normalizada). */
  width: number;
  height: number;
  /** Contornos em mm, canto mínimo em (0,0). */
  contours: SvgContour[];
  /** Total de páginas no PDF. */
  pages: number;
  /** Texto encontrado e não convertido. */
  textSkipped: boolean;
  /** Imagens bitmap ignoradas. */
  imagesSkipped: number;
  /** Operadores/filtros não suportados → quantidade. */
  unsupported: Record<string, number>;
}

export type PdfErrorCode = 'encrypted';

export class PdfError extends Error {
  readonly code: PdfErrorCode;

  constructor(code: PdfErrorCode, message: string) {
    super(message);
    this.name = 'PdfError';
    this.code = code;
  }
}

/** Injeta o descompactador (`node:zlib.inflateSync` no main). */
export type Inflate = (data: Uint8Array) => Uint8Array;

const POINT_TO_MM = 25.4 / 72;
const MAX_BLOCK_DEPTH = 8;
const MAX_CONTOUR_POINTS = 2_000_000;

// ------------------------------------------------------------------ valores

type PdfValue =
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'str'; v: string }
  | { t: 'arr'; v: PdfValue[] }
  | { t: 'dict'; v: Map<string, PdfValue> }
  | { t: 'bool'; v: boolean }
  | { t: 'null' }
  | { t: 'ref'; num: number };

interface Cursor {
  s: string;
  i: number;
}

function isWs(code: number): boolean {
  return (
    code === 0 ||
    code === 9 ||
    code === 10 ||
    code === 12 ||
    code === 13 ||
    code === 32
  );
}

function isDelimiter(code: number): boolean {
  return (
    code === 0x28 ||
    code === 0x29 ||
    code === 0x3c ||
    code === 0x3e ||
    code === 0x5b ||
    code === 0x5d ||
    code === 0x7b ||
    code === 0x7d ||
    code === 0x2f ||
    code === 0x25
  );
}

function skipWs(c: Cursor): void {
  while (c.i < c.s.length) {
    const code = c.s.charCodeAt(c.i);
    if (isWs(code)) {
      c.i++;
      continue;
    }
    if (code === 0x25) {
      while (c.i < c.s.length && c.s.charCodeAt(c.i) !== 10) c.i++;
      continue;
    }
    break;
  }
}

function bytesToLatin1(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function latin1ToBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

function hexByte(text: string, at: number): string {
  const code = Number.parseInt(text.slice(at, at + 2), 16);
  return String.fromCharCode(Number.isFinite(code) ? code : 0);
}

function readName(c: Cursor): string {
  c.i++; // '/'
  let out = '';
  while (
    c.i < c.s.length &&
    !isWs(c.s.charCodeAt(c.i)) &&
    !isDelimiter(c.s.charCodeAt(c.i))
  ) {
    if (c.s[c.i] === '#' && c.i + 2 < c.s.length) {
      out += hexByte(c.s, c.i + 1);
      c.i += 3;
    } else {
      out += c.s[c.i++];
    }
  }
  return out;
}

function readLiteralString(c: Cursor): string {
  c.i++; // '('
  let depth = 1;
  let out = '';
  while (c.i < c.s.length && depth > 0) {
    const ch = c.s[c.i++];
    if (ch === '\\') {
      const next = c.s[c.i++];
      switch (next) {
        case 'n':
          out += '\n';
          break;
        case 'r':
          out += '\r';
          break;
        case 't':
          out += '\t';
          break;
        case 'b':
          out += '\b';
          break;
        case 'f':
          out += '\f';
          break;
        case '(':
          out += '(';
          break;
        case ')':
          out += ')';
          break;
        case '\\':
          out += '\\';
          break;
        case '\r':
          if (c.s[c.i] === '\n') c.i++;
          break;
        case '\n':
          break;
        default: {
          if (next >= '0' && next <= '7') {
            let oct = next;
            while (oct.length < 3 && c.s[c.i] >= '0' && c.s[c.i] <= '7')
              oct += c.s[c.i++];
            out += String.fromCharCode(Number.parseInt(oct, 8) & 0xff);
          } else if (next !== undefined) {
            out += next;
          }
        }
      }
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) break;
    }
    out += ch;
  }
  return out;
}

function readHexString(c: Cursor): string {
  c.i++; // '<'
  let hex = '';
  while (c.i < c.s.length && c.s[c.i] !== '>') {
    const ch = c.s[c.i++];
    if (/[0-9a-fA-F]/.test(ch)) hex += ch;
  }
  c.i++; // '>'
  if (hex.length % 2) hex += '0';
  let out = '';
  for (let i = 0; i + 1 < hex.length; i += 2) {
    out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

function isNumberStart(ch: string | undefined): boolean {
  return (
    ch !== undefined &&
    (ch === '+' || ch === '-' || ch === '.' || (ch >= '0' && ch <= '9'))
  );
}

function parseValue(c: Cursor): PdfValue | null {
  skipWs(c);
  if (c.i >= c.s.length) return null;
  const ch = c.s[c.i];
  if (ch === '<') {
    if (c.s[c.i + 1] === '<') {
      c.i += 2;
      const dict = new Map<string, PdfValue>();
      while (c.i < c.s.length) {
        skipWs(c);
        if (c.s[c.i] === '>' && c.s[c.i + 1] === '>') {
          c.i += 2;
          break;
        }
        if (c.s[c.i] === '/') {
          const key = readName(c);
          const value = parseValue(c) ?? ({ t: 'null' } as const);
          dict.set(key, value);
        } else {
          c.i++;
        }
      }
      return { t: 'dict', v: dict };
    }
    return { t: 'str', v: readHexString(c) };
  }
  if (ch === '(') return { t: 'str', v: readLiteralString(c) };
  if (ch === '[') {
    c.i++;
    const items: PdfValue[] = [];
    while (c.i < c.s.length) {
      skipWs(c);
      if (c.s[c.i] === ']') {
        c.i++;
        break;
      }
      const value = parseValue(c);
      if (!value) break;
      items.push(value);
    }
    return { t: 'arr', v: items };
  }
  if (ch === '/') return { t: 'name', v: readName(c) };
  if (isNumberStart(ch)) return parseNumberValue(c);
  if (c.s.startsWith('true', c.i)) {
    c.i += 4;
    return { t: 'bool', v: true };
  }
  if (c.s.startsWith('false', c.i)) {
    c.i += 5;
    return { t: 'bool', v: false };
  }
  if (c.s.startsWith('null', c.i)) {
    c.i += 4;
    return { t: 'null' };
  }
  c.i++;
  return null;
}

/** Número ou referência indireta (`12 0 R`). */
function parseNumberValue(c: Cursor): PdfValue {
  const start = c.i;
  if (c.s[c.i] === '+' || c.s[c.i] === '-') c.i++;
  while (c.i < c.s.length && /[0-9.]/.test(c.s[c.i])) c.i++;
  if (c.i < c.s.length && (c.s[c.i] === 'e' || c.s[c.i] === 'E')) {
    const save = c.i;
    c.i++;
    if (c.s[c.i] === '+' || c.s[c.i] === '-') c.i++;
    if (/[0-9]/.test(c.s[c.i] ?? '')) {
      while (c.i < c.s.length && /[0-9]/.test(c.s[c.i])) c.i++;
    } else {
      c.i = save;
    }
  }
  const raw = c.s.slice(start, c.i);
  const parsed = Number.parseFloat(raw);
  const value = { t: 'num' as const, v: Number.isFinite(parsed) ? parsed : 0 };
  if (!Number.isInteger(value.v)) return value;
  // Tentativa de referência: <int> <int> R
  const save = c.i;
  const second = skipAndReadUint(c);
  if (second !== null) {
    skipWs(c);
    if (
      c.s[c.i] === 'R' &&
      (c.i + 1 >= c.s.length ||
        isWs(c.s.charCodeAt(c.i + 1)) ||
        isDelimiter(c.s.charCodeAt(c.i + 1)))
    ) {
      c.i++;
      return { t: 'ref', num: value.v };
    }
  }
  c.i = save;
  return value;
}

function skipAndReadUint(c: Cursor): number | null {
  const save = c.i;
  skipWs(c);
  const match = /^\d+/.exec(c.s.slice(c.i));
  if (!match) {
    c.i = save;
    return null;
  }
  c.i += match[0].length;
  return Number.parseInt(match[0], 10);
}

// ------------------------------------------------------------------ objetos

interface PdfObject {
  num: number;
  dict: Map<string, PdfValue>;
  stream?: string;
}

function dictGet(
  dict: Map<string, PdfValue> | undefined,
  key: string,
): PdfValue | undefined {
  return dict?.get(key);
}

function nameOf(value: PdfValue | undefined): string | undefined {
  return value?.t === 'name' ? value.v : undefined;
}

function numberValue(value: PdfValue | undefined): number | undefined {
  return value?.t === 'num' ? value.v : undefined;
}

function decodeAsciiHex(text: string): Uint8Array {
  let hex = '';
  for (const ch of text) {
    if (ch === '>') break;
    if (/[0-9a-fA-F]/.test(ch)) hex += ch;
  }
  if (hex.length % 2) hex += '0';
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16) & 0xff;
  }
  return out;
}

function decodeAscii85(text: string): Uint8Array {
  const out: number[] = [];
  let tuple = 0;
  let count = 0;
  for (const ch of text) {
    if (ch === '~') break;
    if (isWs(ch.charCodeAt(0))) continue;
    if (ch === 'z' && count === 0) {
      for (let i = 0; i < 4; i++) out.push(0);
      continue;
    }
    if (ch < '!' || ch > 'u') continue;
    tuple = tuple * 85 + (ch.charCodeAt(0) - 33);
    count++;
    if (count === 5) {
      out.push(
        (tuple >>> 24) & 0xff,
        (tuple >>> 16) & 0xff,
        (tuple >>> 8) & 0xff,
        tuple & 0xff,
      );
      tuple = 0;
      count = 0;
    }
  }
  if (count > 1) {
    for (let i = count; i < 5; i++) tuple = tuple * 85 + 84;
    out.push(
      (tuple >>> 24) & 0xff,
      (tuple >>> 16) & 0xff,
      (tuple >>> 8) & 0xff,
      tuple & 0xff,
    );
  }
  return new Uint8Array(out);
}

/** Decodifica o stream (filtros em cadeia) ou `null` se houver filtro exótico. */
function decodeStream(
  obj: PdfObject,
  inflate: Inflate,
  unsupported: Map<string, number>,
): string | null {
  if (obj.stream === undefined) return null;
  let data = latin1ToBytes(obj.stream);
  const filter = dictGet(obj.dict, 'Filter');
  const filters = filter ? (filter.t === 'arr' ? filter.v : [filter]) : [];
  if (filters.length === 0) return bytesToLatin1(data);
  for (const entry of filters) {
    const name = nameOf(entry);
    if (name === 'FlateDecode' || name === 'Fl') {
      try {
        data = inflate(data);
      } catch {
        return null;
      }
    } else if (name === 'ASCIIHexDecode' || name === 'AHx') {
      data = decodeAsciiHex(bytesToLatin1(data));
    } else if (name === 'ASCII85Decode' || name === 'A85') {
      data = decodeAscii85(bytesToLatin1(data));
    } else {
      if (name)
        unsupported.set(
          `filtro:${name}`,
          (unsupported.get(`filtro:${name}`) ?? 0) + 1,
        );
      return null;
    }
  }
  return bytesToLatin1(data);
}

/** Varre os objetos `N G obj … endobj` (não depende de xref correto). */
function scanObjects(text: string): Map<number, PdfObject> {
  const objects = new Map<number, PdfObject>();
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let match = re.exec(text);
  while (match !== null) {
    const num = Number.parseInt(match[1], 10);
    const bodyStart = match.index + match[0].length;
    const end = text.indexOf('endobj', bodyStart);
    const body = text.slice(bodyStart, end < 0 ? text.length : end);
    const cursor: Cursor = { s: body, i: 0 };
    const parsed = parseValue(cursor);
    const dict = parsed?.t === 'dict' ? parsed.v : new Map<string, PdfValue>();
    const obj: PdfObject = { num, dict };

    const streamAt = /\bstream(\r\n|\r|\n)/.exec(body);
    if (streamAt) {
      const dataStart = streamAt.index + streamAt[0].length;
      const declared = numberValue(dictGet(dict, 'Length'));
      let dataEnd: number;
      if (declared !== undefined && dataStart + declared <= body.length) {
        dataEnd = dataStart + declared;
      } else {
        const endstream = body.indexOf('endstream', dataStart);
        dataEnd = endstream < 0 ? body.length : endstream;
      }
      obj.stream = body.slice(dataStart, dataEnd).replace(/\r\n$|\r$|\n$/, '');
    }
    objects.set(num, obj);
    re.lastIndex = end < 0 ? text.length : end;
    match = re.exec(text);
  }
  return objects;
}

/** Extrai os objetos comprimidos dentro de um `/ObjStm`. */
function absorbObjectStreams(
  objects: Map<number, PdfObject>,
  inflate: Inflate,
): void {
  for (const obj of [...objects.values()]) {
    if (nameOf(dictGet(obj.dict, 'Type')) !== 'ObjStm') continue;
    const data = decodeStream(obj, inflate, new Map());
    if (data === null) continue;
    const n = numberValue(dictGet(obj.dict, 'N')) ?? 0;
    const first = numberValue(dictGet(obj.dict, 'First')) ?? 0;
    const header = data.slice(0, first);
    const pairs = [...header.matchAll(/(\d+)\s+(\d+)/g)].slice(0, n);
    for (let k = 0; k < pairs.length; k++) {
      const num = Number.parseInt(pairs[k][1], 10);
      const offset = Number.parseInt(pairs[k][2], 10);
      const nextOffset =
        k + 1 < pairs.length
          ? Number.parseInt(pairs[k + 1][2], 10)
          : data.length - first;
      const body = data.slice(
        first + offset,
        first + Math.max(offset, nextOffset),
      );
      const cursor: Cursor = { s: body, i: 0 };
      const parsed = parseValue(cursor);
      if (parsed?.t === 'dict' && !objects.has(num)) {
        objects.set(num, { num, dict: parsed.v });
      }
    }
  }
}

// ------------------------------------------------------------------ páginas

function resolve(
  objects: Map<number, PdfObject>,
  value: PdfValue | undefined,
): PdfObject | undefined {
  if (!value) return undefined;
  if (value.t === 'ref') return objects.get(value.num);
  return undefined;
}

/** Dicionário direto ou por referência, já resolvido. */
function resolveDict(
  objects: Map<number, PdfObject>,
  value: PdfValue | undefined,
): PdfValue | undefined {
  if (value?.t === 'dict') return value;
  if (value?.t === 'ref') {
    const obj = objects.get(value.num);
    if (obj) return { t: 'dict', v: obj.dict };
  }
  return undefined;
}

function pageAttr(
  objects: Map<number, PdfObject>,
  page: PdfObject,
  key: string,
): PdfValue | undefined {
  let current: PdfObject | undefined = page;
  for (let depth = 0; depth < MAX_BLOCK_DEPTH && current; depth++) {
    const value = dictGet(current.dict, key);
    if (value !== undefined) return value;
    current = resolve(objects, dictGet(current.dict, 'Parent'));
  }
  return undefined;
}

function mediaBoxOf(
  objects: Map<number, PdfObject>,
  page: PdfObject,
): [number, number, number, number] {
  const box = pageAttr(objects, page, 'MediaBox');
  if (box?.t === 'arr') {
    const nums = box.v.map((v) => numberValue(v) ?? 0);
    if (nums.length >= 4) return [nums[0], nums[1], nums[2], nums[3]];
  }
  return [0, 0, 612, 792]; // Carta (padrão do PDF)
}

function contentText(
  objects: Map<number, PdfObject>,
  page: PdfObject,
  inflate: Inflate,
  unsupported: Map<string, number>,
): string {
  const contents = dictGet(page.dict, 'Contents');
  const parts: PdfValue[] = [];
  if (contents?.t === 'arr') parts.push(...contents.v);
  else if (contents) parts.push(contents);
  const chunks: string[] = [];
  for (const part of parts) {
    const obj = resolve(objects, part);
    if (!obj) continue;
    const decoded = decodeStream(obj, inflate, unsupported);
    if (decoded !== null) chunks.push(decoded);
  }
  return chunks.join('\n');
}

// ------------------------------------------------------------------ conteúdo

interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function multiply(m: Matrix, n: Matrix): Matrix {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  };
}

function applyMatrix(m: Matrix, p: SvgPoint): SvgPoint {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

interface PathPart {
  points: SvgPoint[];
  closed: boolean;
}

interface ContentContext {
  objects: Map<number, PdfObject>;
  inflate: Inflate;
  contours: PathPart[];
  textSkipped: boolean;
  imagesSkipped: number;
  unsupported: Map<string, number>;
}

function sampleCubic(
  p0: SvgPoint,
  p1: SvgPoint,
  p2: SvgPoint,
  p3: SvgPoint,
  out: SvgPoint[],
): void {
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x:
        u * u * u * p0.x +
        3 * u * u * t * p1.x +
        3 * u * t * t * p2.x +
        t * t * t * p3.x,
      y:
        u * u * u * p0.y +
        3 * u * u * t * p1.y +
        3 * u * t * t * p2.y +
        t * t * t * p3.y,
    });
  }
}

function readOperator(c: Cursor): string {
  const start = c.i;
  while (c.i < c.s.length) {
    const code = c.s.charCodeAt(c.i);
    if (isWs(code) || isDelimiter(code)) break;
    c.i++;
  }
  return c.s.slice(start, c.i);
}

function numbers(operands: PdfValue[], count: number): number[] | null {
  if (operands.length < count) return null;
  const slice = operands.slice(-count);
  const out: number[] = [];
  for (const value of slice) {
    if (value.t !== 'num') return null;
    out.push(value.v);
  }
  return out;
}

function processContent(
  content: string,
  ctm: Matrix,
  resources: PdfValue | undefined,
  depth: number,
  ctx: ContentContext,
): void {
  const stack: Matrix[] = [];
  let current = ctm;
  let operands: PdfValue[] = [];
  let path: PathPart[] = [];
  let sub: SvgPoint[] | null = null;

  const flush = (closed: boolean): void => {
    if (sub && sub.length >= 2) path.push({ points: sub, closed });
    sub = null;
  };

  const paint = (emit: boolean, close: boolean): void => {
    flush(close);
    if (emit) {
      let total = ctx.contours.reduce((sum, p) => sum + p.points.length, 0);
      for (const part of path) {
        if (total >= MAX_CONTOUR_POINTS) break;
        total += part.points.length;
        ctx.contours.push(part);
      }
    }
    path = [];
  };

  const cursor: Cursor = { s: content, i: 0 };
  while (cursor.i < content.length) {
    skipWs(cursor);
    if (cursor.i >= content.length) break;
    const ch = content[cursor.i];
    if (ch === '(') {
      operands.push({ t: 'str', v: readLiteralString(cursor) });
      continue;
    }
    if (ch === '<' && content[cursor.i + 1] !== '<') {
      operands.push({ t: 'str', v: readHexString(cursor) });
      continue;
    }
    if (ch === '[' || ch === '<' || ch === '/') {
      const value = parseValue(cursor);
      if (value) operands.push(value);
      continue;
    }
    if (isNumberStart(ch)) {
      const value = parseValue(cursor);
      if (value) operands.push(value);
      continue;
    }
    const op = readOperator(cursor);
    if (op === '') {
      cursor.i++;
      continue;
    }

    switch (op) {
      case 'q':
        stack.push({ ...current });
        break;
      case 'Q':
        if (stack.length) current = stack.pop() as Matrix;
        break;
      case 'cm': {
        const m = numbers(operands, 6);
        if (m)
          current = multiply(current, {
            a: m[0],
            b: m[1],
            c: m[2],
            d: m[3],
            e: m[4],
            f: m[5],
          });
        break;
      }
      case 'm': {
        const p = numbers(operands, 2);
        if (p) {
          flush(false);
          sub = [applyMatrix(current, { x: p[0], y: p[1] })];
        }
        break;
      }
      case 'l': {
        const p = numbers(operands, 2);
        if (p) {
          const point = applyMatrix(current, { x: p[0], y: p[1] });
          if (!sub) sub = [point];
          else sub.push(point);
        }
        break;
      }
      case 'c':
      case 'v':
      case 'y': {
        const p = numbers(operands, op === 'y' ? 4 : 6);
        if (p && sub?.length) {
          const start = sub[sub.length - 1];
          let control1: SvgPoint;
          let control2: SvgPoint;
          let end: SvgPoint;
          if (op === 'c') {
            control1 = applyMatrix(current, { x: p[0], y: p[1] });
            control2 = applyMatrix(current, { x: p[2], y: p[3] });
            end = applyMatrix(current, { x: p[4], y: p[5] });
          } else if (op === 'v') {
            control1 = start;
            control2 = applyMatrix(current, { x: p[0], y: p[1] });
            end = applyMatrix(current, { x: p[2], y: p[3] });
          } else {
            control1 = applyMatrix(current, { x: p[0], y: p[1] });
            control2 = applyMatrix(current, { x: p[2], y: p[3] });
            end = control2;
          }
          sampleCubic(start, control1, control2, end, sub);
        }
        break;
      }
      case 're': {
        const p = numbers(operands, 4);
        if (p) {
          flush(false);
          const [x, y, w, h] = p;
          sub = [
            applyMatrix(current, { x, y }),
            applyMatrix(current, { x: x + w, y }),
            applyMatrix(current, { x: x + w, y: y + h }),
            applyMatrix(current, { x, y: y + h }),
          ];
          flush(true);
        }
        break;
      }
      case 'h':
        flush(true);
        break;
      case 'n':
        paint(false, false);
        break;
      case 'S':
      case 'f':
      case 'F':
      case 'f*':
        paint(true, false);
        break;
      case 's':
      case 'B':
      case 'B*':
      case 'b':
      case 'b*':
        paint(true, true);
        break;
      case 'W':
      case 'W*':
        break;
      case 'BT':
        ctx.textSkipped = true;
        break;
      case 'BI': {
        const rest = content.slice(cursor.i);
        const ei = /\bEI\b/.exec(rest);
        cursor.i += ei ? ei.index + 2 : rest.length;
        break;
      }
      case 'Do': {
        const name = operands.length
          ? operands[operands.length - 1]
          : undefined;
        if (name?.t === 'name') {
          doXObject(name.v, current, resources, depth, ctx);
        }
        break;
      }
      default:
        break;
    }
    operands = [];
  }
}

function doXObject(
  name: string,
  ctm: Matrix,
  resources: PdfValue | undefined,
  depth: number,
  ctx: ContentContext,
): void {
  if (depth >= MAX_BLOCK_DEPTH || !resources || resources.t !== 'dict') return;
  const xobjects = dictGet(resources.v, 'XObject');
  if (xobjects?.t !== 'dict') return;
  const entry = xobjects.v.get(name);
  const obj = resolve(ctx.objects, entry);
  if (!obj) return;
  const subtype = nameOf(dictGet(obj.dict, 'Subtype'));
  if (subtype === 'Image') {
    ctx.imagesSkipped++;
    return;
  }
  if (subtype !== 'Form') return;
  const matrixValue = dictGet(obj.dict, 'Matrix');
  let matrix: Matrix = IDENTITY;
  if (matrixValue?.t === 'arr') {
    const nums = matrixValue.v.map((v) => numberValue(v) ?? 0);
    if (nums.length >= 6) {
      matrix = {
        a: nums[0],
        b: nums[1],
        c: nums[2],
        d: nums[3],
        e: nums[4],
        f: nums[5],
      };
    }
  }
  const data = decodeStream(obj, ctx.inflate, ctx.unsupported);
  if (data === null) return;
  const own = dictGet(obj.dict, 'Resources');
  const formResources = resolveDict(ctx.objects, own) ?? resources;
  processContent(data, multiply(ctm, matrix), formResources, depth + 1, ctx);
}

// ------------------------------------------------------------------ parse

/**
 * Parseia um PDF (texto latin1) e devolve os contornos da **primeira página**
 * em mm, normalizados para a origem.
 */
export function parsePdf(text: string, inflate: Inflate): PdfDocument {
  if (/\/Encrypt\b/.test(text)) {
    throw new PdfError('encrypted', 'PDF criptografado não é suportado');
  }

  const objects = scanObjects(text);
  absorbObjectStreams(objects, inflate);

  const unsupported = new Map<string, number>();
  const pages = [...objects.values()]
    .filter((obj) => nameOf(dictGet(obj.dict, 'Type')) === 'Page')
    .sort((a, b) => a.num - b.num);

  const empty: PdfDocument = {
    width: 0,
    height: 0,
    contours: [],
    pages: pages.length,
    textSkipped: false,
    imagesSkipped: 0,
    unsupported: {},
  };
  if (pages.length === 0) return empty;

  const page = pages[0];
  const media = mediaBoxOf(objects, page);
  const resources = resolveDict(objects, pageAttr(objects, page, 'Resources'));
  const content = contentText(objects, page, inflate, unsupported);

  const ctx: ContentContext = {
    objects,
    inflate,
    contours: [],
    textSkipped: false,
    imagesSkipped: 0,
    unsupported,
  };
  processContent(content, IDENTITY, resources, 0, ctx);

  if (ctx.contours.length === 0) {
    return {
      ...empty,
      textSkipped: ctx.textSkipped,
      imagesSkipped: ctx.imagesSkipped,
      unsupported: Object.fromEntries(
        [...unsupported.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      ),
    };
  }

  // Rotação da página (a geometria acompanha o que se vê).
  const rotateRaw = numberValue(pageAttr(objects, page, 'Rotate')) ?? 0;
  const rotate = ((rotateRaw % 360) + 360) % 360;
  const boxW = media[2] - media[0];
  const boxH = media[3] - media[1];
  const rotated: PathPart[] = ctx.contours.map((part) => ({
    closed: part.closed,
    points: part.points.map((p) => {
      const x = p.x - media[0];
      const y = p.y - media[1];
      if (rotate === 90) return { x: boxH - y, y: x };
      if (rotate === 180) return { x: boxW - x, y: boxH - y };
      if (rotate === 270) return { x: y, y: boxW - x };
      return { x, y };
    }),
  }));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const part of rotated) {
    for (const point of part.points) {
      point.x *= POINT_TO_MM;
      point.y *= POINT_TO_MM;
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
  }
  const contours: SvgContour[] = rotated.map((part) => ({
    closed: part.closed,
    points: part.points.map((p) => ({ x: p.x - minX, y: p.y - minY })),
  }));

  return {
    width: maxX - minX,
    height: maxY - minY,
    contours,
    pages: pages.length,
    textSkipped: ctx.textSkipped,
    imagesSkipped: ctx.imagesSkipped,
    unsupported: Object.fromEntries(
      [...unsupported.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    ),
  };
}

/** G-code de contorno a partir de um PDF parseado (PDF é y-up: sem flip). */
export function pdfToGcode(
  doc: PdfDocument,
  opts: Partial<SvgToGcodeOptions> = {},
): string {
  return contoursToGcode(
    doc,
    { flipY: false, ...opts },
    'GRBL Studio — importação PDF',
  );
}
