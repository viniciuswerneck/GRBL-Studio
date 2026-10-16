import { describe, expect, it } from 'vitest';
import { parseSettingLine, parseSettings } from '../src/shared/protocol';
import {
  CATALOG,
  GROUP_ORDER,
  buildSettingRows,
  describeSetting,
  groupOf,
  validateSettingValue,
} from '../src/shared/grblSettings';

/** Resposta típica de `$$` numa GRBL 1.1 (recortada). */
const REPLY = [
  '$0=10',
  '$1=25',
  '$32=0',
  '$100=80.000',
  '$130=400.000',
  '$131=400.000',
  'ok',
];

describe('catálogo de $$ (RF-CFG-1/6)', () => {
  it('descreve os settings críticos do laser', () => {
    for (const key of [20, 21, 22, 32]) {
      const descriptor = describeSetting(key);
      expect(descriptor, `$${key}`).toBeDefined();
      expect(descriptor?.name.length).toBeGreaterThan(0);
      expect(descriptor?.help.length).toBeGreaterThan(0);
    }
  });

  it('tem grupos consistentes com GROUP_ORDER', () => {
    const known = new Set(GROUP_ORDER);
    for (const key of Object.keys(CATALOG)) {
      const group = groupOf(Number(key));
      expect(known.has(group), `grupo de $${key}: ${group}`).toBe(true);
    }
  });

  it('não descreve chaves fora do firmware (0–132)', () => {
    expect(describeSetting(999)).toBeUndefined();
  });
});

describe('buildSettingRows (RF-CFG-1)', () => {
  it('ordena por chave e traz os metadados do catálogo', () => {
    const rows = buildSettingRows(parseSettings(REPLY));
    expect(rows.map((r) => r.code)).toEqual([0, 1, 32, 100, 130, 131]);

    const step = rows.find((r) => r.code === 0);
    expect(step?.value).toBe('10');
    expect(step?.number).toBe(10);
    expect(step?.unit).toBe('µs');
    expect(step?.group).toBe('Passo e direção');

    const laser = rows.find((r) => r.code === 32);
    expect(laser?.type).toBe('bool');
    expect(laser?.group).toBe('Spindle/Laser');
  });

  it('descreve chaves conhecidas por grupo', () => {
    expect(groupOf(32)).toBe('Spindle/Laser');
    expect(groupOf(999)).toBe('Outros');
  });

  it('marca chaves desconhecidas como "Outros"', () => {
    const rows = buildSettingRows(parseSettings(['$999=1', 'ok']));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.group).toBe('Outros');
    expect(rows[0]?.number).toBe(1);
  });

  it('ignora linhas que não são settings', () => {
    const rows = buildSettingRows(parseSettings(['ok', 'Grbl 1.1f']));
    expect(rows).toHaveLength(0);
  });
});

describe('validateSettingValue (RF-CFG-2)', () => {
  it('aceita valores dentro da faixa', () => {
    expect(validateSettingValue(0, '10')).toBeNull();
    expect(validateSettingValue(130, '400.000')).toBeNull();
  });

  it('rejeita vazio e não numérico em chaves conhecidas', () => {
    expect(validateSettingValue(1, '   ')).toBeTruthy();
    expect(validateSettingValue(1, 'abc')).toMatch(/inválido|num/i);
  });

  it('respeita min/max do catálogo', () => {
    expect(validateSettingValue(1, '999')).toContain('255');
    expect(validateSettingValue(11, '-1')).toContain('0');
  });

  it('aceita valores livres em chaves desconhecidas', () => {
    expect(validateSettingValue(999, 'qualquer')).toBeNull();
  });

  it('faz parse de linhas do $$', () => {
    expect(parseSettingLine('$32=1')).toEqual({
      key: 32,
      value: '1',
      number: 1,
    });
    expect(parseSettingLine('nope')).toBeNull();
  });
});
