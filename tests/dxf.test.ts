/**
 * Importação DXF (P2.4): geometria, blocos/INSERT, camadas, unidades e
 * geração de G-code. O parser é puro e não depende do Electron.
 */
import { describe, expect, it } from 'vitest';
import {
  DxfError,
  dxfTextToGcode,
  dxfToGcode,
  parseDxf,
} from '../src/shared/dxf';

type Pair = [number, string | number];

function tags(...items: Pair[]): string {
  return items.map(([code, value]) => `${code}\n${value}`).join('\n');
}

function section(name: string, body: Pair[]): string {
  return tags([0, 'SECTION'], [2, name], ...body, [0, 'ENDSEC']);
}

function dxfDoc(
  entities: Pair[],
  opts: {
    units?: number;
    layers?: Pair[][];
    blocks?: Pair[];
  } = {},
): string {
  const header = section('HEADER', [
    [9, '$INSUNITS'],
    [70, opts.units ?? 4],
  ]);
  const tables = opts.layers
    ? section('TABLES', [
        [0, 'TABLE'],
        [2, 'LAYER'],
        [70, opts.layers.length],
        ...opts.layers.flat(),
        [0, 'ENDTAB'],
      ])
    : section('TABLES', []);
  const blocks = section('BLOCKS', opts.blocks ?? []);
  const ents = section('ENTITIES', entities);
  return `${header}\n${tables}\n${blocks}\n${ents}\n${tags([0, 'EOF'])}\n`;
}

function layer(name: string, flags = 0, color = 7): Pair[] {
  return [
    [0, 'LAYER'],
    [2, name],
    [70, flags],
    [62, color],
  ];
}

describe('parseDxf — geometria', () => {
  it('lê LINE e normaliza o canto mínimo em (0,0)', () => {
    const doc = parseDxf(
      dxfDoc([
        [0, 'LINE'],
        [8, 'CUT'],
        [10, 10],
        [20, 20],
        [11, 110],
        [21, 20],
      ]),
    );
    expect(doc.contours).toHaveLength(1);
    expect(doc.contours[0].closed).toBe(false);
    expect(doc.contours[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    expect(doc.width).toBeCloseTo(100, 6);
    expect(doc.height).toBeCloseTo(0, 6);
    expect(doc.unit).toBe('mm');
  });

  it('lê LWPOLYLINE fechada', () => {
    const doc = parseDxf(
      dxfDoc([
        [0, 'LWPOLYLINE'],
        [8, 'CUT'],
        [90, 4],
        [70, 1],
        [10, 0],
        [20, 0],
        [10, 50],
        [20, 0],
        [10, 50],
        [20, 30],
        [10, 0],
        [20, 30],
      ]),
    );
    expect(doc.contours).toHaveLength(1);
    expect(doc.contours[0].closed).toBe(true);
    expect(doc.contours[0].points).toHaveLength(4);
    expect(doc.width).toBeCloseTo(50, 6);
    expect(doc.height).toBeCloseTo(30, 6);
  });

  it('amostra o bulge (arco) de uma polilinha', () => {
    const doc = parseDxf(
      dxfDoc([
        [0, 'LWPOLYLINE'],
        [8, 'CUT'],
        [90, 2],
        [70, 0],
        [10, 0],
        [20, 0],
        [42, 1],
        [10, 20],
        [20, 0],
      ]),
    );
    expect(doc.contours).toHaveLength(1);
    const points = doc.contours[0].points;
    expect(points.length).toBeGreaterThan(3);
    // Semicírculo de bulge +1: a corda fica em y=0 e o arco desce 10 mm.
    expect(doc.height).toBeCloseTo(10, 6);
    expect(doc.width).toBeCloseTo(20, 6);
    expect(points.at(-1)).toEqual({ x: 20, y: 10 });
  });

  it('lê CIRCLE e ARC', () => {
    const doc = parseDxf(
      dxfDoc([
        [0, 'CIRCLE'],
        [8, 'CUT'],
        [10, 50],
        [20, 50],
        [40, 20],
        [0, 'ARC'],
        [8, 'CUT'],
        [10, 100],
        [20, 50],
        [40, 10],
        [50, 0],
        [51, 90],
      ]),
    );
    expect(doc.contours).toHaveLength(2);
    expect(doc.contours[0].closed).toBe(true);
    expect(doc.contours[0].points.length).toBe(72);
    expect(doc.contours[1].closed).toBe(false);
    expect(doc.contours[1].points.length).toBeGreaterThan(3);
    expect(doc.contours[1].points.at(-1)?.y).toBeGreaterThan(
      doc.contours[1].points[0].y,
    );
  });

  it('lê ELLIPSE completa (fechada)', () => {
    const doc = parseDxf(
      dxfDoc([
        [0, 'ELLIPSE'],
        [8, 'CUT'],
        [10, 100],
        [20, 100],
        [11, 20],
        [21, 0],
        [40, 0.5],
      ]),
    );
    expect(doc.contours).toHaveLength(1);
    expect(doc.contours[0].closed).toBe(true);
    expect(doc.width).toBeCloseTo(40, 6);
    expect(doc.height).toBeCloseTo(20, 6);
  });

  it('avalia SPLINE (NURBS) pelos pontos de controle e nós', () => {
    const doc = parseDxf(
      dxfDoc([
        [0, 'SPLINE'],
        [8, 'CUT'],
        [70, 0],
        [71, 2],
        [40, 0],
        [40, 0],
        [40, 0],
        [40, 1],
        [40, 1],
        [40, 1],
        [10, 0],
        [20, 0],
        [10, 5],
        [20, 10],
        [10, 10],
        [20, 0],
      ]),
    );
    expect(doc.contours).toHaveLength(1);
    const points = doc.contours[0].points;
    expect(points.length).toBeGreaterThan(3);
    expect(points[0].x).toBeCloseTo(0, 6);
    expect(points[0].y).toBeCloseTo(0, 6);
    expect(points.at(-1)?.x).toBeCloseTo(10, 6);
    expect(points.at(-1)?.y).toBeCloseTo(0, 6);
  });

  it('resolve INSERT com base, escala e rotação', () => {
    const blocks: Pair[] = [
      [0, 'BLOCK'],
      [2, 'PECA'],
      [10, 0],
      [20, 0],
      [0, 'LINE'],
      [8, '0'],
      [10, 0],
      [20, 0],
      [11, 10],
      [21, 0],
      [0, 'ENDBLK'],
    ];
    const doc = parseDxf(
      dxfDoc(
        [
          [0, 'INSERT'],
          [8, 'CUT'],
          [2, 'PECA'],
          [10, 100],
          [20, 50],
          [41, 2],
          [42, 2],
          [50, 90],
        ],
        { blocks },
      ),
    );
    expect(doc.contours).toHaveLength(1);
    expect(doc.contours[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 20 },
    ]);
  });

  it('converte polegadas ($INSUNITS=1) para milímetros', () => {
    const doc = parseDxf(
      dxfDoc(
        [
          [0, 'LINE'],
          [8, 'CUT'],
          [10, 0],
          [20, 0],
          [11, 1],
          [21, 1],
        ],
        { units: 1 },
      ),
    );
    expect(doc.unit).toBe('in');
    expect(doc.unitScale).toBe(25.4);
    expect(doc.width).toBeCloseTo(25.4, 6);
    expect(doc.height).toBeCloseTo(25.4, 6);
  });
});

describe('parseDxf — camadas e entidades não suportadas', () => {
  it('ignora entidades em camadas congeladas/desligadas', () => {
    const doc = parseDxf(
      dxfDoc(
        [
          [0, 'LINE'],
          [8, 'CUT'],
          [10, 0],
          [20, 0],
          [11, 10],
          [21, 0],
          [0, 'LINE'],
          [8, 'FROZEN'],
          [10, 0],
          [20, 0],
          [11, 10],
          [21, 0],
          [0, 'LINE'],
          [8, 'OFF'],
          [10, 0],
          [20, 0],
          [11, 10],
          [21, 0],
          [0, 'LINE'],
          [8, 'CUT'],
          [62, -3],
          [10, 0],
          [20, 0],
          [11, 10],
          [21, 0],
        ],
        { layers: [layer('CUT'), layer('FROZEN', 1), layer('OFF', 0, -7)] },
      ),
    );
    expect(doc.contours).toHaveLength(1);
    expect(doc.hidden).toBe(3);
    expect(doc.layers).toEqual([
      { name: 'CUT', visible: true },
      { name: 'FROZEN', visible: false },
      { name: 'OFF', visible: false },
    ]);
  });

  it('conta TEXT/HATCH como não suportados sem inventar geometria', () => {
    const doc = parseDxf(
      dxfDoc([
        [0, 'TEXT'],
        [8, 'CUT'],
        [1, 'olá'],
        [0, 'HATCH'],
        [8, 'CUT'],
        [0, 'LINE'],
        [8, 'CUT'],
        [10, 0],
        [20, 0],
        [11, 5],
        [21, 0],
      ]),
    );
    expect(doc.contours).toHaveLength(1);
    expect(doc.unsupported).toEqual({ HATCH: 1, TEXT: 1 });
  });

  it('devolve documento vazio quando não há geometria', () => {
    const doc = parseDxf(dxfDoc([]));
    expect(doc.contours).toEqual([]);
    expect(doc.width).toBe(0);
    expect(doc.height).toBe(0);
  });

  it('recusa DXF binário com erro tipado', () => {
    expect(() => parseDxf('AutoCAD Binary DXF\r\n\x1a\x00')).toThrow(DxfError);
    try {
      parseDxf('AutoCAD Binary DXF\r\n\x1a\x00');
    } catch (err) {
      expect((err as DxfError).code).toBe('binary');
    }
  });
});

describe('dxfToGcode', () => {
  it('emite G-code com cabeçalho DXF e Y para cima (sem flip)', () => {
    const doc = parseDxf(
      dxfDoc([
        [0, 'LINE'],
        [8, 'CUT'],
        [10, 0],
        [20, 0],
        [11, 0],
        [21, 10],
      ]),
    );
    const gcode = dxfToGcode(doc, { feed: 800, travelFeed: 2000 });
    expect(gcode).toContain('importação DXF');
    expect(gcode).toContain('G21');
    expect(gcode).toContain('G90');
    expect(gcode).toContain('G94');
    expect(gcode).toContain('M5');
    expect(gcode).toContain('G0 X0.000 Y0.000 F2000');
    expect(gcode).toContain('G1 X0.000 Y10.000 F800');
    expect(gcode).not.toContain('Y-');
    expect(gcode.trimEnd().endsWith('G0 X0 Y0')).toBe(true);
  });

  it('atalho de texto produz o mesmo G-code', () => {
    const text = dxfDoc([
      [0, 'LINE'],
      [8, 'CUT'],
      [10, 0],
      [20, 0],
      [11, 10],
      [21, 0],
    ]);
    expect(dxfTextToGcode(text)).toBe(dxfToGcode(parseDxf(text)));
  });
});
