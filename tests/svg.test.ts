import { describe, expect, it } from 'vitest';
import { parseSvg, svgTextToGcode } from '../src/shared/svg';

const RECT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="10" y="10" width="30" height="20" />
</svg>`;

const PATH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 10 10 L 40 10 L 40 30 L 10 30 Z" />
  <path d="M 50 50 C 60 40 70 60 80 50" />
</svg>`;

describe('parseSvg', () => {
  it('extrai um rect como contorno fechado', () => {
    const doc = parseSvg(RECT_SVG);
    expect(doc.contours).toHaveLength(1);
    expect(doc.contours[0].closed).toBe(true);
    expect(doc.contours[0].points.length).toBeGreaterThan(3);
  });

  it('extrai paths (M/L/Z e Bézier cúbica)', () => {
    const doc = parseSvg(PATH_SVG);
    expect(doc.contours.length).toBe(2);
    expect(doc.contours[0].closed).toBe(true);
    expect(doc.contours[1].points.length).toBeGreaterThan(2);
  });

  it('normaliza para origem (0,0)', () => {
    const doc = parseSvg(RECT_SVG);
    const xs = doc.contours[0].points.map((p) => p.x);
    const ys = doc.contours[0].points.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(0, 5);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
  });

  it('lida com SVG vazio sem quebrar', () => {
    const doc = parseSvg('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(doc.contours).toEqual([]);
  });

  it('suporta circle e line', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="10" />
      <line x1="0" y1="0" x2="50" y2="50" />
    </svg>`;
    const doc = parseSvg(svg);
    expect(doc.contours.length).toBe(2);
  });
});

describe('svgTextToGcode', () => {
  it('gera G-code de contorno válido', () => {
    const g = svgTextToGcode(RECT_SVG);
    expect(g).toContain('G21');
    expect(g).toContain('G90');
    expect(g).toContain('G0 X');
    expect(g).toContain('G1 X');
    expect(g).toContain('M5');
    expect(g).toContain('G0 X0 Y0');
  });

  it('respeita flipY (SVG y-down -> G-code y-up)', () => {
    const g = svgTextToGcode(RECT_SVG, { flipY: true });
    // o rect está em y=10..30; com flip, y final = height - y
    expect(g).toMatch(/G1 X\d+\.\d+ Y\d+\.\d+/);
  });

  it('aplica escala', () => {
    const g1 = svgTextToGcode(RECT_SVG, { scale: 1 });
    const g2 = svgTextToGcode(RECT_SVG, { scale: 2 });
    expect(g1).not.toBe(g2);
  });
});
