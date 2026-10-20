/**
 * Custo por peça (Anexo B): tempo de máquina + material, com sanidade nos
 * valores e formatação na moeda escolhida.
 */
import { describe, expect, it } from 'vitest';
import {
  COST_MAX,
  estimateCost,
  formatMoney,
  sanitizeCost,
  sanitizeCurrency,
} from '../src/shared/cost';

describe('custo por peça', () => {
  it('soma tempo de máquina e material', () => {
    // 1 hora a 60/h + 1 m² a 100/m² = 160.
    const cost = estimateCost({
      seconds: 3600,
      areaMm2: 1_000_000,
      machinePerHour: 60,
      materialPerM2: 100,
    });
    expect(cost.machine).toBeCloseTo(60, 6);
    expect(cost.material).toBeCloseTo(100, 6);
    expect(cost.total).toBeCloseTo(160, 6);
  });

  it('proporcional ao tempo e à área', () => {
    const half = estimateCost({
      seconds: 1800,
      areaMm2: 500_000,
      machinePerHour: 60,
      materialPerM2: 100,
    });
    expect(half.total).toBeCloseTo(80, 6);
  });

  it('zera valores inválidos em vez de gerar NaN', () => {
    const cost = estimateCost({
      seconds: Number.NaN,
      areaMm2: -5,
      machinePerHour: Number.NaN,
      materialPerM2: -1,
    });
    expect(cost).toEqual({ machine: 0, material: 0, total: 0 });
  });

  it('limita tarifa e preço (typo não vira custo absurdo)', () => {
    expect(sanitizeCost(-10)).toBe(0);
    expect(sanitizeCost(Number.POSITIVE_INFINITY)).toBe(0);
    expect(sanitizeCost(12.5)).toBe(12.5);
    expect(sanitizeCost(10 ** 9)).toBe(COST_MAX);
    expect(
      estimateCost({
        seconds: 3600,
        areaMm2: 0,
        machinePerHour: 10 ** 9,
        materialPerM2: 0,
      }).machine,
    ).toBe(COST_MAX);
  });

  it('aceita só as moedas suportadas', () => {
    expect(sanitizeCurrency('BRL')).toBe('BRL');
    expect(sanitizeCurrency('USD')).toBe('USD');
    expect(sanitizeCurrency('EUR')).toBe('EUR');
    expect(sanitizeCurrency('GBP')).toBe('BRL');
    expect(sanitizeCurrency(undefined)).toBe('BRL');
  });

  it('formata na moeda escolhida, com centavos', () => {
    expect(formatMoney(1.85, 'BRL')).toContain('1,85');
    expect(formatMoney(1.85, 'BRL')).toContain('R$');
    expect(formatMoney(1.85, 'USD')).toContain('1.85');
    expect(formatMoney(1.85, 'USD')).toContain('$');
    expect(formatMoney(1.85, 'EUR')).toContain('1,85');
  });
});
