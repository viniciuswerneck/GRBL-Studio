/**
 * **Documento do editor “Desenhar”** (`.gstudio`) — salvar/abrir o desenho.
 *
 * Até aqui o editor só exportava o **G-code**: fechar a janela perdia a arte
 * (não dava para voltar e ajustar um texto, uma camada, a página). Este módulo
 * define um JSON pequeno e legível com tudo o que o editor precisa para
 * reabrir o trabalho **idêntico**: página, formas (com estilo, camada, texto e
 * símbolo), camadas na ordem de execução e a camada ativa.
 *
 * Regras de ouro:
 * - **Nada de arredondar** coordenadas: o arquivo guarda os mm como vieram
 *   (invariante de precisão). Só valores fora de faixa ou não finitos são
 *   descartados/normalizados na leitura.
 * - **Nunca lançar na leitura**: arquivo corrompido, de outro app ou de versão
 *   futura viram um código de erro (`json`, `format`, `version`) que a UI
 *   traduz — nada de exceção atravessando o IPC.
 * - Metadados opcionais (`text`, `symbol`) passam pelos mesmos sanitizadores da
 *   edição, então um arquivo adulterado não vira G-code inválido depois.
 * - Contadores (`seq`, `layerSeq`) são **derivados** do conteúdo, para que um
 *   objeto novo depois de abrir não colida com os ids existentes.
 *
 * Puro e testável: sem DOM, sem IPC, sem bundle próprio (entra no `design.js`).
 */

import type { DesignLayer, Point, Shape, ShapeKind } from './design';
import { sanitizeDesignSymbol } from './designSymbol';
import { sanitizeKerf } from './kerf';
import { sanitizeLead, sanitizeTabCount, sanitizeTabWidth } from './tabs';

/** Marca do arquivo — evita abrir qualquer JSON por engano. */
export const DESIGN_DOC_KIND = 'grbl-studio/design';
/** Versão do formato (incrementar só com mudança incompatível). */
export const DESIGN_DOC_VERSION = 1;
/** Extensão padrão do documento. */
export const DESIGN_DOC_EXT = 'gstudio';
/** Teto de leitura (o editor não é editor de bitmap; 32 MB é folga). */
export const DESIGN_DOC_MAX_BYTES = 32 * 1024 * 1024;
/** Limites de sanidade da leitura. */
export const DESIGN_DOC_MAX_SHAPES = 50_000;
export const DESIGN_DOC_MAX_POINTS = 2_000_000;
export const DESIGN_DOC_MAX_LAYERS = 100;
/** Página aceita (mm) — o mesmo teto dos campos da UI. */
export const DESIGN_DOC_MAX_PAGE = 100_000;

export interface DesignDocPage {
  w: number;
  h: number;
}

/** Conteúdo útil do documento (sem metadados de arquivo). */
export interface DesignDoc {
  page: DesignDocPage;
  shapes: Shape[];
  layers: DesignLayer[];
  activeLayer: string;
  /** Próximo id de grupo (`g1`, `g2`, …) para não colidir com o que veio. */
  seq: number;
  /** Próximo id de camada (`l1`, `l2`, …). */
  layerSeq: number;
}

/** Códigos de erro (a UI traduz; não são mensagens). */
export type DesignDocError =
  | 'json' // não é JSON
  | 'format' // JSON, mas não é um documento do GRBL Studio
  | 'version' // formato de uma versão mais nova
  | 'toobig'; // acima de DESIGN_DOC_MAX_BYTES

export type DesignDocParseResult =
  | { ok: true; doc: DesignDoc }
  | { ok: false; error: DesignDocError };

const KINDS: readonly ShapeKind[] = [
  'rect',
  'circle',
  'ellipse',
  'line',
  'polygon',
  'text',
];

const TEXT_MODES = ['vector', 'stroke', 'fill'] as const;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown): number | undefined {
  // Só número de verdade: `null`/`""`/`true` virariam 0/1 com `Number()` e
  // transformariam lixo em geometria na origem.
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** Ponto válido ou `null` (descarta `NaN`, `Infinity` e lixo). */
function point(raw: unknown): Point | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const x = finite(p.x);
  const y = finite(p.y);
  return x === undefined || y === undefined ? null : { x, y };
}

function shape(raw: unknown, pointsLeft: number): Shape | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const kind = src.kind as ShapeKind;
  if (!KINDS.includes(kind)) return null;
  if (!Array.isArray(src.points)) return null;

  const pts: Point[] = [];
  for (const item of src.points) {
    if (pts.length >= pointsLeft) break;
    const p = point(item);
    if (p) pts.push(p);
  }
  if (!pts.length) return null;

  const out: Shape = { kind, points: pts, closed: src.closed === true };
  const power = finite(src.power);
  if (power !== undefined) out.power = clamp(power, 0, 100);
  const speed = finite(src.speed);
  if (speed !== undefined && speed > 0) out.speed = clamp(speed, 1, 100_000);
  const passes = finite(src.passes);
  if (passes !== undefined) out.passes = Math.round(clamp(passes, 1, 1000));
  const width = finite(src.width);
  if (width !== undefined && width > 0) out.width = clamp(width, 0, 1000);
  const group = text(src.group, 64);
  if (group) out.group = group;
  const name = text(src.name, 160);
  if (name) out.name = name;
  const layer = text(src.layer, 64);
  if (layer) out.layer = layer;

  const symbol = sanitizeDesignSymbol(src.symbol);
  if (symbol) out.symbol = symbol;

  if (src.text && typeof src.text === 'object') {
    const t = src.text as Record<string, unknown>;
    const value =
      typeof t.value === 'string' ? t.value.slice(0, 2000) : undefined;
    const font = text(t.font, 200);
    const size = finite(t.size);
    const mode = TEXT_MODES.includes(t.mode as (typeof TEXT_MODES)[number])
      ? (t.mode as (typeof TEXT_MODES)[number])
      : 'vector';
    if (value !== undefined && font !== undefined && size !== undefined) {
      out.text = {
        value,
        font,
        size: clamp(size, 0.1, 10_000),
        mode,
      };
      if (t.bold === true) out.text.bold = true;
      const spacing = finite(t.spacing);
      if (spacing !== undefined) out.text.spacing = clamp(spacing, 0.05, 100);
    }
  }

  return out;
}

function layer(raw: unknown): DesignLayer | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const id = text(src.id, 64);
  if (!id) return null;
  const out: DesignLayer = { id };
  const name = text(src.name, 160);
  if (name) out.name = name;
  const color = text(src.color, 40);
  if (color) out.color = color;
  const power = finite(src.power);
  if (power !== undefined) out.power = clamp(power, 0, 100);
  const speed = finite(src.speed);
  if (speed !== undefined && speed > 0) out.speed = clamp(speed, 1, 100_000);
  const passes = finite(src.passes);
  if (passes !== undefined) out.passes = Math.round(clamp(passes, 1, 1000));
  if (src.mode === 'M3' || src.mode === 'M4') out.mode = src.mode;
  const kerf = sanitizeKerf(src.kerf);
  if (kerf > 0) out.kerf = kerf;
  const tabs = sanitizeTabCount(src.tabs);
  if (tabs > 0) {
    out.tabs = tabs;
    out.tabWidth = sanitizeTabWidth(src.tabWidth);
  }
  const lead = sanitizeLead(src.lead);
  if (lead > 0) out.lead = lead;
  return out;
}

/** Maior `n` de ids no padrão `prefixoN` (para continuar a numeração). */
function nextCounter(ids: Iterable<string>, prefix: string): number {
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const id of ids) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/**
 * Lê o texto de um `.gstudio` e devolve o documento **saneado**.
 * Nunca lança; entradas inválidas viram `{ ok: false, error }`.
 */
export function parseDesignDoc(input: unknown): DesignDocParseResult {
  if (typeof input !== 'string') return { ok: false, error: 'json' };
  if (input.length > DESIGN_DOC_MAX_BYTES)
    return { ok: false, error: 'toobig' };

  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    return { ok: false, error: 'json' };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'format' };
  }
  const root = raw as Record<string, unknown>;
  if (root.kind !== DESIGN_DOC_KIND) return { ok: false, error: 'format' };
  const version = finite(root.version);
  if (version === undefined || version < 1)
    return { ok: false, error: 'format' };
  if (version > DESIGN_DOC_VERSION) return { ok: false, error: 'version' };

  const pageRaw = (root.page ?? {}) as Record<string, unknown>;
  const page: DesignDocPage = {
    w: Math.round(clamp(finite(pageRaw.w) ?? 150, 1, DESIGN_DOC_MAX_PAGE)),
    h: Math.round(clamp(finite(pageRaw.h) ?? 130, 1, DESIGN_DOC_MAX_PAGE)),
  };

  const shapes: Shape[] = [];
  let pointsLeft = DESIGN_DOC_MAX_POINTS;
  if (Array.isArray(root.shapes)) {
    for (const item of root.shapes) {
      if (shapes.length >= DESIGN_DOC_MAX_SHAPES) break;
      const sh = shape(item, pointsLeft);
      if (!sh) continue;
      pointsLeft -= sh.points.length;
      shapes.push(sh);
    }
  }

  const layers: DesignLayer[] = [];
  const seen = new Set<string>();
  if (Array.isArray(root.layers)) {
    for (const item of root.layers) {
      if (layers.length >= DESIGN_DOC_MAX_LAYERS) break;
      const l = layer(item);
      if (!l || seen.has(l.id)) continue;
      seen.add(l.id);
      layers.push(l);
    }
  }
  if (!layers.length) layers.push({ id: 'l1' });

  // Formas apontando para camada inexistente voltam ao padrão (como no editor).
  for (const sh of shapes) {
    if (sh.layer && !seen.has(sh.layer)) delete sh.layer;
  }

  const active = text(root.activeLayer, 64);
  const activeLayer = active && seen.has(active) ? active : layers[0].id;

  return {
    ok: true,
    doc: {
      page,
      shapes,
      layers,
      activeLayer,
      seq: nextCounter(
        shapes.map((s) => s.group ?? ''),
        'g',
      ),
      layerSeq: nextCounter(
        layers.map((l) => l.id),
        'l',
      ),
    },
  };
}

/**
 * Serializa o documento para o `.gstudio` (JSON com 2 espaços, legível e
 * diffável). `savedAt` serve de carimbo para o usuário; a leitura o ignora.
 */
export function serializeDesignDoc(
  doc: DesignDoc,
  now: Date = new Date(),
): string {
  const payload = {
    kind: DESIGN_DOC_KIND,
    version: DESIGN_DOC_VERSION,
    savedAt: now.toISOString(),
    page: { w: doc.page.w, h: doc.page.h },
    activeLayer: doc.activeLayer,
    layers: doc.layers,
    shapes: doc.shapes,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
