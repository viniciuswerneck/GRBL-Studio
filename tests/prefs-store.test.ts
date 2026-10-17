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
