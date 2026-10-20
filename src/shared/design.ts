/**
 * Ferramentas de desenho (design tools) — formas vetoriais → G-code de contorno.
 *
 * Complementa a importação de SVG: aqui o usuário desenha diretamente na UI
 * (retângulo, círculo, elipse, linha, polígono) e o módulo converte as formas
 * em G-code de contorno (G0/G1, M3/M4). Formas fechadas viram corte/contorno;
 * formas abertas (linhas) viram gravação.
 *
 * **Camadas / multi-operação:** as formas podem pertencer a uma camada
 * (`Shape.layer` → `DesignDocument.layers`). As camadas são emitidas na ordem
 * do documento, cada uma com sua potência/velocidade/passadas/modo — é o que
 * permite “gravar + cortar numa execução”. Formas sem camada (ou com um id
 * desconhecido) vão por último, usando os parâmetros globais.
 *
 * Módulo puro e testável; a interação (canvas, mouse) vive no renderer.
 */

import type { DesignSymbolSpec } from './designSymbol';
import { STROKE_STEP, strokePaths } from './offset';

export type { DesignSymbolSpec } from './designSymbol';
export {
  SYMBOL_DEFAULT_LINES,
  SYMBOL_MAX_LINES,
  SYMBOL_MAX_MM,
  SYMBOL_MIN_LINES,
  SYMBOL_MIN_MM,
  sanitizeDesignSymbol,
  symbolCellToDesignShapes,
} from './designSymbol';
export type {
  DesignSymbolCell,
  DesignSymbolShape,
  DesignSymbolShapes,
  DesignSymbolType,
} from './designSymbol';

export type ShapeKind =
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  kind: ShapeKind;
  /** Pontos do contorno (polilinha). Para formas fechadas, o último ≠ primeiro. */
  points: Point[];
  closed: boolean;
  /** Parâmetros de gravação opcionais (sobrescrevem os globais). */
  speed?: number;
  /** Potência do objeto em **porcentagem** (0–100), como o campo “P” do painel. */
  power?: number;
  passes?: number;
  /**
   * Espessura do traço em mm, **centrada** no caminho (como um traço de
   * caneta): metade para cada lado. `0`/ausente = uma linha só. A gravação
   * preenche a faixa com linhas paralelas espaçadas de ~0,1 mm
   * (`STROKE_STEP`), com os contornos do próprio objeto servindo de limite.
   */
  width?: number;
  /**
   * Agrupamento: formas com o mesmo id formam um **bloco** (ex.: todas as
   * letras/contornos de um texto) e são movidas/redimensionadas juntas.
   */
  group?: string;
  /** Rótulo exibido no painel de objetos (`Retângulo 1`, `Texto 2`, …). */
  name?: string;
  /**
   * Id da camada/operação a que a forma pertence (`DesignDocument.layers`).
   * Ausente ou desconhecido = usa os parâmetros globais e é emitida por último.
   */
  layer?: string;
  /**
   * Metadados do bloco de símbolo (QR/código de barras) — permite reeditá-lo
   * como bloco inteiro (RF-SYM-8). O desenho em si são as linhas abertas do
   * grupo, então mover/escalar/rotacionar funciona como qualquer objeto.
   */
  symbol?: DesignSymbolSpec;
  /** Metadados do bloco de texto (permite reeditá-lo como bloco inteiro). */
  text?: {
    value: string;
    font: string;
    size: number;
    mode: 'vector' | 'stroke' | 'fill';
    bold?: boolean;
    /** Linhas por mm do preenchimento (modo `fill`). */
    spacing?: number;
  };
}

/**
 * Camada / operação do desenho. A ordem no array é a **ordem de execução**:
 * a primeira camada é gravada inteira antes da segunda (ex.: gravar, depois
 * cortar). Cada parâmetro ausente herda o global correspondente.
 */
export interface DesignLayer {
  id: string;
  /** Nome exibido na UI. Vazio/ausente = “Camada N”. */
  name?: string;
  /** Cor de identificação na UI (o G-code não usa). */
  color?: string;
  /** Potência em **porcentagem** (0–100). */
  power?: number;
  /** Velocidade de corte/gravação (mm/min). */
  speed?: number;
  /** Passadas da camada (multiplicam as passadas do objeto). */
  passes?: number;
  /** Modo do laser; ausente = modo global. */
  mode?: 'M3' | 'M4';
}

export interface DesignDocument {
  shapes: Shape[];
  width: number;
  height: number;
  /**
   * Camadas na ordem de execução. Sem camadas, o documento inteiro é emitido
   * na ordem das formas com os parâmetros globais (comportamento histórico).
   */
  layers?: DesignLayer[];
}

export interface DesignToGcodeOptions {
  feed: number; // mm/min padrão para G1
  travelFeed: number; // mm/min para G0
  sMax: number;
  powerPercent: number; // % do S-max
  passes: number;
  mode: 'M3' | 'M4';
}

const DEFAULT_OPTS: DesignToGcodeOptions = {
  feed: 1000,
  travelFeed: 3000,
  sMax: 1000,
  powerPercent: 100,
  passes: 1,
  mode: 'M4',
};

/**
 * Formata uma coordenada para o G-code com **3 casas (1 µm)**, a mesma
 * resolução do DRO (RNF-12): o GRBL não ganha nada com mais casas e valores
 * longos só incham o arquivo. Note que a resolução do editor é o pixel da
 * prancheta (0,25 mm), então a coordenada original já vem com muito mais
 * precisão do que o laser consegue posicionar.
 */
function fmt(v: number): string {
  return v.toFixed(3);
}

/** Deslocamento/velocidade válidos: não-finito ou ≤ 0 cai no padrão. */
function positive(v: number | undefined, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Texto de comentário (`;`) seguro: remove quebras de linha, que de outro modo
 * transformariam o nome de uma camada numa linha de G-code (um `\nM3 S1000`
 * colado na prancheta/locale).
 */
function commentText(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Só pontos finitos: `NaN`/`Infinity` circulariam até o G-code (`G1 XNaN`) e
 * fariam a máquina responder `error:` no meio do job.
 */
function finitePoints(points: ReadonlyArray<Point>): Point[] {
  return points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

/** Gera pontos de um círculo (centro + raio). */
export function makeCircle(
  cx: number,
  cy: number,
  r: number,
  samples = 24,
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < samples; i++) {
    const a = (2 * Math.PI * i) / samples;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

/** Gera pontos de uma elipse. */
export function makeEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  samples = 24,
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < samples; i++) {
    const a = (2 * Math.PI * i) / samples;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return pts;
}

/** Gera pontos de um retângulo (origem = canto superior esquerdo, y-down). */
export function makeRect(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** Converte um documento de desenho em G-code de contorno. */
export function designToGcode(
  doc: DesignDocument,
  opts: Partial<DesignToGcodeOptions> = {},
): string {
  const o = { ...DEFAULT_OPTS, ...opts };
  // Sanitiza os parâmetros: `F0`, `S-50`, `NaN` fazem o GRBL responder
  // `error:` e abortar o job no meio da gravação — melhor cair num padrão
  // seguro do que gerar um arquivo inválido.
  const feed = positive(o.feed, DEFAULT_OPTS.feed);
  const travelFeed = positive(o.travelFeed, DEFAULT_OPTS.travelFeed);
  const sMax = positive(o.sMax, DEFAULT_OPTS.sMax);
  const powerPercent = Number.isFinite(o.powerPercent)
    ? clamp(o.powerPercent, 0, 100)
    : DEFAULT_OPTS.powerPercent;
  const passes = Number.isFinite(o.passes)
    ? Math.max(1, Math.floor(o.passes))
    : 1;
  const arm = o.mode === 'M4' ? 'M4' : 'M3';

  // Calcula a área (bounds) para informação: inclui a espessura do traço
  // (metade para cada lado), que é o que a máquina realmente percorre.
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let hasShapes = false;
  for (const sh of doc.shapes) {
    const pts = finitePoints(sh.points);
    if (pts.length < 2) continue;
    hasShapes = true;
    const grow = sh.width && sh.width > STROKE_STEP ? sh.width / 2 : 0;
    for (const p of pts) {
      minX = Math.min(minX, p.x - grow);
      minY = Math.min(minY, p.y - grow);
      maxX = Math.max(maxX, p.x + grow);
      maxY = Math.max(maxY, p.y + grow);
    }
  }

  // A arte é gravada **ancorada na origem de trabalho**: o canto inferior
  // esquerdo do desenho vira X0 Y0. Como o usuário posiciona o laser onde o
  // material deve ser gravado e **define a origem ali** (`G10 L20`/`G92`), o
  // job começa a queimar exatamente sob o cabeçote — sem deslocamento — em vez
  // de usar coordenadas absolutas da prancheta e sair andando até o desenho.
  // O editor usa y-down (topo = 0) e o GRBL usa y-up:
  //   machineX = pageX - minX   ·   machineY = maxY - pageY
  const anchorX = Number.isFinite(minX) ? minX : 0;
  const anchorY = Number.isFinite(maxY) ? maxY : 0;
  const toMachine = (p: Point): Point => ({
    x: p.x - anchorX,
    y: anchorY - p.y,
  });

  const lines: string[] = [];
  lines.push('; GRBL Studio — desenho vetorial');
  lines.push(`; ${doc.shapes.length} forma(s)`);
  if (hasShapes) {
    lines.push(
      `; área ${(maxX - minX).toFixed(2)} x ${(maxY - minY).toFixed(2)} mm`,
    );
  }
  // Agrupa as formas por camada preservando a ordem de execução declarada.
  // Sem camadas (ou com id desconhecido), a forma cai no grupo “solta”, que
  // usa os parâmetros globais e é emitido por último.
  const declared = Array.isArray(doc.layers) ? doc.layers : [];
  const byLayer = new Map<string, Shape[]>();
  const loose: Shape[] = [];
  for (const sh of doc.shapes) {
    const id = sh.layer;
    if (id && declared.some((l) => l.id === id)) {
      const list = byLayer.get(id);
      if (list) list.push(sh);
      else byLayer.set(id, [sh]);
    } else {
      loose.push(sh);
    }
  }
  const operations: Array<{ layer: DesignLayer | null; shapes: Shape[] }> =
    declared.map((layer) => ({
      layer,
      shapes: byLayer.get(layer.id) ?? [],
    }));
  if (loose.length) operations.push({ layer: null, shapes: loose });

  lines.push('G21');
  lines.push('G90');
  lines.push('G94');
  lines.push('M5');
  if (declared.length) {
    lines.push(`; ${declared.length} camada(s) — ordem de execução`);
    for (let i = 0; i < declared.length; i++) {
      const l = declared[i];
      const parts = [`; camada ${i + 1}`];
      if (l.name) parts.push(`: ${commentText(l.name)}`);
      const meta = [
        typeof l.power === 'number' ? `P ${l.power}%` : '',
        typeof l.speed === 'number' ? `F ${l.speed}` : '',
        typeof l.passes === 'number' ? `N ${l.passes}` : '',
        l.mode ? l.mode : '',
      ].filter(Boolean);
      if (meta.length) parts.push(` (${meta.join(', ')})`);
      lines.push(parts.join(''));
    }
  }

  // Emite um caminho: deslocamento a laser desligado, seguimento ligado e
  // desligamento no fim (coordenadas com 3 casas — ver `fmt`). O `M5` no fim
  // garante que qualquer troca de potência/modo entre formas ou camadas
  // aconteça com o laser desligado.
  const emit = (
    pts: ReadonlyArray<Point>,
    closed: boolean,
    feed: number,
    power: number,
    laserMode: 'M3' | 'M4',
  ) => {
    const start = toMachine(pts[0]);
    lines.push(`G0 X${fmt(start.x)} Y${fmt(start.y)} F${travelFeed}`);
    lines.push(`${laserMode} S${power}`);
    for (let i = 1; i < pts.length; i++) {
      const m = toMachine(pts[i]);
      lines.push(`G1 X${fmt(m.x)} Y${fmt(m.y)} F${feed}`);
    }
    if (closed && pts.length > 2) {
      lines.push(`G1 X${fmt(start.x)} Y${fmt(start.y)} F${feed}`);
    }
    lines.push('M5');
  };

  // Reordena cada contorno para começar no ponto mais próximo do cabeçote (o
  // contorno anterior termina onde o próximo começa). Assim o primeiro `G0`
  // aponta para o canto inferior esquerdo — que já é X0 Y0 — e o contorno
  // segue sem cruzar o próprio desenho. Em forma aberta pode começar pela
  // outra ponta (inverte o traçado).
  let cursor: Point = { x: 0, y: 0 };
  const orderFrom = (pts: ReadonlyArray<Point>, closed: boolean): Point[] => {
    const dist2 = (p: Point): number => {
      const m = toMachine(p);
      return (m.x - cursor.x) ** 2 + (m.y - cursor.y) ** 2;
    };
    let best = 0;
    let bestDist = dist2(pts[0]);
    for (let i = 1; i < pts.length; i++) {
      const d = dist2(pts[i]);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (!closed && pts.length > 1 && dist2(pts[pts.length - 1]) < bestDist) {
      return [...pts].reverse();
    }
    return best === 0 ? [...pts] : [...pts.slice(best), ...pts.slice(0, best)];
  };

  for (let oi = 0; oi < operations.length; oi++) {
    const op = operations[oi];
    if (!op.shapes.length) continue;
    const layer = op.layer;
    // Parâmetros efetivos da operação: a camada sobrescreve o global e cada
    // forma pode sobrescrever a camada (potência/velocidade/passadas/modo).
    const layerFeed = positive(layer?.speed, feed);
    const layerPowerPct =
      typeof layer?.power === 'number' && Number.isFinite(layer.power)
        ? clamp(layer.power, 0, 100)
        : powerPercent;
    const layerPasses =
      typeof layer?.passes === 'number' && Number.isFinite(layer.passes)
        ? Math.max(1, Math.floor(layer.passes))
        : passes;
    const layerArm: 'M3' | 'M4' =
      layer?.mode === 'M3' || layer?.mode === 'M4' ? layer.mode : arm;
    if (layer && declared.length > 1) {
      const name = layer.name ? `: ${commentText(layer.name)}` : '';
      lines.push(`; camada ${oi + 1}${name}`);
    }
    for (let pass = 0; pass < layerPasses; pass++) {
      if (layerPasses > 1) {
        const suffix = layer?.name ? ` — ${commentText(layer.name)}` : '';
        lines.push(`; pass ${pass + 1}/${layerPasses}${suffix}`);
      }
      for (const sh of op.shapes) {
        const src = finitePoints(sh.points);
        if (src.length < 2) continue;
        // Um contorno "fechado" com 2 pontos tem área zero: é uma linha. Tratá-lo
        // como fechado o faria desaparecer ao ganhar espessura (`strokePaths`
        // exige 3) e deixaria o `cursor` apontando para o canto errado.
        const closed = Boolean(sh.closed) && src.length > 2;
        const shapeFeed = positive(sh.speed, layerFeed);
        // `power` da forma é percentual (campo “P”); o S sai do $30 da máquina.
        const pct =
          typeof sh.power === 'number' && Number.isFinite(sh.power)
            ? clamp(sh.power, 0, 100)
            : layerPowerPct;
        const power = Math.round((pct / 100) * sMax);
        // Traço grosso: cobre a faixa de `width` mm centrada no caminho.
        const paths =
          sh.width && sh.width > 0 ? strokePaths(src, closed, sh.width) : [src];
        // Passadas do próprio objeto, além das da camada (`layerPasses`).
        const shapePasses =
          typeof sh.passes === 'number' && Number.isFinite(sh.passes)
            ? Math.max(1, Math.floor(sh.passes))
            : 1;
        for (let sp = 0; sp < shapePasses; sp++) {
          for (const raw of paths) {
            if (raw.length < 2) continue;
            const pts = orderFrom(raw, closed);
            emit(pts, closed, shapeFeed, power, layerArm);
            const end = closed ? pts[0] : pts[pts.length - 1];
            cursor = toMachine(end);
          }
        }
      }
    }
  }

  lines.push('M5');
  lines.push('G0 X0 Y0');
  lines.push('');
  return lines.join('\n');
}

/** Atalho: lista de formas → G-code. */
export function shapesToGcode(
  shapes: Shape[],
  opts: Partial<DesignToGcodeOptions> = {},
): string {
  return designToGcode({ shapes, width: 0, height: 0 }, opts);
}
