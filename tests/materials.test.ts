import { describe, expect, it } from 'vitest';
import {
  MATERIAL_PROFILES,
  PROFILE_MAX_S,
  findProfile,
  powerPercentToS,
  profilesFor,
} from '../src/shared/materials';

describe('perfis de material (RF-IMG-8)', () => {
  it('tem todos os campos válidos', () => {
    for (const profile of MATERIAL_PROFILES) {
      expect(['3W', '5W', '10W']).toContain(profile.module);
      expect(['engrave', 'cut']).toContain(profile.action);
      expect(profile.material.length).toBeGreaterThan(0);
      expect(profile.powerPercent).toBeGreaterThan(0);
      expect(profile.powerPercent).toBeLessThanOrEqual(100);
      expect(profile.speedMmMin).toBeGreaterThan(0);
      expect(profile.notes.length).toBeGreaterThan(0);
    }
  });

  it('cobre os dois módulos e as duas ações', () => {
    expect(profilesFor('5W', 'engrave').length).toBeGreaterThan(0);
    expect(profilesFor('5W', 'cut').length).toBeGreaterThan(0);
    expect(profilesFor('10W', 'engrave').length).toBeGreaterThan(0);
    expect(profilesFor('10W', 'cut').length).toBeGreaterThan(0);
  });

  it('reproduz a matriz do manual (§9.1 e §9.2)', () => {
    expect(profilesFor('5W', 'engrave')).toHaveLength(10);
    expect(profilesFor('5W', 'cut')).toHaveLength(6);
    expect(profilesFor('10W', 'engrave')).toHaveLength(10);
    expect(profilesFor('10W', 'cut')).toHaveLength(7);
  });

  it('não tem entradas duplicadas (módulo + ação + material)', () => {
    const keys = MATERIAL_PROFILES.map(
      (profile) => `${profile.module}|${profile.action}|${profile.material}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('confere valores pontuais contra o manual', () => {
    // 5W: tecido grava com 40% (potência menor evita queimar as bordas).
    const fabric5w = findProfile('5W', 'engrave', 'Tecido');
    expect(fabric5w?.powerPercent).toBe(40);
    expect(fabric5w?.speedMmMin).toBe(5000);

    // 10W: tecido grava com 20%.
    expect(findProfile('10W', 'engrave', 'Tecido')?.powerPercent).toBe(20);

    // Corte é sempre 100%.
    expect(findProfile('5W', 'cut', 'Tábua 4 mm')?.speedMmMin).toBe(90);
    expect(findProfile('10W', 'cut', 'Tábua 7 mm')?.speedMmMin).toBe(90);
  });

  it('findProfile devolve undefined para combinações inexistentes', () => {
    expect(findProfile('5W', 'cut', 'Aço inoxidável')).toBeUndefined();
    expect(findProfile('10W', 'engrave', 'Tábua 4 mm')).toBeUndefined();
  });

  it('profilesFor preserva a ordem do manual', () => {
    const engrave5w = profilesFor('5W', 'engrave').map((p) => p.material);
    expect(engrave5w[0]).toBe('Tábua de madeira');
    expect(engrave5w.at(-1)).toBe('Tecido');
  });
});

describe('powerPercentToS', () => {
  it('converte % em S usando a referência padrão', () => {
    expect(PROFILE_MAX_S).toBe(1000);
    expect(powerPercentToS(100)).toBe(1000);
    expect(powerPercentToS(40)).toBe(400);
    expect(powerPercentToS(20)).toBe(200);
  });

  it('arredonda para o inteiro mais próximo', () => {
    expect(powerPercentToS(33)).toBe(330);
    expect(powerPercentToS(12.5)).toBe(125);
  });

  it('limita ao intervalo 0..maxS', () => {
    expect(powerPercentToS(150)).toBe(1000);
    expect(powerPercentToS(-10)).toBe(0);
    expect(powerPercentToS(50, 255)).toBe(128);
  });

  it('é imune a entradas inválidas (nunca devolve S absurdo)', () => {
    expect(powerPercentToS(Number.NaN)).toBe(0);
    expect(powerPercentToS(50, 0)).toBe(0);
    expect(powerPercentToS(50, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
