import { type Server, type Socket, createServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { TcpTransport } from '../src/main/services/TcpTransport';

interface FakeServer {
  server: Server;
  port: number;
  clients: Socket[];
  received: string;
}

/** Sobe um servidor TCP local que registra tudo o que recebe. */
function startServer(): Promise<FakeServer> {
  return new Promise((resolve) => {
    const info: FakeServer = {
      server: createServer(),
      port: 0,
      clients: [],
      received: '',
    };
    info.server.on('connection', (socket) => {
      info.clients.push(socket);
      socket.on('data', (chunk: Buffer) => {
        info.received += chunk.toString('utf8');
      });
    });
    info.server.listen(0, '127.0.0.1', () => {
      const address = info.server.address();
      info.port = typeof address === 'object' && address ? address.port : 0;
      resolve(info);
    });
  });
}

/** Espera até `check()` virar verdadeiro (com timeout). */
async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}

const openServers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    openServers
      .splice(0)
      .map((srv) => new Promise<void>((resolve) => srv.close(() => resolve()))),
  );
});

describe('TcpTransport (RF-CON-7)', () => {
  it('conecta, envia linha + byte de tempo real e recebe dados', async () => {
    const fake = await startServer();
    openServers.push(fake.server);

    const transport = new TcpTransport('127.0.0.1', fake.port);
    let opened = false;
    transport.on('open', () => {
      opened = true;
    });

    await transport.open();
    expect(opened).toBe(true);
    expect(transport.isOpen).toBe(true);

    await transport.writeLine('G0 X0');
    await transport.writeRealtime(0x3f); // '?'
    await waitFor(() => fake.received.includes('G0 X0\n?'));

    await waitFor(() => fake.clients.length === 1);
    const data = new Promise<string>((resolve) =>
      transport.once('data', (chunk: string) => resolve(chunk)),
    );
    fake.clients[0]!.write('ok\n');
    expect(await data).toContain('ok');

    await transport.close();
    expect(transport.isOpen).toBe(false);
  });

  it('rejeita quando ninguém escuta na porta', async () => {
    const transport = new TcpTransport('127.0.0.1', 1);
    await expect(transport.open()).rejects.toThrow();
  });

  it('rejeita escrita quando a conexão está fechada', async () => {
    const transport = new TcpTransport('127.0.0.1', 23);
    await expect(transport.writeLine('M5')).rejects.toThrow(/WiFi/);
  });
});
