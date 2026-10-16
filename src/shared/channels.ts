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
  overrideFeed: 'grbl:override:feed',
  overrideReset: 'grbl:override:reset',
  fileSave: 'file:save-gcode',
  fileOpenImage: 'file:open-image',
  fileOpenGcode: 'file:open-gcode',

  // Main -> Renderer (push)
  evConsole: 'grbl:ev:console',
  evStatus: 'grbl:ev:status',
  evProgress: 'grbl:ev:progress',
  evJob: 'grbl:ev:job',
  evConnection: 'grbl:ev:connection',
  evError: 'grbl:ev:error',
} as const;

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS];
