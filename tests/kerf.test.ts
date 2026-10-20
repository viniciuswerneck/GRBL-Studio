/**
 * Kerf / folga de corte por camada (Anexo B): compensação de contornos
 * externos e furos, colapso de furos finos e integração no G-code.
 */
import { describe, expect, it } from 'vitest';
import type { DesignLayer, Shape } from '../src/shared/design';
import { designToGcode, makeRect } from '../src/shared/design';
import type { DesignDoc } from '../src/shared/designDoc';
import { parseDesignDoc, serializeDesignDoc } from '../src/shared/designDoc';
import {
  compensateKerf,
  containmentDepth,
  KERF_MAX_MM,
  sanitizeKerf,
} from '../src/shared/kerf';

function bounds(points: ReadonlyArray<{ x: number; y: number }>) {
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

function rect(x: number, y: number, w: number, h: number): Shape {
  return {
    kind: 'rect',
    points: makeRect(x, y, w, h),
    closed: true,
    layer: 'l1',
  };
}

function layer(extra: Partial<DesignLayer> = {}): DesignLayer {
  return { id: 'l1', ...extra };
}

const FLAT_OPTS = {
  feed: 1000,
  travelFeed: 3000,
  sMax: 1000,
  powerPercent: 100,
  passes: 1,
  mode: 'M4' as const,
};

function gcode(shapes: Shape[], layers: DesignLayer[]): string {
  return designToGcode({ shapes, layers, width: 150, height: 130 }, FLAT_OPTS);
}

/** Só as linhas de movimento (G0/G1), sem comentários nem M3/M5. */
function moves(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => line.startsWith('G0 ') || line.startsWith('G1 '));
}

describe('kerf', () => {
  it('sanitiza a folga (negativa/lixo → 0, acima do teto → teto)', () => {
    expect(sanitizeKerf(undefined)).toBe(0);
    expect(sanitizeKerf(Number.NaN)).toBe(0);
    expect(sanitizeKerf(-0.2)).toBe(0);
    expect(sanitizeKerf('0.15')).toBe(0.15);
    expect(sanitizeKerf(0.2)).toBe(0.2);
    expect(sanitizeKerf(99)).toBe(KERF_MAX_MM);
  });

  it('cresce o contorno externo em kerf/2', () => {
    const out = compensateKerf([makeRect(0, 0, 100, 100)], 2);
    expect(out).toHaveLength(1);
    expect(bounds(out[0] as { x: number; y: number }[])).toEqual({
      minX: -1,
      minY: -1,
      maxX: 101,
      maxY: 101,
    });
  });

  it('encolhe o furo em kerf/2 e volta a crescer na ilha (even-odd)', () => {
    const outer = makeRect(0, 0, 100, 100);
    const hole = makeRect(20, 20, 60, 60);
    const island = makeRect(40, 40, 20, 20);
    expect(containmentDepth(outer, [outer, hole, island])).toBe(0);
    expect(containmentDepth(hole, [outer, hole, island])).toBe(1);
    expect(containmentDepth(island, [outer, hole, island])).toBe(2);

    const out = compensateKerf([outer, hole, island], 2);
    expect(bounds(out[0] as { x: number; y: number }[])).toEqual({
      minX: -1,
      minY: -1,
      maxX: 101,
      maxY: 101,
    });
    expect(bounds(out[1] as { x: number; y: number }[])).toEqual({
      minX: 21,
      minY: 21,
      maxX: 79,
      maxY: 79,
    });
    expect(bounds(out[2] as { x: number; y: number }[])).toEqual({
      minX: 39,
      minY: 39,
      maxX: 61,
      maxY: 61,
    });
  });

  it('folga 0 devolve os mesmos contornos', () => {
    const loops = [makeRect(0, 0, 10, 10), makeRect(2, 2, 4, 4)];
    const out = compensateKerf(loops, 0);
    expect(out).toEqual(loops);
  });

  it('furo menor que a folga colapsa (null) e o externo é mantido', () => {
    const outer = makeRect(0, 0, 100, 100);
    const tiny = makeRect(40, 40, 0.5, 0.5);
    const out = compensateKerf([outer, tiny], 4);
    expect(out[0]).not.toBeNull();
    expect(out[1]).toBeNull();
  });

  it('no G-code: compensa, ancora na área real e não gera coordenada negativa', () => {
    const text = gcode([rect(10, 10, 10, 10)], [layer({ kerf: 0.2 })]);
    expect(text).toContain('; kerf 0.2 mm');
    // Âncora no contorno compensado: nada de coordenada negativa…
    expect(moves(text).join('\n')).not.toMatch(/[XY]-/);
    // …e o contorno percorrido tem 10,2 mm de lado (10 + 2 × 0,1).
    expect(text).toContain('X10.200');
  });

  it('no G-code: furo encolhe (mesma âncora, caminho mais estreito)', () => {
    const outer = rect(0, 0, 100, 100);
    const hole = { ...rect(40, 40, 20, 20) };
    const withKerf = gcode([outer, hole], [layer({ kerf: 2 })]);
    // Âncora em (-1, 101): o furo compensado (41..59) vira 42..60.
    expect(withKerf).toContain('X42.000 Y42.000');
    expect(withKerf).toContain('X60.000 Y60.000');
    // Sem kerf o furo começa em (40,40) → máquina (40, 60).
    const plain = gcode([outer, hole], [layer()]);
    expect(plain).toContain('X40.000 Y60.000');
    expect(plain).not.toContain('; kerf');
  });

  it('no G-code: linha aberta e traço grosso não recebem kerf', () => {
    const line: Shape = {
      kind: 'line',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      closed: false,
      layer: 'l1',
    };
    const stroke: Shape = { ...rect(0, 0, 10, 10), width: 1 };
    const base = moves(gcode([line, stroke], [layer()]));
    const compensated = moves(gcode([line, stroke], [layer({ kerf: 2 })]));
    expect(compensated).toEqual(base);
  });

  it('no G-code: registra o furo omitido quando ele colapsa', () => {
    const text = gcode(
      [rect(0, 0, 100, 100), rect(40, 40, 0.5, 0.5)],
      [layer({ kerf: 4 })],
    );
    expect(text).toContain('1 contorno(s) menor(es) que a folga');
  });

  it('persiste o kerf da camada no documento (.gstudio)', () => {
    const doc: DesignDoc = {
      page: { w: 150, h: 130 },
      activeLayer: 'l1',
      layers: [layer({ kerf: 0.15 })],
      shapes: [rect(0, 0, 10, 10)],
      seq: 1,
      layerSeq: 2,
    };
    const parsed = parseDesignDoc(serializeDesignDoc(doc));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.doc.layers[0].kerf).toBe(0.15);

    // Arquivo adulterado: valor absurdo é limitado, negativo é descartado.
    const raw = JSON.stringify({
      kind: 'grbl-studio/design',
      version: 1,
      layers: [
        { id: 'l1', kerf: 50 },
        { id: 'l2', kerf: -3 },
      ],
      shapes: [],
    });
    const sanitized = parseDesignDoc(raw);
    expect(sanitized.ok).toBe(true);
    if (!sanitized.ok) return;
    expect(sanitized.doc.layers[0].kerf).toBe(KERF_MAX_MM);
    expect(sanitized.doc.layers[1].kerf).toBeUndefined();
  });
});
