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
import { inflateSync } from 'node:zlib';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
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
  CSV_DIALOG_FILTERS,
  DXF_DIALOG_FILTERS,
  GCODE_DIALOG_FILTERS,
  LBDEV_DIALOG_FILTERS,
  IMAGE_DIALOG_FILTERS,
  PDF_DIALOG_FILTERS,
  SVG_DIALOG_FILTERS,
  type FileDialogFilter,
  imageMimeType,
} from '../shared/fileFilters';
import { BATCH_MAX_FILE_BYTES } from '../shared/batch';
import { DESIGN_DOC_EXT, DESIGN_DOC_MAX_BYTES } from '../shared/designDoc';
import { TILE_MAX_COUNT } from '../shared/tiling';
import { parsePdf, pdfToGcode, PdfError } from '../shared/pdf';
import { buildSettingRows, validateSettingValue } from '../shared/grblSettings';
import { parseSettings } from '../shared/protocol';
import type {
  ConnectOptions,
  JogCommand,
  JobLibraryAdd,
  OpenedImageFile,
  OpenedTextFile,
  OverrideAction,
  PdfImportResponse,
  PortInfo,
  Prefs,
  RapidOverrideLevel,
  SettingApplyRequest,
  SpecialQuery,
} from '../shared/types';
import { GrblClient } from './services/GrblClient';
import { JobLibrary } from './services/JobLibrary';
import { JobQueueStore } from './services/JobQueueStore';
import { PrefsStore } from './services/PrefsStore';
import { SessionLog } from './services/SessionLog';

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
  /** Log persistente de sessão (RNF-9). */
  log: SessionLog;
  /** Biblioteca de jobs executados (P2.9). */
  jobs: JobLibrary;
  /** Fila de trabalhos persistida (RF-GC-13). */
  queue: JobQueueStore;
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
  // Log persistente de sessão (RNF-9): grava console e eventos.
  const log = new SessionLog(app.getPath('userData'));
  void log.init();
  // Biblioteca de jobs (P2.9): programas executados + miniatura.
  const jobs = new JobLibrary(path.join(app.getPath('userData'), 'joblib'));
  // Fila de trabalhos (RF-GC-13): caminhos + estado, persistidos.
  const queue = new JobQueueStore(app.getPath('userData'));

  const send = (channel: string, payload: unknown): void => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  /** Pasta padrão dos diálogos de arquivo (RF-CFG-5). */
  const defaultDir = async (): Promise<string | undefined> => {
    const p = await prefs.read();
    return p.fileDir;
  };

  /** Memoriza a pasta do último arquivo escolhido para os próximos diálogos. */
  const rememberDir = (filePath: string): void => {
    void prefs
      .updateInPlace({ fileDir: path.dirname(filePath) })
      .catch(() => {});
  };

  /**
   * Diálogo de arquivo de texto (G-code/SVG/DXF/CSV): valida o tamanho no main
   * e devolve o texto pronto — o renderer nunca recebe caminhos.
   */
  const openTextFile = async (
    sender: WebContents,
    title: string,
    filters: FileDialogFilter[],
    maxBytes = TEXT_MAX_BYTES,
  ): Promise<OpenedTextFile | null> => {
    const filePath = await pickFile(sender, {
      title,
      buttonLabel: t('dlg.open'),
      properties: ['openFile'],
      filters,
      defaultPath: await defaultDir(),
    });
    if (!filePath) return null;
    rememberDir(filePath);

    const info = await stat(filePath);
    if (!info.isFile()) throw new Error(t('dlg.notFile'));
    if (info.size > maxBytes) {
      throw new Error(
        t('dlg.fileTooBig', {
          size: formatMb(info.size),
          limit: formatMb(maxBytes),
        }),
      );
    }
    const text = await readFile(filePath, 'utf8');
    return { path: filePath, name: path.basename(filePath), text };
  };

  client.on('console', (d) => {
    send(CHANNELS.evConsole, d);
    log.append(`${d.direction === 'out' ? '>>' : '<<'} ${d.text}`);
  });
  client.on('status', (s) => send(CHANNELS.evStatus, s));
  client.on('progress', (p) => send(CHANNELS.evProgress, p));
  client.on('job', (j) => {
    send(CHANNELS.evJob, j);
    log.append(`[job] state=${j.state} sent=${j.sent} total=${j.total}`);
  });
  client.on('connection', (c) => {
    send(CHANNELS.evConnection, c);
    log.append(`[conn] ${c}`);
  });
  client.on('error', (e) => {
    send(CHANNELS.evError, e);
    log.append(`[error] ${e.message}${e.solution ? ` — ${e.solution}` : ''}`);
  });

  ipcMain.handle(CHANNELS.portsList, async (): Promise<PortInfo[]> => {
    // Import sob demanda: o binding nativo custa ~35 ms com cache quente
    // (~125 ms no primeiro acesso) e só é preciso ao listar portas.
    const { SerialPort } = await import('serialport');
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

  ipcMain.handle(CHANNELS.jogCancel, () => {
    client.cancelJog();
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

  // Painel "Máquina" (P0.7): um retrato só, consultas seriais no client.
  ipcMain.handle(CHANNELS.machineSnapshot, () => client.snapshot());

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
        defaultPath: await defaultDir(),
      });
      if (!filePath) return null;
      rememberDir(filePath);

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
        defaultPath: await defaultDir(),
      });
      if (!filePath) return null;
      rememberDir(filePath);

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

  // --------------------------------------------------- SVG (importação vetorial)
  ipcMain.handle(CHANNELS.fileOpenSvg, (evt) =>
    openTextFile(evt.sender, t('dlg.openSvg'), SVG_DIALOG_FILTERS),
  );

  // --------------------------------------------------- DXF (importação CAD)
  ipcMain.handle(CHANNELS.fileOpenDxf, (evt) =>
    openTextFile(evt.sender, t('dlg.openDxf'), DXF_DIALOG_FILTERS),
  );

  // ------------------------------------------- Perfil do LightBurn (P2.5)
  ipcMain.handle(CHANNELS.fileOpenLbdev, (evt) =>
    openTextFile(evt.sender, t('dlg.openLbdev'), LBDEV_DIALOG_FILTERS),
  );

  // ------------------------------------------- Planilha do lote (RF-SYM-10)
  // O CSV fica na memória do renderer (e nas preferências, para retomar):
  // limite bem menor que o dos arquivos de G-code.
  ipcMain.handle(CHANNELS.fileOpenCsv, (evt) =>
    openTextFile(
      evt.sender,
      t('dlg.openCsv'),
      CSV_DIALOG_FILTERS,
      BATCH_MAX_FILE_BYTES,
    ),
  );

  // --------------------------------------------------- PDF (vetorial, RF-DSN-15)
  ipcMain.handle(
    CHANNELS.fileOpenPdf,
    async (
      evt,
      payload: { feed?: number; travelFeed?: number } = {},
    ): Promise<PdfImportResponse | null> => {
      const filePath = await pickFile(evt.sender, {
        title: t('dlg.openPdf'),
        buttonLabel: t('dlg.open'),
        properties: ['openFile'],
        filters: PDF_DIALOG_FILTERS,
        defaultPath: await defaultDir(),
      });
      if (!filePath) return null;
      rememberDir(filePath);

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

      const buffer = await readFile(filePath);
      let doc: ReturnType<typeof parsePdf>;
      try {
        doc = parsePdf(
          buffer.toString('latin1'),
          (data) => new Uint8Array(inflateSync(Buffer.from(data))),
        );
      } catch (err) {
        if (err instanceof PdfError && err.code === 'encrypted') {
          return { error: 'encrypted' };
        }
        return { error: 'damaged' };
      }

      const feed =
        Number.isFinite(payload.feed) && (payload.feed ?? 0) > 0
          ? Number(payload.feed)
          : 1000;
      const travelFeed =
        Number.isFinite(payload.travelFeed) && (payload.travelFeed ?? 0) > 0
          ? Number(payload.travelFeed)
          : 3000;
      const gcode = doc.contours.length
        ? pdfToGcode(doc, { feed, travelFeed })
        : '';
      return {
        path: filePath,
        name: path.basename(filePath),
        gcode,
        contours: doc.contours.length,
        width: doc.width,
        height: doc.height,
        pages: doc.pages,
        textSkipped: doc.textSkipped,
        imagesSkipped: doc.imagesSkipped,
        unsupported: doc.unsupported,
      };
    },
  );

  /**
   * Salva o G-code preparado (Fase 5). */
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
      rememberDir(result.filePath);
      return result.filePath;
    },
  );

  /**
   * Salva um **conjunto** de G-code (tiling): uma pasta, N arquivos. Os nomes
   * vêm do renderer (`peca-r1c1.gcode`) e são sanitizados aqui — nada de
   * caminho absoluto nem `..`.
   */
  ipcMain.handle(
    CHANNELS.filesSaveSet,
    async (
      evt,
      payload: {
        baseName?: string;
        items?: Array<{ name?: string; content?: string }>;
      },
    ): Promise<{ dir: string; paths: string[] } | null> => {
      const items = Array.isArray(payload?.items) ? payload.items : [];
      if (!items.length) throw new Error(t('dlg.missingContent'));
      if (items.length > TILE_MAX_COUNT) {
        throw new Error(t('dlg.tooManyFiles', { max: TILE_MAX_COUNT }));
      }
      let total = 0;
      for (const item of items) {
        if (typeof item?.content !== 'string') {
          throw new Error(t('dlg.missingContent'));
        }
        total += item.content.length;
      }
      if (total > TEXT_MAX_BYTES) {
        throw new Error(t('dlg.tooBig', { size: formatMb(total) }));
      }

      const options = {
        title: t('dlg.saveTiles'),
        defaultPath: await defaultDir(),
        properties: ['openDirectory', 'createDirectory'] as Array<
          'openDirectory' | 'createDirectory'
        >,
      };
      const owner = BrowserWindow.fromWebContents(evt.sender);
      const result = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || !result.filePaths[0]) return null;
      const dir = result.filePaths[0];

      const paths: string[] = [];
      const used = new Set<string>();
      for (const item of items) {
        let name = path.basename(String(item.name || 'tile.gcode'));
        name = name.replace(/[^\w.\- ]+/g, '_').trim() || 'tile.gcode';
        if (!/\.gcode$/i.test(name)) name += '.gcode';
        let unique = name;
        for (let n = 2; used.has(unique.toLowerCase()); n++) {
          unique = name.replace(/(\.gcode)$/i, `-${n}$1`);
        }
        used.add(unique.toLowerCase());
        const filePath = path.join(dir, unique);
        await writeFile(filePath, String(item.content), 'utf8');
        paths.push(filePath);
      }
      rememberDir(dir);
      return { dir, paths };
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
        defaultPath: await defaultDir(),
      });
      if (!filePath) return null;
      rememberDir(filePath);

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
      rememberDir(result.filePath);
      return result.filePath;
    },
  );

  // ------------------------------------- presets de material (P2.12)

  ipcMain.handle(
    CHANNELS.presetImport,
    async (evt): Promise<OpenedTextFile | null> => {
      const filePath = await pickFile(evt.sender, {
        title: t('dlg.importPresets'),
        buttonLabel: t('dlg.import'),
        properties: ['openFile'],
        filters: [
          { name: t('filter.presets'), extensions: ['json', 'JSON'] },
          { name: t('filter.all'), extensions: ['*'] },
        ],
        defaultPath: await defaultDir(),
      });
      if (!filePath) return null;
      rememberDir(filePath);

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
    CHANNELS.presetExport,
    async (evt, content: unknown): Promise<string | null> => {
      if (typeof content !== 'string') throw new Error(t('dlg.missingPresets'));
      const options = {
        title: t('dlg.exportPresets'),
        defaultPath: 'grbl-presets.json',
        filters: [
          { name: t('filter.presets'), extensions: ['json'] },
          { name: t('filter.all'), extensions: ['*'] },
        ],
      };
      const owner = BrowserWindow.fromWebContents(evt.sender);
      const result = owner
        ? await dialog.showSaveDialog(owner, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return null;
      await writeFile(result.filePath, content, 'utf8');
      rememberDir(result.filePath);
      return result.filePath;
    },
  );

  // ------------------------------- documento do editor “Desenhar” (RF-DSN-16)

  ipcMain.handle(
    CHANNELS.designDocOpen,
    async (evt): Promise<OpenedTextFile | null> => {
      const filePath = await pickFile(evt.sender, {
        title: t('dlg.openDesign'),
        buttonLabel: t('dlg.open'),
        properties: ['openFile'],
        filters: [
          { name: t('filter.design'), extensions: ['gstudio', 'json'] },
          { name: t('filter.all'), extensions: ['*'] },
        ],
        defaultPath: await defaultDir(),
      });
      if (!filePath) return null;
      rememberDir(filePath);

      const info = await stat(filePath);
      if (!info.isFile()) throw new Error(t('dlg.notFile'));
      if (info.size > DESIGN_DOC_MAX_BYTES) {
        throw new Error(t('dlg.tooBig', { size: formatMb(info.size) }));
      }
      const text = await readFile(filePath, 'utf8');
      return { path: filePath, name: path.basename(filePath), text };
    },
  );

  ipcMain.handle(
    CHANNELS.designDocSave,
    async (
      evt,
      content: unknown,
      suggestedName?: unknown,
    ): Promise<string | null> => {
      if (typeof content !== 'string') throw new Error(t('dlg.missingContent'));
      // Só o nome do arquivo: o diálogo decide a pasta (o renderer não manda
      // caminho) e nada de `../` saindo da pasta escolhida.
      const name =
        typeof suggestedName === 'string' ? path.basename(suggestedName) : '';
      const options = {
        title: t('dlg.saveDesign'),
        defaultPath: name || `desenho.${DESIGN_DOC_EXT}`,
        filters: [
          { name: t('filter.design'), extensions: [DESIGN_DOC_EXT] },
          { name: t('filter.all'), extensions: ['*'] },
        ],
      };
      const owner = BrowserWindow.fromWebContents(evt.sender);
      const result = owner
        ? await dialog.showSaveDialog(owner, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return null;
      await writeFile(result.filePath, content, 'utf8');
      rememberDir(result.filePath);
      return result.filePath;
    },
  );

  // ---------------------------------------------------- log do console (RF-CON-15)

  ipcMain.handle(
    CHANNELS.fileSaveLog,
    async (evt, payload: { content?: string }): Promise<string | null> => {
      if (typeof payload?.content !== 'string')
        throw new Error(t('dlg.missingContent'));
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const dir = await defaultDir();
      const options = {
        title: t('dlg.saveLog'),
        defaultPath: dir
          ? path.join(dir, `grbl-console-${stamp}.log`)
          : `grbl-console-${stamp}.log`,
        filters: [
          { name: t('filter.log'), extensions: ['log', 'txt'] },
          { name: t('filter.all'), extensions: ['*'] },
        ],
      };
      const owner = BrowserWindow.fromWebContents(evt.sender);
      const result = owner
        ? await dialog.showSaveDialog(owner, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return null;
      await writeFile(result.filePath, payload.content, 'utf8');
      rememberDir(result.filePath);
      return result.filePath;
    },
  );

  // ------------------------------------------- pasta de arquivos / logs (RF-CFG-5, RNF-9)

  ipcMain.handle(CHANNELS.pickDir, async (evt): Promise<string | null> => {
    const owner = BrowserWindow.fromWebContents(evt.sender);
    const options: OpenDialogOptions = {
      title: t('dlg.pickDir'),
      buttonLabel: t('dlg.open'),
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: await defaultDir(),
    };
    const result = owner
      ? await dialog.showOpenDialog(owner, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths.length) return null;
    const dir = result.filePaths[0];
    await prefs.updateInPlace({ fileDir: dir });
    return dir;
  });

  ipcMain.handle(CHANNELS.openLogs, async (): Promise<string> => {
    await log.init();
    if (log.dir) await shell.openPath(log.dir);
    return log.dir;
  });

  ipcMain.handle(
    CHANNELS.fontsList,
    async (): Promise<string[]> => listSystemFonts(),
  );

  // ------------------------------------------------- biblioteca de jobs (P2.9)

  ipcMain.handle(CHANNELS.jobLibList, () => jobs.list());
  ipcMain.handle(CHANNELS.jobLibAdd, (_evt, input: JobLibraryAdd) =>
    jobs.add(input),
  );
  ipcMain.handle(CHANNELS.jobLibRead, (_evt, id: string) => jobs.read(id));
  ipcMain.handle(CHANNELS.jobLibRemove, (_evt, id: string) => jobs.remove(id));
  ipcMain.handle(CHANNELS.jobLibClear, () => jobs.clear());

  // ------------------------------------------------- fila de trabalhos (RF-GC-13)
  ipcMain.handle(CHANNELS.queueLoad, () => queue.load());
  ipcMain.handle(CHANNELS.queueSave, (_evt, items: unknown) =>
    queue.save(items),
  );
  ipcMain.handle(CHANNELS.queuePick, async (evt): Promise<unknown[]> => {
    const owner = BrowserWindow.fromWebContents(evt.sender);
    const options: OpenDialogOptions = {
      title: t('dlg.queueAdd'),
      buttonLabel: t('dlg.open'),
      properties: ['openFile', 'multiSelections'],
      filters: GCODE_DIALOG_FILTERS,
      defaultPath: await defaultDir(),
    };
    const result = owner
      ? await dialog.showOpenDialog(owner, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths.length) return [];
    rememberDir(result.filePaths[0]);
    return queue.addPaths(result.filePaths);
  });
  ipcMain.handle(CHANNELS.queueRead, (_evt, filePath: unknown) =>
    queue.read(filePath),
  );

  return { client, prefs, log, jobs, queue };
}

/**
 * Famílias de fontes instaladas (fontconfig, Linux). Alimenta o seletor de
 * fontes da ferramenta de desenho. Falha silenciosa: devolve `[]` e a UI fica
 * com a lista curada embutida.
 */
async function listSystemFonts(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      'fc-list',
      ['--format=%{family}\n'],
      { timeout: 5000, maxBuffer: 8 * 1024 * 1024 },
    );
    const seen = new Set<string>();
    for (const line of String(stdout).split('\n')) {
      // "DejaVu Sans,DejaVu Sans Book": a primeira é a família principal.
      const family = line.split(',')[0]?.trim();
      if (family && !family.startsWith('.')) seen.add(family);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}
