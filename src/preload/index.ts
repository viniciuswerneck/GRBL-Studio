/**
 * Preload: ponte segura (contextBridge) entre renderer e main.
 * Expõe apenas a API `window.grbl` — nunca `ipcRenderer` cru nem Node.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS } from '../shared/channels';
import type {
  ConnectOptions,
  ConnectionState,
  ConsoleLine,
  ErrorPayload,
  GrblStatus,
  JogCommand,
  JobInfo,
  JobProgress,
  OverrideAction,
  PortInfo,
} from '../shared/types';

type Unsubscribe = () => void;

function on<T>(channel: string, cb: (payload: T) => void): Unsubscribe {
  const listener = (_evt: unknown, payload: T): void => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api = {
  // Comandos (renderer -> main)
  listPorts: (): Promise<PortInfo[]> => ipcRenderer.invoke(CHANNELS.portsList),
  connect: (opts: ConnectOptions): Promise<boolean> => ipcRenderer.invoke(CHANNELS.connect, opts),
  disconnect: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.disconnect),
  writeLine: (line: string): Promise<boolean> => ipcRenderer.invoke(CHANNELS.writeLine, line),

  startJob: (lines: string[], name?: string): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.jobStart, { lines, name }),
  pauseJob: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.jobPause),
  resumeJob: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.jobResume),
  stopJob: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.jobStop),

  reset: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.reset),
  unlock: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.unlock),
  home: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.home),
  setOrigin: (x = 0, y = 0, z = 0): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.setOrigin, { x, y, z }),
  gotoZero: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.gotoZero),
  jog: (cmd: JogCommand): Promise<boolean> => ipcRenderer.invoke(CHANNELS.jog, cmd),
  overrideFeed: (action: OverrideAction): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.overrideFeed, action),

  // Eventos (main -> renderer)
  onConsole: (cb: (line: ConsoleLine) => void): Unsubscribe => on(CHANNELS.evConsole, cb),
  onStatus: (cb: (status: GrblStatus) => void): Unsubscribe => on(CHANNELS.evStatus, cb),
  onProgress: (cb: (p: JobProgress) => void): Unsubscribe => on(CHANNELS.evProgress, cb),
  onJob: (cb: (job: JobInfo) => void): Unsubscribe => on(CHANNELS.evJob, cb),
  onConnection: (cb: (state: ConnectionState) => void): Unsubscribe =>
    on(CHANNELS.evConnection, cb),
  onError: (cb: (err: ErrorPayload) => void): Unsubscribe => on(CHANNELS.evError, cb),
};

contextBridge.exposeInMainWorld('grbl', api);

export type GrblApi = typeof api;
