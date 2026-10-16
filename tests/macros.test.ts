import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MACROS,
  MACRO_GROUPS,
  macroLines,
  parseMacroFile,
  sanitizeMacros,
  serializeMacros,
} from '../src/shared/macros';

describe('macros (RF-MAC-1/2)', () => {
  it('tem ids únicos e grupos conhecidos nos padrões', () => {
    const ids = new Set(DEFAULT_MACROS.map((m) => m.id));
    expect(ids.size).toBe(DEFAULT_MACROS.length);
    for (const macro of DEFAULT_MACROS) {
      expect(macro.label.length).toBeGreaterThan(0);
      expect(macro.gcode.length).toBeGreaterThan(0);
      expect(MACRO_GROUPS).toContain(macro.group);
    }
  });

  it('separa o G-code em linhas limpas', () => {
    expect(
      macroLines({ ...DEFAULT_MACROS[0]!, gcode: 'A\n\n B \r\n' }),
    ).toEqual(['A', 'B']);
  });

  it('sanitiza itens inválidos de uma lista', () => {
    const macros = sanitizeMacros([
      { id: 'a', label: 'Um', gcode: 'G0 X1', group: 'Origem' },
      null,
      { label: '', gcode: 'G92' }, // sem rótulo
      { label: 'Sem gcode', gcode: '' },
      { label: 'Sem grupo', gcode: 'M5' },
      'texto',
    ]);
    expect(macros.map((m) => m.label)).toEqual(['Um', 'Sem grupo']);
    expect(macros[1]!.group).toBe('Outros');
  });

  it('gera id quando o item não traz um', () => {
    const [macro] = sanitizeMacros([{ label: 'Sem id', gcode: 'M5' }]);
    expect(macro!.id).toBe('macro-0');
  });

  it('evita ids duplicados', () => {
    const macros = sanitizeMacros([
      { id: 'x', label: 'A', gcode: 'M5' },
      { id: 'x', label: 'B', gcode: 'M5' },
    ]);
    expect(new Set(macros.map((m) => m.id)).size).toBe(2);
  });

  it('faz roundtrip de export/import', () => {
    const text = serializeMacros(DEFAULT_MACROS);
    expect(parseMacroFile(text)).toEqual(DEFAULT_MACROS);
  });

  it('aceita um array puro', () => {
    const text = JSON.stringify([{ label: 'X', gcode: 'G0 X0' }]);
    expect(parseMacroFile(text)).toHaveLength(1);
  });

  it('recusa JSON inválido ou sem macros úteis', () => {
    expect(() => parseMacroFile('{oops')).toThrow(/JSON/);
    expect(() => parseMacroFile('{}')).toThrow(/lista/);
    expect(() => parseMacroFile('[{"label":""}]')).toThrow(/válida/);
  });
});
