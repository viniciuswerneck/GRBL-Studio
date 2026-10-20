import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PrefsStore } from '../src/main/services/PrefsStore';
import type { Prefs } from '../src/shared/types';

const created: string[] = [];

async function storeWith(json?: unknown): Promise<PrefsStore> {
  const { store } = await storeAndFile(json);
  return store;
}

async function storeAndFile(
  json?: unknown,
): Promise<{ store: PrefsStore; file: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), 'grbl-prefs-'));
  created.push(dir);
  const file = path.join(dir, 'prefs.json');
  if (json !== undefined) await writeFile(file, JSON.stringify(json), 'utf8');
  return { store: new PrefsStore(file), file };
}

afterEach(async () => {
  for (const dir of created) await rm(dir, { recursive: true, force: true });
  created.length = 0;
});

describe('PrefsStore — sanitização das novas chaves', () => {
  it('mantém a pasta de arquivos (RF-CFG-5)', async () => {
    const store = await storeWith({ fileDir: '/home/user/gcode' });
    expect((await store.read()).fileDir).toBe('/home/user/gcode');
  });

  it('normaliza perfis de configuração, descartando lixo (RF-CFG-4)', async () => {
    const store = await storeWith({
      settingProfiles: [
        { name: '  Corte fino  ', values: { 130: 400, '131': '420', x: 1 } },
        { name: '', values: { 130: 1 } },
        'nope',
        { name: 'Sem valores' },
      ],
    });
    const profiles = (await store.read()).settingProfiles!;
    expect(profiles).toHaveLength(2);
    expect(profiles[0]).toEqual({
      name: 'Corte fino',
      values: { 130: '400', 131: '420' },
    });
    expect(profiles[1]).toEqual({ name: 'Sem valores', values: {} });
  });

  it('mantém apenas alarmes válidos e limita a 100 (RF-STA-7)', async () => {
    const entries = Array.from({ length: 120 }, (_, i) => ({
      ts: i,
      code: 1,
      message: `alarme ${i}`,
    }));
    const store = await storeWith({
      alarmHistory: [...entries, { nope: true }],
    });
    const history = (await store.read()).alarmHistory!;
    expect(history).toHaveLength(100);
    expect(history.at(-1)!.message).toBe('alarme 119');
    expect(history[0]!.message).toBe('alarme 20');
    expect(history[0]!.code).toBe(1);
  });

  it('mantém só ajustes válidos de símbolos e nunca o conteúdo (RF-CFG-5)', async () => {
    const store = await storeWith({
      symbols: {
        qr: {
          symbology: 'datamatrix',
          ecc: 'H',
          version: 7,
          dmSize: 32,
          moduleMm: 0.8,
          widthMm: 25,
          keepAspect: true,
          feed: 1200,
          mode: 'M3',
          // lixo/segredo: tem de ser descartado
          content: 'não persistir',
          moduleMmHack: 'x',
          quietZoneModules: 999,
        },
        barcode: {
          symbology: 'gs1-128',
          xDimMm: 0.33,
          barHeightMm: 12.7,
          hri: true,
          code39Ratio: 2,
          code39Checksum: true,
          targetWidthMm: 60,
          content: 'também não',
        },
      },
    });
    const prefs = await store.read();
    expect(prefs.symbols?.qr).toEqual({
      symbology: 'datamatrix',
      ecc: 'H',
      version: 7,
      dmSize: 32,
      moduleMm: 0.8,
      widthMm: 25,
      keepAspect: true,
      feed: 1200,
      mode: 'M3',
    });
    expect(prefs.symbols?.barcode).toEqual({
      symbology: 'gs1-128',
      xDimMm: 0.33,
      barHeightMm: 12.7,
      hri: true,
      code39Ratio: 2,
      code39Checksum: true,
      targetWidthMm: 60,
    });
    expect(JSON.stringify(prefs)).not.toContain('persistir');
  });

  it('guarda os ajustes do PDF417 e do Aztec (RF-SYM-7)', async () => {
    const store = await storeWith({
      symbols: {
        qr: {
          symbology: 'aztec',
          aztecEccPercent: 40,
          pdfEcc: 4,
          pdfColumns: 6,
          pdfRowHeightMm: 1.4,
        },
      },
    });
    expect((await store.read()).symbols?.qr).toEqual({
      symbology: 'aztec',
      aztecEccPercent: 40,
      pdfEcc: 4,
      pdfColumns: 6,
      pdfRowHeightMm: 1.4,
    });

    // Fora da faixa: descartado (a norma do Aztec pede no mínimo 23 %).
    const bad = await storeWith({
      symbols: { qr: { symbology: 'aztec', aztecEccPercent: 5 } },
    });
    expect((await bad.read()).symbols?.qr).toEqual({ symbology: 'aztec' });
  });

  it('guarda o tour visto (P0.4) e descarta valor inválido', async () => {
    const store = await storeWith({ onboarding: 1 });
    expect((await store.read()).onboarding).toBe(1);
    const round = await store.updateInPlace({ onboarding: 1.6 });
    expect(round.onboarding).toBe(2);

    const bad = await storeWith({ onboarding: 'sim' });
    expect((await bad.read()).onboarding).toBeUndefined();
  });

  it('descarta simbologia desconhecida e símbolos sem nada válido', async () => {
    const store = await storeWith({
      symbols: { barcode: { symbology: 'evil', content: 'x' } },
    });
    expect((await store.read()).symbols).toBeUndefined();
  });

  it('ignora tipos inválidos sem quebrar', async () => {
    const store = await storeWith({
      fileDir: 42,
      settingProfiles: 'nope',
      alarmHistory: { a: 1 },
    });
    expect(await store.read()).toEqual({});
  });

  it('persiste e relê as preferências (round-trip)', async () => {
    const { store, file } = await storeAndFile();
    const patch: Partial<Prefs> = {
      fileDir: '/tmp/gcode',
      settingProfiles: [{ name: 'Padrão', values: { 130: '410' } }],
      alarmHistory: [{ ts: 1, code: 2, message: 'oops', solution: 'faça X' }],
    };
    const saved = await store.updateInPlace(patch);
    expect(saved).toEqual(patch);

    const raw = JSON.parse(await readFile(file, 'utf8'));
    expect(raw.fileDir).toBe('/tmp/gcode');
    expect(raw.settingProfiles).toHaveLength(1);
    expect(raw.alarmHistory[0].solution).toBe('faça X');
  });
});
