/**
 * Símbolo como objeto do editor “Desenhar” (RF-SYM-8): normalização da
 * especificação e célula → formas (Y invertido), com descarte de lixo.
 */
import { describe, expect, it } from 'vitest';
import { type Shape, designToGcode } from '../src/shared/design';
import { barcodeToCell, qrToCell } from '../src/shared/symbol/gcode';
import {
  SYMBOL_DEFAULT_LINES,
  SYMBOL_MAX_MM,
  SYMBOL_MIN_MM,
  SYMBOL_TEXT_MAX,
  type DesignSymbolCell,
  sanitizeDesignSymbol,
  symbolCellToDesignShapes,
} from '../src/shared/designSymbol';

function cell(over: Partial<DesignSymbolCell> = {}): DesignSymbolCell {
  return {
    extent: { widthMm: 20, heightMm: 10 },
    segments: [
      { x0: 1, y0: 0, x1: 3, y1: 0 },
      { x0: 5, y0: 9, x1: 8, y1: 9 },
    ],
    ...over,
  };
}

describe('sanitizeDesignSymbol', () => {
  it('aceita uma especificação completa', () => {
    expect(
      sanitizeDesignSymbol({
        type: 'qr',
        text: '  https://a.b  ',
        sizeMm: 30,
        ecc: 'Q',
        linesPerMm: 8,
      }),
    ).toEqual({
      type: 'qr',
      text: 'https://a.b',
      sizeMm: 30,
      linesPerMm: 8,
      ecc: 'Q',
    });
  });

  it('exige tipo conhecido e conteúdo', () => {
    expect(sanitizeDesignSymbol(null)).toBeNull();
    expect(sanitizeDesignSymbol({ type: 'pdf', text: 'x' })).toBeNull();
    expect(sanitizeDesignSymbol({ type: 'qr', text: '   ' })).toBeNull();
    expect(sanitizeDesignSymbol({ type: 'qr' })).toBeNull();
  });

  it('limita tamanho, densidade e conteúdo', () => {
    const tiny = sanitizeDesignSymbol({
      type: 'aztec',
      text: 'x',
      sizeMm: 0,
      linesPerMm: 0,
    });
    expect(tiny?.sizeMm).toBe(SYMBOL_MIN_MM);
    expect(tiny?.linesPerMm).toBe(2);
    expect(
      sanitizeDesignSymbol({ type: 'aztec', text: 'x', sizeMm: 9999 })?.sizeMm,
    ).toBe(SYMBOL_MAX_MM);
    expect(
      sanitizeDesignSymbol({
        type: 'aztec',
        text: 'a'.repeat(SYMBOL_TEXT_MAX + 50),
      })?.text.length,
    ).toBe(SYMBOL_TEXT_MAX);
    expect(sanitizeDesignSymbol({ type: 'qr', text: 'x' })?.linesPerMm).toBe(
      SYMBOL_DEFAULT_LINES,
    );
  });

  it('aceita o vocabulário da UI (datamatrix minúsculo)', () => {
    expect(
      sanitizeDesignSymbol({ type: 'datamatrix', text: 'ABC', sizeMm: 20 }),
    ).toMatchObject({ type: 'datamatrix', sizeMm: 20 });
    expect(
      sanitizeDesignSymbol({ type: 'dataMatrix', text: 'ABC' }),
    ).toBeNull();
  });

  it('descarta metadados inválidos sem perder o símbolo', () => {
    const spec = sanitizeDesignSymbol({
      type: 'barcode',
      text: '123',
      sizeMm: 40,
      symbology: 'CODE 128',
      ecc: 'Z',
      hri: true,
    });
    expect(spec).toMatchObject({ type: 'barcode', hri: true });
    expect(spec?.symbology).toBeUndefined();
    expect(spec?.ecc).toBeUndefined();
    expect(
      sanitizeDesignSymbol({ type: 'barcode', text: '1', symbology: 'ean13' })
        ?.symbology,
    ).toBe('ean13');
  });
});

describe('symbolCellToDesignShapes', () => {
  it('põe o canto superior esquerdo na origem e inverte o Y', () => {
    const out = symbolCellToDesignShapes(cell(), { x: 10, y: 20 });
    expect(out.widthMm).toBe(20);
    expect(out.heightMm).toBe(10);
    // Trecho na base da célula (y=0) vira a linha de baixo no editor (y=30).
    expect(out.shapes[0].points).toEqual([
      { x: 11, y: 30 },
      { x: 13, y: 30 },
    ]);
    // Trecho no topo (y=9) fica a 1 mm do topo.
    expect(out.shapes[1].points).toEqual([
      { x: 15, y: 21 },
      { x: 18, y: 21 },
    ]);
    expect(out.shapes.every((s) => s.closed === false)).toBe(true);
  });

  it('mantém trechos verticais (código de barras) com as pontas certas', () => {
    const out = symbolCellToDesignShapes({
      extent: { widthMm: 10, heightMm: 8 },
      segments: [{ x0: 2, y0: 1, x1: 2, y1: 5 }],
    });
    expect(out.shapes[0].points).toEqual([
      { x: 2, y: 7 },
      { x: 2, y: 3 },
    ]);
  });

  it('descarta trechos inválidos e degenerados', () => {
    const out = symbolCellToDesignShapes({
      extent: { widthMm: 10, heightMm: 10 },
      segments: [
        { x0: 0, y0: 0, x1: 1, y1: 0 },
        { x0: Number.NaN, y0: 0, x1: 1, y1: 0 },
        { x0: 2, y0: 2, x1: 2, y1: 2 },
        { x0: 0, y0: 0, x1: Number.POSITIVE_INFINITY, y1: 0 },
      ],
    });
    expect(out.shapes).toHaveLength(1);
  });

  it('não quebra com célula ausente ou vazia', () => {
    expect(symbolCellToDesignShapes(null)).toEqual({
      shapes: [],
      widthMm: 0,
      heightMm: 0,
    });
    expect(
      symbolCellToDesignShapes({ extent: cell().extent, segments: [] }),
    ).toMatchObject({ shapes: [] });
  });
});

describe('símbolo como objeto → G-code do desenho', () => {
  it('o QR vira linhas do desenho, dentro da caixa e sem NaN', () => {
    const cell = qrToCell('https://grbl.studio', {
      targetWidthMm: 30,
      linesPerMm: 4,
      feed: 1000,
      sMax: 1000,
    });
    const placed = symbolCellToDesignShapes(cell, { x: 10, y: 5 });
    const shapes: Shape[] = placed.shapes.map((sh) => ({
      kind: 'line',
      points: sh.points,
      closed: false,
    }));
    const gcode = designToGcode(
      { shapes, width: 0, height: 0 },
      { feed: 1000, powerPercent: 80 },
    );
    const lines = gcode.split('\n').filter((l) => l.startsWith('G1 '));
    expect(lines.length).toBeGreaterThan(50);
    expect(gcode).not.toMatch(/NaN|Infinity|undefined/);
    for (const line of lines) {
      const x = Number(/X(-?[\d.]+)/.exec(line)?.[1]);
      const y = Number(/Y(-?[\d.]+)/.exec(line)?.[1]);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      // 30 mm de símbolo + 0,5 mm de folga de arredondamento por eixo.
      expect(x).toBeLessThanOrEqual(30.5);
      expect(y).toBeLessThanOrEqual(30.5);
    }
  });

  it('o código de barras entra com o HRI abaixo das barras', () => {
    const cell = barcodeToCell('590123412345', {
      symbology: 'ean13',
      targetWidthMm: 50,
      linesPerMm: 6,
      hri: true,
      feed: 1000,
      sMax: 1000,
    });
    const placed = symbolCellToDesignShapes(cell, { x: 0, y: 0 });
    expect(placed.widthMm).toBeGreaterThan(49);
    expect(placed.widthMm).toBeLessThan(51);
    // Altura > barras: inclui o texto legível embaixo.
    expect(placed.heightMm).toBeGreaterThan(10);
    expect(placed.shapes.some((sh) => sh.points[0].y > 10)).toBe(true);
  });
});
