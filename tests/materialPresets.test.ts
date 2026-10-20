/**
 * Presets de material (P2.12 / RF-IMG-8 + RF-IMG-10): normalização,
 * mesclagem, dose e JSON. Módulo puro.
 */
import { describe, expect, it } from 'vitest';
import {
  type MaterialPreset,
  MODULE_WATTS,
  PRESET_MAX,
  PRESET_NAME_MAX,
  PRESET_JSON_VERSION,
  convertPresetTo,
  doseJPerMm,
  presetsFromJson,
  presetsToJson,
  removePreset,
  sanitizePreset,
  sanitizePresets,
  totalDoseJPerMm,
  upsertPreset,
} from '../src/shared/materialPresets';

function preset(over: Partial<MaterialPreset> = {}): MaterialPreset {
  return {
    id: 'p-1',
    name: 'MDF 3 mm — corte',
    material: 'MDF',
    module: '5W',
    action: 'cut',
    powerPercent: 80,
    speedMmMin: 600,
    passes: 2,
    mode: 'M4',
    notes: '',
    createdAt: 1_700_000_000_000,
    ...over,
  };
}

describe('sanitizePreset / sanitizePresets', () => {
  it('mantém um preset válido', () => {
    expect(sanitizePreset(preset())).toEqual(preset());
  });

  it('exige id válido e nome; descarta o resto', () => {
    expect(sanitizePreset(preset({ id: '' }))).toBeNull();
    expect(sanitizePreset(preset({ id: 'com espaço' }))).toBeNull();
    expect(sanitizePreset(preset({ name: '   ' }))).toBeNull();
    expect(sanitizePreset(null)).toBeNull();
    expect(sanitizePreset('x')).toBeNull();
  });

  it('normaliza números fora da faixa e campos desconhecidos', () => {
    const p = sanitizePreset({
      ...preset(),
      powerPercent: 250,
      speedMmMin: 0,
      passes: 999,
      module: '50W',
      action: 'x',
      mode: 'M2',
      createdAt: -5,
      notes: 'a'.repeat(500),
    });
    expect(p).not.toBeNull();
    expect(p?.powerPercent).toBe(100);
    expect(p?.speedMmMin).toBe(1);
    expect(p?.passes).toBe(99);
    expect(p?.module).toBe('5W');
    expect(p?.action).toBe('engrave');
    expect(p?.mode).toBe('M4');
    expect(p?.createdAt).toBe(0);
    expect(p?.notes.length).toBe(240);
  });

  it('limpa caracteres de controle e espaços repetidos do texto', () => {
    const p = sanitizePreset(preset({ name: '  MDF\u0000  3mm  ' }));
    expect(p?.name).toBe('MDF 3mm');
    expect(
      sanitizePreset(preset({ name: 'n'.repeat(200) }))?.name,
    ).toHaveLength(PRESET_NAME_MAX);
  });

  it('descarta itens inválidos e ids repetidos da lista', () => {
    const list = sanitizePresets([
      preset(),
      preset({ name: 'outro' }), // mesmo id → descartado
      preset({ id: 'p-2', name: 'Bambu' }),
      null,
      { id: 'x' },
    ]);
    expect(list.map((p) => p.id)).toEqual(['p-1', 'p-2']);
    expect(sanitizePresets('nada')).toEqual([]);
  });

  it('corta no teto de presets', () => {
    const list = Array.from({ length: PRESET_MAX + 10 }, (_, i) =>
      preset({ id: `p-${i}`, name: `Receita ${i}` }),
    );
    expect(sanitizePresets(list)).toHaveLength(PRESET_MAX);
  });
});

describe('upsertPreset / removePreset', () => {
  it('adiciona um preset novo no fim', () => {
    const out = upsertPreset([preset()], preset({ id: 'p-2', name: 'Bambu' }));
    expect(out.map((p) => p.id)).toEqual(['p-1', 'p-2']);
  });

  it('atualiza pelo id preservando a posição e a data de criação', () => {
    const out = upsertPreset(
      [preset(), preset({ id: 'p-2', name: 'Bambu' })],
      preset({ powerPercent: 100, createdAt: 1 }),
    );
    expect(out).toHaveLength(2);
    expect(out[0].powerPercent).toBe(100);
    expect(out[0].createdAt).toBe(1_700_000_000_000);
  });

  it('substitui quando nome + módulo + ação coincidem (mesmo usuário salvando de novo)', () => {
    const out = upsertPreset(
      [preset()],
      preset({ id: 'novo', speedMmMin: 900 }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('novo');
    expect(out[0].speedMmMin).toBe(900);
  });

  it('não compara nomes de módulos/ações diferentes', () => {
    const out = upsertPreset([preset()], preset({ id: 'p-2', module: '10W' }));
    expect(out).toHaveLength(2);
  });

  it('descarta a receita mais antiga quando a lista está cheia', () => {
    const full = Array.from({ length: PRESET_MAX }, (_, i) =>
      preset({ id: `p-${i}`, name: `Receita ${i}`, createdAt: 1000 + i }),
    );
    const out = upsertPreset(
      full,
      preset({ id: 'nova', name: 'Nova', createdAt: 9999 }),
    );
    expect(out).toHaveLength(PRESET_MAX);
    expect(out.some((p) => p.id === 'p-0')).toBe(false);
    expect(out.some((p) => p.id === 'nova')).toBe(true);
  });

  it('remove pelo id', () => {
    const out = removePreset(
      [preset(), preset({ id: 'p-2', name: 'B' })],
      'p-1',
    );
    expect(out.map((p) => p.id)).toEqual(['p-2']);
    expect(removePreset(out, 'nao-existe')).toHaveLength(1);
  });
});

describe('dose (RF-IMG-10)', () => {
  it('usa a potência nominal do módulo e a velocidade', () => {
    // 5 W × 80 % × 60 / 600 mm/min = 0,4 J/mm
    expect(doseJPerMm(preset())).toBeCloseTo(0.4, 6);
    expect(doseJPerMm(preset({ module: '10W', speedMmMin: 1200 }))).toBeCloseTo(
      0.4,
      6,
    );
    expect(MODULE_WATTS['3W']).toBe(3);
  });

  it('multiplica pelas passadas na dose total', () => {
    expect(totalDoseJPerMm(preset())).toBeCloseTo(0.8, 6);
  });

  it('nunca divide por zero', () => {
    expect(Number.isFinite(doseJPerMm(preset({ speedMmMin: 0 })))).toBe(true);
  });
});

describe('convertPresetTo', () => {
  it('preserva a dose ao trocar de módulo', () => {
    // 5 W a 40 % em 600 mm/min = 2 W efetivos → 3 W precisa de 66,7 %.
    const c = convertPresetTo(preset({ powerPercent: 40 }), { module: '3W' });
    expect(c.powerPercent).toBeCloseTo(66.7, 1);
    expect(c.speedMmMin).toBe(600);
    expect(c.limited).toBe(false);
  });

  it('preserva a dose ao subir de módulo', () => {
    // 5 W a 80 % → 10 W precisa de 40 %.
    expect(convertPresetTo(preset(), { module: '10W' }).powerPercent).toBe(40);
  });

  it('avisa quando o módulo não alcança a dose', () => {
    const strong = preset({
      module: '10W',
      powerPercent: 100,
      speedMmMin: 300,
    });
    const c = convertPresetTo(strong, { module: '3W' });
    expect(c.powerPercent).toBe(100);
    expect(c.limited).toBe(true);
  });

  it('aceita outra velocidade (mesma dose, mais rápido)', () => {
    const c = convertPresetTo(preset(), { module: '5W', speedMmMin: 1200 });
    // Mesmo módulo, dobro da velocidade → dobro da potência (160 % → teto).
    expect(c.powerPercent).toBe(100);
    expect(c.limited).toBe(true);
    expect(c.speedMmMin).toBe(1200);
  });
});

describe('JSON', () => {
  it('exporta versionado e volta na importação', () => {
    const json = presetsToJson([preset()]);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(PRESET_JSON_VERSION);
    expect(parsed.app).toBe('GRBL Studio');
    expect(presetsFromJson(json)).toEqual({ presets: [preset()], skipped: 0 });
  });

  it('aceita um array "cru" e JSON inválido', () => {
    expect(presetsFromJson(JSON.stringify([preset()])).presets).toHaveLength(1);
    expect(presetsFromJson('{oops')).toEqual({
      presets: [],
      skipped: 0,
      error: 'invalid',
    });
    expect(presetsFromJson('{"foo":1}').error).toBe('invalid');
  });

  it('conta as entradas ruins em vez de falhar tudo', () => {
    const text = JSON.stringify({
      version: 1,
      presets: [preset(), { id: 'x' }, null],
    });
    const result = presetsFromJson(text);
    expect(result.presets).toHaveLength(1);
    expect(result.skipped).toBe(2);
    expect(result.error).toBeUndefined();
  });
});
