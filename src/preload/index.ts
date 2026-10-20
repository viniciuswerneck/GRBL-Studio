/**
 * Preload: ponte segura (contextBridge) entre renderer e main.
 * Expõe apenas a API `window.grbl` — nunca `ipcRenderer` cru nem Node.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS } from '../shared/channels';
import type { MenuAction } from '../shared/channels';
import type { SettingRow } from '../shared/grblSettings';
import type {
  AppInfo,
  ConnectOptions,
  ConnectionState,
  ConsoleLine,
  ErrorPayload,
  GrblStatus,
  JogCommand,
  JobInfo,
  JobLibraryAdd,
  JobLibraryEntry,
  JobProgress,
  Lang,
  MachineSnapshot,
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
  connect: (opts: ConnectOptions): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.connect, opts),
  disconnect: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.disconnect),
  writeLine: (line: string): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.writeLine, line),

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
  jog: (cmd: JogCommand): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.jog, cmd),
  /** Cancela o jog contínuo em andamento (0x85) — RF-JOG-2. */
  cancelJog: (): Promise<boolean> => ipcRenderer.invoke(CHANNELS.jogCancel),
  overrideFeed: (action: OverrideAction): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.overrideFeed, action),
  overrideSpindle: (action: OverrideAction): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.overrideSpindle, action),
  overrideRapid: (level: RapidOverrideLevel): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.overrideRapid, level),

  // Configurações $$ (RF-CFG-1/2/3) e preferências (RF-CFG-5)
  readSettings: (): Promise<SettingRow[]> =>
    ipcRenderer.invoke(CHANNELS.settingsRead),
  applySetting: (req: SettingApplyRequest): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.settingsApply, req),
  querySpecial: (kind: SpecialQuery): Promise<string[]> =>
    ipcRenderer.invoke(CHANNELS.settingsSpecial, kind),
  /** Retrato da máquina para o painel (P0.7): `$I`/`$$`/`$#`/`$G`/`$N` + `?`. */
  machineSnapshot: (): Promise<MachineSnapshot> =>
    ipcRenderer.invoke(CHANNELS.machineSnapshot),
  getPrefs: (): Promise<Prefs> => ipcRenderer.invoke(CHANNELS.prefsGet),
  setPrefs: (patch: Partial<Prefs>): Promise<Prefs> =>
    ipcRenderer.invoke(CHANNELS.prefsSet, patch),
  /** Metadados do app (versão/autor/licença/idioma padrão) — RF-APP-6/7. */
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(CHANNELS.appInfo),
  /** Abre uma URL https de host liberado no navegador do sistema. */
  openExternal: (url: string): Promise<boolean> =>
    ipcRenderer.invoke(CHANNELS.openExternal, url),
  saveGcode: (content: string, suggestedName: string): Promise<string | null> =>
    ipcRenderer.invoke(CHANNELS.fileSave, { suggestedName, content }),
  openImage: (): Promise<OpenedImageFile | null> =>
    ipcRenderer.invoke(CHANNELS.fileOpenImage),
  openGcode: (): Promise<OpenedTextFile | null> =>
    ipcRenderer.invoke(CHANNELS.fileOpenGcode),
  openSvg: (): Promise<OpenedTextFile | null> =>
    ipcRenderer.invoke(CHANNELS.fileOpenSvg),
  openDxf: (): Promise<OpenedTextFile | null> =>
    ipcRenderer.invoke(CHANNELS.fileOpenDxf),
  /** Importa PDF vetorial (parse no main, com zlib) — RF-DSN-15. */
  openPdf: (options: {
    feed?: number;
    travelFeed?: number;
  }): Promise<PdfImportResponse | null> =>
    ipcRenderer.invoke(CHANNELS.fileOpenPdf, options),
  /** Perfil de máquina do LightBurn (P2.5). */
  openLbdev: (): Promise<OpenedTextFile | null> =>
    ipcRenderer.invoke(CHANNELS.fileOpenLbdev),
  /** Planilha (CSV/TSV) do lote de dados variáveis (RF-SYM-10). */
  openCsv: (): Promise<OpenedTextFile | null> =>
    ipcRenderer.invoke(CHANNELS.fileOpenCsv),
  openMacros: (): Promise<OpenedTextFile | null> =>
    ipcRenderer.invoke(CHANNELS.macrosOpen),
  saveMacros: (content: string): Promise<string | null> =>
    ipcRenderer.invoke(CHANNELS.macrosSave, content),
  /** Importa presets de material de um JSON (P2.12). */
  importPresets: (): Promise<OpenedTextFile | null> =>
    ipcRenderer.invoke(CHANNELS.presetImport),
  /** Exporta os presets de material para um JSON (P2.12). */
  exportPresets: (content: string): Promise<string | null> =>
    ipcRenderer.invoke(CHANNELS.presetExport, content),
  /** Abre um documento do editor (`.gstudio`). */
  openDesignDoc: (): Promise<OpenedTextFile | null> =>
    ipcRenderer.invoke(CHANNELS.designDocOpen),
  /** Salva o documento do editor (`.gstudio`); `suggestedName` mantém o nome. */
  saveDesignDoc: (
    content: string,
    suggestedName?: string,
  ): Promise<string | null> =>
    ipcRenderer.invoke(CHANNELS.designDocSave, content, suggestedName),
  /** Salva o log do console em `.log`/`.txt` (RF-CON-15). */
  saveLog: (content: string): Promise<string | null> =>
    ipcRenderer.invoke(CHANNELS.fileSaveLog, { content }),
  /** Abre o diálogo de escolha de pasta de arquivos (RF-CFG-5). */
  pickDir: (): Promise<string | null> => ipcRenderer.invoke(CHANNELS.pickDir),
  /** Abre a pasta de logs de sessão no gerenciador de arquivos (RNF-9). */
  openLogs: (): Promise<string> => ipcRenderer.invoke(CHANNELS.openLogs),
  /** Famílias de fontes instaladas no sistema (seleção de fonte do desenho). */
  listFonts: (): Promise<string[]> => ipcRenderer.invoke(CHANNELS.fontsList),

  // Biblioteca de jobs (P2.9): últimos 50 programas executados
  jobLibrary: {
    list: (): Promise<JobLibraryEntry[]> =>
      ipcRenderer.invoke(CHANNELS.jobLibList),
    add: (input: JobLibraryAdd): Promise<JobLibraryEntry> =>
      ipcRenderer.invoke(CHANNELS.jobLibAdd, input),
    read: (id: string): Promise<string | null> =>
      ipcRenderer.invoke(CHANNELS.jobLibRead, id),
    remove: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(CHANNELS.jobLibRemove, id),
    clear: (): Promise<void> => ipcRenderer.invoke(CHANNELS.jobLibClear),
  },

  // Eventos (main -> renderer)
  onConsole: (cb: (line: ConsoleLine) => void): Unsubscribe =>
    on(CHANNELS.evConsole, cb),
  onStatus: (cb: (status: GrblStatus) => void): Unsubscribe =>
    on(CHANNELS.evStatus, cb),
  onProgress: (cb: (p: JobProgress) => void): Unsubscribe =>
    on(CHANNELS.evProgress, cb),
  onJob: (cb: (job: JobInfo) => void): Unsubscribe => on(CHANNELS.evJob, cb),
  onConnection: (cb: (state: ConnectionState) => void): Unsubscribe =>
    on(CHANNELS.evConnection, cb),
  onError: (cb: (err: ErrorPayload) => void): Unsubscribe =>
    on(CHANNELS.evError, cb),
  // Menu nativo -> renderer (RF-APP-7)
  onAbout: (cb: () => void): Unsubscribe => on(CHANNELS.evAbout, cb),
  onTheme: (cb: (themeId: string) => void): Unsubscribe =>
    on(CHANNELS.evTheme, cb),
  onLang: (cb: (lang: Lang) => void): Unsubscribe => on(CHANNELS.evLang, cb),
  /** Ações genéricas do menu (ex.: `open-gcode`). */
  onAction: (cb: (action: MenuAction) => void): Unsubscribe =>
    on(CHANNELS.evAction, cb),
};

contextBridge.exposeInMainWorld('grbl', api);

export type GrblApi = typeof api;
