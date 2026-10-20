/**
 * Abas de retenção e sobre-corte (Anexo B): divisão do contorno fechado em
 * trechos de corte, folga nas abas e emenda sem “bico” no G-code.
 */
import { describe, expect, it } from 'vitest';
import type { DesignLayer, Shape } from '../src/shared/design';
import { designToGcode, makeRect } from '../src/shared/design';
import type { DesignDoc } from '../src/shared/designDoc';
import { parseDesignDoc, serializeDesignDoc } from '../src/shared/designDoc';
import {
  LEAD_MAX_MM,
  loopLength,
  overcutTail,
  sanitizeLead,
  sanitizeTabCount,
  sanitizeTabWidth,
  splitByTabs,
  TAB_MAX_COUNT,
  TAB_MAX_WIDTH_MM,
} from '../src/shared/tabs';

const FLAT_OPTS = {
  feed: 1000,
  travelFeed: 3000,
  sMax: 1000,
  powerPercent: 100,
  passes: 1,
  mode: 'M4' as const,
};

function shape(): Shape {
  return {
    kind: 'rect',
    points: makeRect(0, 0, 10, 10),
    closed: true,
    layer: 'l1',
  };
}

function layer(extra: Partial<DesignLayer> = {}): DesignLayer {
  return { id: 'l1', ...extra };
}

function gcode(l: DesignLayer): string {
  return designToGcode(
    { shapes: [shape()], layers: [l], width: 150, height: 130 },
    FLAT_OPTS,
  );
}

function segmentLength(points: ReadonlyArray<{ x: number; y: number }>) {
  // Comprimento de um trecho **aberto** (sem a aresta de fechamento).
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  return sum;
}

describe('abas de retenção e sobre-corte', () => {
  it('sanitiza contagem, largura e sobre-corte', () => {
    expect(sanitizeTabCount(undefined)).toBe(0);
    expect(sanitizeTabCount(3.9)).toBe(3);
    expect(sanitizeTabCount(-2)).toBe(0);
    expect(sanitizeTabCount(999)).toBe(TAB_MAX_COUNT);
    expect(sanitizeTabWidth(undefined)).toBe(2);
    expect(sanitizeTabWidth(0)).toBe(2);
    expect(sanitizeTabWidth(0.4)).toBe(0.4);
    expect(sanitizeTabWidth(99)).toBe(TAB_MAX_WIDTH_MM);
    expect(sanitizeLead(undefined)).toBe(0);
    expect(sanitizeLead(0.5)).toBe(0.5);
    expect(sanitizeLead(-1)).toBe(0);
    expect(sanitizeLead(99)).toBe(LEAD_MAX_MM);
  });

  it('mede o perímetro incluindo a aresta de fechamento', () => {
    expect(loopLength(makeRect(0, 0, 10, 10))).toBe(40);
    expect(loopLength(makeRect(0, 0, 3, 4))).toBe(14);
  });

  it('divide o contorno em N trechos e pula N abas', () => {
    const square = makeRect(0, 0, 10, 10);
    const segments = splitByTabs(square, 4, 2);
    expect(segments).toHaveLength(4);
    // 4 abas de 2 mm num perímetro de 40 mm → 32 mm de corte.
    const total = segments.reduce((sum, s) => sum + segmentLength(s), 0);
    expect(total).toBeCloseTo(32, 6);
    // Centros em 5, 15, 25 e 35 mm: o 1º trecho vai de (6,0) a (10,4).
    expect(segments[0][0]).toEqual({ x: 6, y: 0 });
    expect(segments[0][segments[0].length - 1]).toEqual({ x: 10, y: 4 });
  });

  it('não cria abas num contorno curto demais', () => {
    // 2 mm de perímetro para uma aba de 2 mm: não sobra corte nenhum.
    expect(splitByTabs(makeRect(0, 0, 0.5, 0.5), 4, 2)).toEqual([]);
    // 4 mm de perímetro: cabe 1 aba (2 mm) e 1 trecho.
    expect(splitByTabs(makeRect(0, 0, 1, 1), 4, 2)).toHaveLength(1);
    expect(splitByTabs(makeRect(0, 0, 10, 10), 0, 2)).toEqual([]);
  });

  it('limita a contagem ao espaço disponível', () => {
    // 40 mm com abas de 2 mm e 0,2 mm de corte → no máximo 18 abas.
    const segments = splitByTabs(makeRect(0, 0, 10, 10), 50, 2);
    expect(segments).toHaveLength(18);
  });

  it('o sobre-corte continua além da origem na mesma direção', () => {
    const square = makeRect(0, 0, 10, 10);
    const tail = overcutTail(square, 2);
    expect(tail).toHaveLength(1);
    expect(tail[0]).toEqual({ x: 2, y: 0 });
    expect(overcutTail(square, 0)).toEqual([]);
  });

  it('no G-code: cada trecho tem seu próprio M3 (laser desliga na aba)', () => {
    const text = gcode(layer({ tabs: 4, tabWidth: 2 }));
    expect(text).toContain('; abas 4 × 2 mm');
    expect(text.match(/M4 S1000/g)).toHaveLength(4);
  });

  it('no G-code: sobre-corte termina 2 mm depois da origem', () => {
    const text = gcode(layer({ lead: 2 }));
    expect(text).toContain('; sobre-corte 2 mm');
    // O último G0 é o retorno para casa; o sobre-corte é o último G1.
    const moves = text.split('\n').filter((l) => l.startsWith('G1 '));
    const point = (line: string) => {
      const x = /X(-?\d+\.\d+)/.exec(line);
      const y = /Y(-?\d+\.\d+)/.exec(line);
      return { x: Number(x?.[1]), y: Number(y?.[1]) };
    };
    const first = text.split('\n').find((l) => l.startsWith('G0 '));
    if (!first) throw new Error('sem G0');
    const start = point(first);
    const end = point(moves[moves.length - 1]);
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeCloseTo(2, 3);
  });

  it('abas vencem o sobre-corte (peça dividida em trechos)', () => {
    const text = gcode(layer({ tabs: 2, tabWidth: 2, lead: 1 }));
    expect(text).toContain('; abas 2 × 2 mm');
    expect(text).not.toContain('; sobre-corte');
    expect(text.match(/M4 S1000/g)).toHaveLength(2);
  });

  it('persiste abas, largura e sobre-corte no documento (.gstudio)', () => {
    const doc: DesignDoc = {
      page: { w: 150, h: 130 },
      activeLayer: 'l1',
      layers: [layer({ tabs: 4, tabWidth: 1.5, lead: 0.8 })],
      shapes: [],
      seq: 1,
      layerSeq: 2,
    };
    const parsed = parseDesignDoc(serializeDesignDoc(doc));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.doc.layers[0]).toMatchObject({
      tabs: 4,
      tabWidth: 1.5,
      lead: 0.8,
    });
  });
});
