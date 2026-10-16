/**
 * Teste de integração do transporte serial com um par de PTYs reais (socat).
 * Valida o caminho verdadeiro: `serialport` -> PTY -> lado "GRBL" falso.
 *
 * Requer `socat` no PATH; caso ausente, o teste é ignorado.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { SerialTransport } from '../src/main/services/SerialTransport';

function hasSocat(): boolean {
  try {
    const { execSync } = require('node:child_process') as typeof import('node:child_process');
    execSync('command -v socat', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const SOCAT = hasSocat();

async function createPtyPair(): Promise<{ proc: ChildProcess; a: string; b: string }> {
  const proc = spawn('socat', ['-d', '-d', 'pty,raw,echo=0', 'pty,raw,echo=0']);
  const paths: string[] = [];

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout aguardando PTYs do socat')), 5000);
    const onData = (buf: Buffer): void => {
      const found = buf.toString().match(/\/dev\/pts\/\d+/g);
      if (found) paths.push(...found);
      if (paths.length >= 2) {
        clearTimeout(timer);
        proc.stderr.off('data', onData);
        resolve();
      }
    };
    proc.stderr.on('data', onData);
    proc.on('error', reject);
  });

  return { proc, a: paths[0]!, b: paths[1]! };
}

function waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = (): void => {
      if (predicate()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout esperando condição'));
      setTimeout(tick, 20);
    };
    tick();
  });
}

const cleanups: Array<() => void> = [];
afterAll(() => cleanups.forEach((fn) => fn()));

describe.skipIf(!SOCAT)('SerialTransport — integração via PTY', () => {
  it('abre a porta, escreve uma linha e recebe dados', async () => {
    const { proc, a, b } = await createPtyPair();
    cleanups.push(() => proc.kill('SIGKILL'));

    const rx = fs.createReadStream(b);
    const rxChunks: string[] = [];
    rx.on('data', (c) => rxChunks.push(c.toString()));
    rx.on('error', () => undefined); // EIO esperado ao fechar o PTY
    cleanups.push(() => rx.close());

    const tx = fs.createWriteStream(b);
    tx.on('error', () => undefined);
    cleanups.push(() => tx.close());

    const transport = new SerialTransport(a, 115200);
    const inbound: string[] = [];
    transport.on('data', (chunk) => inbound.push(chunk));
    cleanups.push(() => void transport.close());

    await transport.open();
    expect(transport.isOpen).toBe(true);

    // main -> "GRBL": a linha escrita deve chegar do outro lado com \n
    await transport.writeLine('G0 X0');
    await waitFor(() => rxChunks.join('').includes('G0 X0\n'));
    expect(rxChunks.join('')).toContain('G0 X0\n');

    // "GRBL" -> main: dado injetado deve chegar ao evento data
    tx.write('ok\n');
    await waitFor(() => inbound.join('').includes('ok\n'));
    expect(inbound.join('')).toContain('ok');

    await transport.close();
    expect(transport.isOpen).toBe(false);
  });
});