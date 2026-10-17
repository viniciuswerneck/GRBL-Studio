import { describe, expect, it } from 'vitest';
import { estimateSeconds, parseGcode } from '../src/shared/preview';

/**
 * Tempo estimado do arquivo (RF-GC-2) e tempo restante durante o job (RF-GC-5).
 * O cálculo é puro: soma `comprimento / velocidade` de cada movimento.
 */
describe('estimateSeconds — tempo estimado', () => {
  it('soma o tempo de corte pelo feed modal', () => {
    // 60 mm a 60 mm/min = 1 min = 60 s.
    const p = parseGcode('G21 G90\nG1 X60 Y0 F60');
    expect(estimateSeconds(p)).toBeCloseTo(60, 6);
  });

  it('usa a velocidade de deslocamento para G0 (ignora o feed modal)', () => {
    const p = parseGcode('G21 G90\nG0 X100 Y0 F10');
    expect(estimateSeconds(p, { rapidSpeedMmMin: 1000 })).toBeCloseTo(6, 6);
  });

  it('usa o feed padrão quando o G-code não declara F', () => {
    const p = parseGcode('G21 G90\nG1 X10 Y0');
    expect(estimateSeconds(p, { defaultFeedMmMin: 600 })).toBeCloseTo(1, 6);
  });

  it('converte polegadas (G20) para mm antes de estimar', () => {
    // 1 in = 25.4 mm a 25.4 mm/min = 60 s.
    const p = parseGcode('G20 G90\nG1 X1 Y0 F1');
    expect(estimateSeconds(p)).toBeCloseTo(60, 6);
  });

  it('acumula deslocamentos e cortes', () => {
    const p = parseGcode('G21 G90\nG0 X10 F10\nG1 X20 F60');
    // rápido: 10 mm a 1000 mm/min = 0,6 s; corte: 10 mm a 60 = 10 s.
    expect(estimateSeconds(p, { rapidSpeedMmMin: 1000 })).toBeCloseTo(10.6, 6);
  });

  it('devolve 0 sem movimentos (só comandos não geométricos)', () => {
    const p = parseGcode('G21\nG0 X0 Y0\nM5');
    expect(estimateSeconds(p)).toBe(0);
  });

  it('trata feeds inválidos (0/negativo) com o padrão', () => {
    const p = parseGcode('G21 G90\nG1 X10 Y0 F0');
    expect(estimateSeconds(p, { defaultFeedMmMin: 600 })).toBeCloseTo(1, 6);
  });
});
