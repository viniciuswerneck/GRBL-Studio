import { describe, expect, it } from 'vitest';
import {
  FONTS,
  fontOptions,
  getFont,
  glyphKey,
  textToShapes,
  unsupportedChars,
} from '../src/shared/fonts';

describe('fonts', () => {
  it('catálogo não vazio e default existe', () => {
    expect(FONTS.length).toBeGreaterThan(0);
    expect(getFont('simplex').id).toBe('simplex');
    expect(getFont('inexistente').id).toBe('simplex');
  });

  it('fontOptions retorna id+name', () => {
    const opts = fontOptions();
    expect(opts[0]).toHaveProperty('id');
    expect(opts[0]).toHaveProperty('name');
  });

  it('textToShapes gera formas para "ABC"', () => {
    const shapes = textToShapes({ text: 'ABC', size: 10, x: 0, y: 0 });
    expect(shapes.length).toBeGreaterThan(0);
    expect(shapes.every((s) => s.points.length >= 2)).toBe(true);
  });

  it('escala pelo tamanho', () => {
    const a = textToShapes({ text: 'A', size: 10, x: 0, y: 0 });
    const b = textToShapes({ text: 'A', size: 20, x: 0, y: 0 });
    const maxA = Math.max(...a.flatMap((s) => s.points.map((p) => p.y)));
    const maxB = Math.max(...b.flatMap((s) => s.points.map((p) => p.y)));
    expect(maxB).toBeGreaterThan(maxA);
  });

  it('espaça letras (avanço)', () => {
    const one = textToShapes({ text: 'A', size: 10, x: 0, y: 0 });
    const two = textToShapes({ text: 'AA', size: 10, x: 0, y: 0 });
    const maxX1 = Math.max(...one.flatMap((s) => s.points.map((p) => p.x)));
    const maxX2 = Math.max(...two.flatMap((s) => s.points.map((p) => p.x)));
    expect(maxX2).toBeGreaterThan(maxX1);
  });

  it('caractere desconhecido usa fallback (?)', () => {
    const shapes = textToShapes({ text: '@', size: 10, x: 0, y: 0 });
    expect(shapes.length).toBeGreaterThan(0);
  });

  it('texto vazio gera 0 formas', () => {
    expect(textToShapes({ text: '', size: 10, x: 0, y: 0 })).toHaveLength(0);
  });

  it('glyphKey remove acentos e resolve dígrafos', () => {
    expect(glyphKey('ç')).toBe('C');
    expect(glyphKey('á')).toBe('A');
    expect(glyphKey('Ã')).toBe('A');
    expect(glyphKey('ø')).toBe('O');
    expect(glyphKey('ß')).toBe('SS');
    expect(glyphKey('a')).toBe('A');
    expect(glyphKey('7')).toBe('7');
  });

  it('acentos são gravados como a letra base (não viram "?")', () => {
    const acentos = textToShapes({ text: 'Ação', size: 10, x: 0, y: 0 });
    const base = textToShapes({ text: 'Acao', size: 10, x: 0, y: 0 });
    expect(acentos).toHaveLength(base.length);
    const maxA = Math.max(...acentos.flatMap((s) => s.points.map((p) => p.x)));
    const maxB = Math.max(...base.flatMap((s) => s.points.map((p) => p.x)));
    expect(maxA).toBeCloseTo(maxB, 6);
  });

  it('unsupportedChars aponta só o que não tem glifo', () => {
    expect(unsupportedChars('Ação 42')).toEqual([]);
    expect(unsupportedChars('A@B')).toEqual(['@']);
    expect(unsupportedChars('R$ 10')).toEqual(['$']);
  });
});
