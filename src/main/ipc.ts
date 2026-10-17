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
  shell,
  type WebContents,
} from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { SerialPort } from 'serialport';
import { CHANNELS } from '../shared/channels';
import {
  APP_AUTHOR,
  APP_LICENSE,
  APP_NAME,
  APP_REPOSITORY,
  APP_URL,
  isAllowedExternalUrl,
} from '../shared/appInfo';
import { detectLocale, setLocale, t } from '../shared/i18n';
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
  /** Store de preferências (o bootstrap lê `lang`/`theme` do menu). */
  prefs: PrefsStore;
}

export interface IpcHooks {
  /**
   * Chamado após cada `app:prefs:set` bem-sucedido. O bootstrap usa para
   * reconstruir o menu nativo (tema/idioma — RF-APP-1/2/7).
   */
  onPrefsChanged?: (prefs: Prefs) => void;
}

/** Registra os handlers e o encaminhamento de eventos para a janela. */
export function registerIpc(
  getWindow: () => BrowserWindow | null,
  hooks: IpcHooks = {},
): IpcContext {
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
        throw new Error(t('settings.invalid'));
      const problem = validateSettingValue(req.code, String(req.value));
      if (problem) throw new Error(problem);
      await client.query(`$${req.code}=${String(req.value).trim()}`);
      return true;
    },
  );

  ipcMain.handle(CHANNELS.settingsSpecial, async (_evt, kind: SpecialQuery) => {
    const line = SPECIAL_LINE[kind];
    if (!line) throw new Error(t('settings.unknownQuery'));
    return client.query(line);
  });

  // -------------------------------------------------------- preferências

  ipcMain.handle(CHANNELS.prefsGet, () => prefs.read());
  ipcMain.handle(CHANNELS.prefsSet, async (_evt, patch: Partial<Prefs>) => {
    const next = await prefs.updateInPlace(patch ?? {});
    // Idioma escolhido: alinha o main (menu/diálogos/mensagens) — RF-APP-2.
    if (patch && typeof patch.lang === 'string') setLocale(next.lang ?? null);
    if (patch && ('lang' in patch || 'theme' in patch))
      hooks.onPrefsChanged?.(next);
    return next;
  });

  // --------------------------------------------------- app:info / links
  // Versão vem do Electron (package.json) — nunca hardcoded no renderer.

  ipcMain.handle(CHANNELS.appInfo, () => ({
    name: APP_NAME,
    version: app.getVersion(),
    author: APP_AUTHOR,
    license: APP_LICENSE,
    url: APP_URL,
    repository: APP_REPOSITORY,
    defaultLang: detectLocale(app.getLocale()),
  }));

  ipcMain.handle(CHANNELS.openExternal, async (_evt, url: unknown) => {
    if (!isAllowedExternalUrl(url)) return false;
    await shell.openExternal(url);
    return true;
  });

  /**
   * Abre uma imagem para preparação (Fase 5). O caminho vem sempre do
   * diálogo do sistema; o renderer recebe apenas nome + bytes.
   */
  ipcMain.handle(
    CHANNELS.fileOpenImage,
    async (evt): Promise<OpenedImageFile | null> => {
      const filePath = await pickFile(evt.sender, {
        title: t('dlg.openImage'),
        buttonLabel: t('dlg.open'),
        properties: ['openFile'],
        filters: IMAGE_DIALOG_FILTERS,
      });
      if (!filePath) return null;

      const info = await stat(filePath);
      if (!info.isFile()) throw new Error(t('dlg.notFile'));
      if (info.size > IMAGE_MAX_BYTES) {
        throw new Error(
          t('dlg.imageTooBig', {
            size: formatMb(info.size),
            limit: formatMb(IMAGE_MAX_BYTES),
          }),
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
        title: t('dlg.openGcode'),
        buttonLabel: t('dlg.open'),
        properties: ['openFile'],
        filters: GCODE_DIALOG_FILTERS,
      });
      if (!filePath) return null;

      const info = await stat(filePath);
      if (!info.isFile()) throw new Error(t('dlg.notFile'));
      if (info.size > TEXT_MAX_BYTES) {
        throw new Error(
          t('dlg.fileTooBig', {
            size: formatMb(info.size),
            limit: formatMb(TEXT_MAX_BYTES),
          }),
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
        throw new Error(t('dlg.missingContent'));

      const options = {
        title: t('dlg.saveGcode'),
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
        title: t('dlg.importMacros'),
        buttonLabel: t('dlg.import'),
        properties: ['openFile'],
        filters: [
          { name: t('filter.macros'), extensions: ['json', 'JSON'] },
          { name: t('filter.all'), extensions: ['*'] },
        ],
      });
      if (!filePath) return null;

      const info = await stat(filePath);
      if (!info.isFile()) throw new Error(t('dlg.notFile'));
      if (info.size > TEXT_MAX_BYTES) {
        throw new Error(t('dlg.tooBig', { size: formatMb(info.size) }));
      }
      const text = await readFile(filePath, 'utf8');
      return { path: filePath, name: path.basename(filePath), text };
    },
  );

  ipcMain.handle(
    CHANNELS.macrosSave,
    async (evt, content: unknown): Promise<string | null> => {
      if (typeof content !== 'string') throw new Error(t('dlg.missingMacros'));
      const options = {
        title: t('dlg.exportMacros'),
        defaultPath: 'grbl-macros.json',
        filters: [
          { name: t('filter.macros'), extensions: ['json'] },
          { name: t('filter.all'), extensions: ['*'] },
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

  return { client, prefs };
}
