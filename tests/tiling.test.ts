/**
 * Tiling (Anexo B): divisão do programa em janelas do tamanho da mesa, com
 * sobreposição na emenda e origem local em cada programa.
 */
import { describe, expect, it } from 'vitest';
import {
  planTiles,
  sanitizeOverlap,
  sanitizeTileSize,
  TILE_MAX_COUNT,
  TILE_MAX_MM,
  TILE_MIN_MM,
  tileGcode,
} from '../src/shared/tiling';

const SAMPLE = [
  'G21',
  'G90',
  'M4 S1000',
  'G0 X0 Y50',
  'G1 X210 Y50 F1000',
  'M5',
  'G0 X10 Y0',
  'M4 S1000',
  'G1 X10 Y100 F1000',
  'M5',
  'G0 X90 Y0',
  'M4 S1000',
  'G1 X90 Y100 F1000',
  'M5',
  'G0 X150 Y0',
  'M4 S1000',
  'G1 X150 Y100 F1000',
  'M5',
  'G0 X205 Y0',
  'M4 S1000',
  'G1 X205 Y100 F1000',
  'M5',
].join('\n');

const BOUNDS = { minX: 0, minY: 0, maxX: 210, maxY: 100 };

/** Todas as coordenadas `G1` de um programa (já no espaço local). */
function cutPoints(text: string): Array<{ x: number; y: number }> {
  return text
    .split('\n')
    .filter((l) => l.startsWith('G1 '))
    .map((l) => ({
      x: Number(/X(-?\d+\.\d+)/.exec(l)?.[1]),
      y: Number(/Y(-?\d+\.\d+)/.exec(l)?.[1]),
    }));
}

describe('tiling (peça maior que a mesa)', () => {
  it('sanitiza tamanho e sobreposição', () => {
    expect(sanitizeTileSize(undefined)).toBe(0);
    expect(sanitizeTileSize(0)).toBe(0);
    expect(sanitizeTileSize(1)).toBe(TILE_MIN_MM);
    expect(sanitizeTileSize(150)).toBe(150);
    expect(sanitizeTileSize(99999)).toBe(TILE_MAX_MM);
    expect(sanitizeOverlap(undefined)).toBe(0);
    expect(sanitizeOverlap(-5)).toBe(0);
    expect(sanitizeOverlap(3)).toBe(3);
  });

  it('usa um tile quando a arte cabe na mesa', () => {
    const plan = planTiles(
      { minX: 0, minY: 0, maxX: 100, maxY: 80 },
      150,
      130,
      0,
    );
    expect(plan?.cols).toBe(1);
    expect(plan?.rows).toBe(1);
    expect(plan?.tiles).toHaveLength(1);
  });

  it('calcula colunas e linhas com o passo mínimo', () => {
    const plan = planTiles(BOUNDS, 100, 100, 0);
    expect(plan?.cols).toBe(3);
    expect(plan?.rows).toBe(1);
    expect(plan?.stepX).toBe(100);
    // 210 mm de arte em janelas de 100 → 3 janelas (0, 100, 200).
    expect(plan?.tiles.map((t) => t.x0)).toEqual([0, 100, 200]);
  });

  it('respeita a sobreposição pedida', () => {
    const plan = planTiles(BOUNDS, 100, 100, 20);
    expect(plan?.stepX).toBe(80);
    expect(plan?.tiles.map((t) => t.x0)).toEqual([0, 80, 160]);
  });

  it('recusa plano degenerado ou absurdo', () => {
    expect(
      planTiles({ minX: 0, minY: 0, maxX: 0, maxY: 0 }, 100, 100, 0),
    ).toBeNull();
    const tiny = planTiles(BOUNDS, TILE_MIN_MM, TILE_MIN_MM, 0);
    expect(tiny).toBeNull(); // 42 × 20 janelas passaria de TILE_MAX_COUNT
    expect(planTiles(BOUNDS, 100, 100, 0)!.tiles.length).toBeLessThan(
      TILE_MAX_COUNT,
    );
  });

  it('desloca a origem de cada janela e recorta as bordas', () => {
    const plan = planTiles(BOUNDS, 100, 100, 0)!;
    const result = tileGcode(SAMPLE, plan, 'peca');
    expect(result.tiles).toHaveLength(3);
    expect(result.skipped).toBe(0);
    expect(result.tiles[0].name).toBe('peca-r1c1.gcode');
    expect(result.tiles[2].name).toBe('peca-r1c3.gcode');
    expect(result.tiles[0].text).toContain('tile 1/1, coluna 1/3');
    // A linha horizontal de y=50 é cortada nas três janelas, cada uma com a
    // sua parte local (0..100, 0..100, 0..10).
    expect(result.tiles[0].text).toContain('G1 X100.000 Y50.000');
    expect(result.tiles[2].text).toContain('G1 X10.000 Y50.000');
    // Verticais: x=10 só na 1ª, x=150 na 2ª (local 50), x=205 na 3ª (local 5).
    expect(result.tiles[0].text).toMatch(/G1 X10\.000 Y100\.000/);
    expect(result.tiles[1].text).toMatch(/G1 X50\.000 Y100\.000/);
    expect(result.tiles[2].text).toMatch(/G1 X5\.000 Y100\.000/);
    expect(result.tiles[0].text).not.toMatch(/G1 X50\.000 Y100\.000/);
    // Nada sai da janela.
    for (const tile of result.tiles) {
      for (const p of cutPoints(tile.text)) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(100);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(100);
      }
    }
  });

  it('a sobreposição faz a emenda ser cortada pelos dois vizinhos', () => {
    const sem = tileGcode(SAMPLE, planTiles(BOUNDS, 100, 100, 0)!, 'peca');
    // x=90 fica só na 1ª janela (0..100) quando não há sobreposição.
    expect(sem.tiles[0].text).toMatch(/G1 X90\.000 Y100\.000/);
    expect(sem.tiles[1].text).not.toMatch(/X0\.000 Y100\.000/);

    const com = tileGcode(SAMPLE, planTiles(BOUNDS, 100, 100, 20)!, 'peca');
    // Com 20 mm, x=90 aparece na 1ª (local 90) e na 2ª (local 10).
    expect(com.tiles[0].text).toMatch(/G1 X90\.000 Y100\.000/);
    expect(com.tiles[1].text).toMatch(/G1 X10\.000 Y100\.000/);
  });

  it('mantém modo, potência e feed e ignora G1 sem potência', () => {
    const text = [
      'G21',
      'G90',
      'M3 S400',
      'G0 X0 Y10',
      'G1 X50 Y10 F600',
      'M5',
      'G0 X0 Y20',
      'G1 X50 Y20 S0 F600',
    ].join('\n');
    const plan = planTiles(
      { minX: 0, minY: 0, maxX: 50, maxY: 30 },
      100,
      100,
      0,
    )!;
    const result = tileGcode(text, plan, 'm3');
    expect(result.tiles).toHaveLength(1);
    const out = result.tiles[0].text;
    expect(out).toContain('M3 S400');
    expect(out).not.toContain('M4');
    expect(out).toContain('G1 X50.000 Y10.000 F600');
    // A linha com S0 não vira corte (não há `Y20`).
    expect(out).not.toContain('Y20.000');
    expect(out.trimEnd().endsWith('M5\nG0 X0.000 Y0.000')).toBe(true);
  });

  it('tile sem nenhum corte é omitido', () => {
    // Arte na coluna da direita: a 1ª janela fica vazia.
    const text = ['M4 S1000', 'G0 X150 Y50', 'G1 X200 Y50 F1000', 'M5'].join(
      '\n',
    );
    const plan = planTiles(
      { minX: 0, minY: 0, maxX: 210, maxY: 100 },
      100,
      100,
      0,
    )!;
    const result = tileGcode(text, plan, 'vazio');
    // Só a janela do meio tem corte (a 3ª pega apenas o ponto final da linha,
    // que degenera em comprimento zero).
    expect(result.tiles).toHaveLength(1);
    expect(result.skipped).toBe(2);
    expect(result.tiles.map((t) => t.rect.col)).toEqual([1]);
  });
});
