import { describe, expect, it } from 'vitest';
import {
  generateMaterialTest,
  type MaterialTestOptions,
} from '../src/shared/materialTest';

const base: MaterialTestOptions = {
  cols: 3,
  rows: 2,
  speedMin: 1000,
  speedMax: 3000,
  powerMin: 20,
  powerMax: 80,
  cellSize: 10,
  spacing: 2,
  passes: 1,
  mode: 'M4',
  sMax: 1000,
  travelFeed: 3000,
};

describe('generateMaterialTest', () => {
  it('produz uma célula por combinação (cols × rows)', () => {
    const r = generateMaterialTest(base);
    expect(r.legend).toHaveLength(6);
    // 3 colunas × 2 linhas = 6 células, cada uma armando o laser.
    const arms = r.gcode.match(/M[34] S\d+/g) ?? [];
    expect(arms).toHaveLength(6);
  });

  it('calcula a área total corretamente', () => {
    const r = generateMaterialTest(base);
    // 3 células de 10 + 2 espaços de 2 = 34 mm
    expect(r.width).toBe(3 * 10 + 2 * 2);
    expect(r.height).toBe(2 * 10 + 1 * 2);
  });

  it('varia velocidade por coluna e potência por linha (linspace)', () => {
    const r = generateMaterialTest(base);
    const speeds = [...new Set(r.legend.map((e) => e.speed))];
    const powers = [...new Set(r.legend.map((e) => e.powerPercent))];
    expect(speeds).toEqual([1000, 2000, 3000]);
    expect(powers).toEqual([20, 80]);
    // célula (col 1, row 1) tem a velocidade/potência intermediárias
    const mid = r.legend.find((e) => e.col === 1 && e.row === 1)!;
    expect(mid.speed).toBe(2000);
    expect(mid.powerPercent).toBe(80);
  });

  it('respeita o modo M3/M4 e o S-max', () => {
    const m3 = generateMaterialTest({ ...base, mode: 'M3' });
    expect(m3.gcode).toContain('M3 S');
    expect(m3.gcode).not.toContain('M4 S');
    const r = generateMaterialTest(base);
    expect(r.legend.every((e) => e.powerS <= 1000 && e.powerS >= 0)).toBe(true);
    // 80% de 1000 = 800
    expect(r.legend.find((e) => e.powerPercent === 80)!.powerS).toBe(800);
  });

  it('emite ; pass N/M quando passes > 1', () => {
    const r = generateMaterialTest({ ...base, passes: 3 });
    expect(r.gcode).toContain('; pass 1/3');
    expect(r.gcode).toContain('; pass 3/3');
    const arms = r.gcode.match(/M[34] S\d+/g) ?? [];
    expect(arms).toHaveLength(6 * 3);
  });

  it('termina com M5 e retorno à origem', () => {
    const r = generateMaterialTest(base);
    const tail = r.gcode.trim().split('\n').slice(-3);
    expect(tail).toContain('M5');
    expect(tail).toContain('G0 X0 Y0');
  });

  it('inclui a legenda no cabeçalho', () => {
    const r = generateMaterialTest(base);
    expect(r.gcode).toContain(
      '; legenda (indice -> velocidade mm/min, potencia %):',
    );
    expect(r.gcode).toContain(';   0: 1000 mm/min, 20% (S200)');
  });

  it('lida com grade 1×1 (sem divisão por zero)', () => {
    const r = generateMaterialTest({ ...base, cols: 1, rows: 1 });
    expect(r.legend).toHaveLength(1);
    expect(r.legend[0].speed).toBe(1000);
    expect(r.legend[0].powerPercent).toBe(20);
  });

  it('clampa valores inválidos sem quebrar', () => {
    const r = generateMaterialTest({
      ...base,
      cols: 0,
      rows: -3,
      cellSize: 0,
      spacing: -5,
      passes: 0,
    });
    expect(r.legend.length).toBeGreaterThanOrEqual(1);
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
  });
});
