import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GrblClient, type TransportLike } from '../src/main/services/GrblClient';
import type { GrblStatus, JobInfo } from '../src/shared/types';

/** Transporte falso: registra escritas e permite injetar dados. */
class FakeTransport extends EventEmitter implements TransportLike {
  isOpen = false;
  written: string[] = [];
  realtime: number[] = [];

  async open(): Promise<void> {
    this.isOpen = true;
    this.emit('open');
  }
  async writeLine(line: string): Promise<void> {
    this.written.push(line);
  }
  async writeRealtime(byte: number): Promise<void> {
    this.realtime.push(byte);
  }
  async close(): Promise<void> {
    this.isOpen = false;
    this.emit('close');
  }
  feed(data: string): void {
    this.emit('data', data);
  }
}

function setup(overrides: { stallMs?: number } = {}) {
  const fake = new FakeTransport();
  const client = new GrblClient({
    statusPollMs: 100000,
    stallMs: overrides.stallMs ?? 100000,
    transportFactory: () => fake,
  });
  return { fake, client };
}

const CONNECT = { path: '/dev/fake', baudRate: 115200 };

afterEach(() => {
  vi.useRealTimers();
});

describe('GrblClient — conexão', () => {
  it('emite connection connected/disconnected', async () => {
    const { client } = setup();
    const events: string[] = [];
    client.on('connection', (c) => events.push(c));
    await client.connect(CONNECT);
    await client.disconnect();
    expect(events).toEqual(['connecting', 'connected', 'disconnected']);
  });

  it('propaga falha de abertura', async () => {
    const failing = new GrblClient({
      transportFactory: () => {
        const t = new FakeTransport();
        t.open = () => Promise.reject(new Error('permission denied'));
        return t;
      },
    });
    await expect(failing.connect(CONNECT)).rejects.toThrow('permission denied');
  });
});

describe('GrblClient — send-response', () => {
  it('só envia a próxima linha após o "ok"', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);

    client.sendLine('G0 X0');
    client.sendLine('G0 X1');
    expect(fake.written).toEqual(['G0 X0']);

    fake.feed('ok\n');
    expect(fake.written).toEqual(['G0 X0', 'G0 X1']);

    fake.feed('ok\n');
    expect(fake.written).toEqual(['G0 X0', 'G0 X1']);
  });

  it('registra console out/in', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    const dirs: string[] = [];
    client.on('console', (l) => dirs.push(l.direction));

    client.sendLine('$G');
    fake.feed('ok\n');
    expect(dirs).toContain('out');
    expect(dirs).toContain('in');
  });
});

describe('GrblClient — job', () => {
  it('emite progresso e finaliza', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);

    const progress: Array<{ sent: number; total: number }> = [];
    const jobs: JobInfo[] = [];
    client.on('progress', (p) => progress.push(p));
    client.on('job', (j) => jobs.push(j));

    client.startJob(['G1 X1', 'G1 X2', 'G1 X3'], 'teste');
    expect(fake.written).toEqual(['G1 X1']);

    fake.feed('ok\n');
    fake.feed('ok\n');
    fake.feed('ok\n');

    expect(progress.at(-1)).toEqual({ sent: 3, total: 3 });
    expect(jobs.at(-1)!.state).toBe('finished');
    expect(fake.written).toEqual(['G1 X1', 'G1 X2', 'G1 X3']);
  });

  it('aborta o job em "error:N"', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    const jobs: JobInfo[] = [];
    client.on('job', (j) => jobs.push(j));

    client.startJob(['G1 X1', 'G1 X2']);
    fake.feed('error:9\n');

    expect(jobs.at(-1)!.state).toBe('aborted');
    expect(jobs.at(-1)!.error).toMatch(/alarme ou jog/i);
    // não envia mais linhas do job
    fake.feed('ok\n');
    expect(fake.written).toEqual(['G1 X1']);
  });

  it('alarme limpa a fila e aborta', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    const jobs: JobInfo[] = [];
    client.on('job', (j) => jobs.push(j));

    client.startJob(['G1 X1', 'G1 X2', 'G1 X3']);
    fake.feed('ALARM:1\n');

    expect(jobs.at(-1)!.state).toBe('aborted');
    expect(fake.written).toEqual(['G1 X1']);
    client.sendLine('$X'); // fila aceita novos comandos avulsos
    expect(fake.written).toEqual(['G1 X1', '$X']);
  });
});

describe('GrblClient — tempo real', () => {
  it('pause/resume usam bytes de tempo real (sem newline)', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    client.startJob(['G1 X1', 'G1 X2']);

    client.pauseJob();
    expect(fake.realtime).toContain(0x21); // '!'
    expect(fake.written).toEqual(['G1 X1']);

    client.resumeJob();
    expect(fake.realtime).toContain(0x7e); // '~'
  });

  it('override de feed emite bytes 0x90-0x94', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    client.overrideFeed('plus10');
    client.overrideFeed('reset');
    expect(fake.realtime).toEqual([0x91, 0x90]);
  });

  it('stopJob envia soft reset (0x18)', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    client.startJob(['G1 X1']);
    client.stopJob();
    expect(fake.realtime).toContain(0x18);
  });
});

describe('GrblClient — status e parsing', () => {
  it('parseia status report e emite evento', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    let status: GrblStatus | null = null;
    client.on('status', (s) => (status = s));

    fake.feed('<Idle|MPos:1.000,2.000,0.000|FS:0,0>\n');
    expect(status).not.toBeNull();
    expect((status as unknown as GrblStatus).state).toBe('Idle');
    expect(client.getLastStatus()!.mpos).toEqual({ x: 1, y: 2, z: 0 });
  });

  it('lida com linhas chegando em pedaços', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    let status: GrblStatus | null = null;
    client.on('status', (s) => (status = s));

    fake.feed('<Idle|MPos:1.000');
    expect(status).toBeNull();
    fake.feed(',2.000,0.000>\n');
    expect(status).not.toBeNull();
    expect((status as unknown as GrblStatus).mpos!.y).toBe(2);
  });
});

describe('GrblClient — watchdog', () => {
  it('avisa quando a máquina não responde com ok', async () => {
    vi.useFakeTimers();
    const { client } = setup({ stallMs: 5000 });
    await client.connect(CONNECT);

    const errors: string[] = [];
    client.on('error', (e: { message: string }) => errors.push(e.message));

    client.sendLine('G0 X0');
    vi.advanceTimersByTime(5001);

    expect(errors.some((m) => /não respondeu/.test(m))).toBe(true);
  });
});
