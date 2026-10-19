/**
 * Importação de **DXF ASCII** → contornos em mm (e G-code).
 *
 * O DXF é o formato de troca do CAD (AutoCAD, LibreCAD, Fusion, Inkscape…).
 * Este módulo é puro (sem DOM/Node), para ser testável e rodar no renderer:
 *
 * - Lê a seção `ENTITIES` e os `BLOCKS`/`INSERT` (translação, escala, rotação
 *   e arrays), com recursão limitada;
 * - `LINE`, `LWPOLYLINE`/`POLYLINE` (com *bulge*), `CIRCLE`, `ARC`, `ELLIPSE`
 *   e `SPLINE` (NURBS por *de Boor*); curvas viram polilinhas;
 * - `$INSUNITS` converte para mm; o desenho é normalizado com o canto mínimo
 *   em (0,0), como no importador SVG;
 * - camadas congeladas/desligadas são respeitadas.
 *
 * Fora do escopo v1: texto (TEXT/MTEXT), HATCH, dimensões e DXF binário.
 * Essas entidades são contadas em `unsupported` para a UI avisar — sem
 * inventar geometria que o usuário não desenhou.
 */

import {
  contoursToGcode,
  type SvgContour,
  type SvgPoint,
  type SvgToGcodeOptions,
} from './svg';

export interface DxfLayer {
  name: string;
  visible: boolean;
}

export interface DxfDocument {
  /** Largura/altura da geometria em mm (já normalizada). */
  width: number;
  height: number;
  /** Contornos em mm, canto mínimo em (0,0). */
  contours: SvgContour[];
  /** Unidade declarada no cabeçalho (ex.: `mm`, `in`). */
  unit: string;
  /** Fator aplicado da unidade de origem para mm. */
  unitScale: number;
  layers: DxfLayer[];
  /** Entidades geométricas processadas (inclui as de blocos). */
  entities: number;
  /** Entidades ignoradas por estarem em camada oculta. */
  hidden: number;
  /** Tipos não suportados → quantidade (texto, hatch, dimensões…). */
  unsupported: Record<string, number>;
}

export type DxfErrorCode = 'binary';

/** Erro com código estável para a UI traduzir (nunca exibe texto cru). */
export class DxfError extends Error {
  readonly code: DxfErrorCode;

  constructor(code: DxfErrorCode, message: string) {
    super(message);
    this.name = 'DxfError';
    this.code = code;
  }
}

interface Tag {
  code: number;
  value: string;
}

interface RawEntity {
  type: string;
  tags: Tag[];
}

interface BlockDef {
  name: string;
  base: SvgPoint;
  entities: RawEntity[];
}

interface PolyVertex {
  x: number;
  y: number;
  bulge: number;
}

/** Matriz afim 2D: x' = a·x + c·y + e; y' = b·x + d·y + f. */
interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Códigos de `$INSUNITS` que aparecem em arquivos de corte. */
const UNIT_SCALES: Record<number, { scale: number; label: string }> = {
  1: { scale: 25.4, label: 'in' },
  2: { scale: 304.8, label: 'ft' },
  4: { scale: 1, label: 'mm' },
  5: { scale: 10, label: 'cm' },
  6: { scale: 1000, label: 'm' },
  8: { scale: 0.0000254, label: 'µin' },
  9: { scale: 0.0254, label: 'mil' },
  10: { scale: 914.4, label: 'yd' },
  13: { scale: 0.001, label: 'µm' },
  14: { scale: 100, label: 'dm' },
  17: { scale: 1_000_000, label: 'km' },
};

const MAX_BLOCK_DEPTH = 8;

function num(value: string | undefined): number {
  if (value === undefined) return 0;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function first(tags: Tag[], code: number): string | undefined {
  for (const tag of tags) if (tag.code === code) return tag.value;
  return undefined;
}

function all(tags: Tag[], code: number): string[] {
  const out: string[] = [];
  for (const tag of tags) if (tag.code === code) out.push(tag.value);
  return out;
}

/**
 * Pares (código, valor) do DXF ASCII. Cada par ocupa duas linhas; arquivos
 * com CRLF/CR também são aceitos.
 */
function parsePairs(text: string): Tag[] {
  const rows = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
  const tags: Tag[] = [];
  let i = 0;
  while (i < rows.length) {
    while (i < rows.length && rows[i].trim() === '') i++;
    if (i >= rows.length) break;
    const code = Number.parseInt(rows[i].trim(), 10);
    i++;
    if (!Number.isFinite(code) || i >= rows.length) continue;
    tags.push({ code, value: rows[i].trim() });
    i++;
  }
  return tags;
}

/** Divide um trecho em entidades `0/TIPO` + tags até o próximo `0`. */
function splitEntities(tags: Tag[]): RawEntity[] {
  const out: RawEntity[] = [];
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].code !== 0) continue;
    const type = tags[i].value.toUpperCase();
    let j = i + 1;
    while (j < tags.length && tags[j].code !== 0) j++;
    out.push({ type, tags: tags.slice(i + 1, j) });
    i = j - 1;
  }
  return out;
}

/** Seções `0/SECTION` … `0/ENDSEC` por nome (`HEADER`, `ENTITIES`…). */
function parseSections(tags: Tag[]): Map<string, Tag[]> {
  const out = new Map<string, Tag[]>();
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].code !== 0 || tags[i].value.toUpperCase() !== 'SECTION') {
      continue;
    }
    const nameTag = tags[i + 1];
    if (nameTag?.code !== 2) continue;
    const name = nameTag.value.toUpperCase();
    let j = i + 2;
    while (
      j < tags.length &&
      !(tags[j].code === 0 && tags[j].value.toUpperCase() === 'ENDSEC')
    ) {
      j++;
    }
    out.set(name, tags.slice(i + 2, j));
    i = j;
  }
  return out;
}

/** Valor numérico de uma variável do `HEADER` (`$INSUNITS`, `$MEASUREMENT`). */
function headerNumber(
  tags: Tag[] | undefined,
  name: string,
): number | undefined {
  if (!tags) return undefined;
  const wanted = name.toUpperCase();
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].code !== 9 || tags[i].value.toUpperCase() !== wanted) continue;
    for (let j = i + 1; j < Math.min(i + 4, tags.length); j++) {
      if (tags[j].code === 9) break;
      const n = Number.parseFloat(tags[j].value);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

/** Tabela `LAYER`: nome + visibilidade (congelada ou desligada). */
function parseLayers(tables: Tag[] | undefined): Map<string, DxfLayer> {
  const out = new Map<string, DxfLayer>();
  if (!tables) return out;
  for (const ent of splitEntities(tables)) {
    if (ent.type !== 'LAYER') continue;
    const name = first(ent.tags, 2) ?? '0';
    const flags = num(first(ent.tags, 70));
    const color = first(ent.tags, 62);
    const frozen = (flags & 1) !== 0;
    const off = color !== undefined && num(color) < 0;
    out.set(name.toUpperCase(), { name, visible: !frozen && !off });
  }
  return out;
}

/** Definições de bloco (`BLOCK` … `ENDBLK`) para resolver `INSERT`. */
function parseBlocks(section: Tag[] | undefined): Map<string, BlockDef> {
  const out = new Map<string, BlockDef>();
  if (!section) return out;
  const ents = splitEntities(section);
  for (let i = 0; i < ents.length; i++) {
    if (ents[i].type !== 'BLOCK') continue;
    const name = first(ents[i].tags, 2) ?? '';
    const base: SvgPoint = {
      x: num(first(ents[i].tags, 10)),
      y: num(first(ents[i].tags, 20)),
    };
    const body: RawEntity[] = [];
    i++;
    while (i < ents.length && ents[i].type !== 'ENDBLK') {
      body.push(ents[i]);
      i++;
    }
    if (name) out.set(name.toUpperCase(), { name, base, entities: body });
  }
  return out;
}

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

function translation(x: number, y: number): Matrix {
  return { ...IDENTITY, e: x, f: y };
}

function scaling(x: number, y: number): Matrix {
  return { a: x, b: 0, c: 0, d: y, e: 0, f: 0 };
}

function rotation(degrees: number): Matrix {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

function applyMatrix(m: Matrix, p: SvgPoint): SvgPoint {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

function transformContour(m: Matrix, contour: SvgContour): SvgContour {
  return {
    closed: contour.closed,
    points: contour.points.map((p) => applyMatrix(m, p)),
  };
}

/** Amostra o arco de uma polilinha a partir do *bulge* (tan(Δ/4)). */
function bulgePoints(from: SvgPoint, to: SvgPoint, bulge: number): SvgPoint[] {
  const theta = 4 * Math.atan(bulge);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const chord = Math.hypot(dx, dy);
  if (chord < 1e-9 || Math.abs(theta) < 1e-9) {
    return [{ x: to.x, y: to.y }];
  }
  const radius = chord / (2 * Math.sin(theta / 2));
  if (!Number.isFinite(radius) || Math.abs(radius) < 1e-9) {
    return [{ x: to.x, y: to.y }];
  }
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const ux = dx / chord;
  const uy = dy / chord;
  // Normal à esquerda do sentido from→to.
  const offset = radius * Math.cos(theta / 2);
  const cx = mx - uy * offset;
  const cy = my + ux * offset;
  const start = Math.atan2(from.y - cy, from.x - cx);
  const steps = Math.min(
    360,
    Math.max(2, Math.ceil(Math.abs(theta) / (Math.PI / 36))),
  );
  const r = Math.abs(radius);
  const out: SvgPoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const angle = start + (theta * i) / steps;
    out.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return out;
}

/** Constrói os pontos de uma polilinha 2D (com *bulge* por segmento). */
function polylinePoints(verts: PolyVertex[], closed: boolean): SvgPoint[] {
  if (verts.length === 0) return [];
  const points: SvgPoint[] = [{ x: verts[0].x, y: verts[0].y }];
  if (verts.length === 1) return points;
  const segments = closed ? verts.length : verts.length - 1;
  for (let i = 0; i < segments; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    if (Math.abs(a.bulge) > 1e-9) {
      points.push(...bulgePoints(a, b, a.bulge));
    } else {
      points.push({ x: b.x, y: b.y });
    }
  }
  if (closed && points.length > 2) {
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    if (
      Math.hypot(firstPoint.x - lastPoint.x, firstPoint.y - lastPoint.y) < 1e-9
    ) {
      points.pop();
    }
  }
  return points;
}

/** Lê vértices `10/20/42` na ordem em que aparecem (LWPOLYLINE/SPLINE). */
function parsePolyVertices(tags: Tag[]): PolyVertex[] {
  const verts: PolyVertex[] = [];
  let current: PolyVertex | null = null;
  for (const tag of tags) {
    if (tag.code === 10) {
      if (current) verts.push(current);
      current = { x: num(tag.value), y: 0, bulge: 0 };
    } else if (tag.code === 20 && current) {
      current.y = num(tag.value);
    } else if (tag.code === 42 && current) {
      current.bulge = num(tag.value);
    }
  }
  if (current) verts.push(current);
  return verts;
}

/** Pontos 2D de códigos repetidos (ex.: `11/21` dos *fit points*). */
function parsePointPairs(tags: Tag[], xCode: number): SvgPoint[] {
  const out: SvgPoint[] = [];
  let x: number | null = null;
  for (const tag of tags) {
    if (tag.code === xCode) {
      x = num(tag.value);
    } else if (tag.code === xCode + 10 && x !== null) {
      out.push({ x, y: num(tag.value) });
      x = null;
    }
  }
  return out;
}

/** Amostra um arco (graus, sentido anti-horário) em polilinha. */
function arcPoints(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
): SvgPoint[] {
  let sweep = endDeg - startDeg;
  while (sweep <= 0) sweep += 360;
  const steps = Math.min(720, Math.max(2, Math.ceil(sweep / 5)));
  const out: SvgPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = ((startDeg + (sweep * i) / steps) * Math.PI) / 180;
    out.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return out;
}

/** Amostra uma elipse paramétrica (eixo maior + razão). */
function ellipsePoints(
  cx: number,
  cy: number,
  majorX: number,
  majorY: number,
  ratio: number,
  start: number,
  end: number,
): { points: SvgPoint[]; closed: boolean } {
  let sweep = end - start;
  while (sweep <= 0) sweep += 2 * Math.PI;
  const closed = sweep >= 2 * Math.PI - 1e-6;
  if (closed) sweep = 2 * Math.PI;
  const steps = Math.min(720, Math.max(4, Math.ceil(sweep / (Math.PI / 36))));
  const minorX = -majorY * ratio;
  const minorY = majorX * ratio;
  const out: SvgPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = start + (sweep * i) / steps;
    out.push({
      x: cx + majorX * Math.cos(t) + minorX * Math.sin(t),
      y: cy + majorY * Math.cos(t) + minorY * Math.sin(t),
    });
  }
  if (closed && out.length > 2) out.pop();
  return { points: out, closed };
}

/**
 * Ponto de uma NURBS (B-spline racional) por *de Boor*, em coordenadas
 * homogêneas. Usado por `SPLINE`.
 */
function nurbsPoint(
  degree: number,
  control: SvgPoint[],
  knots: number[],
  weights: number[],
  t: number,
): SvgPoint {
  const n = control.length - 1;
  const u = Math.min(Math.max(t, knots[degree]), knots[n + 1]);
  let span = degree;
  while (span < n && !(u < knots[span + 1])) span++;

  const d: [number, number, number][] = [];
  for (let j = 0; j <= degree; j++) {
    const index = span - degree + j;
    const weight = weights[index] ?? 1;
    const point = control[Math.min(control.length - 1, Math.max(0, index))];
    d.push([point.x * weight, point.y * weight, weight]);
  }
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const i = span - degree + j;
      const denom = knots[i + degree - r + 1] - knots[i];
      const alpha = denom === 0 ? 0 : (u - knots[i]) / denom;
      d[j] = [
        (1 - alpha) * d[j - 1][0] + alpha * d[j][0],
        (1 - alpha) * d[j - 1][1] + alpha * d[j][1],
        (1 - alpha) * d[j - 1][2] + alpha * d[j][2],
      ];
    }
  }
  const weight = d[degree][2] || 1;
  return { x: d[degree][0] / weight, y: d[degree][1] / weight };
}

function splinePoints(tags: Tag[]): { points: SvgPoint[]; closed: boolean } {
  const flags = num(first(tags, 70));
  const closed = (flags & 1) !== 0;
  const degree = Math.max(1, Math.min(10, num(first(tags, 71)) || 3));
  const control = parsePolyVertices(tags).map((v) => ({ x: v.x, y: v.y }));
  const knots = all(tags, 40).map(num);
  const weights = all(tags, 41).map(num);
  const fit = parsePointPairs(tags, 11);

  if (
    control.length < degree + 1 ||
    knots.length < control.length + degree + 1
  ) {
    const fallback = control.length >= 2 ? control : fit;
    return { points: fallback, closed };
  }

  const start = knots[degree];
  const end = knots[control.length];
  if (!(end > start)) return { points: control, closed };
  const steps = Math.min(720, Math.max(16, (control.length - degree) * 12));
  const points: SvgPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    points.push(
      nurbsPoint(
        degree,
        control,
        knots,
        weights,
        start + ((end - start) * i) / steps,
      ),
    );
  }
  if (closed && points.length > 2) {
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    if (
      Math.hypot(firstPoint.x - lastPoint.x, firstPoint.y - lastPoint.y) < 1e-9
    ) {
      points.pop();
    }
  }
  return { points, closed };
}

interface Context {
  layers: Map<string, DxfLayer>;
  blocks: Map<string, BlockDef>;
  contours: SvgContour[];
  unsupported: Map<string, number>;
  hidden: number;
  entities: number;
}

function noteUnsupported(ctx: Context, type: string): void {
  ctx.unsupported.set(type, (ctx.unsupported.get(type) ?? 0) + 1);
}

function layerVisible(
  ctx: Context,
  tags: Tag[],
  inheritedLayer: string | undefined,
): boolean {
  const own = (first(tags, 8) ?? '0').toUpperCase();
  const effective = own === '0' && inheritedLayer ? inheritedLayer : own;
  const layer = ctx.layers.get(effective);
  if (layer && !layer.visible) return false;
  const color = first(tags, 62);
  return color === undefined || num(color) >= 0;
}

function pushContour(ctx: Context, contour: SvgContour, matrix: Matrix): void {
  if (contour.points.length < 2) return;
  ctx.contours.push(transformContour(matrix, contour));
}

function processEntity(
  ctx: Context,
  ent: RawEntity,
  matrix: Matrix,
  inheritedLayer: string | undefined,
  depth: number,
): void {
  if (!layerVisible(ctx, ent.tags, inheritedLayer)) {
    ctx.hidden++;
    return;
  }

  const layer = (first(ent.tags, 8) ?? '0').toUpperCase();
  const childLayer = layer === '0' ? inheritedLayer : layer;

  switch (ent.type) {
    case 'LINE': {
      const a = { x: num(first(ent.tags, 10)), y: num(first(ent.tags, 20)) };
      const b = { x: num(first(ent.tags, 11)), y: num(first(ent.tags, 21)) };
      if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-9) return;
      ctx.entities++;
      pushContour(ctx, { points: [a, b], closed: false }, matrix);
      return;
    }
    case 'LWPOLYLINE': {
      const flags = num(first(ent.tags, 70));
      const verts = parsePolyVertices(ent.tags);
      const points = polylinePoints(verts, (flags & 1) !== 0);
      if (points.length < 2) return;
      ctx.entities++;
      pushContour(ctx, { points, closed: (flags & 1) !== 0 }, matrix);
      return;
    }
    case 'POLYLINE': {
      // POLYLINE antiga é consumida por `processEntities` (VERTEX/SEQEND são
      // entidades irmãs); aqui só chegaria por engano.
      noteUnsupported(ctx, 'POLYLINE (fora de contexto)');
      return;
    }
    case 'CIRCLE': {
      const cx = num(first(ent.tags, 10));
      const cy = num(first(ent.tags, 20));
      const radius = num(first(ent.tags, 40));
      if (radius <= 0) return;
      ctx.entities++;
      const points: SvgPoint[] = [];
      const steps = 72;
      for (let i = 0; i < steps; i++) {
        const angle = (2 * Math.PI * i) / steps;
        points.push({
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        });
      }
      pushContour(ctx, { points, closed: true }, matrix);
      return;
    }
    case 'ARC': {
      const cx = num(first(ent.tags, 10));
      const cy = num(first(ent.tags, 20));
      const radius = num(first(ent.tags, 40));
      if (radius <= 0) return;
      const start = num(first(ent.tags, 50));
      const end = num(first(ent.tags, 51));
      ctx.entities++;
      pushContour(
        ctx,
        { points: arcPoints(cx, cy, radius, start, end), closed: false },
        matrix,
      );
      return;
    }
    case 'ELLIPSE': {
      const cx = num(first(ent.tags, 10));
      const cy = num(first(ent.tags, 20));
      const majorX = num(first(ent.tags, 11));
      const majorY = num(first(ent.tags, 21));
      if (Math.hypot(majorX, majorY) < 1e-9) return;
      const ratio = num(first(ent.tags, 40)) || 1;
      const start =
        first(ent.tags, 41) !== undefined ? num(first(ent.tags, 41)) : 0;
      const end =
        first(ent.tags, 42) !== undefined
          ? num(first(ent.tags, 42))
          : 2 * Math.PI;
      const result = ellipsePoints(cx, cy, majorX, majorY, ratio, start, end);
      if (result.points.length < 2) return;
      ctx.entities++;
      pushContour(ctx, result, matrix);
      return;
    }
    case 'SPLINE': {
      const result = splinePoints(ent.tags);
      if (result.points.length < 2) return;
      ctx.entities++;
      pushContour(ctx, result, matrix);
      return;
    }
    case 'INSERT': {
      if (depth >= MAX_BLOCK_DEPTH) {
        noteUnsupported(ctx, 'INSERT (aninhamento)');
        return;
      }
      const name = (first(ent.tags, 2) ?? '').toUpperCase();
      const block = ctx.blocks.get(name);
      if (!block) {
        noteUnsupported(ctx, 'INSERT (bloco ausente)');
        return;
      }
      const x = num(first(ent.tags, 10));
      const y = num(first(ent.tags, 20));
      const sx =
        first(ent.tags, 41) !== undefined ? num(first(ent.tags, 41)) : 1;
      const sy =
        first(ent.tags, 42) !== undefined ? num(first(ent.tags, 42)) : 1;
      const rot = num(first(ent.tags, 50));
      const cols = Math.max(1, Math.min(100, num(first(ent.tags, 70)) || 1));
      const rows = Math.max(1, Math.min(100, num(first(ent.tags, 71)) || 1));
      const colGap = num(first(ent.tags, 44));
      const rowGap = num(first(ent.tags, 45));
      ctx.entities++;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const array = translation(col * colGap, row * rowGap);
          const local = multiply(
            multiply(
              multiply(translation(x, y), rotation(rot)),
              scaling(sx || 1, sy || 1),
            ),
            multiply(array, translation(-block.base.x, -block.base.y)),
          );
          const total = multiply(matrix, local);
          processEntities(ctx, block.entities, total, childLayer, depth + 1);
        }
      }
      return;
    }
    case 'POINT':
    case 'SEQEND':
    case 'VERTEX':
      return;
    default:
      noteUnsupported(ctx, ent.type);
  }
}

/**
 * Processa a lista de entidades, consumindo `VERTEX`/`SEQEND` da POLYLINE
 * antiga (que vêm como entidades separadas).
 */
function processEntities(
  ctx: Context,
  entities: RawEntity[],
  matrix: Matrix,
  inheritedLayer: string | undefined,
  depth: number,
): void {
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (ent.type === 'POLYLINE') {
      if (!layerVisible(ctx, ent.tags, inheritedLayer)) {
        ctx.hidden++;
      } else {
        const flags = num(first(ent.tags, 70));
        const verts: PolyVertex[] = [];
        let j = i + 1;
        while (j < entities.length && entities[j].type === 'VERTEX') {
          const v = entities[j].tags;
          verts.push({
            x: num(first(v, 10)),
            y: num(first(v, 20)),
            bulge: num(first(v, 42)),
          });
          j++;
        }
        if (j < entities.length && entities[j].type === 'SEQEND') j++;
        i = j - 1;
        const closed = (flags & 1) !== 0;
        const points = polylinePoints(verts, closed);
        if (points.length >= 2) {
          ctx.entities++;
          pushContour(ctx, { points, closed }, matrix);
        }
      }
      continue;
    }
    processEntity(ctx, ent, matrix, inheritedLayer, depth);
  }
}

/** Escala de mm para a unidade declarada + rótulo legível. */
function unitOf(header: Tag[] | undefined): {
  scale: number;
  label: string;
} {
  const code = headerNumber(header, '$INSUNITS');
  if (code === undefined || code === 0) return { scale: 1, label: 'mm' };
  return UNIT_SCALES[code] ?? { scale: 1, label: `#${code}` };
}

/**
 * Parseia DXF ASCII e devolve contornos em mm, normalizados para a origem.
 * Lança `DxfError` apenas para DXF binário (formato diferente).
 */
export function parseDxf(text: string): DxfDocument {
  if (text.replace(/^\uFEFF/, '').startsWith('AutoCAD Binary DXF')) {
    throw new DxfError('binary', 'DXF binário não é suportado');
  }

  const tags = parsePairs(text);
  const sections = parseSections(tags);
  const unit = unitOf(sections.get('HEADER'));
  const layers = parseLayers(sections.get('TABLES'));
  const blocks = parseBlocks(sections.get('BLOCKS'));
  const entities = splitEntities(sections.get('ENTITIES') ?? []);

  const ctx: Context = {
    layers,
    blocks,
    contours: [],
    unsupported: new Map(),
    hidden: 0,
    entities: 0,
  };
  processEntities(ctx, entities, IDENTITY, undefined, 0);

  // Converte para mm e normaliza o canto mínimo em (0,0).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const contour of ctx.contours) {
    for (const point of contour.points) {
      point.x *= unit.scale;
      point.y *= unit.scale;
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
  }

  if (!Number.isFinite(minX) || ctx.contours.length === 0) {
    return {
      width: 0,
      height: 0,
      contours: [],
      unit: unit.label,
      unitScale: unit.scale,
      layers: [...layers.values()],
      entities: ctx.entities,
      hidden: ctx.hidden,
      unsupported: Object.fromEntries(
        [...ctx.unsupported.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      ),
    };
  }

  for (const contour of ctx.contours) {
    for (const point of contour.points) {
      point.x -= minX;
      point.y -= minY;
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  return {
    width,
    height,
    contours: ctx.contours,
    unit: unit.label,
    unitScale: unit.scale,
    layers: [...layers.values()],
    entities: ctx.entities,
    hidden: ctx.hidden,
    unsupported: Object.fromEntries(
      [...ctx.unsupported.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    ),
  };
}

/**
 * G-code de contorno a partir de um DXF já parseado. DXF é y-up, então
 * `flipY` é desligado por padrão (diferente do SVG).
 */
export function dxfToGcode(
  doc: DxfDocument,
  opts: Partial<SvgToGcodeOptions> = {},
): string {
  return contoursToGcode(
    doc,
    { flipY: false, ...opts },
    'GRBL Studio — importação DXF',
  );
}

/** Atalho: texto DXF → G-code. */
export function dxfTextToGcode(
  text: string,
  opts: Partial<SvgToGcodeOptions> = {},
): string {
  return dxfToGcode(parseDxf(text), opts);
}
