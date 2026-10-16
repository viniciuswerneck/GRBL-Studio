/**
 * Handlers IPC: único ponto de contato entre a UI e o GrblClient.
 * Contratos tipados, sem lógica de negócio aqui (apenas wiring).
 */

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type OpenDialogOptions,
  type WebContents,
} from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { SerialPort } from 'serialport';
import { CHANNELS } from '../shared/channels';
import {
  GCODE_DIALOG_FILTERS,
  IMAGE_DIALOG_FILTERS,
  imageMimeType,
} from '../shared/fileFilters';
import { buildSettingRows, validateSettingValue } from '../shared/grblSettings';
import { parseSettings } from '../shared/protocol';
import type {
  ConnectOptions,
  JogCommand,
  OpenedImageFile,
  OpenedTextFile,
  OverrideAction,
  PortInfo,
  Prefs,
  RapidOverrideLevel,
  SettingApplyRequest,
  SpecialQuery,
} from '../shared/types';
import { GrblClient } from './services/GrblClient';
import { PrefsStore } from './services/PrefsStore';

/** Linha de consulta de cada comando especial (RF-CFG-3). */
const SPECIAL_LINE: Record<SpecialQuery, string> = {
  offsets: '$#',
  info: '$I',
  state: '$G',
};

/** Teto de leitura dos diálogos (protege RAM no main: RNF-12). */
const IMAGE_MAX_BYTES = 48 * 1024 * 1024;
const TEXT_MAX_BYTES = 64 * 1024 * 1024;

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Abre o diálogo nativo e devolve o primeiro caminho escolhido. */
async function pickFile(
  sender: WebContents,
  options: OpenDialogOptions,
): Promise<string | null> {
  const owner = BrowserWindow.fromWebContents(sender);
  const result = owner
    ? await dialog.showOpenDialog(owner, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
}

export interface IpcContext {
  client: GrblClient;
}

/** Registra os handlers e o encaminhamento de eventos para a janela. */
export function registerIpc(getWindow: () => BrowserWindow | null): IpcContext {
  const client = new GrblClient();
  const prefs = new PrefsStore(
    path.join(app.getPath('userData'), 'prefs.json'),
  );

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

  ipcMain.handle(
    CHANNELS.jobStart,
    (_evt, payload: { lines: string[]; name?: string }) => {
      client.startJob(payload.lines, payload.name);
      return true;
    },
  );

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

  ipcMain.handle(
    CHANNELS.setOrigin,
    (_evt, p: { x?: number; y?: number; z?: number }) => {
      client.setOrigin(p.x ?? 0, p.y ?? 0, p.z ?? 0);
      return true;
    },
  );

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

  ipcMain.handle(CHANNELS.overrideSpindle, (_evt, action: OverrideAction) => {
    client.overrideSpindle(action);
    return true;
  });

  ipcMain.handle(CHANNELS.overrideRapid, (_evt, level: RapidOverrideLevel) => {
    client.overrideRapid(level);
    return true;
  });

  // ----------------------------------------------------- configurações $$

  ipcMain.handle(CHANNELS.settingsRead, async () => {
    const lines = await client.query('$$');
    return buildSettingRows(parseSettings(lines));
  });

  ipcMain.handle(
    CHANNELS.settingsApply,
    async (_evt, req: SettingApplyRequest) => {
      if (!Number.isInteger(req?.code) || req.code < 0)
        throw new Error('Configuração inválida.');
      const problem = validateSettingValue(req.code, String(req.value));
      if (problem) throw new Error(problem);
      await client.query(`$${req.code}=${String(req.value).trim()}`);
      return true;
    },
  );

  ipcMain.handle(CHANNELS.settingsSpecial, async (_evt, kind: SpecialQuery) => {
    const line = SPECIAL_LINE[kind];
    if (!line) throw new Error('Consulta desconhecida.');
    return client.query(line);
  });

  // -------------------------------------------------------- preferências

  ipcMain.handle(CHANNELS.prefsGet, () => prefs.read());
  ipcMain.handle(CHANNELS.prefsSet, (_evt, patch: Partial<Prefs>) =>
    prefs.updateInPlace(patch ?? {}),
  );

  /**
   * Abre uma imagem para preparação (Fase 5). O caminho vem sempre do
   * diálogo do sistema; o renderer recebe apenas nome + bytes.
   */
  ipcMain.handle(
    CHANNELS.fileOpenImage,
    async (evt): Promise<OpenedImageFile | null> => {
      const filePath = await pickFile(evt.sender, {
        title: 'Abrir imagem',
        buttonLabel: 'Abrir',
        properties: ['openFile'],
        filters: IMAGE_DIALOG_FILTERS,
      });
      if (!filePath) return null;

      const info = await stat(filePath);
      if (!info.isFile())
        throw new Error('O caminho escolhido não é um arquivo.');
      if (info.size > IMAGE_MAX_BYTES) {
        throw new Error(
          `Imagem muito grande (${formatMb(info.size)}). Limite: ${formatMb(IMAGE_MAX_BYTES)}.`,
        );
      }

      const buffer = await readFile(filePath);
      const name = path.basename(filePath);
      return {
        path: filePath,
        name,
        mime: imageMimeType(name),
        data: new Uint8Array(buffer),
      };
    },
  );

  /**
   * Abre um arquivo de G-code para envio. Mesmo contrato: caminho só vem do
   * diálogo; o renderer recebe o texto pronto.
   */
  ipcMain.handle(
    CHANNELS.fileOpenGcode,
    async (evt): Promise<OpenedTextFile | null> => {
      const filePath = await pickFile(evt.sender, {
        title: 'Abrir G-code',
        buttonLabel: 'Abrir',
        properties: ['openFile'],
        filters: GCODE_DIALOG_FILTERS,
      });
      if (!filePath) return null;

      const info = await stat(filePath);
      if (!info.isFile())
        throw new Error('O caminho escolhido não é um arquivo.');
      if (info.size > TEXT_MAX_BYTES) {
        throw new Error(
          `Arquivo muito grande (${formatMb(info.size)}). Limite: ${formatMb(TEXT_MAX_BYTES)}.`,
        );
      }

      const text = await readFile(filePath, 'utf8');
      return { path: filePath, name: path.basename(filePath), text };
    },
  );

  /**
   * Salva o G-code preparado (Fase 5). Só grava o texto que a UI gerou —
   * nenhum caminho vem do renderer sem passar pelo diálogo do sistema.
   */
  ipcMain.handle(
    CHANNELS.fileSave,
    async (
      evt,
      payload: { suggestedName?: string; content?: string },
    ): Promise<string | null> => {
      if (typeof payload?.content !== 'string')
        throw new Error('Conteúdo de G-code ausente.');

      const options = {
        title: 'Salvar G-code',
        defaultPath: payload.suggestedName || 'gravacao.gcode',
        filters: GCODE_DIALOG_FILTERS,
      };
      const owner = BrowserWindow.fromWebContents(evt.sender);
      const result = owner
        ? await dialog.showSaveDialog(owner, options)
        : await dialog.showSaveDialog(options);

      if (result.canceled || !result.filePath) return null;
      await writeFile(result.filePath, payload.content, 'utf8');
      return result.filePath;
    },
  );

  // --------------------------------------------------- macros (RF-MAC-2)

  ipcMain.handle(
    CHANNELS.macrosOpen,
    async (evt): Promise<OpenedTextFile | null> => {
      const filePath = await pickFile(evt.sender, {
        title: 'Importar macros',
        buttonLabel: 'Importar',
        properties: ['openFile'],
        filters: [
          { name: 'Macros (JSON)', extensions: ['json', 'JSON'] },
          { name: 'Todos os arquivos', extensions: ['*'] },
        ],
      });
      if (!filePath) return null;

      const info = await stat(filePath);
      if (!info.isFile()) throw new Error('O caminho escolhido não é arquivo.');
      if (info.size > TEXT_MAX_BYTES) {
        throw new Error(`Arquivo grande demais (${formatMb(info.size)}).`);
      }
      const text = await readFile(filePath, 'utf8');
      return { path: filePath, name: path.basename(filePath), text };
    },
  );

  ipcMain.handle(
    CHANNELS.macrosSave,
    async (evt, content: unknown): Promise<string | null> => {
      if (typeof content !== 'string')
        throw new Error('Conteúdo de macros ausente.');
      const options = {
        title: 'Exportar macros',
        defaultPath: 'grbl-macros.json',
        filters: [
          { name: 'Macros (JSON)', extensions: ['json'] },
          { name: 'Todos os arquivos', extensions: ['*'] },
        ],
      };
      const owner = BrowserWindow.fromWebContents(evt.sender);
      const result = owner
        ? await dialog.showSaveDialog(owner, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return null;
      await writeFile(result.filePath, content, 'utf8');
      return result.filePath;
    },
  );

  return { client };
}
