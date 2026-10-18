import { describe, expect, it } from 'vitest';
import { FONTS, fontOptions, getFont, textToShapes } from '../src/shared/fonts';

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
});