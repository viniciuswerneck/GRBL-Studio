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

export type ShapeKind = 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'text';

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
  power?: number;
  passes?: number;
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
  feed: number;        // mm/min padrão para G1
  travelFeed: number;  // mm/min para G0
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

/** Gera pontos de um círculo (centro + raio). */
export function makeCircle(cx: number, cy: number, r: number, samples = 24): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < samples; i++) {
    const a = (2 * Math.PI * i) / samples;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

/** Gera pontos de uma elipse. */
export function makeEllipse(cx: number, cy: number, rx: number, ry: number, samples = 24): Point[] {
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
export function designToGcode(doc: DesignDocument, opts: Partial<DesignToGcodeOptions> = {}): string {
  const o = { ...DEFAULT_OPTS, ...opts };
  const powerS = Math.round((o.powerPercent / 100) * o.sMax);
  const arm = o.mode === 'M4' ? 'M4' : 'M3';

  // Calcula a área (bounds) para informação.
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const sh of doc.shapes) {
    for (const p of sh.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  const hasShapes = doc.shapes.length > 0;

  const lines: string[] = [];
  lines.push('; GRBL Studio — desenho vetorial');
  lines.push(`; ${doc.shapes.length} forma(s)`);
  if (hasShapes) {
    lines.push(`; área ${ (maxX - minX).toFixed(2) } x ${ (maxY - minY).toFixed(2) } mm`);
  }
  lines.push('G21');
  lines.push('G90');
  lines.push('G94');
  lines.push('M5');

  for (let pass = 0; pass < o.passes; pass++) {
    if (o.passes > 1) lines.push(`; pass ${pass + 1}/${o.passes}`);
    for (const sh of doc.shapes) {
      if (sh.points.length < 2) continue;
      const feed = sh.speed ?? o.feed;
      const power = sh.power ?? powerS;
      const pts = sh.points;
      // Deslocamento até o início (laser desligado).
      lines.push(`G0 X${fmt(pts[0].x)} Y${fmt(minY + maxY - pts[0].y)} F${o.travelFeed}`);
      lines.push(`${arm} S${power}`);
      for (let i = 1; i < pts.length; i++) {
        lines.push(`G1 X${fmt(pts[i].x)} Y${fmt(minY + maxY - pts[i].y)} F${feed}`);
      }
      if (sh.closed && pts.length > 2) {
        lines.push(`G1 X${fmt(pts[0].x)} Y${fmt(minY + maxY - pts[0].y)} F${feed}`);
      }
      lines.push('M5');
    }
  }

  lines.push('M5');
  lines.push('G0 X0 Y0');
  lines.push('');
  return lines.join('\n');
}

/** Atalho: lista de formas → G-code. */
export function shapesToGcode(shapes: Shape[], opts: Partial<DesignToGcodeOptions> = {}): string {
  return designToGcode({ shapes, width: 0, height: 0 }, opts);
}