/**
 * Transporte serial: encapsula `serialport` e expõe eventos + escrita.
 *
 * Responsabilidade única: I/O da porta. Nada de protocolo aqui.
 */

import { EventEmitter } from 'node:events';
import type { SerialPort as SerialPortHandle } from 'serialport';

export class SerialTransport extends EventEmitter {
  private port: SerialPortHandle | null = null;

  constructor(
    private readonly path: string,
    private readonly baudRate: number,
  ) {
    super();
  }

  get isOpen(): boolean {
    return this.port?.isOpen ?? false;
  }

  /** Abre a porta. Rejeita se falhar (ex.: permissão / porta ocupada). */
  async open(): Promise<void> {
    // Import sob demanda: o binding nativo custa ~35 ms com cache quente e só
    // é preciso ao conectar de fato (RNF-11: o startup não paga esse custo).
    const { SerialPort } = await import('serialport');
    return new Promise((resolve, reject) => {
      const port = new SerialPort({
        path: this.path,
        baudRate: this.baudRate,
        autoOpen: false,
      });

      port.on('data', (chunk: Buffer) =>
        this.emit('data', chunk.toString('utf8')),
      );
      port.on('error', (err: Error) => this.emit('error', err));
      port.on('close', (err?: Error) => {
        this.port = null;
        this.emit('close', err);
      });

      port.open((err) => {
        if (err) {
          reject(err);
          return;
        }
        this.port = port;
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
      if (!this.port?.isOpen) {
        reject(new Error('Porta serial não está aberta.'));
        return;
      }
      this.port.write(data, (err) => {
        if (err) {
          reject(err);
          return;
        }
        this.port!.drain((drainErr) =>
          drainErr ? reject(drainErr) : resolve(),
        );
      });
    });
  }

  /** Fecha a porta de forma segura (nunca lança). */
  close(): Promise<void> {
    return new Promise((resolve) => {
      const port = this.port;
      if (!port?.isOpen) {
        this.port = null;
        resolve();
        return;
      }
      port.close(() => {
        this.port = null;
        resolve();
      });
    });
  }
}
