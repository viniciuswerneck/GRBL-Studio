import { describe, expect, it } from 'vitest';
import { signedArea } from '../src/shared/boolean';
import { offsetLoop, offsetPasses } from '../src/shared/offset';
import type { Point } from '../src/shared/design';

const rect = (x: number, y: number, w: number, h: number): Point[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

/** Círculo aproximado por um polígono de `n` lados. */
const circle = (cx: number, cy: number, r: number, n = 64): Point[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });

const area = (points: Point[]): number => Math.abs(signedArea(points));

describe('offsetLoop', () => {
  it('cresce um retângulo (bico)', () => {
    const out = offsetLoop(rect(0, 0, 10, 10), 1);
    expect(out).not.toBeNull();
    expect(area(out as Point[])).toBeCloseTo(144); // 12 × 12
    const xs = (out as Point[]).map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(-1);
    expect(Math.max(...xs)).toBeCloseTo(11);
  });
  it('encolhe um retângulo', () => {
    const out = offsetLoop(rect(0, 0, 10, 10), -1);
    expect(out).not.toBeNull();
    expect(area(out as Point[])).toBeCloseTo(64); // 8 × 8
    const xs = (out as Point[]).map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(1);
    expect(Math.max(...xs)).toBeCloseTo(9);
  });

  it('canto reto com arredondamento (round)', () => {
    const out = offsetLoop(rect(0, 0, 10, 10), 1, { join: 'round' });
    // 144 menos os 4 cantos retos: 4 × (1 − π/4) ≈ 0,858
    expect(area(out as Point[])).toBeCloseTo(143.14, 1);
    expect((out as Point[]).length).toBeGreaterThan(12);
  });

  it('canto reto chanfrado (bevel)', () => {
    const out = offsetLoop(rect(0, 0, 10, 10), 1, { join: 'bevel' });
    expect(area(out as Point[])).toBeCloseTo(142); // 4 triângulos de 0,5
  });

  it('aproxima o raio de um círculo poligonal', () => {
    const out = offsetLoop(circle(0, 0, 10), 2) as Point[];
    // deslocar as arestas de 2 mm num 64-gono dá r + 2/cos(π/64)
    const r = out.map((p) => Math.hypot(p.x, p.y));
    expect(Math.min(...r)).toBeCloseTo(12.0024, 2);
    expect(Math.max(...r)).toBeCloseTo(12.0024, 2);
  });

  it('bico longo demais vira chanfro (miterLimit)', () => {
    const tri: Point[] = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 10, y: 1 },
    ];
    const out = offsetLoop(tri, 1, { miterLimit: 3 }) as Point[];
    // Num contorno convexo, todo ponto do offset fica a ≤ limite × distância do
    // vértice de origem (o bico seria muito maior que isso).
    for (const p of out) {
      const near = Math.min(
        ...tri.map((v) => Math.hypot(p.x - v.x, p.y - v.y)),
      );
      expect(near).toBeLessThan(3.001);
    }
    // e o bico agudo vira dois pontos (chanfro), não um
    expect(out.length).toBeGreaterThan(3);
  });

  it('contorno que colapsa devolve null', () => {
    expect(offsetLoop(rect(0, 0, 10, 10), -6)).toBeNull();
    expect(offsetLoop(rect(0, 0, 10, 10), 0)).toBeNull();
    expect(
      offsetLoop(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        1,
      ),
    ).toBeNull();
  });

  it('mantém o sentido do contorno (área positiva continua positiva)', () => {
    const out = offsetLoop(rect(0, 0, 10, 10), 1) as Point[];
    expect(signedArea(out)).toBeGreaterThan(0);
    const inverted = rect(0, 0, 10, 10).reverse();
    const out2 = offsetLoop(inverted, 1) as Point[];
    expect(signedArea(out2)).toBeLessThan(0);
  });
});

describe('offsetPasses', () => {
  it('gera contornos concêntricos', () => {
    const passes = offsetPasses(rect(0, 0, 10, 10), 1, 3);
    expect(passes).toHaveLength(3);
    expect(passes.map(area).map((a) => Math.round(a))).toEqual([144, 196, 256]);
  });

  it('para quando o contorno colapsa', () => {
    const passes = offsetPasses(rect(0, 0, 10, 10), -4, 5);
    expect(passes).toHaveLength(1);
    expect(area(passes[0])).toBeCloseTo(4); // 2 × 2
  });

  it('distância zero não gera passadas', () => {
    expect(offsetPasses(rect(0, 0, 10, 10), 0, 3)).toEqual([]);
  });
});
