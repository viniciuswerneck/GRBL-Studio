import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SessionLog } from '../src/main/services/SessionLog';

const created: string[] = [];

async function baseDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'grbl-log-'));
  created.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of created) await rm(dir, { recursive: true, force: true });
  created.length = 0;
});

describe('SessionLog — log persistente (RNF-9)', () => {
  it('grava as linhas agrupadas num arquivo de sessão', async () => {
    const dir = await baseDir();
    const log = new SessionLog(dir);
    log.append('linha um');
    log.append('linha dois');
    await log.close();

    expect(log.path).toContain(path.join('logs', 'session-'));
    const files = await readdir(log.dir);
    expect(files).toHaveLength(1);
    const text = await readFile(log.path, 'utf8');
    expect(text).toContain('linha um');
    expect(text).toContain('linha dois');
    expect(text).toMatch(/^# GRBL Studio session /);
  });

  it('init é idempotente e o caminho é estável', async () => {
    const dir = await baseDir();
    const log = new SessionLog(dir);
    await log.init();
    const first = log.path;
    await log.init();
    expect(log.path).toBe(first);
  });

  it('ignora novas linhas após o close (sem timer órfão)', async () => {
    const dir = await baseDir();
    const log = new SessionLog(dir);
    log.append('antes');
    await log.close();
    log.append('depois');
    await log.close();
    const text = await readFile(log.path, 'utf8');
    expect(text).toContain('antes');
    expect(text).not.toContain('depois');
  });
});
