/**
 * Ferramentas de desenho (design tools) — formas vetoriais → G-code de contorno.
 *
 * Complementa a importação de SVG: aqui o usuário desenha diretamente na UI
 * (retângulo, círculo, elipse, linha, polígono) e o módulo converte as formas
 * em G-code de contorno (G0/G1, M3/M4). Formas fechadas viram corte/contorno;
 * formas abertas (linhas) viram gravação.
 *
 * Módulo puro e testável; a interação (canvas, mouse) vive no renderer.
 */

import { STROKE_STEP, strokePaths } from './offset';

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

export interface DesignDocument {
  shapes: Shape[];
  width: number;
  height: number;
}

export interface DesignToGcodeOptions {
  feed: number; // mm/min padrão para G1
  travelFeed: number; // mm/min para G0
  sMax: number;
  powerPercent: number; // % do S-max
  passes: number;
  mode: 'M3' | 'M4';
  /** Amostras por curva (círculos/elipses). */
  samples: number;
}

const DEFAULT_OPTS: DesignToGcodeOptions = {
  feed: 1000,
  travelFeed: 3000,
  sMax: 1000,
  powerPercent: 100,
  passes: 1,
  mode: 'M4',
  samples: 24,
};

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
  lines.push('G21');
  lines.push('G90');
  lines.push('G94');
  lines.push('M5');

  // Emite um caminho: deslocamento a laser desligado, seguimento ligado e
  // desligamento no fim (nunca arredonda as coordenadas).
  const emit = (
    pts: ReadonlyArray<Point>,
    closed: boolean,
    feed: number,
    power: number,
  ) => {
    const start = toMachine(pts[0]);
    lines.push(`G0 X${fmt(start.x)} Y${fmt(start.y)} F${travelFeed}`);
    lines.push(`${arm} S${power}`);
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

  for (let pass = 0; pass < passes; pass++) {
    if (passes > 1) lines.push(`; pass ${pass + 1}/${passes}`);
    for (const sh of doc.shapes) {
      const src = finitePoints(sh.points);
      if (src.length < 2) continue;
      // Um contorno "fechado" com 2 pontos tem área zero: é uma linha. Tratá-lo
      // como fechado o faria desaparecer ao ganhar espessura (`strokePaths`
      // exige 3) e deixaria o `cursor` apontando para o canto errado.
      const closed = Boolean(sh.closed) && src.length > 2;
      const shapeFeed = positive(sh.speed, feed);
      // `power` da forma é percentual (campo “P”); o S sai do $30 da máquina.
      const pct =
        typeof sh.power === 'number' && Number.isFinite(sh.power)
          ? clamp(sh.power, 0, 100)
          : powerPercent;
      const power = Math.round((pct / 100) * sMax);
      // Traço grosso: cobre a faixa de `width` mm centrada no caminho.
      const paths =
        sh.width && sh.width > 0 ? strokePaths(src, closed, sh.width) : [src];
      for (const raw of paths) {
        if (raw.length < 2) continue;
        const pts = orderFrom(raw, closed);
        emit(pts, closed, shapeFeed, power);
        const end = closed ? pts[0] : pts[pts.length - 1];
        cursor = toMachine(end);
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
