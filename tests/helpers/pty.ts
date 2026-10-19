/**
 * Helpers para testes de integração com um par de PTYs reais (socat).
 *
 * O app abre uma ponta (`a`); o "GRBL" falso usa a outra (`b`) via streams.
 * Requer `socat` no PATH — os testes que usam estes helpers devem ser pulados
 * (`describe.skipIf(!hasSocat())`) quando ele não estiver disponível.
 */

import { execSync, spawn, type ChildProcess } from 'node:child_process';

export function hasSocat(): boolean {
  try {
    execSync('command -v socat', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export interface PtyPair {
  /** Processo do socat (matar no cleanup). */
  proc: ChildProcess;
  /** Ponta usada pelo app (serialport). */
  a: string;
  /** Ponta usada pelo emulador (streams). */
  b: string;
}

/** Cria um par de PTYs cru, sem eco, interligados pelo socat. */
export async function createPtyPair(): Promise<PtyPair> {
  const proc = spawn('socat', ['-d', '-d', 'pty,raw,echo=0', 'pty,raw,echo=0']);
  const paths: string[] = [];

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('timeout aguardando PTYs do socat')),
        5000,
      );
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
  } catch (err) {
    proc.kill('SIGKILL');
    throw err;
  }

  return { proc, a: paths[0]!, b: paths[1]! };
}

/** Espera até a condição virar verdadeira (polling curto). */
export function waitFor(
  predicate: () => boolean,
  timeoutMs = 6000,
  intervalMs = 10,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = (): void => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('timeout esperando condição'));
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
