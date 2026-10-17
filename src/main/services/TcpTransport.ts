/**
 * Transporte TCP/WiFi (RF-CON-7): fala com um ESP8266/serial-over-network que
 * expõe a serial do GRBL em uma porta TCP (tipicamente `192.168.4.1:23`).
 *
 * Mesma responsabilidade do `SerialTransport`: só I/O. O enquadramento de
 * linhas e o protocolo ficam no `GrblClient`.
 *
 * Diferença importante: TCP pode repartir/juntar dados de formas imprevisíveis,
 * mas o `GrblClient` já acumula em `rxBuffer` e divide por `\n`, então nada muda
 * aqui. Usamos `\n` como delimitador (o GRBL aceita `\n` ou `\r\n`).
 */

import { EventEmitter } from 'node:events';
import { Socket } from 'node:net';

export class TcpTransport extends EventEmitter {
  private socket: Socket | null = null;

  constructor(
    private readonly host: string,
    private readonly port: number,
  ) {
    super();
  }

  get isOpen(): boolean {
    return this.socket !== null && !this.socket.destroyed;
  }

  /** Abre a conexão. Rejeita se o host recusar/expirar. */
  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      socket.setNoDelay(true);
      socket.setKeepAlive(true, 5000);

      const onError = (err: Error): void => {
        socket.destroy();
        reject(err);
      };

      socket.once('error', onError);
      socket.connect({ host: this.host, port: this.port }, () => {
        // Conectado: a partir daqui os erros são eventos (não rejeição).
        socket.off('error', onError);
        this.socket = socket;
        socket.on('data', (chunk: Buffer) =>
          this.emit('data', chunk.toString('utf8')),
        );
        socket.on('error', (err: Error) => this.emit('error', err));
        socket.on('close', () => {
          this.socket = null;
          this.emit('close');
        });
        this.emit('open');
        resolve();
      });
    });
  }

  /** Escreve uma linha de comando G-code (adiciona `\n`). */
  writeLine(line: string): Promise<void> {
    return this.writeRaw(Buffer.from(`${line}\n`, 'utf8'));
  }

  /** Escreve um comando de tempo real: byte único, SEM `\n`. */
  writeRealtime(byte: number): Promise<void> {
    return this.writeRaw(Buffer.from([byte]));
  }

  private writeRaw(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = this.socket;
      if (!socket || socket.destroyed) {
        reject(new Error('Conexão WiFi fechada.'));
        return;
      }
      socket.write(data, (err) => (err ? reject(err) : resolve()));
    });
  }

  async close(): Promise<void> {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    await new Promise<void>((resolve) => {
      socket.end();
      socket.destroy();
      resolve();
    });
  }
}
