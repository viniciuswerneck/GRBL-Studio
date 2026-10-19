import { describe, expect, it, vi } from 'vitest';

/**
 * `serialport` falso: a porta abre e aceita escrita, mas o **callback do
 * `close` nunca chega** — exatamente o que acontece com o fd de um CDC USB que
 * foi re-enumerado depois do reset do controlador (`PLANO_MAQUINA` §11.6.4).
 * O callback do `write` é assíncrono de propósito: é a janela em que o
 * `close()` já zerou `this.port` e a escrita ainda está em voo.
 */
vi.mock('serialport', () => {
  class FakeSerialPort {
    isOpen = true;
    on(_event: string, _cb: (...args: unknown[]) => void): this {
      return this;
    }
    open(cb: (err?: Error) => void): void {
      cb();
    }
    close(_cb: () => void): void {
      // De propósito: nunca chama o callback.
    }
    write(_data: Buffer, cb: (err?: Error) => void): void {
      setTimeout(() => cb(), 10);
    }
    drain(cb: (err?: Error) => void): void {
      setTimeout(() => cb(), 10);
    }
  }
  return { SerialPort: FakeSerialPort };
});

const { SerialTransport } = await import(
  '../src/main/services/SerialTransport'
);

describe('SerialTransport — porta morta (§11.6.4)', () => {
  it('`close()` resolve mesmo se o callback do `serialport` nunca chegar', async () => {
    vi.useFakeTimers();
    const transport = new SerialTransport('/dev/fake', 115200);
    await transport.open();

    const closed = transport.close();
    // Quem espera (o `disconnect()` do cliente) não pode travar: a UI ficaria
    // presa em "conectado" numa porta que não existe mais.
    await vi.advanceTimersByTimeAsync(600);

    await expect(closed).resolves.toBeUndefined();
    expect(transport.isOpen).toBe(false);
    vi.useRealTimers();
  });

  it('escrita em voo não estoura quando a porta fecha no meio (regressão)', async () => {
    // O callback do `write` chega **depois** do `close()`: o `drain` não pode
    // dereferenciar uma porta já zerada (era `this.port!.drain`).
    vi.useFakeTimers();
    const transport = new SerialTransport('/dev/fake', 115200);
    await transport.open();

    const write = transport.writeLine('G1 X1 F1000');
    const closed = transport.close();
    await vi.advanceTimersByTimeAsync(50);

    await expect(write).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(600);
    await expect(closed).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
