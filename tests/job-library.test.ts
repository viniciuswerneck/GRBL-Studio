/**
 * Biblioteca de jobs (P2.9) — armazenamento em disco.
 *
 * O contrato que importa: nada do que o renderer manda pode escapar do
 * diretório, o acervo não cresce sem teto e um índice corrompido nunca derruba
 * a listagem (a biblioteca é um extra, não parte do fluxo de gravação).
 */

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  JOB_LIBRARY_MAX,
  JOB_LIBRARY_MAX_PROGRAM_BYTES,
  JobLibrary,
} from '../src/main/services/JobLibrary';
import type { JobLibraryAdd } from '../src/shared/types';

/** PNG 1×1 válido (o main só confere o formato do data URL). */
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let dir: string;
let lib: JobLibrary;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'grbl-joblib-'));
  lib = new JobLibrary(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function add(overrides: Partial<JobLibraryAdd> = {}): Promise<unknown> {
  return lib.add({
    name: 'peca.gcode',
    source: 'image',
    estimatedSec: 90,
    program: ['G21', 'G1 X1', 'M5'],
    thumb: PNG,
    ...overrides,
  });
}

describe('JobLibrary', () => {
  it('registra, lista e devolve o programa (texto) de volta', async () => {
    const entry = await add();
    expect(entry.id).toMatch(/^[a-z0-9][a-z0-9-]{5,39}$/i);
    expect(entry.name).toBe('peca.gcode');
    expect(entry.source).toBe('image');
    expect(entry.lines).toBe(3);
    expect(entry.bytes).toBe(Buffer.byteLength('G21\nG1 X1\nM5', 'utf8'));
    expect(entry.hasProgram).toBe(true);
    expect(entry.thumb).toBe(PNG);
    expect(entry.estimatedSec).toBe(90);
    expect(entry.createdAt).toBeGreaterThan(0);

    const list = await lib.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(entry.id);
    // O programa comprimido fica ao lado do índice.
    expect(readdirSync(dir).sort()).toEqual(['index.json', `${entry.id}.gz`]);
    expect(await lib.read(entry.id)).toBe('G21\nG1 X1\nM5');
  });

  it('deduplica o mesmo programa e não deixa arquivo órfão', async () => {
    const first = await add();
    const second = await add({ name: 'renomeado.gcode' });
    expect(second.id).not.toBe(first.id);

    const list = await lib.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(second.id);
    expect(list[0].name).toBe('renomeado.gcode');
    expect(readdirSync(dir)).not.toContain(`${first.id}.gz`);
  });

  it('mantém a miniatura anterior quando a reexecução não manda uma', async () => {
    const first = await add();
    const second = await add({ thumb: undefined });
    expect(second.id).not.toBe(first.id);
    expect(second.thumb).toBe(PNG);
    expect((await lib.list())[0].thumb).toBe(PNG);
  });

  it('mantém a ordem do mais novo para o mais antigo', async () => {
    const a = await add({ program: ['G0 X1'] });
    const b = await add({ program: ['G0 X2'] });
    const c = await add({ program: ['G0 X3'] });
    const list = await lib.list();
    expect(list.map((item) => item.id)).toEqual([c.id, b.id, a.id]);
    expect(list[0].createdAt).toBeGreaterThan(list[1].createdAt);
    expect(list[1].createdAt).toBeGreaterThan(list[2].createdAt);
  });

  it('respeita o teto de 50 entradas e remove os programas descartados', async () => {
    for (let i = 0; i < JOB_LIBRARY_MAX + 2; i++) {
      await add({ name: `job-${i}.gcode`, program: [`G1 X${i}`] });
    }
    const list = await lib.list();
    expect(list).toHaveLength(JOB_LIBRARY_MAX);
    expect(list[0].name).toBe(`job-${JOB_LIBRARY_MAX + 1}.gcode`);
    expect(list.some((item) => item.name === 'job-0.gcode')).toBe(false);
    expect(
      readdirSync(dir).filter((file) => file.endsWith('.gz')),
    ).toHaveLength(JOB_LIBRARY_MAX);
  });

  it('registra job grande sem guardar o programa (sem reexecutar)', async () => {
    const huge = 'X'.repeat(JOB_LIBRARY_MAX_PROGRAM_BYTES + 1);
    const entry = await lib.add({ name: 'grande.gcode', program: [huge] });
    expect(entry.lines).toBe(1);
    expect(entry.hasProgram).toBe(false);
    expect(entry.bytes).toBeGreaterThan(JOB_LIBRARY_MAX_PROGRAM_BYTES);
    expect(await lib.read(entry.id)).toBeNull();
    expect((await lib.list())[0].hasProgram).toBe(false);
  });

  it('sanitiza nome, origem e miniatura vindos do renderer', async () => {
    const entry = await lib.add({
      name: '  peça\u0000 estranha  ',
      source: 'NAO-VALE!',
      thumb: 'javascript:alert(1)',
      program: ['G0'],
    });
    expect(entry.name).toMatch(/^peça\s+estranha$/);
    expect(entry.source).toBe('file');
    expect(entry.thumb).toBeUndefined();
  });

  it('recusa id inválido e nunca sai do diretório', async () => {
    await add();
    expect(await lib.read('../../etc/passwd')).toBeNull();
    expect(await lib.read('..')).toBeNull();
    expect(await lib.read('')).toBeNull();
    expect(await lib.remove('../../etc/passwd')).toBe(false);
    // Um id válido porém desconhecido também não vaza nada.
    expect(await lib.read('nao-existe-123')).toBeNull();
  });

  it('remove uma entrada e limpa todas (índice + arquivos)', async () => {
    const a = await add({ program: ['G0 X1'] });
    const b = await add({ program: ['G0 X2'] });
    expect(await lib.remove(a.id)).toBe(true);
    expect(await lib.remove(a.id)).toBe(false);
    expect((await lib.list()).map((item) => item.id)).toEqual([b.id]);
    expect(await lib.read(a.id)).toBeNull();

    await lib.clear();
    expect(await lib.list()).toEqual([]);
    expect(readdirSync(dir).filter((file) => file.endsWith('.gz'))).toEqual([]);
  });

  it('índice corrompido vira biblioteca vazia (e não lança)', async () => {
    await add();
    writeFileSync(path.join(dir, 'index.json'), '{ isto não é json', 'utf8');
    const fresh = new JobLibrary(dir);
    expect(await fresh.list()).toEqual([]);
    // E volta a funcionar: o próximo add reescreve o índice.
    await fresh.add({ name: 'novo.gcode', program: ['G0'] });
    expect(await fresh.list()).toHaveLength(1);
  });

  it('aceita adds simultâneos sem perder entrada', async () => {
    await Promise.all([
      add({ program: ['G1 X1'] }),
      add({ program: ['G1 X2'] }),
      add({ program: ['G1 X3'] }),
    ]);
    const list = await lib.list();
    expect(list).toHaveLength(3);
    expect(new Set(list.map((item) => item.id)).size).toBe(3);
  });
});
