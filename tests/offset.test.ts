import { describe, expect, it } from 'vitest';
import { signedArea } from '../src/shared/boolean';
import {
  offsetLoop,
  offsetPasses,
  offsetPolyline,
  strokeOffsets,
  strokePaths,
} from '../src/shared/offset';
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

  it('contorno fino encolhendo colapsa em vez de virar espigão', () => {
    // Arestas quase colineares: a intersecção das retas deslocadas cairia a
    // ~200 mm do vértice, bem fora da peça (e o laser queimaria lá).
    const sliver: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 0.05 },
    ];
    expect(offsetLoop(sliver, -1)).toBeNull();
    // O traço grosso do mesmo contorno fica na faixa esperada (±width/2).
    for (const ring of strokePaths(sliver, true, 2)) {
      for (const p of ring) {
        expect(Math.abs(p.x)).toBeLessThanOrEqual(11.001);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(1.051);
      }
    }
  });

  it('quina aguda legítima mantém o vértice do inset (sem chanfro)', () => {
    // Triângulo 10×2 encolhido 0,5 mm: o inset existe (raio interno ≈ 0,96) e
    // os vértices da base ficam a ~2,6 mm do original — nada de chanfro.
    const tri: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 2 },
    ];
    const out = offsetLoop(tri, -0.5) as Point[];
    expect(out).not.toBeNull();
    expect(out).toHaveLength(3);
    expect(out[0].x).toBeCloseTo(2.596, 2);
    expect(out[1].x).toBeCloseTo(7.404, 2);
    expect(out[2].y).toBeCloseTo(1.461, 2);
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

describe('strokeOffsets', () => {
  it('cobre a faixa centrada, com as pontas exatamente em ±width/2', () => {
    const d = strokeOffsets(2, 0.1);
    expect(d).toHaveLength(21); // 1 mm para cada lado em passos de 0,1
    expect(d[0]).toBeCloseTo(-1);
    expect(d[d.length - 1]).toBeCloseTo(1);
    expect(d).toContain(0);
    for (let i = 1; i < d.length; i++) {
      expect(d[i] - d[i - 1]).toBeLessThanOrEqual(0.1000001);
    }
  });

  it('espaçamento nunca passa do passo pedido', () => {
    const d = strokeOffsets(1, 0.05);
    expect(d).toHaveLength(21);
    for (let i = 1; i < d.length; i++) {
      expect(d[i] - d[i - 1]).toBeLessThanOrEqual(0.0500001);
    }
  });

  it('espessura zero (ou irrisória) é o caminho original', () => {
    expect(strokeOffsets(0)).toEqual([0]);
    expect(strokeOffsets(0.0001)).toEqual([0]);
    // O sinal é ignorado: a faixa é simétrica em torno do caminho.
    expect(strokeOffsets(-2)).toEqual(strokeOffsets(2));
  });

  it('faixa com até um passo de largura é uma passada só', () => {
    // Antes: `strokeOffsets(0.1, 0.1)` devolvia 3 passadas (espaçamento 0,05),
    // queimando a faixa com o dobro da densidade pedida.
    expect(strokeOffsets(0.1, 0.1)).toEqual([0]);
    expect(strokeOffsets(0.099, 0.1)).toEqual([0]);
    // Acima de um passo, a lateral mais externa encosta na borda.
    expect(strokeOffsets(0.2, 0.1)).toEqual([-0.1, 0, 0.1]);
    // 0,21 mm: as pontas ficam a 0,1 mm (5 µm da borda — dentro do kerf).
    expect(strokeOffsets(0.21, 0.1)).toEqual([-0.1, 0, 0.1]);
    // 0,25 mm (1 px de traço): passo real de 0,1 (as bordas ficam cobertas
    // pelo kerf do feixe, como no preenchimento).
    expect(strokeOffsets(0.25, 0.1)).toEqual([-0.1, 0, 0.1]);
  });

  it('limita a quantidade de linhas mantendo as pontas', () => {
    const d = strokeOffsets(1000, 0.05, 41);
    expect(d.length).toBeLessThanOrEqual(41);
    expect(d[0]).toBeCloseTo(-500);
    expect(d[d.length - 1]).toBeCloseTo(500);
  });
});

describe('offsetPolyline', () => {
  it('desloca uma linha reta pela normal', () => {
    const out = offsetPolyline(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      2,
    );
    expect(out).not.toBeNull();
    expect(out as Point[]).toHaveLength(2);
    expect((out as Point[])[0].y).toBeCloseTo(2);
    expect((out as Point[])[1].y).toBeCloseTo(2);
  });

  it('curva fechando encolhe (sem espigão) e curva abrindo usa bico limitado', () => {
    // "L" indo para +X e depois +Y (curva à esquerda): o lado esquerdo é o de
    // dentro da curva, então o canto deslocado para a esquerda encolhe.
    const lShape: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const inside = offsetPolyline(lShape, 2) as Point[];
    expect(inside).toHaveLength(3);
    expect(inside[1].x).toBeCloseTo(8);
    expect(inside[1].y).toBeCloseTo(2);
    // Do outro lado o canto abre e o bico é mantido (2,83 ≤ limite 3 × 2).
    const outside = offsetPolyline(lShape, -2) as Point[];
    expect(outside[1].x).toBeCloseTo(12);
    expect(outside[1].y).toBeCloseTo(-2);
    // nenhum ponto foge do limite de bico (3 × distância, com folga)
    for (const p of outside) {
      const near = Math.min(
        ...lShape.map((v) => Math.hypot(p.x - v.x, p.y - v.y)),
      );
      expect(near).toBeLessThan(6.001);
    }
  });

  it('polilinha degenerada devolve null', () => {
    expect(offsetPolyline([{ x: 1, y: 1 }], 2)).toBeNull();
    expect(
      offsetPolyline(
        [
          { x: 1, y: 1 },
          { x: 1, y: 1 },
        ],
        2,
      ),
    ).toBeNull();
    expect(
      offsetPolyline(
        [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
        ],
        0,
      ),
    ).toBeNull();
  });
});

describe('strokePaths', () => {
  it('espessura dentro do passo devolve só o caminho original', () => {
    expect(strokePaths(rect(0, 0, 10, 10), true, 0.1)).toHaveLength(1);
    expect(strokePaths(rect(0, 0, 10, 10), true, 0)).toHaveLength(1);
  });

  it('quadrado com 2 mm de espessura: anéis de 8×8 a 12×12 (centrados)', () => {
    const paths = strokePaths(rect(0, 0, 10, 10), true, 2, 0.1);
    expect(paths).toHaveLength(21);
    const areas = paths.map(area).sort((a, b) => a - b);
    expect(areas[0]).toBeCloseTo(64); // 8 × 8 (dentro)
    expect(areas[areas.length - 1]).toBeCloseTo(144); // 12 × 12 (fora)
  });

  it('linha aberta com 2 mm de espessura: paralelas dos dois lados', () => {
    const paths = strokePaths(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      false,
      2,
      0.5,
    );
    expect(paths).toHaveLength(5); // −1, −0,5, 0, 0,5, 1
    const ys = paths.map((p) => p[0].y).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(-1);
    expect(ys[2]).toBeCloseTo(0);
    expect(ys[4]).toBeCloseTo(1);
  });

  it('caminho degenerado não gera nada', () => {
    expect(strokePaths([{ x: 0, y: 0 }], false, 1)).toEqual([]);
    expect(
      strokePaths(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        true,
        1,
      ),
    ).toEqual([]);
  });
});
