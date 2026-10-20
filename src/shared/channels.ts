/**
 * Nomes de canais IPC centralizados e tipados.
 * Único lugar onde strings de canal existem (ver AGENTS.md).
 */

export const CHANNELS = {
  // Renderer -> Main (invoke)
  portsList: 'grbl:ports:list',
  connect: 'grbl:connect',
  disconnect: 'grbl:disconnect',
  writeLine: 'grbl:write-line',
  jobStart: 'grbl:job:start',
  jobPause: 'grbl:job:pause',
  jobResume: 'grbl:job:resume',
  jobStop: 'grbl:job:stop',
  reset: 'grbl:reset',
  unlock: 'grbl:unlock',
  home: 'grbl:home',
  setOrigin: 'grbl:origin:set',
  gotoZero: 'grbl:goto-zero',
  jog: 'grbl:jog',
  jogCancel: 'grbl:jog:cancel',
  overrideFeed: 'grbl:override:feed',
  overrideSpindle: 'grbl:override:spindle',
  overrideRapid: 'grbl:override:rapid',
  overrideReset: 'grbl:override:reset',
  settingsRead: 'grbl:settings:read',
  settingsApply: 'grbl:settings:apply',
  settingsSpecial: 'grbl:settings:special',
  machineSnapshot: 'grbl:machine:snapshot',
  prefsGet: 'app:prefs:get',
  prefsSet: 'app:prefs:set',
  appInfo: 'app:info',
  openExternal: 'app:open-external',
  fileSave: 'file:save-gcode',
  fileSaveLog: 'file:save-log',
  fileOpenImage: 'file:open-image',
  fileOpenGcode: 'file:open-gcode',
  fileOpenSvg: 'file:open-svg',
  fileOpenDxf: 'file:open-dxf',
  fileOpenPdf: 'file:open-pdf',
  fileOpenLbdev: 'file:open-lbdev',
  macrosOpen: 'file:open-macros',
  macrosSave: 'file:save-macros',
  pickDir: 'app:pick-dir',
  openLogs: 'app:open-logs',
  fontsList: 'app:fonts:list',
  // Biblioteca de jobs (P2.9): últimos programas executados
  jobLibList: 'grbl:joblib:list',
  jobLibAdd: 'grbl:joblib:add',
  jobLibRead: 'grbl:joblib:read',
  jobLibRemove: 'grbl:joblib:remove',
  jobLibClear: 'grbl:joblib:clear',

  // Main -> Renderer (push)
  evConsole: 'grbl:ev:console',
  evStatus: 'grbl:ev:status',
  evProgress: 'grbl:ev:progress',
  evJob: 'grbl:ev:job',
  evConnection: 'grbl:ev:connection',
  evError: 'grbl:ev:error',
  // Menu nativo do Electron -> Renderer (RF-APP-7)
  evAbout: 'grbl:ev:about',
  evTheme: 'grbl:ev:theme',
  evLang: 'grbl:ev:lang',
  evAction: 'grbl:ev:action',
} as const;

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS];

/**
 * Ações genéricas disparadas pelo menu nativo (`evAction`). Valor único
 * compartilhado entre `main/menu.ts` (emissor) e o renderer (consumidor) —
 * evita literais divergentes.
 */
export const MENU_ACTIONS = {
  openGcode: 'open-gcode',
  editGcode: 'edit-gcode',
  openImage: 'open-image',
  appearance: 'appearance',
  openLogs: 'open-logs',
  materialTest: 'material-test',
  machine: 'machine',
  openSvg: 'open-svg',
  openDxf: 'open-dxf',
  openPdf: 'open-pdf',
  design: 'design',
  jobLibrary: 'job-library',
  qrCode: 'qr-code',
  barCode: 'bar-code',
  tour: 'tour',
} as const;

export type MenuAction = (typeof MENU_ACTIONS)[keyof typeof MENU_ACTIONS];
