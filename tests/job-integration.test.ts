/**
 * E2E do job pelo caminho real: `GrblClient` → `SerialTransport` → par de PTYs
 * (socat) → emulador GRBL. Sem hardware.
 *
 * Cobre o P0.2 do roadmap (docs/ROADMAP.md): job completo com pausa/retomada,
 * cancelamento e alarme rodando no CI.
 *
 * Requisitos exercitados: RF-GC-* (streaming com janela), RF-STA-* (status,
 * alarme), RF-CON-* (transporte serial). Invariantes do AGENTS.md: comandos de
 * tempo real são byte único, sem `\n`; a janela nunca estoura o buffer RX.
 *
 * Requer `socat` no PATH; caso ausente, a suíte é ignorada.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { GrblClient } from '../src/main/services/GrblClient';
import { SerialTransport } from '../src/main/services/SerialTransport';
import type { GrblStatus, JobInfo } from '../src/shared/types';
import { GrblEmulator } from './helpers/grbl-emulator';
import { createPtyPair, delay, hasSocat, waitFor } from './helpers/pty';

const SOCAT = hasSocat();
const BAUD = 115200;

interface ClientError {
  message: string;
  code?: number;
  solution?: string;
}

interface Harness {
  emulator: GrblEmulator;
  client: GrblClient;
  /** Linhas efetivamente despachadas pelo cliente (console `out`). */
  written: string[];
  jobs: JobInfo[];
  errors: ClientError[];
  statuses: GrblStatus[];
}

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const fn = cleanups.pop()!;
    try {
      await fn();
    } catch {
      // cleanup best-effort: socat/PTY podem já ter morrido
    }
  }
});

async function setup(
  emulatorOptions: ConstructorParameters<typeof GrblEmulator>[1] = {},
): Promise<Harness> {
  const pair = await createPtyPair();
  const emulator = new GrblEmulator(pair.b, emulatorOptions);
  await emulator.open();

  const client = new GrblClient({
    statusPollMs: 20,
    stallMs: 5000,
    transportFactory: () => new SerialTransport(pair.a, BAUD),
  });

  const written: string[] = [];
  const jobs: JobInfo[] = [];
  const errors: ClientError[] = [];
  const statuses: GrblStatus[] = [];

  client.on('console', (line: { direction: string; text: string }) => {
    if (line.direction === 'out') written.push(line.text);
  });
  client.on('job', (job: JobInfo) => jobs.push(job));
  client.on('error', (err: ClientError) => errors.push(err));
  client.on('status', (status: GrblStatus) => statuses.push(status));

  cleanups.push(
    () => {
      pair.proc.kill('SIGKILL');
    },
    () => emulator.close(),
    () => client.disconnect(),
  );

  await client.connect({ path: pair.a, baudRate: BAUD, kind: 'serial' });

  return { emulator, client, written, jobs, errors, statuses };
}

/** Job de N linhas curtas (~8 B): enche a janela de RX e o planner. */
function jobLines(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `G1 X${i % 10}`);
}

function lastJob(h: Harness): JobInfo | undefined {
  return h.jobs.at(-1);
}

describe.skipIf(!SOCAT)('Job E2E — GrblClient + SerialTransport (PTY)', () => {
  it('completa ~30 linhas e preserva a ordem do G-code', {
    timeout: 15_000,
  }, async () => {
    const h = await setup({ ackDelayMs: 6 });
    const lines = jobLines(30);

    h.client.startJob(lines, 'ordem');
    await waitFor(() => lastJob(h)?.state === 'finished');

    // O emulador recebeu e confirmou exatamente na ordem do arquivo.
    expect(h.emulator.receivedLines).toEqual(lines);
    expect(h.emulator.ackedLines).toEqual(lines);
    expect(h.written).toEqual(lines);
    expect(lastJob(h)).toMatchObject({ state: 'finished', total: 30 });
    expect(h.errors).toEqual([]);

    // Streaming com janela: mais de uma linha em voo, mas nunca além do
    // buffer RX (128 B) nem da profundidade do planner (16).
    expect(h.emulator.maxOutstandingLines).toBeGreaterThan(1);
    expect(h.emulator.maxOutstandingLines).toBeLessThanOrEqual(16);
    expect(h.emulator.maxOutstandingBytes).toBeLessThanOrEqual(128);
    expect(h.emulator.windowViolations).toBe(0);
  });

  it('pausa (!) → status Hold → retomada (~) → job termina', {
    timeout: 15_000,
  }, async () => {
    const h = await setup({ ackDelayMs: 12 });
    const lines = jobLines(40);

    h.client.startJob(lines, 'pausa');
    await waitFor(() => h.emulator.ackedLines.length >= 3);

    h.client.pauseJob();
    await waitFor(() => h.emulator.state === 'Hold');
    await waitFor(() => h.client.getLastStatus()?.state === 'Hold');
    expect(lastJob(h)?.state).toBe('paused');
    expect(h.statuses.some((s) => s.state === 'Hold')).toBe(true);

    // Em pausa nenhuma linha nova do job é despachada.
    const writtenAtPause = h.written.length;
    await delay(120);
    expect(h.written.length).toBe(writtenAtPause);

    h.client.resumeJob();
    await waitFor(() => lastJob(h)?.state === 'finished');

    expect(h.emulator.receivedLines).toEqual(lines);
    expect(h.emulator.ackedLines).toEqual(lines);
    expect(h.emulator.realtime.hold).toBe(1);
    expect(h.emulator.realtime.resume).toBe(1);
    expect(h.errors).toEqual([]);
  });

  it('cancelamento (0x18) no meio do job para de escrever', {
    timeout: 15_000,
  }, async () => {
    const h = await setup({ ackDelayMs: 15 });
    const lines = jobLines(40);

    h.client.startJob(lines, 'cancelar');
    await waitFor(() => h.emulator.ackedLines.length >= 3);

    const writtenBefore = h.written.length;
    h.client.stopJob();
    await waitFor(() => h.emulator.realtime.reset > 0);
    await waitFor(() => h.client.getLastStatus()?.state === 'Idle');

    const receivedAtReset = h.emulator.receivedLines.length;
    await delay(200);

    // Nenhuma linha nova do cliente depois do cancelamento — nem no console
    // (`out`), nem no lado da máquina.
    expect(h.written.length).toBe(writtenBefore);
    expect(h.emulator.receivedLines.length).toBe(receivedAtReset);
    expect(h.emulator.state).toBe('Idle');
    expect(lastJob(h)?.state).toBe('aborted');
    expect(lastJob(h)?.error).toMatch(/interrompido/i);
    expect(h.emulator.receivedLines.length).toBeLessThan(lines.length);
  });

  it('alarme no meio do job bloqueia o envio e expõe estado/evento', {
    timeout: 15_000,
  }, async () => {
    const h = await setup({ ackDelayMs: 15 });
    const lines = jobLines(40);

    h.client.startJob(lines, 'alarme');
    await waitFor(() => h.emulator.ackedLines.length >= 3);

    h.emulator.raiseAlarm(1);
    await waitFor(() => h.errors.some((e) => e.code === 1));
    await waitFor(() => h.client.getLastStatus()?.state === 'Alarm');

    const writtenAtAlarm = h.written.length;
    await delay(120);
    const receivedAfterAlarm = h.emulator.receivedLines.length;
    await delay(120);

    // O cliente abortou o job e não escreveu mais nenhuma linha (só o
    // polling de status com `?`, que é tempo real). As linhas que ainda
    // estavam no fio antes do alarme podem chegar depois — mas nenhuma
    // linha nova foi despachada.
    expect(h.written.length).toBe(writtenAtAlarm);
    expect(h.emulator.receivedLines.length).toBe(receivedAfterAlarm);
    expect(receivedAfterAlarm).toBeLessThanOrEqual(writtenAtAlarm);
    expect(h.emulator.state).toBe('Alarm');
    expect(lastJob(h)?.state).toBe('aborted');
    expect(h.statuses.some((s) => s.state === 'Alarm')).toBe(true);

    const alarm = h.errors.find((e) => e.code === 1);
    expect(alarm?.message).toMatch(/alarme|limit/i);
    expect(alarm?.solution).toBeTruthy();
  });

  it('error:9 numa linha do job aborta o envio e reporta o código', {
    timeout: 15_000,
  }, async () => {
    const h = await setup({
      ackDelayMs: 12,
      rejectLine: (line) => line === 'G1 X7',
    });
    const lines = jobLines(40);

    h.client.startJob(lines, 'erro');
    await waitFor(() => h.errors.some((e) => e.code === 9));

    expect(h.emulator.errorLines).toEqual(['G1 X7']);
    expect(lastJob(h)?.state).toBe('aborted');

    const writtenAtError = h.written.length;
    await delay(150);
    expect(h.written.length).toBe(writtenAtError);
    expect(h.emulator.receivedLines.length).toBeLessThan(lines.length);
  });

  it('comandos de tempo real são byte único, sem newline', {
    timeout: 15_000,
  }, async () => {
    const h = await setup({ ackDelayMs: 10 });
    const lines = jobLines(20);

    h.client.startJob(lines, 'framing');
    await waitFor(() => h.emulator.ackedLines.length >= 2);

    h.client.pauseJob();
    await waitFor(() => h.emulator.realtime.hold > 0);
    await waitFor(() => h.emulator.state === 'Hold');

    h.client.resumeJob();
    await waitFor(() => h.emulator.realtime.resume > 0);

    h.client.stopJob();
    await waitFor(() => h.emulator.realtime.reset > 0);
    await delay(80);

    // Cada `?`, `!`, `~` e `0x18` visto no lado falso precisa ser um único
    // byte: nada de `\n` colado (AGENTS.md, invariante 1).
    const frames = h.emulator.framingOf([0x3f, 0x21, 0x7e, 0x18]);
    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      expect(
        frame.followedByNewline,
        `byte 0x${frame.byte.toString(16)} seguido de newline no offset ${frame.offset}`,
      ).toBe(false);
    }

    // E todos os comandos do cenário passaram pelo fio.
    expect(h.emulator.realtime.status).toBeGreaterThan(0);
    expect(h.emulator.realtime.hold).toBe(1);
    expect(h.emulator.realtime.resume).toBe(1);
    expect(h.emulator.realtime.reset).toBe(1);
  });
});
