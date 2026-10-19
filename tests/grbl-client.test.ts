import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GrblClient,
  type TransportLike,
} from '../src/main/services/GrblClient';
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

describe('GrblClient — comandos avulsos (um por vez)', () => {
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
    // A janela manda as linhas curtas de uma vez (contagem de caracteres)…
    expect(fake.written).toEqual(['G1 X1', 'G1 X2', 'G1 X3']);

    // …mas o job só termina quando **todos** os `ok` chegam: `sent` chega ao
    // total ao enviar a última linha, não ao executá-la.
    fake.feed('ok\n');
    expect(jobs.at(-1)!.state).toBe('running');
    fake.feed('ok\n');
    fake.feed('ok\n');

    expect(progress.at(-1)).toEqual({ sent: 3, total: 3 });
    expect(jobs.at(-1)!.state).toBe('finished');
    expect(fake.written).toEqual(['G1 X1', 'G1 X2', 'G1 X3']);
  });

  it('limita os eventos de progresso mas sempre entrega o final', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);

    const progress: Array<{ sent: number; total: number }> = [];
    client.on('progress', (p) => progress.push(p));

    // 50 linhas com os `ok` em rajada (muito mais rápido que o intervalo de
    // 100 ms): o renderer não pode receber 50 eventos de IPC.
    const lines = Array.from({ length: 50 }, (_, i) => `G1 X${i}`);
    client.startJob(lines, 'teste');
    for (let i = 0; i < lines.length; i++) fake.feed('ok\n');

    expect(progress.length).toBeLessThan(10);
    expect(progress.length).toBeGreaterThanOrEqual(2);
    // O último evento sempre chega, com o total correto (barra anda até o fim).
    expect(progress.at(-1)).toEqual({ sent: 50, total: 50 });
    // E `sent` nunca anda para trás.
    const sent = progress.map((p) => p.sent);
    expect([...sent].sort((a, b) => a - b)).toEqual(sent);
  });

  it('aborta o job em "error:N"', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    const jobs: JobInfo[] = [];
    client.on('job', (j) => jobs.push(j));

    client.startJob(['G1 X1', 'G1 X2']);
    // A janela já colocou as duas linhas em voo; o que ainda estava na fila do
    // job é descartado no aborto e nada mais do job é enviado.
    const written = [...fake.written];
    fake.feed('error:9\n');

    expect(jobs.at(-1)!.state).toBe('aborted');
    expect(jobs.at(-1)!.error).toMatch(/alarme ou jog/i);
    fake.feed('ok\n');
    fake.feed('ok\n');
    expect(fake.written).toEqual(written);
  });

  it('alarme limpa a fila e aborta', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    const jobs: JobInfo[] = [];
    client.on('job', (j) => jobs.push(j));

    client.startJob(['G1 X1', 'G1 X2', 'G1 X3']);
    fake.feed('ALARM:1\n');

    expect(jobs.at(-1)!.state).toBe('aborted');
    // O alarme descarta o que estava em voo: a fila retoma de imediato.
    client.sendLine('$X'); // fila aceita novos comandos avulsos
    expect(fake.written).toEqual(['G1 X1', 'G1 X2', 'G1 X3', '$X']);
  });

  it('alarme traz a ação recomendada catalogada (RF-STA-4)', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    const errors: { code?: number; solution?: string }[] = [];
    client.on('error', (e) => errors.push(e));
    fake.feed('ALARM:1\n');
    expect(errors.at(-1)!.code).toBe(1);
    expect(errors.at(-1)!.solution).toBeTruthy();
  });
});

describe('GrblClient — janela de envio (contagem de caracteres)', () => {
  it('mantém linhas em voo até o orçamento do buffer RX', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);

    // `G1 X000 Y1.234 S500` = 19 bytes + '\n' = 20; o buffer RX padrão (128)
    // menos a margem = 120, então cabem 6 linhas em voo (120/20).
    const lines = Array.from(
      { length: 50 },
      (_, i) => `G1 X${String(i).padStart(3, '0')} Y1.234 S500`,
    );
    client.startJob(lines, 'janela');
    expect(fake.written.length).toBe(6);

    // Cada `ok` libera exatamente o espaço de uma linha.
    fake.feed('ok\n');
    expect(fake.written.length).toBe(7);

    for (let i = 0; i < 60; i++) fake.feed('ok\n');
    expect(fake.written.length).toBe(50);
  });

  it('limita as linhas em voo à profundidade do planner', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);

    // Linhas curtas (6 B) caberiam 20 na janela de 120 B; o teto do planner
    // (16 blocos → 15 linhas) evita encher a fila da máquina de uma vez.
    client.startJob(
      Array.from({ length: 50 }, () => 'G1 X1'),
      'janela',
    );
    expect(fake.written.length).toBe(15);
  });

  it('usa o buffer RX informado pela máquina ([OPT:…])', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    fake.feed('[OPT:V,15,256]\n'); // GRBL com buffer RX de 256 bytes

    // 20 bytes/linha: 248/20 = 12 em voo (contra 6 com o buffer padrão de 128).
    const lines = Array.from(
      { length: 100 },
      (_, i) => `G1 X${String(i).padStart(3, '0')} Y1.234 S500`,
    );
    client.startJob(lines, 'janela');
    expect(fake.written.length).toBe(12);
  });

  it('nunca envia linha maior que o buffer RX (aborta o job)', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    const errors: string[] = [];
    client.on('error', (e) => errors.push(e.message));

    // 201 bytes: não cabe no buffer de 128 B — enviar estouraria o buffer e o
    // GRBL perderia caracteres no meio (G-code corrompido). Melhor falhar alto.
    const long = `;${'x'.repeat(200)}`;
    client.startJob(['G1 X1', long, 'G1 X2'], 'longa');

    expect(fake.written).toEqual(['G1 X1']); // a longa nunca sai
    expect(errors.join(' ')).toMatch(/Linha longa demais/);

    // Job abortado: as linhas seguintes não são enviadas nem com `ok` chegando.
    fake.feed('ok\n');
    expect(fake.written).toEqual(['G1 X1']);
  });

  it('rejeita a consulta enfileirada quando um job começa', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);

    client.sendLine('G1 X1'); // ocupa a janela…
    const pending = client.query('$$'); // …então a consulta fica só na fila
    const rejected = expect(pending).rejects.toThrow('Consulta cancelada');

    client.startJob(['G1 X2'], 'novo');
    await rejected;

    expect(fake.written).not.toContain('$$');
    expect(fake.written).toContain('G1 X2');
  });

  it('não mistura consulta com linhas do job em voo', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    client.startJob(['G1 X1', 'G1 X2'], 'janela');

    const pending = client.query('$$');
    expect(fake.written).toEqual(['G1 X1', 'G1 X2']); // consulta espera a janela

    fake.feed('ok\n');
    fake.feed('ok\n');
    expect(fake.written.at(-1)).toBe('$$');

    fake.feed('[SETTING:x]\n');
    fake.feed('ok\n');
    await expect(pending).resolves.toEqual(['[SETTING:x]']);
  });
});

describe('GrblClient — tempo real', () => {
  it('pause/resume usam bytes de tempo real (sem newline)', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    const jobs: JobInfo[] = [];
    client.on('job', (j) => jobs.push(j));
    client.startJob(['G1 X1', 'G1 X2']);
    expect(fake.written).toEqual(['G1 X1', 'G1 X2']);

    const sent = fake.written.length;
    client.pauseJob();
    expect(fake.realtime).toContain(0x21); // '!'
    expect(fake.written.length).toBe(sent);

    // Em pausa o envio do job para: os `ok` que chegam não liberam mais linhas
    // nem concluem o job (a máquina ainda tem movimento no buffer).
    fake.feed('ok\n');
    fake.feed('ok\n');
    expect(fake.written.length).toBe(sent);
    expect(jobs.at(-1)!.state).toBe('paused');

    client.resumeJob();
    expect(fake.realtime).toContain(0x7e); // '~'
    expect(jobs.at(-1)!.state).toBe('finished');
  });

  it('override de feed emite bytes 0x90-0x94', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    client.overrideFeed('plus10');
    client.overrideFeed('reset');
    expect(fake.realtime).toEqual([0x91, 0x90]);
  });

  it('override de potência (spindle) emite bytes 0x99-0x9d', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    client.overrideSpindle('plus1');
    client.overrideSpindle('minus10');
    client.overrideSpindle('reset');
    expect(fake.realtime).toEqual([0x9c, 0x9b, 0x99]);
  });

  it('override rápido emite bytes 0x95-0x97 (3 níveis)', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    client.overrideRapid('medium');
    client.overrideRapid('low');
    client.overrideRapid('default');
    expect(fake.realtime).toEqual([0x96, 0x97, 0x95]);
  });

  it('stopJob envia soft reset (0x18)', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    client.startJob(['G1 X1']);
    client.stopJob();
    expect(fake.realtime).toContain(0x18);
  });

  it('cancelJog emite 0x85 (jog contínuo — RF-JOG-2)', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    client.cancelJog();
    expect(fake.realtime).toEqual([0x85]);
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

  it('não dispara o vigia com a janela cheia sendo confirmada aos poucos', async () => {
    vi.useFakeTimers();
    const { fake, client } = setup({ stallMs: 500 });
    await client.connect(CONNECT);
    const errors: string[] = [];
    client.on('error', (e: { message: string }) => errors.push(e.message));

    // A janela coloca ~20 linhas em voo de uma vez; os `ok` chegam depois, um a
    // cada 200 ms. Um timer por linha (em vez de um único timer reiniciado)
    // dispararia o "stall" no meio do job e travaria o envio.
    const jobs: JobInfo[] = [];
    client.on('job', (j) => jobs.push(j));
    client.startJob(
      Array.from({ length: 30 }, () => 'G1 X1'),
      'janela',
    );
    for (let i = 0; i < 30; i++) {
      await vi.advanceTimersByTimeAsync(200);
      fake.feed('ok\n');
    }

    expect(errors).toEqual([]);
    expect(jobs.at(-1)!.state).toBe('finished');
  });
});

describe('GrblClient — consultas ($$, etc.)', () => {
  it('devolve as linhas até o "ok" (sem incluí-lo)', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);

    const promise = client.query('$$');
    expect(fake.written).toEqual(['$$']);

    fake.feed('$0=10\n$1=25\n$32=0\n');
    fake.feed('ok\n');

    await expect(promise).resolves.toEqual(['$0=10', '$1=25', '$32=0']);
  });

  it('alterna com jobs sem misturar a captura', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);

    const promise = client.query('$G');
    fake.feed('[GC:G0 G54 G17 G21 G90 G94 M5 M9]\n');
    // uma linha de job não deve entrar na consulta
    fake.feed('ok\n');

    await expect(promise).resolves.toEqual([
      '[GC:G0 G54 G17 G21 G90 G94 M5 M9]',
    ]);
  });

  it('rejeita em "error:N"', async () => {
    const { fake, client } = setup();
    await client.connect(CONNECT);
    const promise = client.query('$88=x');
    fake.feed('error:3\n');
    await expect(promise).rejects.toThrow();
  });

  it('rejeita quando a máquina não responde', async () => {
    vi.useFakeTimers();
    const { client } = setup({ stallMs: 4000 });
    await client.connect(CONNECT);
    const promise = client.query('$I');
    vi.advanceTimersByTime(4001);
    await expect(promise).rejects.toThrow(/não respondeu/);
  });

  it('recusa enquanto desconectado e com consulta em andamento', async () => {
    const { fake, client } = setup();
    await expect(client.query('$$')).rejects.toThrow(/Conecte-se/);

    await client.connect(CONNECT);
    const first = client.query('$$');
    await expect(client.query('$I')).rejects.toThrow(/andamento/);
    fake.feed('ok\n');
    await expect(first).resolves.toEqual([]);
  });
});
