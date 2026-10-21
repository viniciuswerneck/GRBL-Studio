import { describe, expect, it } from 'vitest';
import type { Shape } from '../src/shared/design';
import { jigOutlines, sanitizeJigClearance } from '../src/shared/jig';
import { arcTextShapes, minArcRadius } from '../src/shared/textArc';

function square(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  extra: Partial<Shape> = {},
): Shape {
  return {
    kind: 'rect',
    points: [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ],
    closed: true,
    ...extra,
  };
}

function circle(cx: number, cy: number, r: number, n = 48): Shape {
  const points = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return { kind: 'ellipse', points, closed: true };
}

function bbox(points: Array<{ x: number; y: number }>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

describe('jigOutlines', () => {
  it('cresce o contorno externo pela folga (e ignora o furo)', () => {
    const res = jigOutlines([square(0, 0, 100, 60), circle(50, 30, 10)], 0.5);
    expect(res.outlines).toHaveLength(1);
    const b = bbox(res.outlines[0]);
    expect(b.maxX - b.minX).toBeCloseTo(101, 1);
    expect(b.maxY - b.minY).toBeCloseTo(61, 1);
    expect(b.minX).toBeCloseTo(-0.5, 1);
    expect(b.minY).toBeCloseTo(-0.5, 1);
  });

  it('faz um molde por peça quando há peças soltas', () => {
    const res = jigOutlines([square(0, 0, 20, 20), square(50, 0, 70, 20)], 0.4);
    expect(res.outlines).toHaveLength(2);
  });

  it('ignora linhas abertas e traço grosso, contando o que sobrou', () => {
    const open: Shape = {
      kind: 'line',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      closed: false,
    };
    const thick = square(0, 0, 10, 10, { width: 1.2 });
    const res = jigOutlines([square(0, 0, 40, 40), open, thick], 0.3);
    expect(res.outlines).toHaveLength(1);
    expect(res.skipped).toBe(2);
  });

  it('sem contorno fechado não gera molde', () => {
    const res = jigOutlines(
      [
        {
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 5 },
            { x: 10, y: 0 },
          ],
          closed: false,
        },
      ],
      0.5,
    );
    expect(res.outlines).toEqual([]);
    expect(res.skipped).toBe(1);
  });

  it('folga 0 ainda produz um molde (mínimo de 0,05 mm)', () => {
    const res = jigOutlines([square(0, 0, 10, 10)], 0);
    const b = bbox(res.outlines[0]);
    expect(b.maxX - b.minX).toBeCloseTo(10.1, 2);
  });

  it('sanitiza a folga', () => {
    expect(sanitizeJigClearance(0.4)).toBe(0.4);
    expect(sanitizeJigClearance(-3)).toBe(0);
    expect(sanitizeJigClearance(99)).toBe(5);
    expect(sanitizeJigClearance('x')).toBe(0);
  });
});

describe('arcTextShapes', () => {
  const line: Shape = {
    kind: 'line',
    points: [
      { x: -10, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    closed: false,
    group: 'g1',
    name: 'Texto 1',
  };

  it('mantém o ápice e curva as pontas para baixo (raio positivo)', () => {
    const out = arcTextShapes([line], 50, 0);
    expect(out[0].points).toHaveLength(3);
    const [a, b, c] = out[0].points;
    expect(b.x).toBeCloseTo(0, 9);
    expect(b.y).toBeCloseTo(0, 9);
    expect(a.x).toBeCloseTo(-9.933, 2);
    expect(a.y).toBeCloseTo(-0.997, 2);
    expect(c.x).toBeCloseTo(9.933, 2);
    expect(c.y).toBeCloseTo(-0.997, 2);
    // Metadados preservados (grupo/nome/tipo).
    expect(out[0].group).toBe('g1');
    expect(out[0].name).toBe('Texto 1');
    expect(out[0].kind).toBe('line');
  });

  it('raio negativo curva para cima', () => {
    const out = arcTextShapes([line], -50, 0);
    expect(out[0].points[0].y).toBeCloseTo(0.997, 2);
    expect(out[0].points[2].y).toBeCloseTo(0.997, 2);
  });

  it('preserva a altura do glifo (sem achatar as letras)', () => {
    const glyph: Shape = {
      kind: 'line',
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 8 },
      ],
      closed: false,
    };
    const out = arcTextShapes([glyph], 60, 0);
    expect(out[0].points[0]).toEqual({ x: 0, y: 0 });
    expect(out[0].points[1].y).toBeCloseTo(8, 9);
  });

  it('linha de base deslocada mantém a altura', () => {
    const glyph: Shape = {
      kind: 'line',
      points: [
        { x: 0, y: 20 },
        { x: 0, y: 28 },
      ],
      closed: false,
    };
    const out = arcTextShapes([glyph], 60, 20);
    expect(out[0].points[0].y).toBeCloseTo(20, 9);
    expect(out[0].points[1].y).toBeCloseTo(28, 9);
  });

  it('raio 0 devolve os mesmos pontos (cópia)', () => {
    const out = arcTextShapes([line], 0, 0);
    expect(out[0].points).toEqual(line.points);
    expect(out[0].points).not.toBe(line.points);
  });

  it('minArcRadius cresce com a largura do texto', () => {
    expect(minArcRadius([line])).toBeCloseTo(10 / 0.9, 5);
    const short: Shape = {
      kind: 'line',
      points: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
      closed: false,
    };
    expect(minArcRadius([short])).toBe(5);
  });
});
