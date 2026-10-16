/**
 * Handlers IPC: único ponto de contato entre a UI e o GrblClient.
 * Contratos tipados, sem lógica de negócio aqui (apenas wiring).
 */

import { ipcMain, type BrowserWindow } from 'electron';
import { SerialPort } from 'serialport';
import { CHANNELS } from '../shared/channels';
import type { ConnectOptions, JogCommand, OverrideAction, PortInfo } from '../shared/types';
import { GrblClient } from './services/GrblClient';

export interface IpcContext {
  client: GrblClient;
}

/** Registra os handlers e o encaminhamento de eventos para a janela. */
export function registerIpc(getWindow: () => BrowserWindow | null): IpcContext {
  const client = new GrblClient();

  const send = (channel: string, payload: unknown): void => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  client.on('console', (d) => send(CHANNELS.evConsole, d));
  client.on('status', (s) => send(CHANNELS.evStatus, s));
  client.on('progress', (p) => send(CHANNELS.evProgress, p));
  client.on('job', (j) => send(CHANNELS.evJob, j));
  client.on('connection', (c) => send(CHANNELS.evConnection, c));
  client.on('error', (e) => send(CHANNELS.evError, e));

  ipcMain.handle(CHANNELS.portsList, async (): Promise<PortInfo[]> => {
    const ports = await SerialPort.list();
    return ports.map((p) => ({
      path: p.path,
      manufacturer: p.manufacturer,
      serialNumber: p.serialNumber,
      vendorId: p.vendorId,
      productId: p.productId,
    }));
  });

  ipcMain.handle(CHANNELS.connect, async (_evt, opts: ConnectOptions) => {
    await client.connect(opts);
    return true;
  });

  ipcMain.handle(CHANNELS.disconnect, async () => {
    await client.disconnect();
    return true;
  });

  ipcMain.handle(CHANNELS.writeLine, (_evt, line: string) => {
    client.sendLine(line);
    return true;
  });

  ipcMain.handle(CHANNELS.jobStart, (_evt, payload: { lines: string[]; name?: string }) => {
    client.startJob(payload.lines, payload.name);
    return true;
  });

  ipcMain.handle(CHANNELS.jobPause, () => {
    client.pauseJob();
    return true;
  });

  ipcMain.handle(CHANNELS.jobResume, () => {
    client.resumeJob();
    return true;
  });

  ipcMain.handle(CHANNELS.jobStop, () => {
    client.stopJob();
    return true;
  });

  ipcMain.handle(CHANNELS.reset, () => {
    client.softReset();
    return true;
  });

  ipcMain.handle(CHANNELS.unlock, () => {
    client.unlock();
    return true;
  });

  ipcMain.handle(CHANNELS.home, () => {
    client.home();
    return true;
  });

  ipcMain.handle(CHANNELS.setOrigin, (_evt, p: { x?: number; y?: number; z?: number }) => {
    client.setOrigin(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    return true;
  });

  ipcMain.handle(CHANNELS.gotoZero, () => {
    client.gotoZero();
    return true;
  });

  ipcMain.handle(CHANNELS.jog, (_evt, cmd: JogCommand) => {
    client.jog(cmd);
    return true;
  });

  ipcMain.handle(CHANNELS.overrideFeed, (_evt, action: OverrideAction) => {
    client.overrideFeed(action);
    return true;
  });

  return { client };
}
