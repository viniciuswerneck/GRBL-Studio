/**
 * Teste de foco / spot (P2.13): escada de Z com duas potências por passo.
 * Módulo puro — nada de DOM nem de máquina.
 */
import { describe, expect, it } from 'vitest';
import {
  FOCUS_MAX_STEPS,
  FOCUS_MIN_STEPS,
  type FocusTestOptions,
  generateFocusTest,
} from '../src/shared/focusTest';

const base: FocusTestOptions = {
  steps: 5,
  zStep: 0.2,
  lineLength: 20,
  spacing: 2,
  feed: 800,
  powerLow: 10,
  powerHigh: 40,
  mode: 'M4',
  sMax: 1000,
};

describe('generateFocusTest', () => {
  it('gera 2 linhas por passo (baixa e alta potência)', () => {
    const r = generateFocusTest(base);
    expect(r.lines).toHaveLength(10);
    expect(r.lines.filter((l) => !l.high)).toHaveLength(5);
    expect(r.lines.filter((l) => l.high)).toHaveLength(5);
    // Cada par tem as duas potências e a mesma altura de Z.
    const first = r.lines.filter((l) => l.step === 0);
    expect(first.map((l) => l.powerPercent)).toEqual([10, 40]);
    expect(new Set(first.map((l) => l.zOffset)).size).toBe(1);
  });

  it('distribui o Z em passos simétricos a partir do Z atual', () => {
    const r = generateFocusTest(base);
    const offsets = [...new Set(r.lines.map((l) => l.zOffset))];
    expect(offsets).toEqual([-0.4, -0.2, 0, 0.2, 0.4]);
    expect(r.zMin).toBeCloseTo(-0.4);
    expect(r.zMax).toBeCloseTo(0.4);
    // A legenda do cabeçalho mostra a faixa e o passo.
    expect(r.gcode).toContain('-0.400 .. 0.400');
    expect(r.gcode).toContain('passo 0.200');
  });

  it('usa Z relativo: a soma dos movimentos de Z é zero (volta ao início)', () => {
    const r = generateFocusTest(base);
    const moves = [...r.gcode.matchAll(/G1 Z(-?\d+\.\d+) F200/g)].map((m) =>
      Number(m[1]),
    );
    // 5 degraus de 0,2 = 4 subidas + descida inicial + volta final.
    expect(moves).toHaveLength(6);
    const sum = moves.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0, 6);
    expect(r.gcode).toContain('G91');
    expect(r.gcode).toContain('G90');
  });

  it('mantém G91/G90 equilibrados e nenhum Z absoluto', () => {
    const r = generateFocusTest(base);
    const rel = r.gcode.match(/^G91$/gm) ?? [];
    const abs = r.gcode.match(/^G90$/gm) ?? [];
    // Um `G90` a mais: o preâmbulo fixa o modo absoluto uma vez.
    expect(abs.length - rel.length).toBe(1);
    // Nenhum G0/G1 com Z em modo absoluto (só os `G1 Z…` relativos).
    for (const line of r.gcode.split('\n')) {
      if (/^G0 .*Z/.test(line)) expect(line).not.toContain('Z');
    }
  });

  it('posiciona as linhas da frente (Y0) para trás, duas por passo', () => {
    const r = generateFocusTest(base);
    const ys = r.lines.map((l) => l.y);
    expect(ys).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    expect(r.height).toBe(18); // (5 * 2 - 1) * 2
    expect(r.width).toBe(20);
  });

  it('converte % em S pelo S-max e respeita o modo', () => {
    const m4 = generateFocusTest(base);
    expect(m4.gcode).toContain('M4 S100');
    expect(m4.gcode).toContain('M4 S400');
    const m3 = generateFocusTest({ ...base, mode: 'M3', sMax: 255 });
    expect(m3.gcode).toContain('M3 S26'); // 10% de 255
    expect(m3.gcode).toContain('M3 S102'); // 40% de 255
    // O laser é desligado antes de cada movimento (nada de queimar no G0).
    for (const line of m3.gcode.split('\n')) {
      if (line.startsWith('G0 ')) expect(line).not.toMatch(/M[34]/);
    }
  });

  it('nunca move o Z com o laser ligado', () => {
    const r = generateFocusTest(base);
    let laserOn = false;
    let zMoves = 0;
    for (const line of r.gcode.split('\n')) {
      if (/^M[34] /.test(line)) laserOn = true;
      else if (line === 'M5') laserOn = false;
      else if (/^G[01] Z/.test(line) || /^G1 Z/.test(line)) {
        zMoves++;
        expect(laserOn).toBe(false);
      }
    }
    expect(zMoves).toBeGreaterThan(0);
  });

  it('passo de Z negativo inverte o sentido (aproxima)', () => {
    const r = generateFocusTest({ ...base, zStep: -0.2 });
    const offsets = [...new Set(r.lines.map((l) => l.zOffset))];
    expect(offsets).toEqual([0.4, 0.2, 0, -0.2, -0.4]);
    expect(r.gcode).toContain('Z+ aproxima');
  });

  it('normaliza valores fora da faixa', () => {
    const r = generateFocusTest({
      ...base,
      steps: 0,
      zStep: 0,
      lineLength: -5,
      spacing: -1,
      feed: 0,
      powerLow: -10,
      powerHigh: 300,
      sMax: 0,
    });
    expect(r.lines).toHaveLength(FOCUS_MIN_STEPS * 2);
    expect(r.width).toBe(1);
    expect(r.height).toBe(0);
    expect(r.gcode).toContain('S0'); // 0% de S-max 1
    expect(r.gcode).toContain('S1'); // 100% de S-max 1
    expect(r.gcode).not.toMatch(/NaN|undefined/);
    // Passo zero vira o padrão de 0,1 mm.
    expect(r.gcode).toContain('passo 0.100');
  });

  it('limita o número de passos', () => {
    const r = generateFocusTest({ ...base, steps: 999 });
    expect(r.lines).toHaveLength(FOCUS_MAX_STEPS * 2);
  });
});
