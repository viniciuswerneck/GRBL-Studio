/**
 * Gravar dos dois lados (Anexo B): o lado B é o desenho espelhado em torno do
 * centro da arte. O teste fixa as invariantes físicas do fluxo:
 *
 * - os dois programas têm a **mesma caixa** (mesma origem X0 Y0);
 * - cada X do lado B é o espelho do lado A (`x_B = largura − x_A`), com o
 *   mesmo Y — a peça virada encaixa;
 * - as **marcas de registro** (L simétricos) caem nas mesmas posições;
 * - o kerf continua compensando o furo para dentro depois do espelho (o
 *   winding é preservado por `mirrorEntities`).
 */
import { describe, expect, it } from 'vitest';
import {
  compensateKerf,
  type DesignLayer,
  designToGcode,
  fiducialMarks,
  type Point,
  type Shape,
} from '../src/shared/design';
import { mirrorEntities } from '../src/shared/designEditor';

const LAYER: DesignLayer = { id: 'l1', power: 80, speed: 1200, kerf: 0.5 };

function rect(x0: number, y0: number, x1: number, y1: number): Shape {
  return {
    kind: 'rect',
    points: [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ],
    closed: true,
    layer: LAYER.id,
  };
}

function circle(cx: number, cy: number, r: number, n = 32): Shape {
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return { kind: 'ellipse', points, closed: true, layer: LAYER.id };
}

interface Seg {
  a: Point;
  b: Point;
}

/**
 * Segmentos **queimados** (entre `M4/M3` e `M5`, contando o `G0` de entrada):
 * é a geometria real do corte, independente da ordem dos vértices.
 */
function cutSegments(gcode: string): Seg[] {
  const segs: Seg[] = [];
  let prev: Point | null = null;
  let armed = false;
  for (const line of gcode.split('\n')) {
    if (/^M[34]\b/.test(line)) {
      armed = true;
      continue;
    }
    if (line.startsWith('M5')) {
      armed = false;
      prev = null;
      continue;
    }
    const m = /^G([01]) X(-?[\d.]+) Y(-?[\d.]+)/.exec(line);
    if (!m) continue;
    const pt = { x: Number(m[2]), y: Number(m[3]) };
    if (m[1] === '0') {
      prev = pt;
      continue;
    }
    if (armed && prev) segs.push({ a: prev, b: pt });
    prev = pt;
  }
  return segs;
}

function area(points: Point[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

function shapeArea(shape: Shape): number {
  return area(shape.points);
}

describe('gravar dos dois lados', () => {
  // Arte **assimétrica** (furo fora do centro) para o espelho ser visível.
  const art = [rect(0, 0, 100, 60), circle(30, 30, 10)];
  const marks: Shape[] = fiducialMarks(
    { minX: 0, minY: 0, maxX: 100, maxY: 60 },
    { kind: 'corners', offset: 5, size: 10 },
  ).map((points) => ({ kind: 'line', points, closed: false }));

  function programs(shapes: Shape[]) {
    const all = new Set(shapes.map((_, i) => i));
    const mirrored = mirrorEntities(shapes, all, 'h');
    const doc = { width: 150, height: 130, layers: [LAYER] };
    return {
      mirrored,
      a: designToGcode({ ...doc, shapes }),
      b: designToGcode({ ...doc, shapes: mirrored }),
    };
  }

  it('o lado B é o espelho do lado A, com a mesma origem e o mesmo Y', () => {
    const { a, b } = programs([...art, ...marks]);
    const sa = cutSegments(a);
    const sb = cutSegments(b);
    expect(sa.length).toBeGreaterThan(10);
    expect(sb).toHaveLength(sa.length);
    // Largura da arte + marcas (o programador ancora em 0).
    const width = Math.max(...sa.flatMap((s) => [s.a.x, s.b.x]));
    expect(width).toBeCloseTo(110, 2);
    // Cada segmento do lado A tem de existir espelhado no lado B (a ordem dos
    // vértices e o sentido do contorno mudam; o kerf pode variar 1 µm).
    const near = (p: Point, q: Point) =>
      Math.abs(p.x - q.x) < 0.01 && Math.abs(p.y - q.y) < 0.01;
    const rest = sb.slice();
    for (const seg of sa) {
      const exp = {
        a: { x: width - seg.a.x, y: seg.a.y },
        b: { x: width - seg.b.x, y: seg.b.y },
      };
      const i = rest.findIndex(
        (s) =>
          (near(s.a, exp.a) && near(s.b, exp.b)) ||
          (near(s.a, exp.b) && near(s.b, exp.a)),
      );
      expect(
        i,
        `segmento ${exp.a.x.toFixed(3)},${exp.a.y.toFixed(3)} → ${exp.b.x.toFixed(3)},${exp.b.y.toFixed(3)}`,
      ).toBeGreaterThanOrEqual(0);
      rest.splice(i, 1);
    }
    expect(rest).toEqual([]);
  });

  it('as marcas de registro ficam nas mesmas posições depois do espelho', () => {
    const all = new Set(marks.map((_, i) => i));
    const mirrored = mirrorEntities(marks, all, 'h');
    const key = (p: Point) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
    // Cada L espelhado é o próprio L de outro canto (a caixa é simétrica).
    const before = marks.flatMap((s) => s.points.map(key)).sort();
    const after = mirrored.flatMap((s) => s.points.map(key)).sort();
    expect(after).toEqual(before);
  });

  it('o kerf continua encolhendo o furo depois do espelho', () => {
    const all = new Set(art.map((_, i) => i));
    const mirrored = mirrorEntities(art, all, 'h');
    const outA = compensateKerf(
      art.map((s) => s.points),
      0.5,
    );
    const outB = compensateKerf(
      mirrored.map((s) => s.points),
      0.5,
    );
    const holeA = outA[1];
    const holeB = outB[1];
    expect(holeA && holeB).toBeTruthy();
    if (!holeA || !holeB) return;
    // O furo encolhe (área menor que o círculo original) e o espelho mantém
    // o mesmo tamanho — sem isso, o lado B sairia com o furo maior.
    expect(area(holeA)).toBeLessThan(shapeArea(art[1]));
    expect(area(holeB)).toBeCloseTo(area(holeA), 1);
  });

  it('sem marcas, a caixa do espelho é idêntica à do original', () => {
    const { a, b } = programs(art);
    const ca = cutSegments(a);
    const cb = cutSegments(b);
    expect(Math.max(...cb.flatMap((s) => [s.a.x, s.b.x]))).toBeCloseTo(
      Math.max(...ca.flatMap((s) => [s.a.x, s.b.x])),
      2,
    );
    // Mesma origem/área no cabeçalho: os dois programas começam em X0 Y0.
    expect(b.split('\n').slice(0, 4)).toEqual(a.split('\n').slice(0, 4));
  });
});
