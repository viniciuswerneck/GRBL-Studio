/**
 * Grade de símbolos (RF-SYM-9): vários símbolos num só programa de G-code, com
 * espaçamento configurável, invariantes de segurança e geometria alinhada.
 */

import { describe, expect, it } from 'vitest';
import {
  barcodeGridToGcode,
  dataMatrixGridToGcode,
  qrGridToGcode,
  qrToGcode,
  symbolGridToGcode,
} from '../src/shared/symbol/gcode';

const baseParams = {
  feed: 1000,
  travelFeed: 3000,
  sMax: 1000,
  powerPercent: 100,
  passes: 1,
  mode: 'M4' as const,
  moduleMm: 0.5,
};

const MOVE_RE = /^(G0|G1) X(-?\d+\.\d+) Y(-?\d+\.\d+)/;

/** Linhas de movimento (`G0`/`G1`) — ignora comentários e o `G0 X0 Y0` fixo. */
function moves(gcode: string): string[] {
  return gcode.split('\n').filter((l) => MOVE_RE.test(l));
}

function coords(gcode: string): Array<{ x: number; y: number }> {
  return moves(gcode).map((l) => {
    const m = MOVE_RE.exec(l) as RegExpExecArray;
    return { x: Number(m[2]), y: Number(m[3]) };
  });
}

describe('symbolGridToGcode / qrGridToGcode', () => {
  it('posiciona 4 QR em 2×2 com espaçamento e um só cabeçalho/rodapé', () => {
    const single = qrToGcode('A', baseParams);
    const grid = qrGridToGcode(['A', 'A', 'A', 'A'], {
      ...baseParams,
      columns: 2,
      gapXMm: 10,
      gapYMm: 10,
    });

    expect(grid.count).toBe(4);
    expect(grid.columns).toBe(2);
    expect(grid.rows).toBe(2);
    expect(grid.cellWidthMm).toBeCloseTo(single.widthMm, 6);
    expect(grid.cellHeightMm).toBeCloseTo(single.heightMm, 6);
    expect(grid.widthMm).toBeCloseTo(2 * single.widthMm + 10, 6);
    expect(grid.heightMm).toBeCloseTo(2 * single.heightMm + 10, 6);
    expect(grid.segments).toBe(4 * single.segments);

    // Um único cabeçalho e um único rodapé.
    const lines = grid.gcode.split('\n');
    expect(lines.filter((l) => l === 'G21')).toHaveLength(1);
    expect(lines.filter((l) => l === 'G90')).toHaveLength(1);
    expect(lines[lines.length - 1]).toBe(''); // termina com \n
    expect(grid.gcode.trimEnd().endsWith('G0 X0 Y0')).toBe(true);
  });

  it('cabeçalho lista cada célula e o resumo da grade', () => {
    const grid = qrGridToGcode(['AAA', 'BBB'], {
      ...baseParams,
      columns: 2,
      gapXMm: 4,
      gapYMm: 6,
    });
    expect(grid.gcode).toContain('; Grade de símbolos (GRBL Studio)');
    expect(grid.gcode).toContain('; [1] AAA');
    expect(grid.gcode).toContain('; [2] BBB');
    expect(grid.gcode).toContain('espaçamento 4.000 × 6.000 mm');
  });

  it('colunas padrão = ceil(sqrt(n))', () => {
    const grid = qrGridToGcode(['1', '2', '3', '4', '5'], baseParams);
    expect(grid.columns).toBe(3);
    expect(grid.rows).toBe(2);
  });

  it('mantém as coordenadas dentro da caixa da grade', () => {
    const grid = qrGridToGcode(['A', 'B', 'C', 'D'], {
      ...baseParams,
      columns: 2,
      gapXMm: 5,
      gapYMm: 5,
    });
    const pts = coords(grid.gcode);
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    expect(minX).toBeGreaterThanOrEqual(0);
    expect(minY).toBeGreaterThanOrEqual(0);
    expect(maxX).toBeLessThanOrEqual(grid.widthMm + 1e-6);
    expect(maxY).toBeLessThanOrEqual(grid.heightMm + 1e-6);
    // A primeira célula (topo) começa acima da segunda linha.
    expect(maxY).toBeGreaterThan(grid.heightMm / 2);
  });

  it('respeita a origem', () => {
    const grid = qrGridToGcode(['A'], {
      ...baseParams,
      originX: 100,
      originY: 50,
    });
    const minX = Math.min(...coords(grid.gcode).map((p) => p.x));
    const minY = Math.min(...coords(grid.gcode).map((p) => p.y));
    expect(minX).toBeGreaterThanOrEqual(100);
    expect(minY).toBeGreaterThanOrEqual(50);
  });

  it('não desloca com o laser armado e limita a potência a S ≤ sMax', () => {
    const grid = qrGridToGcode(['A', 'B'], {
      ...baseParams,
      sMax: 800,
      powerPercent: 60,
    });
    let armed = false;
    for (const line of grid.gcode.split('\n')) {
      if (line.startsWith('M3 S') || line.startsWith('M4 S')) {
        armed = true;
        const s = Number(/S(\d+)/.exec(line)?.[1]);
        expect(s).toBeLessThanOrEqual(800);
      } else if (line.trim() === 'M5') {
        armed = false;
      } else if (line.startsWith('G0')) {
        expect(armed).toBe(false);
      }
    }
  });

  it('agrega avisos sem repetição', () => {
    // X-dimension minúsculo no 1D gera aviso; repetido, conta uma vez.
    const grid = barcodeGridToGcode(['AB', 'CD', 'EF'], {
      feed: 1000,
      sMax: 1000,
      powerPercent: 100,
      symbology: 'code128',
      xDimMm: 0.01,
      columns: 3,
    });
    expect(grid.warnings).toContain('x-dim-small');
    expect(grid.warnings.filter((w) => w === 'x-dim-small')).toHaveLength(1);
  });

  it('lista vazia gera um programa válido e vazio', () => {
    const grid = symbolGridToGcode([], baseParams);
    expect(grid.count).toBe(0);
    expect(grid.segments).toBe(0);
    expect(grid.gcode).toContain('G21');
    expect(grid.gcode.trimEnd().endsWith('G0 X0 Y0')).toBe(true);
  });
});

describe('dataMatrixGridToGcode', () => {
  it('gera a grade 3×1 de Data Matrix', () => {
    const grid = dataMatrixGridToGcode(['A', 'B', 'C'], {
      feed: 1000,
      sMax: 1000,
      powerPercent: 100,
      moduleMm: 0.6,
      columns: 3,
      gapXMm: 8,
    });
    expect(grid.count).toBe(3);
    expect(grid.columns).toBe(3);
    expect(grid.rows).toBe(1);
    expect(grid.widthMm).toBeCloseTo(3 * grid.cellWidthMm + 2 * 8, 6);
  });
});

describe('barcodeGridToGcode', () => {
  it('gera a grade de códigos de barras com barras em ordem de gravação', () => {
    const grid = barcodeGridToGcode(['AB', 'CD'], {
      feed: 1000,
      sMax: 1000,
      powerPercent: 100,
      symbology: 'code128',
      xDimMm: 0.3,
      barHeightMm: 10,
      columns: 2,
      gapXMm: 12,
      gapYMm: 12,
    });
    expect(grid.count).toBe(2);
    expect(grid.columns).toBe(2);
    expect(grid.rows).toBe(1);
    expect(grid.segments).toBeGreaterThan(0);
    expect(grid.gcode).toContain('; [1] AB');
  });
});
