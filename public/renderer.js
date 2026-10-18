/**
 * Renderer do GRBL Studio.
 * Fala com o main apenas via window.grbl (preload). Sem Node aqui.
 */

const $ = (id) => document.getElementById(id);
const sidebar = document.querySelector('.sidebar');

// ------------------------------------------------ i18n e aparência (RF-APP-1/2)

// Catálogo i18n gerado por `npm run build:i18n` (public/i18n.js → GRBL_I18N).
const I18N = window.GRBL_I18N;
const t = (key, params) => (I18N ? I18N.t(key, params) : key);
const hasKey = (key) => (I18N ? I18N.hasKey(key) : false);
const slugify = (value) => (I18N ? I18N.slugify(value) : String(value));
const THEMES = I18N ? I18N.THEMES : [];

// Aplica idioma/tema do cache local antes de qualquer pintura (evita "flash").
try {
  const cachedLang = localStorage.getItem('grbl-lang');
  if (cachedLang && I18N) I18N.setLocale(cachedLang);
  const cachedTheme = localStorage.getItem('grbl-theme');
  if (cachedTheme && THEMES.some((th) => th.id === cachedTheme)) {
    document.documentElement.dataset.theme = cachedTheme;
  }
} catch {
  /* localStorage indisponível */
}

/** Nome de máquina localizável — marcas/modelos são nomes próprios. */
function machineName(prof) {
  return prof && prof.id === 'generic' ? t('profile.generic') : prof.name;
}

/** Nome de material via `mat.<slug>` (o slug é estável nos 3 idiomas). */
function materialName(name) {
  const key = `mat.${slugify(name)}`;
  return hasKey(key) ? t(key) : name;
}

/** Notas do manual via `mnote.<slug>`. */
function materialNotes(notes) {
  if (!notes) return '';
  const key = `mnote.${slugify(notes)}`;
  return hasKey(key) ? t(key) : notes;
}

/** Rótulo de macro padrão via `macro.def.<id>` (macros do usuário ficam como estão). */
function macroLabel(macro) {
  const key = `macro.def.${macro.id}`;
  return hasKey(key) ? t(key) : macro.label;
}

/** Grupo de macro via `macrogroup.<slug>`. */
function macroGroup(group) {
  const key = `macrogroup.${slugify(group)}`;
  return hasKey(key) ? t(key) : group;
}

const el = {
  portList: $('portList'),
  baudList: $('baudList'),
  refreshPorts: $('refreshPorts'),
  machineProfile: $('machineProfile'),
  connectBtn: $('connectBtn'),
  connDot: $('connDot'),
  connText: $('connText'),
  jogXp: $('jogXp'),
  jogXm: $('jogXm'),
  jogYp: $('jogYp'),
  jogYm: $('jogYm'),
  jogZp: $('jogZp'),
  jogZm: $('jogZm'),
  homeBtn: $('homeBtn'),
  stepSelect: $('stepSelect'),
  feedSelect: $('feedSelect'),
  setOriginBtn: $('setOriginBtn'),
  gotoZeroBtn: $('gotoZeroBtn'),
  unlockBtn: $('unlockBtn'),
  resetBtn: $('resetBtn'),
  portHint: $('portHint'),
  fileOpen: $('fileOpen'),
  fileInfo: $('fileInfo'),
  playBtn: $('playBtn'),
  pauseBtn: $('pauseBtn'),
  resumeBtn: $('resumeBtn'),
  stopBtn: $('stopBtn'),
  jobBarState: $('jobBarState'),
  jobBarProgress: $('jobBarProgress'),
  runHint: $('runHint'),
  progressBar: $('progressBar'),
  progressText: $('progressText'),
  stateBadge: $('stateBadge'),
  droX: $('droX'),
  droY: $('droY'),
  droZ: $('droZ'),
  metaFeed: $('metaFeed'),
  metaS: $('metaS'),
  metaDtg: $('metaDtg'),
  progressEta: $('progressEta'),
  alarmHistory: $('alarmHistory'),
  alarmHistoryClear: $('alarmHistoryClear'),
  consoleOutput: $('consoleOutput'),
  consoleInput: $('consoleInput'),
  consolePause: $('consolePause'),
  consoleClear: $('consoleClear'),
  consoleSave: $('consoleSave'),
  modeBtn: $('modeBtn'),
  guideConnect: $('guideConnect'),
  guideImage: $('guideImage'),
  guideGenerate: $('guideGenerate'),
  guideFrame: $('guideFrame'),
  guideRecord: $('guideRecord'),
  guideClose: $('guideClose'),
  guidePanel: $('guidePanel'),
  guideWidth: $('guideWidth'),
  guideHeight: $('guideHeight'),
  guideTypePhoto: $('guideTypePhoto'),
  guideTypeBW: $('guideTypeBW'),
  guideTypeVector: $('guideTypeVector'),
  guideMaterial: $('guideMaterial'),
  wizardTitle: $('wizardTitle'),
  wizardStatus: $('wizardStatus'),
  wizardDot: $('wizardDot'),
  wizardNext: $('wizardNext'),
  imageOpen: $('imageOpen'),
  imageReplace: $('imageReplace'),
  imageCancel: $('imageCancel'),
  imageInfo: $('imageInfo'),
  imgWidth: $('imgWidth'),
  imgHeight: $('imgHeight'),
  imgOffsetX: $('imgOffsetX'),
  imgOffsetY: $('imgOffsetY'),
  imgKeepAspect: $('imgKeepAspect'),
  sizeHint: $('sizeHint'),
  imgAlgorithm: $('imgAlgorithm'),
  imgLines: $('imgLines'),
  imgDirection: $('imgDirection'),
  imgDot: $('imgDot'),
  imgSimplify: $('imgSimplify'),
  imgBrightness: $('imgBrightness'),
  imgContrast: $('imgContrast'),
  imgWhiteClip: $('imgWhiteClip'),
  imgThreshold: $('imgThreshold'),
  imgInvert: $('imgInvert'),
  imgBW: $('imgBW'),
  imgSpeed: $('imgSpeed'),
  imgPasses: $('imgPasses'),
  imgMode: $('imgMode'),
  imgSmin: $('imgSmin'),
  imgSmax: $('imgSmax'),
  imgAdaptive: $('imgAdaptive'),
  imgBidirectional: $('imgBidirectional'),
  speedHint: $('speedHint'),
  profileModule: $('profileModule'),
  profileAction: $('profileAction'),
  profileMaterial: $('profileMaterial'),
  profileHint: $('profileHint'),
  imgGenerate: $('imgGenerate'),
  imgSave: $('imgSave'),
  imgStats: $('imgStats'),
  previewCanvas: $('previewCanvas'),
  previewHint: $('previewHint'),
  previewWarning: $('previewWarning'),
  previewLegend: $('previewLegend'),
  lgPass: $('lgPass'),
  lgPassSwatch: $('lgPassSwatch'),
  simBar: $('simBar'),
  simPlay: $('simPlay'),
  simPause: $('simPause'),
  simSeek: $('simSeek'),
  simSpeed: $('simSpeed'),
  simTime: $('simTime'),
  simStop: $('simStop'),
  simToggle: $('simToggle'),
  ovrFeedValue: $('ovrFeedValue'),
  ovrRapidValue: $('ovrRapidValue'),
  ovrSpindleValue: $('ovrSpindleValue'),
  unitsSelect: $('unitsSelect'),
  settingsBtn: $('settingsBtn'),
  settingsOverlay: $('settingsOverlay'),
  settingsClose: $('settingsClose'),
  frameOverlay: $('frameOverlay'),
  frameClose: $('frameClose'),
  frameYp: $('frameYp'),
  frameXm: $('frameXm'),
  frameXp: $('frameXp'),
  frameYm: $('frameYm'),
  frameHome: $('frameHome'),
  frameOrigin: $('frameOrigin'),
  frameSetOrigin: $('frameSetOrigin'),
  frameOutline: $('frameOutline'),
  frameCenter: $('frameCenter'),
  frameStart: $('frameStart'),
  frameCancel: $('frameCancel'),
  frameStatus: $('frameStatus'),
  framePower: $('framePower'),
  framePowerValue: $('framePowerValue'),
  frameSpeed: $('frameSpeed'),
  frameSpeedValue: $('frameSpeedValue'),
  framePasses: $('framePasses'),
  framePassesMinus: $('framePassesMinus'),
  framePassesPlus: $('framePassesPlus'),
  matTestOverlay: $('matTestOverlay'),
  matTestClose: $('matTestClose'),
  mtCols: $('mtCols'),
  mtRows: $('mtRows'),
  mtSpeedMin: $('mtSpeedMin'),
  mtSpeedMax: $('mtSpeedMax'),
  mtPowerMin: $('mtPowerMin'),
  mtPowerMax: $('mtPowerMax'),
  mtCellSize: $('mtCellSize'),
  mtSpacing: $('mtSpacing'),
  mtPasses: $('mtPasses'),
  mtMode: $('mtMode'),
  matTestStatus: $('matTestStatus'),
  matTestSave: $('matTestSave'),
  matTestGenerate: $('matTestGenerate'),
  designOverlay: $('designOverlay'),
  designClose: $('designClose'),
  designMaximize: $('designMaximize'),
  designCanvas: $('designCanvas'),
  designToolSelect: $('designToolSelect'),
  designToolRect: $('designToolRect'),
  designToolCircle: $('designToolCircle'),
  designToolLine: $('designToolLine'),
  designToolText: $('designToolText'),
  designDelete: $('designDelete'),
  designClear: $('designClear'),
  designUndo: $('designUndo'),
  designRedo: $('designRedo'),
  designZoomIn: $('designZoomIn'),
  designZoomOut: $('designZoomOut'),
  designZoomFit: $('designZoomFit'),
  designAlignLeft: $('designAlignLeft'),
  designAlignCenter: $('designAlignCenter'),
  designAlignRight: $('designAlignRight'),
  designPropX: $('designPropX'),
  designPropY: $('designPropY'),
  designPropW: $('designPropW'),
  designPropH: $('designPropH'),
  designSnap: $('designSnap'),
  designCursor: $('designCursor'),
  designObjectList: $('designObjectList'),
  designSpeed: $('designSpeed'),
  designPower: $('designPower'),
  designPasses: $('designPasses'),
  designMode: $('designMode'),
  designFont: $('designFont'),
  designText: $('designText'),
  designTextSize: $('designTextSize'),
  designTextFont: $('designTextFont'),
  designTextMode: $('designTextMode'),
  designTextAdd: $('designTextAdd'),
  designStatus: $('designStatus'),
  designSave: $('designSave'),
  designGenerate: $('designGenerate'),
  settingsRefresh: $('settingsRefresh'),
  settingsFilter: $('settingsFilter'),
  settingsList: $('settingsList'),
  settingsStatus: $('settingsStatus'),
  specialOutput: $('specialOutput'),
  settingsProfileName: $('settingsProfileName'),
  settingsProfileSave: $('settingsProfileSave'),
  settingsProfiles: $('settingsProfiles'),
  settingsProfileApply: $('settingsProfileApply'),
  settingsProfileDelete: $('settingsProfileDelete'),
  fileDirValue: $('fileDirValue'),
  fileDirChoose: $('fileDirChoose'),
  settingsTabs: document.querySelectorAll('#settingsOverlay .tabs .tab'),
  resumeLine: $('resumeLine'),
  resumeBack: $('resumeBack'),
  resumeSuggest: $('resumeSuggest'),
  resumeFrom: $('resumeFrom'),
  resumeInfo: $('resumeInfo'),
  macroButtons: $('macroButtons'),
  macroEditor: $('macroEditor'),
  macroHint: $('macroHint'),
  macroAdd: $('macroAdd'),
  macroReset: $('macroReset'),
  macroImport: $('macroImport'),
  macroExport: $('macroExport'),
  transportKind: $('transportKind'),
  serialFields: $('serialFields'),
  tcpFields: $('tcpFields'),
  tcpHost: $('tcpHost'),
  tcpPort: $('tcpPort'),
  wizardBack: $('wizardBack'),
  wizardImageInfo: $('wizardImageInfo'),
  themeGroups: $('themeGroups'),
  langRow: $('langRow'),
  appearanceOverlay: $('appearanceOverlay'),
  appearanceClose: $('appearanceClose'),
  aboutOverlay: $('aboutOverlay'),
  aboutClose: $('aboutClose'),
  aboutBtn: $('aboutBtn'),
  aboutVersion: $('aboutVersion'),
  aboutLicense: $('aboutLicense'),
  aboutAuthor: $('aboutAuthor'),
  aboutLab: $('aboutLab'),
  aboutRepo: $('aboutRepo'),
  aboutVisit: $('aboutVisit'),
  footerVersion: $('footerVersion'),
  footerLab: $('footerLab'),
};

const state = {
  connected: false,
  connection: 'disconnected',
  jobState: 'idle',
  lines: [],
  fileName: '',
  /** Unidade de exibição (RF-APP-3). mm é a do G-code; in é só conversão visual. */
  units: 'mm',
  /** Último status recebido (para reprocessar o DRO ao trocar a unidade). */
  lastStatus: null,
  /** Preferências persistidas no main (RF-CFG-5). */
  prefs: {},
  /** Histórico do console (RF-CON-13). */
  consoleHistory: [],
  consoleHistoryIndex: -1,
  /** Índice (no arquivo) da primeira linha do job atual — 0 no envio normal. */
  jobStart: 0,
  /** Linhas de preâmbulo injetadas por uma retomada (RF-GC-7). */
  jobPreamble: 0,
  /** Última linha confirmada pelo GRBL, mapeada para o arquivo. */
  doneFile: 0,
  /** Chave/params do rótulo do arquivo atual (para repor ao trocar de idioma). */
  fileInfoText: null,
  /** Estado modal reportado pelo GRBL (`Idle`, `Run`, `Alarm`…) — RF-STA-5. */
  grblState: '',
  /** Tempo estimado (s) do arquivo atual — RF-GC-2/5. */
  estimatedSec: 0,
  /** Histórico de alarmes/erros da sessão — RF-STA-7. */
  alarms: [],
  /** Rolagem do console pausada pelo usuário — RF-CON-14. */
  consolePaused: false,
  /**
   * Último `WCO` recebido (RF-PRV-3). O GRBL só manda `MPos`/`WPos` e o `WCO`
   * vem de vez em quando (~10–30 relatórios); guardamos o último para obter
   * `WPos = MPos − WCO` em todo relatório.
   */
  wco: { x: 0, y: 0, z: 0 },
};

// ------------------------------------------------------------------ console

const MAX_LINES = 500;
let pendingLines = [];
let flushScheduled = false;

function appendLine(text, kind) {
  pendingLines.push({ text, kind });
  if (pendingLines.length > MAX_LINES * 2)
    pendingLines.splice(0, pendingLines.length - MAX_LINES);
  if (!flushScheduled) {
    flushScheduled = true;
    requestAnimationFrame(flushLines);
  }
}

function flushLines() {
  flushScheduled = false;
  const nearBottom =
    el.consoleOutput.scrollHeight -
      el.consoleOutput.scrollTop -
      el.consoleOutput.clientHeight <
    40;

  const frag = document.createDocumentFragment();
  for (const { text, kind } of pendingLines) {
    const div = document.createElement('div');
    div.className = `line-${kind}`;
    div.textContent = text;
    frag.appendChild(div);
  }
  pendingLines = [];
  el.consoleOutput.appendChild(frag);

  while (el.consoleOutput.childElementCount > MAX_LINES) {
    el.consoleOutput.removeChild(el.consoleOutput.firstChild);
  }
  if (nearBottom && !state.consolePaused)
    el.consoleOutput.scrollTop = el.consoleOutput.scrollHeight;
}

/** Alterna a rolagem automática do console (RF-CON-14). */
function setConsolePaused(paused) {
  state.consolePaused = paused;
  if (el.consolePause) {
    el.consolePause.textContent = paused
      ? t('console.resume')
      : t('console.pause');
    el.consolePause.classList.toggle('active', paused);
  }
}

if (el.consolePause)
  el.consolePause.addEventListener('click', () =>
    setConsolePaused(!state.consolePaused),
  );

if (el.consoleClear)
  el.consoleClear.addEventListener('click', () => {
    pendingLines = [];
    el.consoleOutput.textContent = '';
  });

/** Texto do console como está na tela (RF-CON-15). */
function consoleText() {
  return [...el.consoleOutput.children].map((n) => n.textContent).join('\n');
}

if (el.consoleSave)
  el.consoleSave.addEventListener('click', async () => {
    const content = consoleText();
    if (!content.trim()) return;
    try {
      const path = await window.grbl.saveLog(`${content}\n`);
      if (path) appendLine(t('console.saved', { path }), 'ok');
    } catch (err) {
      appendLine(t('console.saveFail', { msg: err.message }), 'error');
    }
  });

// ----------------------------------------------------------------- conexão

function setConnection(conn) {
  state.connection = conn;
  state.connected = conn === 'connected';
  if (!state.connected) state.grblState = '';
  // Ao (re)conectar, o `WCO` pode ter mudado (reset/power-cycle): descarta o
  // cache até o GRBL mandar o próximo (RF-PRV-3).
  if (conn !== 'connected') {
    state.wco = { x: 0, y: 0, z: 0 };
    // Limites da máquina: outra gravadora pode ter outro `$110/$111`.
    machineLimits.rateX = null;
    machineLimits.rateY = null;
    updateSpeedHint();
  }

  el.connDot.className =
    'dot' +
    (conn === 'connected'
      ? ' connected'
      : conn === 'connecting'
        ? ' connecting'
        : conn === 'error'
          ? ' error'
          : '');
  const labels = {
    disconnected: t('conn.disconnected'),
    connecting: t('conn.connecting'),
    connected: t('conn.connected'),
    error: t('conn.error'),
  };
  el.connText.textContent = labels[conn] ?? conn;
  el.connectBtn.textContent =
    state.connected || conn === 'connecting'
      ? t('conn.disconnect')
      : t('conn.connect');
  el.connectBtn.classList.toggle(
    'primary',
    !state.connected && conn !== 'connecting',
  );

  if (!state.connected && state.jobState === 'running') setJobState('idle');
  sidebar.classList.toggle('is-connected', state.connected);
  // Após conectar, abre a aba Imagem para facilitar gerar o G-code.
  if (state.connected) {
    const activeTab = document.querySelector('.sidebar-tabs .tab.active');
    if (activeTab && activeTab.dataset.tab === 'machine') {
      const imgTab = document.querySelector(
        '.sidebar-tabs .tab[data-tab="image"]',
      );
      if (imgTab) imgTab.click();
    }
  }
  updateWorkflow();
  updateWizard();
  updateControls();
}

function setJobState(jobState) {
  state.jobState = jobState;
  if (jobState !== 'running' && jobState !== 'paused') {
    if (el.metaDtg) el.metaDtg.textContent = '—';
    if (el.progressEta) el.progressEta.textContent = '';
    if (el.jobBarProgress) el.jobBarProgress.textContent = '';
  }
  updateControls();
}

// Abas da sidebar (Gravadora / Imagem / Execução / Macros).
document.querySelectorAll('.sidebar-tabs .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const name = tab.dataset.tab;
    document.querySelectorAll('.sidebar-tabs .tab').forEach((t) => {
      t.classList.remove('active');
    });
    tab.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.panel !== name);
    });
  });
});

let frameBounds = null;

function openFrameModal() {
  // Área do job: a geometria da imagem gerada ou, para um .gcode aberto, a
  // caixa do próprio programa — assim "Marcar centro"/"Contorno" também
  // funcionam fora do fluxo de imagem.
  frameBounds =
    window.frameBounds ||
    (previewProgram?.program?.bounds
      ? { ...previewProgram.program.bounds }
      : null);
  if (!el.frameOverlay) return;
  el.frameOverlay.classList.remove('hidden');
  if (el.frameStatus) {
    el.frameStatus.textContent = state.connected
      ? t('frame.status.connected')
      : t('frame.status.disconnected');
  }
  // Sincroniza potência/velocidade com os parâmetros da imagem.
  if (el.frameSpeed && el.imgSpeed) el.frameSpeed.value = el.imgSpeed.value;
  if (el.framePower && el.imgSmax) {
    const pct = Math.round((Number(el.imgSmax.value) || 0) / 10);
    el.framePower.value = String(Math.max(0, Math.min(100, pct)));
  }
  if (el.frameSpeedValue && el.frameSpeed)
    el.frameSpeedValue.textContent = `${el.frameSpeed.value} mm/min`;
  if (el.framePowerValue && el.framePower)
    el.framePowerValue.textContent = `${el.framePower.value} %`;
  updateFrameButtons();
}

/**
 * Habilita o que move/enquadra só com a máquina conectada, **sem job** e fora
 * de alarme: contorno/centro/origem enviam G-code, que ficaria na fila no meio
 * do corte (RF-STA-5).
 */
async function openSvgImport() {
  if (!window.GRBL_SVG) {
    appendLine('Módulo de importação SVG não carregado.', 'error');
    return;
  }
  try {
    const file = await window.grbl.openSvg();
    if (!file) return;
    const gcode = window.GRBL_SVG.svgTextToGcode(file.text, {
      feed: Number(el.imgSpeed ? el.imgSpeed.value : 1000) || 1000,
      travelFeed: 3000,
      scale: 1,
      flipY: true,
    });
    applyJobLines(file.name.replace(/\.svg$/i, '.gcode'), gcode);
    appendLine(t('file.loaded', { name: file.name, lines: gcode.split('\n').length }), 'ok');
    try {
      const path = await window.grbl.saveGcode(gcode, file.name.replace(/\.svg$/i, '.gcode'));
      if (path) appendLine(t('file.saved', { path }), 'ok');
    } catch (err) {
      appendLine(t('err.prefix', { msg: err.message }), 'error');
    }
  } catch (err) {
    appendLine(t('err.prefix', { msg: err.message }), 'error');
  }
}

// ------------------------------------------------------------------ desenho vetorial (design tools) — premium (CorelDRAW-inspired)
window.__designSpace = false;
document.addEventListener('keydown', (e) => { if (e.code === 'Space') window.__designSpace = true; });
document.addEventListener('keyup', (e) => { if (e.code === 'Space') window.__designSpace = false; });
const designState = {
  tool: 'select',
  shapes: [],          // Shape[]
  selected: -1,
  drawing: null,
  dragStart: null,
  dragMoved: false,
  resizeHandle: -1,
  resizeOrig: null,
  history: [],         // snapshots of shapes[]
  historyIdx: -1,
  view: { scale: 1, tx: 0, ty: 0 },
  snap: true,
  snapSize: 1,         // mm
  clipboard: null,
  pendingTextPos: null,
  panning: false,
  panStart: null,
};

function designCanvas() { return el.designCanvas; }
function designCtx() { const c = el.designCanvas; return c ? c.getContext('2d') : null; }
function designSize() { const c = el.designCanvas; return c ? { w: c.width, h: c.height } : { w: 720, h: 420 }; }

// ---- coordenadas mundo <-> canvas (com zoom/pan) ----
function dWorldToCanvas(wx, wy) {
  return { x: wx * designState.view.scale + designState.view.tx,
           y: wy * designState.view.scale + designState.view.ty };
}
function dCanvasToWorld(cx, cy) {
  return { x: (cx - designState.view.tx) / designState.view.scale,
           y: (cy - designState.view.ty) / designState.view.scale };
}
function dSnap(v) {
  if (!designState.snap) return v;
  const s = designState.snapSize || 1;
  return Math.round(v / s) * s;
}

// ---- histórico (undo/redo) ----
function dPushHistory() {
  const snap = JSON.stringify(designState.shapes);
  // descarta futuro
  designState.history = designState.history.slice(0, designState.historyIdx + 1);
  designState.history.push(snap);
  if (designState.history.length > 60) designState.history.shift();
  designState.historyIdx = designState.history.length - 1;
  dUpdateUndoButtons();
}
function dUndo() {
  if (designState.historyIdx <= 0) return;
  designState.historyIdx--;
  designState.shapes = JSON.parse(designState.history[designState.historyIdx]);
  designState.selected = -1;
  dRender();
  dUpdateProps();
  dUpdateObjectList();
  dUpdateUndoButtons();
}
function dRedo() {
  if (designState.historyIdx >= designState.history.length - 1) return;
  designState.historyIdx++;
  designState.shapes = JSON.parse(designState.history[designState.historyIdx]);
  designState.selected = -1;
  dRender();
  dUpdateProps();
  dUpdateObjectList();
  dUpdateUndoButtons();
}
function dUpdateUndoButtons() {
  if (el.designUndo) el.designUndo.disabled = designState.historyIdx <= 0;
  if (el.designRedo) el.designRedo.disabled = designState.historyIdx >= designState.history.length - 1;
}

// ---- renderização premium ----
function dRender() {
  const c = el.designCanvas;
  if (!c) return;
  const ctx = c.getContext('2d');
  const { w, h } = designSize();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // fundo sutil
  ctx.fillStyle = '#0f0f12';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(designState.view.tx, designState.view.ty);
  ctx.scale(designState.view.scale, designState.view.scale);

  // grade (menor + maior)
  const grid = 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1 / designState.view.scale;
  for (let x = 0; x <= w / designState.view.scale + 100; x += grid) {
    const wx = x;
    ctx.beginPath(); ctx.moveTo(wx, -1000); ctx.lineTo(wx, 1000); ctx.stroke();
  }
  for (let y = 0; y <= h / designState.view.scale + 100; y += grid) {
    const wy = y;
    ctx.beginPath(); ctx.moveTo(-1000, wy); ctx.lineTo(1000, wy); ctx.stroke();
  }
  // eixos
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1 / designState.view.scale;
  ctx.beginPath(); ctx.moveTo(0, -1000); ctx.lineTo(0, 1000); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-1000, 0); ctx.lineTo(1000, 0); ctx.stroke();

  const drawShape = (sh, selected) => {
    if (!sh.points.length) return;
    ctx.strokeStyle = selected ? '#4cc2ff' : '#e6e6e6';
    ctx.lineWidth = (selected ? 2 : 1.5) / designState.view.scale;
    ctx.beginPath();
    ctx.moveTo(sh.points[0].x, sh.points[0].y);
    for (let i = 1; i < sh.points.length; i++) ctx.lineTo(sh.points[i].x, sh.points[i].y);
    if (sh.closed) ctx.closePath();
    ctx.stroke();
    if (sh.closed) {
      ctx.fillStyle = selected ? 'rgba(76,194,255,0.10)' : 'rgba(255,255,255,0.03)';
      ctx.fill();
    }
    if (selected) {
      ctx.fillStyle = '#4cc2ff';
      for (const p of sh.points) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 3 / designState.view.scale, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  for (let i = 0; i < designState.shapes.length; i++) {
    drawShape(designState.shapes[i], designSelectedIndices().includes(i));
  }
  if (designState.drawing) drawShape(designState.drawing, true);

  // Handles + bbox do grupo selecionado (uma única vez, não por forma).
  if (designState.selected >= 0 && designState.shapes.length) {
    const b = designSelectedBounds();
    if (b) {
      ctx.strokeStyle = 'rgba(76,194,255,0.6)';
      ctx.lineWidth = 1 / designState.view.scale;
      ctx.setLineDash([4 / designState.view.scale, 3 / designState.view.scale]);
      ctx.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#4cc2ff';
      const handles = [
        { x: b.minX, y: b.minY }, { x: (b.minX + b.maxX) / 2, y: b.minY },
        { x: b.maxX, y: b.minY }, { x: b.maxX, y: (b.minY + b.maxY) / 2 },
        { x: b.maxX, y: b.maxY }, { x: (b.minX + b.maxX) / 2, y: b.maxY },
        { x: b.minX, y: b.maxY }, { x: b.minX, y: (b.minY + b.maxY) / 2 },
      ];
      const hs = 6 / designState.view.scale;
      for (const h of handles) {
        ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
      }
    }
  }

  for (let i = 0; i < designState.shapes.length; i++) {
    drawShape(designState.shapes[i], designSelectedIndices().includes(i));
  }
  if (designState.drawing) drawShape(designState.drawing, true);

  ctx.restore();

  // ---- réguas (screen space) ----
  const RULER = 20;
  const scale = designState.view.scale;
  // major tick interval in world units, chosen so ticks are ~60-120 px apart
  let major = 10;
  while (major * scale < 40) major *= 2;
  while (major * scale > 120) major /= 2;
  const minor = major / 5;
  const tx = designState.view.tx;
  const ty = designState.view.ty;

  // visible world range
  const w0 = (0 - tx) / scale;
  const w1 = (w - tx) / scale;
  const h0 = (0 - ty) / scale;
  const h1 = (h - ty) / scale;

  // top ruler background
  ctx.fillStyle = '#1a1a1e';
  ctx.fillRect(0, 0, w, RULER);
  ctx.fillRect(0, 0, RULER, h);
  // corner
  ctx.fillStyle = '#232328';
  ctx.fillRect(0, 0, RULER, RULER);

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 1;

  // top ticks
  const firstMajorX = Math.ceil(w0 / major) * major;
  for (let wx = firstMajorX; wx <= w1; wx += major) {
    const sx = wx * scale + tx;
    if (sx < RULER || sx > w) continue;
    ctx.beginPath();
    ctx.moveTo(sx, RULER - 8);
    ctx.lineTo(sx, RULER);
    ctx.stroke();
    ctx.fillText(String(Math.round(wx)), sx, 2);
    // minor ticks
    for (let m = 1; m < 5; m++) {
      const wxm = wx - major + m * minor;
      const sxm = wxm * scale + tx;
      if (sxm < RULER || sxm > w) continue;
      ctx.beginPath();
      ctx.moveTo(sxm, RULER - 4);
      ctx.lineTo(sxm, RULER);
      ctx.stroke();
    }
  }
  // left ticks
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const firstMajorY = Math.ceil(h0 / major) * major;
  for (let wy = firstMajorY; wy <= h1; wy += major) {
    const sy = wy * scale + ty;
    if (sy < RULER || sy > h) continue;
    ctx.beginPath();
    ctx.moveTo(RULER - 8, sy);
    ctx.lineTo(RULER, sy);
    ctx.stroke();
    ctx.fillText(String(Math.round(wy)), RULER - 10, sy);
    for (let m = 1; m < 5; m++) {
      const wym = wy - major + m * minor;
      const sym = wym * scale + ty;
      if (sym < RULER || sym > h) continue;
      ctx.beginPath();
      ctx.moveTo(RULER - 4, sym);
      ctx.lineTo(RULER, sym);
      ctx.stroke();
    }
  }
  // border
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.moveTo(RULER, 0); ctx.lineTo(RULER, h);
  ctx.moveTo(0, RULER); ctx.lineTo(w, RULER);
  ctx.stroke();

  // cursor crosshair (subtle)
  // (none — keeps canvas clean)

  dUpdateObjectList();
  dUpdateProps();
  dUpdateCursor();
}

function designHitTest(x, y) {
  for (let i = designState.shapes.length - 1; i >= 0; i--) {
    const sh = designState.shapes[i];
    if (!sh.points.length) continue;
    const xs = sh.points.map((p) => p.x);
    const ys = sh.points.map((p) => p.y);
    const minX = Math.min(...xs) - 6, maxX = Math.max(...xs) + 6;
    const minY = Math.min(...ys) - 6, maxY = Math.max(...ys) + 6;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) return i;
  }
  return -1;
}

/** Índices de todas as formas do mesmo grupo da selecionada (ou só a selecionada). */
function designSelectedIndices() {
  const idx = designState.selected;
  if (idx < 0 || idx >= designState.shapes.length) return [];
  const g = designState.shapes[idx].group;
  if (g === undefined || g === null) return [idx];
  const out = [];
  for (let i = 0; i < designState.shapes.length; i++) {
    if (designState.shapes[i].group === g) out.push(i);
  }
  return out.length ? out : [idx];
}

/** Bounding box de todas as formas selecionadas (grupo). */
function designSelectedBounds() {
  const idxs = designSelectedIndices();
  if (!idxs.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const i of idxs) {
    const sh = designState.shapes[i];
    for (const p of sh.points) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  }
  return { minX, minY, maxX, maxY };
}

/** Retorna o índice do handle (0-7) sob (x,y) para a forma selecionada, ou -1. */
function designHandleAt(sh, x, y) {
  if (!sh || !sh.points.length) return -1;
  const xs = sh.points.map((p) => p.x);
  const ys = sh.points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const hs = 7 / designState.view.scale;
  const handles = [
    { x: minX, y: minY }, { x: (minX + maxX) / 2, y: minY }, { x: maxX, y: minY },
    { x: maxX, y: (minY + maxY) / 2 },
    { x: maxX, y: maxY }, { x: (minX + maxX) / 2, y: maxY }, { x: minX, y: maxY },
    { x: minX, y: (minY + maxY) / 2 },
  ];
  for (let i = 0; i < handles.length; i++) {
    if (Math.abs(handles[i].x - x) <= hs && Math.abs(handles[i].y - y) <= hs) return i;
  }
  return -1;
}

function designCanvasCoords(e) {
  const c = el.designCanvas;
  const r = c.getBoundingClientRect();
  const sx = c.width / r.width;
  const sy = c.height / r.height;
  const w = dCanvasToWorld((e.clientX - r.left) * sx, (e.clientY - r.top) * sy);
  return w;
}

function dShapeBounds(sh) {
  const xs = sh.points.map((p) => p.x);
  const ys = sh.points.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function dUpdateProps() {
  if (!el.designPropX) return;
  const b = designSelectedBounds();
  if (!b || designState.selected < 0) {
    el.designPropX.value = '';
    el.designPropY.value = '';
    el.designPropW.value = '';
    el.designPropH.value = '';
    return;
  }
  el.designPropX.value = b.minX.toFixed(1);
  el.designPropY.value = b.minY.toFixed(1);
  el.designPropW.value = (b.maxX - b.minX).toFixed(1);
  el.designPropH.value = (b.maxY - b.minY).toFixed(1);
}

function dUpdateObjectList() {
  const ul = el.designObjectList;
  if (!ul) return;
  ul.innerHTML = '';
  designState.shapes.forEach((sh, i) => {
    const li = document.createElement('li');
    li.className = 'design-obj' + (i === designState.selected ? ' selected' : '');
    li.textContent = `${i + 1}. ${sh.kind}`;
    li.addEventListener('click', () => {
      designState.selected = i;
      dRender();
    });
    const del = document.createElement('button');
    del.className = 'design-obj-del';
    del.textContent = '×';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      designState.shapes.splice(i, 1);
      designState.selected = -1;
      dPushHistory();
      dRender();
    });
    li.appendChild(del);
    ul.appendChild(li);
  });
}

function dUpdateCursor() {
  if (!el.designCursor) return;
  // updated on mousemove
}

function openDesignModal() {
  if (!el.designOverlay) return;
  el.designOverlay.classList.remove('hidden');
  designState.tool = 'select';
  designState.selected = -1;
  designState.drawing = null;
  designState.view = { scale: 1, tx: 20, ty: 20 };
  designUpdateToolButtons();
  dPushHistory();
  dRender();
}

function closeDesignModal() {
  if (el.designOverlay) el.designOverlay.classList.add('hidden');
}

function designUpdateToolButtons() {
  const tools = { designToolSelect: 'select', designToolRect: 'rect', designToolCircle: 'circle', designToolLine: 'line', designToolText: 'text' };
  for (const [id, tool] of Object.entries(tools)) {
    const b = el[id];
    if (b) b.classList.toggle('active', designState.tool === tool);
  }
}

function designGenerate() {
  if (!window.GRBL_DESIGN) {
    appendLine('Módulo de desenho não carregado.', 'error');
    return;
  }
  if (!designState.shapes.length) {
    if (el.designStatus) el.designStatus.textContent = 'Desenhe ao menos uma forma.';
    return;
  }
  if (el.designStatus) el.designStatus.textContent = t('design.status.generating');
  const sMax = Number(el.imgSmax ? el.imgSmax.value : 1000) || 1000;
  const opts = {
    feed: Number(el.designSpeed.value) || 1000,
    travelFeed: 3000,
    sMax,
    powerPercent: Number(el.designPower.value) || 100,
    passes: Number(el.designPasses.value) || 1,
    mode: el.designMode.value === 'M3' ? 'M3' : 'M4',
    samples: 24,
  };
  const gcode = window.GRBL_DESIGN.designToGcode(
    { shapes: designState.shapes, width: 0, height: 0 },
    opts,
  );
  applyJobLines('design.gcode', gcode);
  if (el.designStatus) el.designStatus.textContent = t('design.status.done');
  openFrameModal();
}

async function designSave() {
  if (!window.GRBL_DESIGN || !designState.shapes.length) return;
  const sMax = Number(el.imgSmax ? el.imgSmax.value : 1000) || 1000;
  const opts = {
    feed: Number(el.designSpeed.value) || 1000,
    travelFeed: 3000,
    sMax,
    powerPercent: Number(el.designPower.value) || 100,
    passes: Number(el.designPasses.value) || 1,
    mode: el.designMode.value === 'M3' ? 'M3' : 'M4',
    samples: 24,
  };
  const gcode = window.GRBL_DESIGN.designToGcode(
    { shapes: designState.shapes, width: 0, height: 0 },
    opts,
  );
  try {
    const path = await window.grbl.saveGcode(gcode, 'design.gcode');
    if (path) appendLine(t('file.saved', { path }), 'ok');
  } catch (err) {
    appendLine(t('err.prefix', { msg: err.message }), 'error');
  }
}

// ---- interações do canvas ----
(function wireDesignCanvas() {
  const c = el.designCanvas;
  if (!c) return;
  let start = null;
  let panning = false;
  let panStart = null;

  c.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && window.__designSpace)) {
      panning = true;
      panStart = { x: e.clientX, y: e.clientY, tx: designState.view.tx, ty: designState.view.ty };
      c.style.cursor = 'grabbing';
      return;
    }
    const pt = designCanvasCoords(e);
    if (designState.tool === 'select') {
      // Primeiro: está clicando num handle da forma selecionada?
      if (designState.selected >= 0) {
        const idxs = designSelectedIndices();
        const allPts = idxs.flatMap((i) => designState.shapes[i].points);
        const hi = designHandleAt({ points: allPts }, pt.x, pt.y);
        if (hi >= 0) {
          designState.resizeHandle = hi;
          designState.resizeOrig = {
            shapes: idxs.map((i) => designState.shapes[i].points.map((p) => ({ x: p.x, y: p.y }))),
            idxs: idxs.slice(),
            minX: Math.min(...allPts.map((p) => p.x)),
            maxX: Math.max(...allPts.map((p) => p.x)),
            minY: Math.min(...allPts.map((p) => p.y)),
            maxY: Math.max(...allPts.map((p) => p.y)),
            mouse: pt,
          };
          dRender();
          return;
        }
      }
      const idx = designHitTest(pt.x, pt.y);
      designState.selected = idx;
      if (idx >= 0) {
        designState.dragStart = pt;
        designState.dragMoved = false;
      }
      dRender();
      dUpdateProps();
      return;
    }
    // ferramenta de texto: armazena o ponto de inserção e foca o campo de texto
    if (designState.tool === 'text') {
      designState.pendingTextPos = { x: pt.x, y: pt.y };
      if (el.designText) { el.designText.focus(); el.designText.select(); }
      return;
    }
    start = pt;
    designState.drawing = null;
    if (designState.tool === 'rect') {
      const sx = designState.snap ? dSnap(pt.x) : pt.x;
      const sy = designState.snap ? dSnap(pt.y) : pt.y;
      designState.drawing = { kind: 'rect', points: [{ x: sx, y: sy }, { x: sx, y: sy }, { x: sx, y: sy }, { x: sx, y: sy }], closed: true, _start: { x: sx, y: sy } };
    } else if (designState.tool === 'circle') {
      const sx = designState.snap ? dSnap(pt.x) : pt.x;
      const sy = designState.snap ? dSnap(pt.y) : pt.y;
      designState.drawing = { kind: 'circle', points: [{ x: sx, y: sy }], closed: true, _center: { x: sx, y: sy }, _r: 0 };
    } else if (designState.tool === 'line') {
      const sx = designState.snap ? dSnap(pt.x) : pt.x;
      const sy = designState.snap ? dSnap(pt.y) : pt.y;
      designState.drawing = { kind: 'line', points: [{ x: sx, y: sy }, { x: sx, y: sy }], closed: false };
    }
  });

  c.addEventListener('mousemove', (e) => {
    const pt = designCanvasCoords(e);
    // cursor status
    if (el.designCursor) el.designCursor.textContent = `${pt.x.toFixed(1)}, ${pt.y.toFixed(1)} mm`;
    // cursor shape
    if (designState.tool === 'select' && designState.selected >= 0 && !designState.dragStart && designState.resizeHandle < 0) {
      const sh = designState.shapes[designState.selected];
      const hi = designHandleAt(sh, pt.x, pt.y);
      if (hi >= 0) {
        const cursors = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize'];
        c.style.cursor = cursors[hi];
      } else if (designHitTest(pt.x, pt.y) >= 0) {
        c.style.cursor = 'move';
      } else {
        c.style.cursor = 'default';
      }
    } else if (designState.tool !== 'select') {
      c.style.cursor = 'crosshair';
    }
    if (panning && panStart) {
      designState.view.tx = panStart.tx + (e.clientX - panStart.x);
      designState.view.ty = panStart.ty + (e.clientY - panStart.y);
      dRender();
      return;
    }
    // resize de forma selecionada via handle
    if (designState.resizeHandle >= 0 && designState.resizeOrig && designState.selected >= 0) {
      const orig = designState.resizeOrig;
      const hi = designState.resizeHandle;
      const newPt = designState.snap ? { x: dSnap(pt.x), y: dSnap(pt.y) } : pt;
      const ow = orig.maxX - orig.minX || 1;
      const oh = orig.maxY - orig.minY || 1;
      // determina novo bbox conforme o handle
      let nMinX = orig.minX, nMaxX = orig.maxX, nMinY = orig.minY, nMaxY = orig.maxY;
      // handles: 0=TL,1=TC,2=TR,3=MR,4=BR,5=BC,6=BL,7=ML
      if (hi === 0 || hi === 6 || hi === 7) nMinX = newPt.x;
      if (hi === 2 || hi === 3 || hi === 4) nMaxX = newPt.x;
      if (hi === 0 || hi === 1 || hi === 2) nMinY = newPt.y;
      if (hi === 4 || hi === 5 || hi === 6) nMaxY = newPt.y;
      if (nMaxX - nMinX < 2) { if (hi === 0 || hi === 6 || hi === 7) nMinX = nMaxX - 2; else nMaxX = nMinX + 2; }
      if (nMaxY - nMinY < 2) { if (hi === 0 || hi === 1 || hi === 2) nMinY = nMaxY - 2; else nMaxY = nMinY + 2; }
      const sx = (nMaxX - nMinX) / ow;
      const sy = (nMaxY - nMinY) / oh;
      for (let k = 0; k < orig.idxs.length; k++) {
        const sh2 = designState.shapes[orig.idxs[k]];
        if (!sh2) continue;
        const op = orig.shapes[k];
        for (let i = 0; i < sh2.points.length; i++) {
          sh2.points[i].x = nMinX + (op[i].x - orig.minX) * sx;
          sh2.points[i].y = nMinY + (op[i].y - orig.minY) * sy;
        }
      }
      dRender();
      dUpdateProps();
      return;
    }
    if (designState.drawing) {
      const s = designState.drawing._start || designState.drawing.points[0];
      const x = designState.snap ? dSnap(pt.x) : pt.x;
      const y = designState.snap ? dSnap(pt.y) : pt.y;
      if (designState.tool === 'rect') {
        designState.drawing.points = [s, { x, y: s.y }, { x, y }, { x: s.x, y }];
      } else if (designState.tool === 'circle') {
        const center = designState.drawing._center;
        const r = Math.hypot(x - center.x, y - center.y);
        designState.drawing.points = window.GRBL_DESIGN.makeCircle(center.x, center.y, r, 32);
        designState.drawing._r = r;
      } else if (designState.tool === 'line') {
        designState.drawing.points = [designState.drawing.points[0], { x, y }];
      }
      dRender();
      return;
    }
    // move selected
    if (designState.selected >= 0 && designState.dragStart) {
      const sh = designState.shapes[designState.selected];
      const dx = pt.x - designState.dragStart.x;
      const dy = pt.y - designState.dragStart.y;
      if (dx === 0 && dy === 0) return;
      for (const p of sh.points) { p.x += dx; p.y += dy; }
      designState.dragStart = pt;
      designState.dragMoved = true;
      dRender();
      dUpdateProps();
    }
  });

  c.addEventListener('mouseup', (e) => {
    if (panning) {
      panning = false;
      panStart = null;
      c.style.cursor = designState.tool === 'select' ? 'default' : 'crosshair';
      return;
    }
    let changed = false;
    if (designState.resizeHandle >= 0) {
      designState.resizeHandle = -1;
      designState.resizeOrig = null;
      changed = true;
    }
    if (designState.drawing) {
      const sh = designState.drawing;
      delete sh._center; delete sh._r; delete sh._start;
      const xs = sh.points.map((p) => p.x);
      const ys = sh.points.map((p) => p.y);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      if (w > 1 || h > 1 || sh.kind === 'line') {
        designState.shapes.push(sh);
        designState.selected = designState.shapes.length - 1;
        changed = true;
      }
      designState.drawing = null;
    }
    if (designState.dragStart) {
      if (designState.dragMoved) changed = true;
      designState.dragStart = null;
      designState.dragMoved = false;
    }
    if (changed) {
      dPushHistory();
      dUpdateProps();
      dUpdateObjectList();
    }
    dRender();
  });

  c.addEventListener('mouseleave', () => {
    if (designState.drawing) {
      designState.drawing = null;
      dRender();
    }
    designState.dragStart = null;
  });

  // wheel zoom
  c.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = c.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (c.width / rect.width);
    const cy = (e.clientY - rect.top) * (c.height / rect.height);
    const before = dCanvasToWorld(cx, cy);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    designState.view.scale = Math.max(0.2, Math.min(8, designState.view.scale * factor));
    const after = dWorldToCanvas(before.x, before.y);
    designState.view.tx += cx - after.x;
    designState.view.ty += cy - after.y;
    dRender();
  }, { passive: false });

  // keyboard
  c.addEventListener('keydown', (e) => {});
})();

// space-key tracking for pan
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    const c = el.designCanvas;
    if (c && document.activeElement === c) {
      c.dataset.space = '1';
    }
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    const c = el.designCanvas;
    if (c) delete c.dataset.space;
  }
});

// Patch mousedown to detect space for panning (already handled via e.spaceKey check above is unreliable; use dataset)
// We'll just rely on middle mouse (button 1) for pan, already handled.

document.addEventListener('keydown', (e) => {
  if (!el.designOverlay || el.designOverlay.classList.contains('hidden')) return;
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); dUndo(); return; }
    if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); dRedo(); return; }
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (designState.selected >= 0) {
      e.preventDefault();
      designState.shapes.splice(designState.selected, 1);
      designState.selected = -1;
      dPushHistory();
      dRender();
      dUpdateProps();
      dUpdateObjectList();
    }
    return;
  }
  if (e.key === 'Escape') {
    closeDesignModal();
  }
});
if (el.designClose) el.designClose.addEventListener('click', closeDesignModal);
if (el.designMaximize) el.designMaximize.addEventListener('click', () => {
  const m = el.designOverlay.querySelector('.design-modal');
  if (!m) return;
  const max = m.classList.toggle('maximized');
  el.designMaximize.textContent = max ? ' ( ) ' : ' ( ) ';
  el.designMaximize.title = max ? 'Restaurar' : 'Maximizar';
  // re-render canvas to fit new size
  setTimeout(() => dRender(), 50);
});
if (el.designOverlay)
  el.designOverlay.addEventListener('click', (e) => {
    if (e.target === el.designOverlay) closeDesignModal();
  });
function designSetTool(t) {
  designState.tool = t;
  designState.drawing = null;
  designUpdateToolButtons();
  dRender();
}
if (el.designToolSelect) el.designToolSelect.addEventListener('click', () => designSetTool('select'));
if (el.designToolRect) el.designToolRect.addEventListener('click', () => designSetTool('rect'));
if (el.designToolCircle) el.designToolCircle.addEventListener('click', () => designSetTool('circle'));
if (el.designToolLine) el.designToolLine.addEventListener('click', () => designSetTool('line'));
async function designAddText() {
  const txt = el.designText ? el.designText.value : '';
  if (!txt || !txt.trim()) {
    if (el.designStatus) el.designStatus.textContent = 'Digite o texto.';
    return;
  }
  const fontName = el.designTextFont ? (el.designTextFont.value || 'sans-serif') : 'sans-serif';
  const size = Number(el.designTextSize && el.designTextSize.value) || 10;
  const mode = el.designTextMode ? el.designTextMode.value : 'vector';
  if (el.designStatus) el.designStatus.textContent = t('design.status.generating');

  if (mode === 'stroke' && window.GRBL_FONTS) {
    // Single-stroke (Hershey): rápido, ideal para gravação.
    const fontId = el.designFont && el.designFont.tagName === 'SELECT' ? el.designFont.value : 'simplex';
    const pos = designState.pendingTextPos || { x: 50, y: 50 };
    const shapes = window.GRBL_FONTS.textToShapes({ text: txt, fontId, size, x: pos.x, y: pos.y, letterSpacing: 0.1 });
    for (const sh of shapes) designState.shapes.push(sh);
    designState.selected = designState.shapes.length - 1;
    designState.pendingTextPos = null;
    dPushHistory();
    dRender();
    dUpdateProps();
    dUpdateObjectList();
    if (el.designStatus) el.designStatus.textContent = t('design.status.done');
    return;
  }

  // Modo vetor (contorno real da fonte do sistema): renderiza em canvas e
  // traça o contorno — resultado "premium", como CorelDRAW/Photoshop.
  if (!window.GRBL_CONTOUR) {
    appendLine('Módulo de contorno não carregado.', 'error');
    if (el.designStatus) el.designStatus.textContent = '';
    return;
  }
  try {
    const pos = designState.pendingTextPos || { x: 50, y: 50 };
    const shapes = await renderTextToShapes(txt, fontName, size, pos.x, pos.y);
    if (!shapes.length) {
      if (el.designStatus) el.designStatus.textContent = 'Não foi possível gerar o texto.';
      return;
    }
    for (const sh of shapes) designState.shapes.push(sh);
    designState.selected = designState.shapes.length - 1;
    designState.pendingTextPos = null;
    dPushHistory();
    dRender();
    dUpdateProps();
    dUpdateObjectList();
    if (el.designStatus) el.designStatus.textContent = t('design.status.done');
  } catch (err) {
    appendLine(t('err.prefix', { msg: err.message }), 'error');
    if (el.designStatus) el.designStatus.textContent = '';
  }
}

/**
 * Renderiza texto com a fonte do sistema em alta resolução e traça o contorno,
 * retornando formas vetoriais (coordenadas em mm, y-down no canvas).
 */
async function renderTextToShapes(text, fontName, sizeMm, cx, cy) {
  const PX_PER_MM = 8;
  const fontSizePx = Math.max(16, Math.round(sizeMm * PX_PER_MM));
  // canvas temporário (tamanho generoso)
  const pad = Math.round(fontSizePx * 0.5);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((sizeMm * text.length * 1.2 + 4) * PX_PER_MM);
  canvas.height = Math.round((sizeMm * 1.6 + 2) * PX_PER_MM);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${fontSizePx}px "${fontName}", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, pad, pad);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // binariza (threshold)
  const mask = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = img.data[i * 4] > 128 ? 1 : 0;
  }
  const contours = window.GRBL_CONTOUR.traceContours(mask, canvas.width, canvas.height);
  // Converte contornos (pixels, y-down) em formas (mm, y-down). Escala.
  const shapes = [];
  for (const cont of contours) {
    if (!cont || cont.length < 3) continue;
    const pts = cont.map((p) => ({
      x: (p.x / PX_PER_MM) + (cx - (canvas.width / PX_PER_MM) / 2),
      y: (p.y / PX_PER_MM) + (cy - (canvas.height / PX_PER_MM) / 2),
    }));
    shapes.push({ kind: 'text', points: pts, closed: true });
  }
  return shapes;
}
if (el.designToolText) el.designToolText.addEventListener('click', () => designSetTool('text'));
if (el.designUndo) el.designUndo.addEventListener('click', dUndo);
if (el.designRedo) el.designRedo.addEventListener('click', dRedo);
if (el.designZoomIn) el.designZoomIn.addEventListener('click', () => { designState.view.scale = Math.min(8, designState.view.scale * 1.2); dRender(); });
if (el.designZoomOut) el.designZoomOut.addEventListener('click', () => { designState.view.scale = Math.max(0.2, designState.view.scale / 1.2); dRender(); });
if (el.designZoomFit) el.designZoomFit.addEventListener('click', () => { designState.view = { scale: 1, tx: 20, ty: 20 }; dRender(); });
if (el.designAlignLeft) el.designAlignLeft.addEventListener('click', () => dAlign('left'));
if (el.designAlignCenter) el.designAlignCenter.addEventListener('click', () => dAlign('center'));
if (el.designAlignRight) el.designAlignRight.addEventListener('click', () => dAlign('right'));
if (el.designDelete) el.designDelete.addEventListener('click', () => {
  if (designState.selected >= 0) {
    designState.shapes.splice(designState.selected, 1);
    designState.selected = -1;
    dPushHistory();
    dRender();
    dUpdateProps();
    dUpdateObjectList();
  }
});
if (el.designClear) el.designClear.addEventListener('click', () => {
  if (!designState.shapes.length) return;
  designState.shapes = [];
  designState.selected = -1;
  dPushHistory();
  dRender();
  dUpdateProps();
  dUpdateObjectList();
});
if (el.designGenerate) el.designGenerate.addEventListener('click', designGenerate);
if (el.designSave) el.designSave.addEventListener('click', designSave);
if (el.designTextAdd) el.designTextAdd.addEventListener('click', designAddText);
if (el.designSnap) el.designSnap.addEventListener('change', (e) => { designState.snap = e.target.checked; });
// Properties bar -> apply to selected shape (translate/scale)
function dApplyProps() {
  const idx = designState.selected;
  if (idx < 0) return;
  const sh = designState.shapes[idx];
  const b = dShapeBounds(sh);
  const newX = Number(el.designPropX.value);
  const newY = Number(el.designPropY.value);
  const newW = Number(el.designPropW.value);
  const newH = Number(el.designPropH.value);
  if (!Number.isFinite(newX) || !Number.isFinite(newY) || !Number.isFinite(newW) || !Number.isFinite(newH)) return;
  const dx = newX - b.minX;
  const dy = newY - b.minY;
  const sx = (b.maxX - b.minX) > 0 ? newW / (b.maxX - b.minX) : 1;
  const sy = (b.maxY - b.minY) > 0 ? newH / (b.maxY - b.minY) : 1;
  // scale around (minX, minY) then translate
  for (const p of sh.points) {
    p.x = newX + (p.x - b.minX) * sx;
    p.y = newY + (p.y - b.minY) * sy;
  }
  // also apply the base translate (already included above via newX/newY)
  dPushHistory();
  dRender();
  dUpdateProps();
  dUpdateObjectList();
}
for (const id of ['designPropX', 'designPropY', 'designPropW', 'designPropH']) {
  if (el[id]) el[id].addEventListener('change', dApplyProps);
}

function dAlign(mode) {
  if (designState.selected < 0) return;
  const sh = designState.shapes[designState.selected];
  const b = dShapeBounds(sh);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const dx = mode === 'left' ? -b.minX : mode === 'right' ? -b.maxX : mode === 'center' ? -cx : 0;
  const dy = mode === 'top' ? -b.minY : mode === 'bottom' ? -b.maxY : mode === 'middle' ? -cy : 0;
  // align to canvas center
  const { w, h } = designSize();
  const targetX = mode === 'left' ? 0 : mode === 'right' ? w : mode === 'center' ? w / 2 : 0;
  const targetY = mode === 'top' ? 0 : mode === 'bottom' ? h : mode === 'middle' ? h / 2 : 0;
  // simpler: align shape's bbox edge to canvas edge/center
  let tx = 0, ty = 0;
  if (mode === 'left') tx = -b.minX;
  else if (mode === 'right') tx = w - b.maxX;
  else if (mode === 'center') tx = w / 2 - cx;
  if (mode === 'top') ty = -b.minY;
  else if (mode === 'bottom') ty = h - b.maxY;
  else if (mode === 'middle') ty = h / 2 - cy;
  for (const p of sh.points) { p.x += tx; p.y += ty; }
  dPushHistory();
  dRender();
  dUpdateProps();
}

function openDesignModal() {
  if (!el.designOverlay) return;
  el.designOverlay.classList.remove('hidden');
  designState.tool = 'select';
  designState.selected = -1;
  designState.drawing = null;
  designState.view = { scale: 1, tx: 20, ty: 20 };
  if (designState.history.length === 0) dPushHistory();
  // Popula o seletor de fonte single-stroke (se existir).
  if (el.designFont && window.GRBL_FONTS && el.designFont.tagName === 'SELECT') {
    const cur = el.designFont.value;
    el.designFont.innerHTML = '';
    for (const f of window.GRBL_FONTS.fontOptions()) {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      el.designFont.appendChild(opt);
    }
    if (cur) el.designFont.value = cur;
  }
  designUpdateToolButtons();
  dRender();
}

function closeDesignModal() {
  if (el.designOverlay) el.designOverlay.classList.add('hidden');
}

function updateFrameButtons() {
  const busy = state.jobState === 'running' || state.jobState === 'paused';
  const alarm = state.grblState === 'Alarm' || state.grblState === 'Door';
  const enabled = state.connected && !busy && !alarm;
  for (const b of [
    el.frameYp,
    el.frameXm,
    el.frameXp,
    el.frameYm,
    el.frameHome,
    el.frameSetOrigin,
    el.frameOrigin,
    el.frameOutline,
    el.frameCenter,
    el.frameStart,
  ]) {
    if (b) b.disabled = !enabled;
  }
}

function closeFrameModal() {
  if (el.frameOverlay) el.frameOverlay.classList.add('hidden');
}

function openMatTestModal() {
  if (!el.matTestOverlay) return;
  el.matTestOverlay.classList.remove('hidden');
  if (el.matTestStatus)
    el.matTestStatus.textContent =
      t('matTest.status.generating').replace('Gerando', '') || '';
  if (el.matTestStatus) el.matTestStatus.textContent = '';
}

function closeMatTestModal() {
  if (el.matTestOverlay) el.matTestOverlay.classList.add('hidden');
}

function readMatTestOptions() {
  const sMax = Number(el.imgSmax ? el.imgSmax.value : 1000) || 1000;
  return {
    cols: Math.max(2, Number(el.mtCols.value) || 5),
    rows: Math.max(2, Number(el.mtRows.value) || 5),
    speedMin: Math.max(1, Number(el.mtSpeedMin.value) || 500),
    speedMax: Math.max(1, Number(el.mtSpeedMax.value) || 3000),
    powerMin: Math.max(0, Math.min(100, Number(el.mtPowerMin.value) || 10)),
    powerMax: Math.max(0, Math.min(100, Number(el.mtPowerMax.value) || 100)),
    cellSize: Math.max(3, Number(el.mtCellSize.value) || 8),
    spacing: Math.max(0, Number(el.mtSpacing.value) || 2),
    passes: Math.max(1, Number(el.mtPasses.value) || 1),
    mode: el.mtMode.value === 'M3' ? 'M3' : 'M4',
    sMax,
    travelFeed: 3000,
  };
}

function generateMatTest() {
  if (!window.GRBL_MATERIAL_TEST) {
    appendLine('Módulo de teste de material não carregado.', 'error');
    return;
  }
  if (el.matTestStatus)
    el.matTestStatus.textContent = t('matTest.status.generating');
  const opts = readMatTestOptions();
  const result = window.GRBL_MATERIAL_TEST.generateMaterialTest(opts);
  // Carrega a grade como arquivo virtual (habilita Play e preview).
  applyJobLines('material-test.gcode', result.gcode);
  if (el.matTestStatus) el.matTestStatus.textContent = t('matTest.status.done');
  // Abre o modal de posicionamento para alinhar e gravar.
  openFrameModal();
}

async function saveMatTest() {
  if (!window.GRBL_MATERIAL_TEST) return;
  const opts = readMatTestOptions();
  const result = window.GRBL_MATERIAL_TEST.generateMaterialTest(opts);
  try {
    const path = await window.grbl.saveGcode(
      result.gcode,
      'material-test.gcode',
    );
    if (path) appendLine(t('file.saved', { path }), 'ok');
  } catch (err) {
    appendLine(t('err.prefix', { msg: err.message }), 'error');
  }
}

function frameJog(axis, sign) {
  if (!state.connected) {
    appendLine(t('err.connectForFrame'), 'error');
    return;
  }
  const step = Number(el.stepSelect ? el.stepSelect.value : 5) || 5;
  const feed = Number(el.feedSelect ? el.feedSelect.value : 1000) || 1000;
  appendLine(
    `Jog ${axis.toUpperCase()}${sign > 0 ? '+' : '-'} ${step} mm`,
    'ok',
  );
  window.grbl.jog({ [axis]: sign * step, feed });
}

function drawFrameOutline() {
  if (!state.connected || !frameBounds) return;
  const b = frameBounds;
  const sPower = 5; // S=5 ≈ 0,5 % do Smax: contorno bem fraco, só para marcar
  // Contorno visível: laser ligado em baixa potência e G1, para a marca
  // aparecer na superfície sem queimar.
  const lines = [
    'G90',
    'M4',
    `G1 X${b.xMin.toFixed(3)} Y${b.yMin.toFixed(3)} S${sPower} F3000`,
    `G1 X${b.xMax.toFixed(3)} Y${b.yMin.toFixed(3)} S${sPower}`,
    `G1 X${b.xMax.toFixed(3)} Y${b.yMax.toFixed(3)} S${sPower}`,
    `G1 X${b.xMin.toFixed(3)} Y${b.yMax.toFixed(3)} S${sPower}`,
    `G1 X${b.xMin.toFixed(3)} Y${b.yMin.toFixed(3)} S${sPower}`,
    'M5',
  ];
  for (const line of lines) window.grbl.writeLine(line);
  if (el.frameStatus) el.frameStatus.textContent = t('frame.outline.done');
}

/**
 * Leva o laser até o **centro da imagem** (RF-PRV-6), com o laser desligado,
 * para o usuário ver com a ponta onde será o centro antes de gravar.
 */
function moveToFrameCenter() {
  if (!state.connected || !frameBounds) return;
  const b = frameBounds;
  const cx = (b.xMin + b.xMax) / 2;
  const cy = (b.yMin + b.yMax) / 2;
  // Vai até o centro (laser desligado) e **aponta com laser bem fraco**
  // (S=5, ~0,5 %) por um breve instante, para o usuário ver com a ponta
  // onde será o centro — igual ao contorno, sem queimar o material.
  // Usa M3 (potência constante): em M4 a potência é proporcional à
  // velocidade e durante o dwell (G4) a velocidade é zero → o laser não
  // acende. M3 mantém o laser ligado mesmo parado.
  const sPower = 5;
  const step = 0.3;
  for (const line of [
    'G90',
    'M5',
    `G0 X${cx.toFixed(3)} Y${cy.toFixed(3)}`,
    `M3 S${sPower}`,   // M3 = potência constante (acende mesmo parado/lento)
    `G1 X${(cx + step).toFixed(3)} Y${cy.toFixed(3)} F300`,
    `G1 X${(cx - step).toFixed(3)} Y${cy.toFixed(3)} F300`,
    `G1 X${cx.toFixed(3)} Y${cy.toFixed(3)} F300`,
    'M5',
  ]) {
    window.grbl.writeLine(line);
  }
  if (el.frameStatus) el.frameStatus.textContent = t('frame.center.done');
}

const MACHINE_PROFILES = [
  {
    id: 'generic',
    name: 'Genérica (GRBL)',
    module: '5W',
    area: [0, 0],
    homing: false,
    spot: 0.08,
    lines: 8,
    mode: 'M4',
    settings: {},
  },
  {
    id: 'sculpfun-c1',
    name: 'Sculpfun C1 (3 W)',
    module: '3W',
    area: [150, 130],
    homing: false,
    spot: 0.04,
    lines: 10,
    mode: 'M4',
    settings: { 130: 150, 131: 130, 22: 0, 20: 0, 32: 1 },
  },
  {
    id: 'sculpfun-s6',
    name: 'Sculpfun S6 (5,5 W)',
    module: '5W',
    area: [410, 420],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 130: 410, 131: 420, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'sculpfun-s9',
    name: 'Sculpfun S9 (5,5 W)',
    module: '5W',
    area: [410, 420],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 130: 410, 131: 420, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'sculpfun-s10',
    name: 'Sculpfun S10 (10 W)',
    module: '10W',
    area: [410, 420],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 130: 410, 131: 420, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'sculpfun-s30',
    name: 'Sculpfun S30 (10-20 W)',
    module: '10W',
    area: [410, 420],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 130: 410, 131: 420, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'ortur-lm2',
    name: 'Ortur Laser Master 2',
    module: '5W',
    area: [400, 430],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 130: 400, 131: 430, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'ortur-lm3',
    name: 'Ortur Laser Master 3',
    module: '5W',
    area: [400, 400],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 130: 400, 131: 400, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'ortur-aufero2',
    name: 'Ortur Aufero 2',
    module: '5W',
    area: [390, 390],
    homing: false,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 130: 390, 131: 390, 22: 0, 20: 0, 32: 1 },
  },
  {
    id: 'atomstack-a5',
    name: 'AtomStack A5 Pro',
    module: '5W',
    area: [410, 400],
    homing: true,
    spot: 0.06,
    lines: 10,
    mode: 'M4',
    settings: { 130: 410, 131: 400, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'atomstack-x7',
    name: 'AtomStack X7 Pro',
    module: '10W',
    area: [410, 400],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 130: 410, 131: 400, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'twotrees-ts2',
    name: 'TwoTrees TS2',
    module: '5W',
    area: [300, 300],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 130: 300, 131: 300, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'twotrees-ts3',
    name: 'TwoTrees TS3',
    module: '10W',
    area: [300, 300],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 130: 300, 131: 300, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'foxalien-masuter',
    name: 'FoxAlien Masuter',
    module: '5W',
    area: [400, 400],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 130: 400, 131: 400, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'genmitsu-cubiko',
    name: 'Genmitsu Cubiko',
    module: '3W',
    area: [150, 150],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 130: 150, 131: 150, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'genmitsu-3018',
    name: 'Genmitsu 3018-PRO',
    module: '5W',
    area: [300, 180],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 130: 300, 131: 180, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'wainlux-k6',
    name: 'Wainlux K6 (portátil)',
    module: '3W',
    area: [80, 80],
    homing: false,
    spot: 0.03,
    lines: 10,
    mode: 'M4',
    settings: { 130: 80, 131: 80, 22: 0, 20: 0, 32: 1 },
  },
  {
    id: 'wainlux-k8',
    name: 'Wainlux K8 (portátil)',
    module: '3W',
    area: [80, 80],
    homing: false,
    spot: 0.03,
    lines: 10,
    mode: 'M4',
    settings: { 130: 80, 131: 80, 22: 0, 20: 0, 32: 1 },
  },
  {
    id: 'comgrow-z1',
    name: 'Comgrow Z1',
    module: '5W',
    area: [130, 150],
    homing: false,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 130: 130, 131: 150, 22: 0, 20: 0, 32: 1 },
  },
  {
    id: 'xtool-d1',
    name: 'xTool D1',
    module: '10W',
    area: [430, 390],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 130: 430, 131: 390, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'creality-falcon2',
    name: 'Creality Falcon 2',
    module: '10W',
    area: [400, 415],
    homing: true,
    spot: 0.1,
    lines: 10,
    mode: 'M4',
    settings: { 130: 400, 131: 415, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'neje-master2',
    name: 'NEJE Master 2S',
    module: '10W',
    area: [400, 400],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 130: 400, 131: 400, 22: 1, 20: 1, 32: 1 },
  },
  {
    id: 'longer-ray5',
    name: 'Longer Ray5',
    module: '5W',
    area: [400, 400],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 130: 400, 131: 400, 22: 1, 20: 1, 32: 1 },
  },
];

function populateMachineProfiles() {
  if (!el.machineProfile) return;
  const current = el.machineProfile.value;
  el.machineProfile.innerHTML = '';
  for (const prof of MACHINE_PROFILES) {
    const opt = document.createElement('option');
    opt.value = prof.id;
    opt.textContent = machineName(prof);
    el.machineProfile.appendChild(opt);
  }
  if (current && MACHINE_PROFILES.some((p) => p.id === current)) {
    el.machineProfile.value = current;
  } else {
    el.machineProfile.value = 'sculpfun-c1';
  }
}

function applyMachineProfile(profile) {
  const prof =
    MACHINE_PROFILES.find((p) => p.id === profile) || MACHINE_PROFILES[0];
  if (!prof) return;

  if (prof.area && prof.area[0] > 0 && prof.area[1] > 0) {
    setWorkArea(prof.area[0], prof.area[1]);
  }
  if (el.imgDot) el.imgDot.value = String(prof.spot);
  if (el.imgLines) el.imgLines.value = String(prof.lines);
  if (el.imgMode) el.imgMode.value = prof.mode;
  if (el.homeBtn) {
    el.homeBtn.disabled = !prof.homing;
    el.homeBtn.title = prof.homing
      ? t('jog.home.title')
      : t('jog.home.noHoming', { name: machineName(prof) });
  }
  if (state.connected) {
    for (const [code, value] of Object.entries(prof.settings)) {
      window.grbl
        .applySetting({ code: Number(code), value: String(value) })
        .catch(() => {});
    }
  }
  persistPrefs({ machineProfile: profile });
}

function updateWizard() {
  if (!el.wizardTitle) return;
  if (el.wizardDot) {
    el.wizardDot.className =
      'dot' +
      (state.connected
        ? ' connected'
        : state.connection === 'connecting'
          ? ' connecting'
          : state.connection === 'error'
            ? ' error'
            : '');
  }

  const titles = [
    t('conn.connect'),
    t('img.choose'),
    t('wizard.paramsTitle'),
    t('img.generate'),
    t('frame.position'),
    t('frame.engrave'),
  ];
  el.wizardTitle.textContent = t('wizard.title', {
    n: wizardStep,
    total: 6,
    title: titles[wizardStep - 1],
  });

  // Mostra só o painel do passo atual.
  document.querySelectorAll('.wizard-step').forEach((panel) => {
    const step = Number(panel.dataset.step);
    panel.classList.toggle('hidden', step !== wizardStep);
  });

  // Status contextual.
  if (el.wizardStatus) {
    if (wizardStep === 1) {
      el.wizardStatus.textContent = state.connected
        ? t('wizard.connected')
        : t('wizard.connect');
    } else if (wizardStep === 2) {
      el.wizardStatus.textContent = imageState?.loaded
        ? t('wizard.imageLoaded', { name: imageState.loaded.name })
        : t('wizard.chooseImage');
    } else if (wizardStep === 3) {
      el.wizardStatus.textContent = t('wizard.defineParams');
    } else if (wizardStep === 4) {
      el.wizardStatus.textContent = state.lines?.length
        ? t('wizard.gcodeReady')
        : t('wizard.clickGenerate');
    } else if (wizardStep === 5) {
      el.wizardStatus.textContent = t('wizard.positionHint');
    } else {
      el.wizardStatus.textContent = t('wizard.check');
    }

    // Info da imagem no passo 2.
    if (el.wizardImageInfo) {
      el.wizardImageInfo.textContent = imageState?.loaded
        ? imageState.loaded.name
        : t('img.none');
    }
  }

  if (el.wizardNext) {
    let canNext = false;
    if (wizardStep === 1) canNext = state.connected;
    else if (wizardStep === 2) canNext = Boolean(imageState?.loaded);
    else if (wizardStep === 3) canNext = true;
    else if (wizardStep === 4) canNext = Boolean(state.lines?.length);
    else canNext = true;
    el.wizardNext.disabled = !canNext;
    el.wizardNext.textContent =
      wizardStep < 6 ? t('wizard.next') : t('wizard.finish');
  }
  if (el.wizardBack) el.wizardBack.disabled = wizardStep <= 1;
}

function updateWorkflow() {
  // Exibição progressiva: controla classes no sidebar (ver style.css).
  if (!sidebar) return;
  sidebar.classList.toggle('is-connected', state.connected);
  const hasImage = Boolean(imageState?.loaded);
  const cardImage = document.getElementById('cardImage');
  if (cardImage) cardImage.classList.toggle('has-image', hasImage);
  if (el.imageCancel) el.imageCancel.classList.toggle('hidden', !hasImage);
  const hasGcode = Array.isArray(state.lines) && state.lines.length > 0;
  sidebar.classList.toggle('has-gcode', hasGcode);
}

function updateControls() {
  const conn = state.connected;
  const hasFile = state.lines.length > 0;
  const running = state.jobState === 'running';
  const paused = state.jobState === 'paused';
  const idle =
    state.jobState === 'idle' ||
    state.jobState === 'finished' ||
    state.jobState === 'aborted';
  // Em alarme/porta aberta o GRBL recusa movimento: bloqueia o que move (RF-STA-5).
  const alarm = state.grblState === 'Alarm' || state.grblState === 'Door';

  el.playBtn.disabled = !conn || !hasFile || !idle || alarm;
  if (el.pauseBtn) el.pauseBtn.disabled = !running;
  if (el.resumeBtn) el.resumeBtn.disabled = !paused;
  if (el.stopBtn) el.stopBtn.disabled = !(running || paused);

  // Barra de controles sempre à mão durante a gravação (RF-GC-8): fica visível
  // em qualquer aba e sobre o assistente, para pausar/retomar/cancelar.
  document.body.classList.toggle('job-active', running || paused);
  updateFrameButtons();
  if (el.jobBarState) {
    el.jobBarState.textContent = paused
      ? t('run.state.paused')
      : running
        ? t('run.state.engraving')
        : '';
  }

  // Explica por que "Iniciar" está apagado (a dúvida mais comum da UI).
  const lines = state.lines.length;
  let hint;
  if (alarm) {
    hint = t('status.alarmHint');
  } else if (!hasFile && !conn) {
    hint = t('run.hint.noFileNoConn');
  } else if (!hasFile) {
    hint = t('run.hint.noFile');
  } else if (!conn) {
    hint = t('run.hint.readyNoConn', { lines });
  } else if (running) {
    hint = t('run.hint.sending');
  } else {
    hint = t('run.hint.ready', { lines });
  }
  el.runHint.textContent = hint;
  el.runHint.classList.toggle('attention', alarm || (hasFile && !conn));

  el.playBtn.title = alarm
    ? t('status.alarmHint')
    : !hasFile
      ? t('run.noGcode')
      : !conn
        ? t('conn.connectFirst')
        : '';

  // Jog/origem/macros não fazem sentido em alarme (o GRBL recusa o movimento).
  for (const b of [el.jogXp, el.jogXm, el.jogYp, el.jogYm, el.jogZp, el.jogZm]) {
    if (b) b.disabled = !conn || alarm;
  }
  el.homeBtn.disabled = !conn || alarm || !machineHoming();
  el.setOriginBtn.disabled = !conn || alarm;
  el.gotoZeroBtn.disabled = !conn || alarm;
  // Unlock/Reset continuam disponíveis: são a saída do alarme.
  el.unlockBtn.disabled = !conn;
  el.resetBtn.disabled = !conn;

  // Retomada (RF-GC-7): só com arquivo, conectado e nada em execução.
  el.resumeFrom.disabled = !conn || !hasFile || running || paused || alarm;

  // Macros (RF-MAC-1) só fazem sentido conectado e sem alarme.
  for (const button of el.macroButtons.querySelectorAll('button')) {
    button.disabled = !conn || alarm;
  }
  el.macroHint.classList.toggle('hidden', conn);
}

/** O perfil de máquina atual declara homing de fábrica? */
function machineHoming() {
  const prof =
    MACHINE_PROFILES.find((p) => p.id === el.machineProfile?.value) ||
    MACHINE_PROFILES[0];
  return Boolean(prof?.homing);
}

/** O GRBL está em um estado que recusa movimento (RF-STA-5)? */
function isAlarmState() {
  return state.grblState === 'Alarm' || state.grblState === 'Door';
}

// -------------------------------------------------------------------- portas

async function refreshPorts() {
  el.portList.innerHTML = '';
  let ports = [];
  try {
    ports = await window.grbl.listPorts();
  } catch (err) {
    appendLine(t('err.listPorts', { msg: err.message }), 'error');
    return;
  }
  // Placas laser aparecem como ttyUSB* (CH340/CP2102) ou ttyACM* (Arduino).
  const hasUsbBoard = ports.some((p) => /\/tty(USB|ACM)\d/.test(p.path));
  el.portHint.classList.toggle('hidden', hasUsbBoard);
  if (!ports.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = t('port.none');
    el.portList.appendChild(opt);
    return;
  }
  for (const p of ports) {
    const opt = document.createElement('option');
    opt.value = p.path;
    opt.textContent = p.manufacturer ? `${p.path} — ${p.manufacturer}` : p.path;
    el.portList.appendChild(opt);
  }

  // Seleciona automaticamente a porta que parece ser a gravadora.
  const preferred = ports.find(
    (p) =>
      /\/tty(USB|ACM)\d/.test(p.path) &&
      /artery|ch340|cp210|ftdi|prolific|arduino|usb/i.test(
        `${p.manufacturer || ''} ${p.path}`,
      ),
  );
  if (preferred) {
    el.portList.value = preferred.path;
  } else if (ports.length === 1) {
    el.portList.value = ports[0].path;
  }
}

// ------------------------------------------------------------------ conexão

el.refreshPorts.addEventListener('click', refreshPorts);

/** Mostra os campos do transporte escolhido (RF-CON-7). */
function applyTransportVisibility() {
  const tcp = el.transportKind.value === 'tcp';
  el.serialFields.classList.toggle('hidden', tcp);
  el.tcpFields.classList.toggle('hidden', !tcp);
}

if (el.machineProfile) {
  el.machineProfile.addEventListener('change', () =>
    applyMachineProfile(el.machineProfile.value),
  );
}

el.transportKind.addEventListener('change', () => {
  applyTransportVisibility();

  persistPrefs({
    transport: el.transportKind.value === 'tcp' ? 'tcp' : 'serial',
  });
});

/** Opções de conexão conforme o transporte; `null` se faltar dado. */
function connectionOptions() {
  if (el.transportKind.value === 'tcp') {
    return {
      kind: 'tcp',
      host: el.tcpHost.value.trim() || '192.168.4.1',
      tcpPort: Number(el.tcpPort.value) || 23,
    };
  }
  const path = el.portList.value;
  if (!path) return null;
  return { kind: 'serial', path, baudRate: Number(el.baudList.value) };
}

/**
 * Conecta e, ao dar certo, guarda o último transporte (RF-CON-3) e lê
 * `$130/$131` para o aviso de área de trabalho (RF-GC-9).
 */
async function tryConnect(opts) {
  if (!opts) {
    appendLine(t('conn.selectPort'), 'error');
    return;
  }
  setConnection('connecting');
  try {
    await window.grbl.connect(opts);
    persistPrefs(
      opts.kind === 'tcp'
        ? { transport: 'tcp', host: opts.host, tcpPort: opts.tcpPort }
        : { transport: 'serial', port: opts.path, baud: opts.baudRate },
    );
    // Área de trabalho para o aviso de excedente (RF-GC-9). Silencioso.
    announceFirmware()
      .then(() => loadSettings().catch(() => {}))
      .catch(() => {});
  } catch (err) {
    setConnection('error');
    appendLine(t('err.connect', { msg: err.message }), 'error');
  }
}

/**
 * Lê `$I` (versão/opções) e `$G` (estado modal) ao conectar e mostra no
 * console (RF-CON-5). Firmware antigo pode não responder — falha é silenciosa.
 */
async function announceFirmware() {
  for (const [kind, key] of [
    ['info', 'conn.firmware'],
    ['state', 'conn.stateReport'],
  ]) {
    try {
      const lines = await window.grbl.querySpecial(kind);
      const value = lines.join(' | ').trim();
      if (value) appendLine(t(key, { value }), 'message');
    } catch {
      /* consulta não suportada pela máquina */
    }
  }
}

el.connectBtn.addEventListener('click', async () => {
  if (state.connected) {
    await window.grbl.disconnect();
    return;
  }
  await tryConnect(connectionOptions());
});

// ----------------------------------------------------------------------- jog

function jog(axis, sign) {
  if (!state.connected || isAlarmState()) return;
  const step = Number(el.stepSelect.value) * sign;
  const feed = Number(el.feedSelect.value);
  const cmd = { feed };
  cmd[axis] = step;
  window.grbl.jog(cmd);
}

/** Distância do jog contínuo, cancelada assim que o botão é solto (RF-JOG-2). */
const CONTINUOUS_JOG_MM = 200;
/** Tempo (ms) que o botão precisa ficar pressionado para virar contínuo. */
const JOG_HOLD_MS = 250;

function startContinuousJog(axis, sign) {
  if (!state.connected || isAlarmState()) return;
  const feed = Number(el.feedSelect.value);
  const cmd = { feed };
  cmd[axis] = sign * CONTINUOUS_JOG_MM;
  window.grbl.jog(cmd);
}

function stopContinuousJog() {
  if (state.connected) window.grbl.cancelJog();
}

/**
 * Liga um botão de jog: toque = passo; segurar (≥ `JOG_HOLD_MS`) = movimento
 * contínuo, cancelado com `0x85` ao soltar (RF-JOG-2).
 */
function bindJogButton(button, axis, sign) {
  if (!button) return;
  let timer = null;
  let pressed = false;
  let continuous = false;

  const cancelTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  button.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !state.connected || isAlarmState()) return;
    pressed = true;
    continuous = false;
    cancelTimer();
    timer = setTimeout(() => {
      timer = null;
      continuous = true;
      startContinuousJog(axis, sign);
    }, JOG_HOLD_MS);
  });

  const release = () => {
    cancelTimer();
    if (continuous) {
      continuous = false;
      pressed = false;
      stopContinuousJog();
    } else if (pressed) {
      pressed = false;
      jog(axis, sign);
    }
  };

  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', () => {
    cancelTimer();
    if (continuous) stopContinuousJog();
    continuous = false;
    pressed = false;
  });
  button.addEventListener('pointerleave', () => {
    cancelTimer();
    if (continuous) {
      stopContinuousJog();
      continuous = false;
    }
    pressed = false;
  });
}

bindJogButton(el.jogXp, 'x', 1);
bindJogButton(el.jogXm, 'x', -1);
bindJogButton(el.jogYp, 'y', 1);
bindJogButton(el.jogYm, 'y', -1);
bindJogButton(el.jogZp, 'z', 1);
bindJogButton(el.jogZm, 'z', -1);
el.homeBtn.addEventListener('click', () => window.grbl.home());
el.setOriginBtn.addEventListener('click', () => window.grbl.setOrigin(0, 0, 0));
el.gotoZeroBtn.addEventListener('click', () => window.grbl.gotoZero());
el.unlockBtn.addEventListener('click', () => window.grbl.unlock());
el.resetBtn.addEventListener('click', () => window.grbl.reset());

// ------------------------------------------- atalhos de teclado (RF-JOG-6)

const JOG_KEYS = {
  ArrowLeft: ['x', -1],
  ArrowRight: ['x', 1],
  ArrowUp: ['y', 1],
  ArrowDown: ['y', -1],
  PageUp: ['z', 1],
  PageDown: ['z', -1],
};

function typingInField(target) {
  if (!target?.tagName) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    tag.isContentEditable === true
  );
}

function overlayOpen(node) {
  return Boolean(node && !node.classList.contains('hidden'));
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (typingInField(e.target)) return;
  if (
    [
      el.settingsOverlay,
      el.appearanceOverlay,
      el.aboutOverlay,
      el.frameOverlay,
      el.matTestOverlay,
      el.designOverlay,
    ].some(overlayOpen)
  ) {
    return;
  }
  const move = JOG_KEYS[e.key];
  if (move) {
    if (!state.connected || isAlarmState()) return;
    e.preventDefault();
    jog(move[0], move[1]);
    return;
  }
  if (
    e.key === 'Home' &&
    state.connected &&
    !isAlarmState() &&
    machineHoming()
  ) {
    e.preventDefault();
    window.grbl.home();
  }
});

// ---------------------------------------------------------------- overrides

/** Liga um botão de override a uma ação da API (feed/spindle). */
function bindOverride(button, method, action) {
  $(button).addEventListener('click', () => window.grbl[method](action));
}

for (const [id, action] of [
  ['ovrFeedMinus10', 'minus10'],
  ['ovrFeedMinus1', 'minus1'],
  ['ovrFeedPlus1', 'plus1'],
  ['ovrFeedPlus10', 'plus10'],
  ['ovrFeedReset', 'reset'],
]) {
  bindOverride(id, 'overrideFeed', action);
}

for (const [id, action] of [
  ['ovrSpindleMinus10', 'minus10'],
  ['ovrSpindleMinus1', 'minus1'],
  ['ovrSpindlePlus1', 'plus1'],
  ['ovrSpindlePlus10', 'plus10'],
  ['ovrSpindleReset', 'reset'],
]) {
  bindOverride(id, 'overrideSpindle', action);
}

for (const [id, level] of [
  ['ovrRapidDefault', 'default'],
  ['ovrRapidMedium', 'medium'],
  ['ovrRapidLow', 'low'],
]) {
  $(id).addEventListener('click', () => window.grbl.overrideRapid(level));
}

/** Mostra no botão o nível de rápido ativo (o GRBL só distingue 3 níveis). */
function updateRapidButtons(percent) {
  el.ovrRapidValue.textContent = `${percent}%`;
  const active = percent >= 100 ? 'default' : percent >= 50 ? 'medium' : 'low';
  for (const [id, level] of [
    ['ovrRapidDefault', 'default'],
    ['ovrRapidMedium', 'medium'],
    ['ovrRapidLow', 'low'],
  ]) {
    $(id).classList.toggle('active', level === active);
  }
}

// ------------------------------------------------------------------ arquivo

el.fileOpen.addEventListener('click', async () => {
  let opened;
  try {
    opened = await window.grbl.openGcode();
  } catch (err) {
    appendLine(t('err.openFile', { msg: err.message }), 'error');
    return;
  }
  if (!opened) return;

  applyJobLines(opened.name, opened.text);
  appendLine(
    t('file.loaded', { name: opened.name, lines: state.lines.length }),
    'ok',
  );
});

function applyJobLines(name, text) {
  state.lines = String(text)
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  state.fileName = name;
  state.jobStart = 0;
  state.jobPreamble = 0;
  state.doneFile = 0;
  // Arquivo aberto: pré-visualiza o caminho real do G-code (RF-PRV-1).
  // Usa as linhas já filtradas para que o índice (`moves[].line`) fique na
  // mesma base de `state.doneFile` (progresso do job) — RF-STA-2.
  setGcodePreview(state.lines.join('\n'), name);
  // Tempo estimado e tamanho do arquivo (RF-GC-2).
  const parser = window.GRBL_PREVIEW;
  state.estimatedSec =
    parser && previewProgram.program
      ? parser.estimateSeconds(previewProgram.program)
      : 0;
  const size = formatBytes(byteLength(String(text)));
  state.fileInfoText =
    state.estimatedSec > 0
      ? {
          key: 'file.infoTime',
          params: {
            name,
            lines: state.lines.length,
            size,
            time: formatTime(state.estimatedSec),
          },
        }
      : {
          key: 'file.info',
          params: { name, lines: state.lines.length, size },
        };
  renderFileInfo();
  sidebar.classList.add('has-gcode');
  updateWorkflow();
  updateControls();
}

/**
 * Inicia o envio a partir de `startIndex` no arquivo. Em retomada (> 0),
 * injeta o preâmbulo que reafirma o estado modal (RF-GC-7, `shared/resume.ts`).
 */
function beginJob(startIndex = 0) {
  if (!state.connected || !state.lines.length) return;
  const total = state.lines.length;
  const start = Math.max(0, Math.min(Math.trunc(startIndex), total));
  const resume = window.GRBL_RESUME;
  const program =
    start > 0 && resume
      ? resume.buildResume(state.lines, start)
      : state.lines.slice(start);

  state.jobStart = start;
  state.jobPreamble = program.length - (total - start);
  state.doneFile = start;

  // Preview do caminho para acompanhar a execução (RF-PRV-5).
  setGcodePreview(state.lines.join('\n'), state.fileName);
  previewProgram.done = start;
  window.grbl.startJob(program, state.fileName);
}

el.playBtn.addEventListener('click', () => beginJob(0));

// -------------------------------------------- retomada de job (RF-GC-7)

/** Linha inicial sugerida (done − reversão) para o campo de retomada. */
function suggestedStart(done) {
  const back = Math.max(0, Number(el.resumeBack.value) || 0);
  if (window.GRBL_RESUME) return window.GRBL_RESUME.suggestStart(done, back);
  return Math.max(0, done - back);
}

function updateResumeInfo() {
  const total = state.lines.length;
  const done = Math.min(state.doneFile, total);
  if (done > 0 && done < total) {
    el.resumeInfo.textContent = t('resume.interrupted', {
      done,
      total,
      suggestion: suggestedStart(done),
    });
  } else if (total > 0 && done >= total) {
    el.resumeInfo.textContent = t('resume.done', { lines: total });
  } else {
    el.resumeInfo.textContent = t('resume.idle');
  }
}

el.resumeSuggest.addEventListener('click', () => {
  el.resumeLine.value = String(suggestedStart(state.doneFile));
});

el.resumeFrom.addEventListener('click', () => {
  const index = Math.max(0, Number(el.resumeLine.value) || 0);
  appendLine(t('resume.resuming', { line: index }), 'ok');
  beginJob(index);
});

el.pauseBtn.addEventListener('click', () => window.grbl.pauseJob());

if (el.resumeBtn)
  el.resumeBtn.addEventListener('click', () => window.grbl.resumeJob());

el.stopBtn.addEventListener('click', () => window.grbl.stopJob());

// ------------------------------------------------- preparação (imagem -> G-code)

/** Maior lado aceito na importação (protege RAM: RNF-12). */
const MAX_IMAGE_SIDE = 3072;

/** Chave do travamento de proporção na memória local (RF-IMG-3). */
const ASPECT_LOCK_KEY = 'grbl-keep-aspect';

const imageState = {
  loaded: null, // { name, width, height, aspect, data }
  stats: null,
  grid: null,
  algorithm: null,
  busy: false,
  preview: null, // { kind: 'image' | 'grid', ... }
  error: null, // { title, detail } — reposto na troca de idioma
  /** `true` quando `stats` veio de uma pré-visualização (não confirmada). */
  statsPreview: false,
};

let gcodeWorker = null;
let convertId = 0;
let convertMode = 'commit';
let autoStartAfterGenerate = false;
let wizardStep = 1;

function ensureWorker() {
  if (gcodeWorker) return gcodeWorker;
  try {
    gcodeWorker = new Worker('./gcode.worker.js');
  } catch (err) {
    appendLine(t('err.worker', { msg: err.message }), 'error');
    return null;
  }
  gcodeWorker.onmessage = onConvertResult;
  gcodeWorker.onerror = (e) => {
    appendLine(
      t('err.workerUnknown', { msg: e.message || t('err.unknown') }),
      'error',
    );
    endConvert();
  };
  return gcodeWorker;
}

function endConvert() {
  imageState.busy = false;
  el.imgGenerate.disabled = !imageState.loaded;
  el.imgGenerate.textContent = t('img.generate');
  el.imgGenerate.title = imageState.loaded
    ? t('img.generate.title')
    : t('img.generate.disabled');
}

function onConvertResult(ev) {
  const msg = ev.data;
  if (!msg || msg.id !== convertId) return; // resposta obsoleta
  endConvert();

  if (!msg.ok) {
    el.imgStats.textContent = t('img.statsFail', { msg: msg.error });
    appendLine(t('err.generate', { msg: msg.error }), 'error');
    return;
  }
  if (convertMode === 'preview') {
    applyPreview(msg.stats, msg.grid, msg.contourPaths);
  } else {
    applyGenerated(msg.gcode, msg.stats, msg.grid, msg.contourPaths);
  }
}

function applyPreview(stats, grid, contourPaths) {
  imageState.stats = stats;
  imageState.grid = grid;
  imageState.statsPreview = true;
  renderImageStats();
  imageState.preview = {
    kind: 'grid',
    grid,
    rows: stats.rows,
    cols: stats.cols,
    contours: contourPaths,
  };
  renderPreview();
}

function applyGenerated(gcode, stats, grid, contourPaths) {
  const image = imageState.loaded;
  if (!image) return;

  state.lines = gcode.split(/\r?\n/).filter((l) => l.trim().length > 0);
  state.fileName = `${baseName(image.name)}.gcode`;
  state.jobStart = 0;
  state.jobPreamble = 0;
  state.doneFile = 0;
  state.estimatedSec = stats.estimatedSec || 0;
  const size = formatBytes(
    typeof stats.bytes === 'number' ? stats.bytes : byteLength(gcode),
  );
  state.fileInfoText =
    state.estimatedSec > 0
      ? {
          key: 'file.infoGeneratedTime',
          params: {
            file: state.fileName,
            lines: state.lines.length,
            size,
            image: image.name,
            time: formatTime(state.estimatedSec),
          },
        }
      : {
          key: 'file.infoGenerated',
          params: {
            file: state.fileName,
            lines: state.lines.length,
            size,
            image: image.name,
          },
        };
  renderFileInfo();

  imageState.stats = stats;
  imageState.grid = grid;
  imageState.statsPreview = false;
  el.imgSave.disabled = state.lines.length === 0;
  el.imgSave.title = el.imgSave.disabled
    ? t('img.save.disabled')
    : t('img.save.title');
  renderImageStats();

  imageState.preview = {
    kind: 'grid',
    grid,
    rows: stats.rows,
    cols: stats.cols,
    contours: contourPaths, // só no modo vetor (RF-IMG-6)
  };
  renderPreview();
  updateControls();

  appendLine(
    t('gcode.summary', {
      lines: state.lines.length,
      size: formatBytes(stats.bytes),
      rows: stats.rows,
      cols: stats.cols,
      time: formatTime(stats.estimatedSec),
    }),
    'ok',
  );

  // Guarda a área de gravação para o modal de posicionamento (moldura).
  const opts = readImageOptions();
  window.frameBounds = {
    xMin: opts.geometry.offsetX,
    yMin: opts.geometry.offsetY,
    xMax: opts.geometry.offsetX + opts.geometry.widthMm,
    yMax: opts.geometry.offsetY + opts.geometry.heightMm,
  };

  // Abre o modal de posicionamento em vez de gravar imediatamente.
  openFrameModal();
  updateWizard();

  if (autoStartAfterGenerate) {
    autoStartAfterGenerate = false;
    setTimeout(() => {
      closeFrameModal();
      if (state.connected) beginJob(0);
    }, 50);
  }
}

function baseName(name) {
  return String(name).replace(/\.[^.]+$/, '');
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Tamanho em bytes UTF-8 de um texto (RF-GC-2: "tamanho" no rótulo do arquivo). */
function byteLength(text) {
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    return text.length;
  }
}

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const s = Math.round(sec);
  if (s < 60) return t('time.sec', { s });
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? t('time.minSec', { m, r }) : t('time.min', { m });
}

function formatStats(stats) {
  const contours =
    typeof stats.contours === 'number' && stats.contours > 0
      ? t('stats.contours', { count: stats.contours })
      : '';
  return (
    t('stats.format', {
      rows: stats.rows,
      cols: stats.cols,
      segments: stats.segments,
      size: formatBytes(stats.bytes),
      time: formatTime(stats.estimatedSec),
    }) + contours
  );
}

/** (Re)escreve as estatísticas da imagem no idioma atual (RF-APP-2). */
function renderImageStats() {
  if (!el.imgStats || !imageState.stats) return;
  el.imgStats.textContent = imageState.statsPreview
    ? `${formatStats(imageState.stats)} ${t('img.previewTag')}`
    : formatStats(imageState.stats);
}

// --------------------------------------------------------------- importação

el.imageOpen.addEventListener('click', async () => {
  let opened;
  try {
    opened = await window.grbl.openImage();
  } catch (err) {
    setImageError(t('img.error.open'), err.message);
    return;
  }
  if (!opened) return;
  loadImageBlob(
    opened.name,
    new Blob([toBytes(opened.data)], { type: opened.mime }),
  );
});

async function openImageDialog() {
  let opened;
  try {
    opened = await window.grbl.openImage();
  } catch (err) {
    setImageError(t('img.error.open'), err.message);
    return;
  }
  if (!opened) return;
  loadImageBlob(
    opened.name,
    new Blob([toBytes(opened.data)], { type: opened.mime }),
  );
}

el.imageReplace.addEventListener('click', openImageDialog);
el.imageCancel.addEventListener('click', cancelImage);

/** Normaliza o retorno do IPC (Uint8Array/Buffer/ArrayBuffer) para bytes. */
function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (ArrayBuffer.isView(data))
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Uint8Array(data);
}

function cancelImage() {
  imageState.loaded = null;
  imageState.stats = null;
  imageState.grid = null;
  imageState.preview = null;
  imageState.busy = false;
  imageState.error = null;
  imageState.statsPreview = false;
  const cardImage = document.getElementById('cardImage');
  if (cardImage) cardImage.classList.remove('has-image');
  sidebar.classList.remove('has-gcode');
  renderImageInfo();
  el.imgStats.textContent = '';
  el.imgGenerate.disabled = true;
  el.imgSave.disabled = true;
  updateWorkflow();
  renderPreview();
}

function setImageError(title, detail) {
  imageState.error = { title, detail };
  renderImageInfo();
  document.getElementById('cardImage').classList.remove('has-image');
  updateWorkflow();
  el.imgStats.textContent = '';
  el.imgSave.disabled = true;
  el.imgGenerate.disabled = true;
  appendLine(`${title}: ${detail}`, 'error');
}

/** Decodifica a imagem num canvas (a UI continua responsiva: só o worker converte). */
function loadImageBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    if (!naturalW || !naturalH) {
      URL.revokeObjectURL(url);
      setImageError(
        t('img.error.invalid'),
        t('img.error.invalidDetail', { name }),
      );
      return;
    }
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(naturalW, naturalH));
    const w = Math.max(1, Math.round(naturalW * scale));
    const h = Math.max(1, Math.round(naturalH * scale));

    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    URL.revokeObjectURL(url);

    imageState.loaded = {
      name,
      width: w,
      height: h,
      naturalW,
      naturalH,
      aspect: naturalH / naturalW,
      data: imageData.data,
    };
    imageState.stats = null;
    imageState.grid = null;
    imageState.preview = {
      kind: 'image',
      data: imageData.data,
      width: w,
      height: h,
    };

    imageState.error = null;
    renderImageInfo();
    document.getElementById('cardImage').classList.add('has-image');
    updateWorkflow();
    updateWizard();
    el.imgStats.textContent = '';
    el.imgSave.disabled = true;
    el.imgGenerate.disabled = false;
    el.imgGenerate.title = t('img.generate.title');
    applySizeFromAspect('w');
    if (el.guideWidth) el.guideWidth.value = el.imgWidth.value;
    if (el.guideHeight) el.guideHeight.value = el.imgHeight.value;
    refreshImagePreview();
    scheduleGenerate();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    setImageError(t('img.error.format'), t('img.error.formatDetail', { name }));
  };
  img.src = url;
}

/** Reaplica os ajustes (brilho, contraste, …) no preview da imagem (RF-IMG-2). */
function refreshImagePreview() {
  const image = imageState.loaded;
  if (!image) {
    renderPreview();
    return;
  }
  const adjust = window.GRBL_ADJUST;
  if (!adjust) {
    renderPreview();
    return;
  }
  try {
    adjust.validateAdjust({
      brightness: Number(el.imgBrightness.value),
      contrast: Number(el.imgContrast.value),
      whiteClip: Number(el.imgWhiteClip.value),
      invert: el.imgInvert.checked,
      blackWhite: el.imgBW.checked,
      bwThreshold: Number(el.imgThreshold.value),
    });
  } catch {
    renderPreview();
    return;
  }
  const gray = adjust.toGrayscale(image.data, image.width, image.height);
  const adjusted = adjust.applyAdjust(gray, {
    brightness: Number(el.imgBrightness.value),
    contrast: Number(el.imgContrast.value),
    whiteClip: Number(el.imgWhiteClip.value),
    invert: el.imgInvert.checked,
    blackWhite: el.imgBW.checked,
    bwThreshold: Number(el.imgThreshold.value),
  });
  const rgba = new Uint8ClampedArray(image.width * image.height * 4);
  for (let i = 0; i < adjusted.length; i++) {
    const g = Math.round(adjusted[i] * 255);
    rgba[i * 4] = g;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = g;
    rgba[i * 4 + 3] = 255;
  }
  imageState.preview = {
    kind: 'image',
    data: rgba,
    width: image.width,
    height: image.height,
  };
  renderPreview();
}

/** Formata mm com no máximo 3 decimais (mesma precisão do G-code/DRO). */
function formatMm(value) {
  return String(Math.round(value * 1000) / 1000);
}

/**
 * Mantém largura/altura na proporção da imagem (RF-IMG-3).
 * `source` é o campo editado: a largura manda na altura e vice-versa.
 *
 * Só roda no evento `input`. Se também rodamos em `change`, o clique na
 * caixa "Manter proporção" dispara o blur do campo num instante em que a
 * caixa **ainda está marcada** — e a medida parecia ser importada mesmo
 * quando o usuário acabou de desmarcar.
 */
function applySizeFromAspect(source) {
  const image = imageState.loaded;
  if (!image || !el.imgKeepAspect.checked) return;

  const sourceEl = source === 'w' ? el.imgWidth : el.imgHeight;
  const targetEl = source === 'w' ? el.imgHeight : el.imgWidth;

  // Digitando, o campo passa por estados vazios/inválidos: nesse caso não
  // toque no outro campo (senão ele some enquanto o usuário redige).
  const value = Number(sourceEl.value);
  if (!Number.isFinite(value) || value <= 0) return;

  const next = source === 'w' ? value * image.aspect : value / image.aspect;
  targetEl.value = formatMm(next);
}

el.imgWidth.addEventListener('input', () => applySizeFromAspect('w'));
el.imgHeight.addEventListener('input', () => applySizeFromAspect('h'));

/** Deixa explícito quando a altura está sendo derivada da largura (ou não). */
function updateSizeHint() {
  el.sizeHint.textContent = el.imgKeepAspect.checked
    ? t('img.aspect.locked')
    : t('img.aspect.free');
}

el.imgKeepAspect.addEventListener('change', () => {
  try {
    localStorage.setItem(ASPECT_LOCK_KEY, el.imgKeepAspect.checked ? '1' : '0');
  } catch {
    /* ignora */
  }
  updateSizeHint();
  // Re-marcar volta a travar na hora (largura como mestre).
  if (el.imgKeepAspect.checked) applySizeFromAspect('w');
});

// ------------------------------------------------------------------ gerar

/** Linhas/mm, direção e ponto valem só no raster; suavização só no vetor (RF-IMG-6). */
function updateAlgorithmVisibility() {
  const vector = el.imgAlgorithm.value === 'vector';
  document.querySelectorAll('.vector-only').forEach((node) => {
    node.classList.toggle('hidden', !vector);
  });
  document.querySelectorAll('.raster-only').forEach((node) => {
    node.classList.toggle('hidden', vector);
  });
}

el.imgAlgorithm.addEventListener('change', updateAlgorithmVisibility);
updateAlgorithmVisibility();

// Ajustes ao vivo no preview (RF-IMG-2).
['imgBrightness', 'imgContrast', 'imgWhiteClip', 'imgThreshold'].forEach(
  (key) => {
    el[key].addEventListener('input', refreshImagePreview);
  },
);
['imgInvert', 'imgBW'].forEach((key) => {
  el[key].addEventListener('change', refreshImagePreview);
});

function readImageOptions() {
  return {
    adjust: {
      brightness: Number(el.imgBrightness.value),
      contrast: Number(el.imgContrast.value),
      whiteClip: Number(el.imgWhiteClip.value),
      invert: el.imgInvert.checked,
      blackWhite: el.imgBW.checked,
      bwThreshold: Number(el.imgThreshold.value),
    },
    geometry: {
      widthMm: Number(el.imgWidth.value),
      heightMm: Number(el.imgHeight.value),
      offsetX: Number(el.imgOffsetX.value),
      offsetY: Number(el.imgOffsetY.value),
      linesPerMm: Number(el.imgLines.value),
      direction: el.imgDirection.value,
      dotSizeMm: Number(el.imgDot.value),
    },
    engrave: {
      speedMmMin: Number(el.imgSpeed.value),
      travelSpeedMmMin: 5000, // só para estimativa de tempo ($25 do GRBL)
      sMin: Number(el.imgSmin.value),
      sMax: Number(el.imgSmax.value),
      mode: el.imgMode.value,
      adaptiveSpeed: Number(el.imgAdaptive?.value) || 1,
    },
    algorithm: el.imgAlgorithm.value,
    passes: Number(el.imgPasses.value),
    bidirectional: el.imgBidirectional?.checked ?? true,
    // Só existe no modo vetor: assim o campo vazio nunca invalida os modos raster.
    ...(el.imgAlgorithm.value === 'vector'
      ? { simplifyPx: Number(el.imgSimplify.value) }
      : {}),
  };
}

// ------------------------------------------------------ perfil de material (RF-IMG-8)

/** Catálogo empacotado por esbuild em `public/materials.js` (fonte: shared/materials.ts). */
const materials = window.GRBL_MATERIALS;

/** Preenche o select de material conforme módulo + ação escolhidos. */
function populateMaterials() {
  if (!materials) return;
  const module = el.profileModule.value;
  const action = el.profileAction.value;
  const list = materials.profilesFor(module, action);
  // Preserva a escolha ao repopular (ex.: troca de idioma); module/ação
  // diferentes simplesmente não encontram o material e voltam ao placeholder.
  const previous = el.profileMaterial.value;

  el.profileMaterial.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = t('profile.material.placeholder');
  el.profileMaterial.appendChild(placeholder);
  for (const profile of list) {
    const option = document.createElement('option');
    option.value = profile.material;
    option.textContent = materialName(profile.material);
    el.profileMaterial.appendChild(option);
  }
  if (previous && list.some((p) => p.material === previous)) {
    el.profileMaterial.value = previous;
  }
  el.profileHint.textContent = t('profile.material.choose');
}

/**
 * Aplica o perfil escolhido: preenche velocidade e S-max e mostra as notas.
 * A coluna "Power (%)" vira `S` com referência `PROFILE_MAX_S` (≈ `$30 = 1000`).
 */
function applyProfile() {
  const material = el.profileMaterial.value;
  if (!materials || !material) return;
  const profile = materials.findProfile(
    el.profileModule.value,
    el.profileAction.value,
    material,
  );
  if (!profile) return;

  const sMax = materials.powerPercentToS(profile.powerPercent);
  el.imgSpeed.value = String(profile.speedMmMin);
  el.imgSmax.value = String(sMax);
  if (el.frameSpeed) el.frameSpeed.value = String(profile.speedMmMin);
  if (el.framePower)
    el.framePower.value = String(Math.round(profile.powerPercent));
  if (el.frameSpeedValue)
    el.frameSpeedValue.textContent = `${profile.speedMmMin} mm/min`;
  if (el.framePowerValue)
    el.framePowerValue.textContent = `${Math.round(profile.powerPercent)} %`;
  renderProfileHint();
}

/**
 * Só (re)escreve o texto de recomendação do perfil — sem tocar em
 * velocidade/S-max (para repor o idioma sem reverter ajustes manuais).
 */
function renderProfileHint() {
  const material = el.profileMaterial.value;
  if (!materials || !material) {
    el.profileHint.textContent = t('profile.material.choose');
    return;
  }
  const profile = materials.findProfile(
    el.profileModule.value,
    el.profileAction.value,
    material,
  );
  if (!profile) return;
  el.profileHint.textContent = t('profile.material.applied', {
    power: profile.powerPercent,
    smax: materials.powerPercentToS(profile.powerPercent),
    speed: profile.speedMmMin,
    notes: materialNotes(profile.notes),
  });
}

if (materials) {
  el.profileModule.addEventListener('change', populateMaterials);
  el.profileAction.addEventListener('change', populateMaterials);
  el.profileMaterial.addEventListener('change', applyProfile);
  populateMaterials();
} else {
  // Sem `public/materials.js` (build ausente): não deixa o campo parecer útil.
  el.profileMaterial.disabled = true;
  el.profileHint.textContent = t('profile.material.unavailable');
}

function generateGcode(commit = true) {
  convertMode = commit ? 'commit' : 'preview';
  const image = imageState.loaded;
  if (!image || imageState.busy) return;

  const worker = ensureWorker();
  if (!worker) return;

  const options = readImageOptions();
  imageState.algorithm = options.algorithm;
  imageState.busy = true;
  el.imgGenerate.disabled = true;
  el.imgGenerate.textContent = t('img.generating');

  // Cópia própria para transferir sem tocar no buffer do preview.
  const buffer = image.data.slice().buffer;
  convertId += 1;
  worker.postMessage(
    {
      id: convertId,
      width: image.width,
      height: image.height,
      rgba: buffer,
      options,
    },
    [buffer],
  );
}

el.imgGenerate.addEventListener('click', () => generateGcode(true));

// Regenera automaticamente quando os parâmetros de conversão mudam
// (algoritmo, linhas/mm, direção, ponto, suavização, passes, velocidade,
// S-min/S-max, modo, dimensões, offset) — evita "não afetou a imagem".
let generateTimer = null;
function scheduleGenerate() {
  if (!imageState.loaded || imageState.busy) return;
  if (generateTimer) clearTimeout(generateTimer);
  generateTimer = setTimeout(() => {
    generateTimer = null;
    generateGcode(false);
  }, 250);
}

const CONVERSION_CONTROLS = [
  'imgAlgorithm',
  'imgLines',
  'imgDirection',
  'imgDot',
  'imgSimplify',
  'imgPasses',
  'imgSpeed',
  'imgMode',
  'imgSmin',
  'imgSmax',
  'imgAdaptive',
  'imgBidirectional',
  'imgWidth',
  'imgHeight',
  'imgOffsetX',
  'imgOffsetY',
];
CONVERSION_CONTROLS.forEach((key) => {
  const node = el[key];
  if (!node) return;
  node.addEventListener('change', scheduleGenerate);
});

el.imgSave.addEventListener('click', async () => {
  if (!state.lines.length || !imageState.loaded) return;
  try {
    const path = await window.grbl.saveGcode(
      `${baseName(imageState.loaded.name)}.gcode`,
      `${state.lines.join('\n')}\n`,
    );
    if (path) appendLine(t('file.saved', { path }), 'ok');
  } catch (err) {
    appendLine(t('err.save', { msg: err.message }), 'error');
  }
});

// ----------------------------------------------------------------- preview

function previewContext() {
  const canvas = el.previewCanvas;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, rect: { width: rect.width, height: rect.height }, dpr };
}

/** Caixa contida (letterbox) com margem de 10 %. */
function fitBox(box, srcW, srcH) {
  const scale = Math.min(box.width / srcW, box.height / srcH) * 0.9;
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (box.width - w) / 2, y: (box.height - h) / 2, w, h };
}

function drawSource(source, srcW, srcH, smooth, alpha = 1) {
  const { ctx, rect } = previewContext();
  ctx.clearRect(0, 0, rect.width, rect.height);

  const off = document.createElement('canvas');
  off.width = srcW;
  off.height = srcH;
  const offCtx = off.getContext('2d');
  offCtx.putImageData(source, 0, 0);

  const box = fitBox(rect, srcW, srcH);
  ctx.imageSmoothingEnabled = smooth;
  ctx.globalAlpha = alpha;
  ctx.drawImage(off, box.x, box.y, box.w, box.h);
  ctx.globalAlpha = 1;
  return box;
}

/**
 * Traça os contornos vetoriais (RF-IMG-6) sobre a área já desenhada:
 * `flat` é o formato comprimento-prefixado do worker, em coordenadas 0..1.
 */
function drawContours(flat, box) {
  if (!flat?.length) return;
  const { ctx } = previewContext();
  const accent =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim() || '#4cc2ff';

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  let i = 0;
  while (i < flat.length) {
    const n = flat[i++];
    if (n <= 0) break;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const x = box.x + flat[i++] * box.w;
      const y = box.y + flat[i++] * box.h;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

// --- Preview de caminho (G-code): parser puro + canvas (RF-PRV-1…5) --------

const previewProgram = {
  program: null, // result de window.GRBL_PREVIEW.parseGcode
  view: { scale: 1, tx: 0, ty: 0 },
  /** Linhas já executadas (progresso do job) para destacar o percorrido. */
  done: 0,
  /** Área de trabalho em mm ($130/$131), quando conhecida. */
  workArea: null,
  /** Última posição (work coords) recebida no status. */
  lastPos: null,
  /** Cursor do segmento atual para o cálculo de DTG (RF-STA-2). */
  dtgCursor: 0,
  /** Número de passadas do programa (RF-GC-6); 1 quando não há marca. */
  passCount: 1,
  /** Trechos de queima do programa (cache; evita filtrar a cada quadro). */
  burns: [],
  /** Maior `S` do programa (referência de brilho no preview). */
  maxS: 0,
  /** Muda a cada programa novo: invalida as camadas do preview. */
  epoch: 0,
  label: '',
};

/**
 * Paleta das passadas (RF-GC-6). Como cada passada repete o mesmo caminho,
 * a cor do trecho já gravado muda por passada — senão perde-se a referência
 * de onde o laser está. A primeira (passada 1) usa o "ok" do tema.
 */
const PASS_COLORS = [
  '#e0b341',
  '#d977d9',
  '#e8843c',
  '#59c9c0',
  '#9a86ff',
  '#c9d44b',
];

/** Passada (0-based) do primeiro movimento ainda não gravado. */
function currentPass(done) {
  const moves = previewProgram.program?.moves;
  if (!moves) return 0;
  for (const m of moves) {
    if (!m.rapid && m.line >= done) return m.pass ?? 0;
  }
  return Math.max(0, (previewProgram.passCount ?? 1) - 1);
}

function cssColor(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/** Interpreta o G-code e passa o preview para o modo caminho (RF-PRV-2/4). */
function setGcodePreview(text, label) {
  const parser = window.GRBL_PREVIEW;
  if (!parser) return;
  previewProgram.program = parser.parseGcode(text);
  previewProgram.view = { scale: 1, tx: 0, ty: 0 };
  previewProgram.done = 0;
  previewProgram.lastPos = null;
  previewProgram.dtgCursor = 0;
  // Nº de passadas a partir das marcas `; pass` (RF-GC-6).
  let maxPass = 0;
  for (const m of previewProgram.program.moves) {
    if (m.pass && m.pass > maxPass) maxPass = m.pass;
  }
  previewProgram.passCount = maxPass + 1;
  // Cache por programa (o preview não pode repassar todos os trechos a cada
  // quadro — ver `previewLayers`): trechos de queima, potência máxima e época.
  previewProgram.burns = previewProgram.program.moves.filter((m) => !m.rapid);
  let maxS = 0;
  for (const m of previewProgram.burns) if (m.s && m.s > maxS) maxS = m.s;
  previewProgram.maxS = maxS;
  previewProgram.epoch = (previewProgram.epoch ?? 0) + 1;
  previewProgram.label = label || '';
  imageState.preview = { kind: 'gcode' };
  checkWorkArea();
  // Novo programa: a simulação anterior não faz mais sentido.
  if (typeof simStop === 'function') simStop(true);
  renderPreview();
}

// ------------------------------------------------------------------ simulação de job (RF-PRV-7)
const simState = {
  running: false,
  raf: null,
  speed: 1,
  time: 0,
  total: 0,
  index: 0,
  cum: [],
  moves: [],
};

function simPrepare() {
  const moves = previewProgram.program ? previewProgram.program.moves : [];
  simState.moves = moves;
  simState.cum = [];
  let acc = 0;
  const RAPID = 3000;
  for (const m of moves) {
    const dx = m.x1 - m.x0;
    const dy = m.y1 - m.y0;
    const dist = Math.hypot(dx, dy);
    const feed = m.rapid ? RAPID : (m.feed || 1000);
    const t = feed > 0 ? (dist / feed) * 60 : 0;
    acc += t;
    simState.cum.push(acc);
  }
  simState.total = acc > 0 ? acc : 1;
  simState.time = 0;
  simState.index = 0;
}

function simFmt(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function simUpdateUi() {
  if (!el.simTime) return;
  el.simTime.textContent = `${simFmt(simState.time)} / ${simFmt(simState.total)}`;
  if (el.simSeek) el.simSeek.value = String(Math.round((simState.time / simState.total) * 1000));
}

function simTick(ts) {
  if (!simState.running) return;
  if (!simState.lastTs) simState.lastTs = ts;
  const dt = (ts - simState.lastTs) / 1000;
  simState.lastTs = ts;
  simState.time = Math.min(simState.total, simState.time + dt * simState.speed);
  const moves = simState.moves;
  while (simState.index < moves.length - 1 && simState.cum[simState.index + 1] <= simState.time) {
    simState.index++;
  }
  const m = moves[simState.index];
  if (m) {
    previewProgram.done = m.line;
    previewProgram.lastPos = { x: m.x1, y: m.y1 };
  }
  scheduleRenderPreview();
  simUpdateUi();
  if (simState.time >= simState.total) {
    simState.running = false;
    if (el.simPlay) el.simPlay.disabled = false;
    if (el.simPause) el.simPause.disabled = true;
    return;
  }
  simState.raf = requestAnimationFrame(simTick);
}

function simStart() {
  if (!previewProgram.program || !previewProgram.program.moves.length) return;
  simPrepare();
  simState.running = true;
  simState.lastTs = 0;
  if (el.simPlay) el.simPlay.disabled = true;
  if (el.simPause) el.simPause.disabled = false;
  if (el.simBar) el.simBar.classList.remove('hidden');
  simState.raf = requestAnimationFrame(simTick);
}

function simPause() {
  if (!simState.running) return;
  simState.running = false;
  if (simState.raf) cancelAnimationFrame(simState.raf);
  simState.raf = null;
  if (el.simPlay) el.simPlay.disabled = false;
  if (el.simPause) el.simPause.disabled = true;
}

function simStop(resetPreview) {
  resetPreview = resetPreview !== false;
  simState.running = false;
  if (simState.raf) cancelAnimationFrame(simState.raf);
  simState.raf = null;
  simState.time = 0;
  simState.index = 0;
  if (el.simPlay) el.simPlay.disabled = false;
  if (el.simPause) el.simPause.disabled = true;
  if (el.simBar) el.simBar.classList.add('hidden');
  if (resetPreview && previewProgram.program) {
    previewProgram.done = 0;
    previewProgram.lastPos = null;
    renderPreview();
  }
  simUpdateUi();
}

function simSeek(val) {
  if (!simState.moves.length) return;
  const wasRunning = simState.running;
  if (wasRunning) simPause();
  simState.time = (Number(val) / 1000) * simState.total;
  let i = 0;
  while (i < simState.moves.length - 1 && simState.cum[i + 1] <= simState.time) i++;
  simState.index = i;
  const m = simState.moves[i];
  if (m) {
    previewProgram.done = m.line;
    previewProgram.lastPos = { x: m.x1, y: m.y1 };
  }
  renderPreview();
  simUpdateUi();
  if (wasRunning) {
    simState.running = true;
    simState.lastTs = 0;
    simState.raf = requestAnimationFrame(simTick);
    if (el.simPlay) el.simPlay.disabled = false;
    if (el.simPause) el.simPause.disabled = true;
  }
}

// Wire simulation controls.
if (el.simToggle)
  el.simToggle.addEventListener('click', () => {
    if (el.simBar && !el.simBar.classList.contains('hidden')) simStop();
    else simStart();
  });
if (el.simPlay) el.simPlay.addEventListener('click', simStart);
if (el.simPause) el.simPause.addEventListener('click', simPause);
if (el.simStop) el.simStop.addEventListener('click', () => simStop());
if (el.simSeek)
  el.simSeek.addEventListener('input', (e) => simSeek(e.target.value));
if (el.simSpeed)
  el.simSpeed.addEventListener('change', (e) => {
    simState.speed = Number(e.target.value) || 1;
  });

// Reset simulation when a new program is loaded.
const _origSetGcodePreview = setGcodePreview;
// (setGcodePreview is a function declaration; wrap via redefinition is not possible.
// Instead, patch at call sites is unnecessary: simStop is invoked by the toggle.
// We keep simState reset lightweight here.)


/** Atualiza a área de trabalho (vem das $130/$131 — Fase 3). */
function setWorkArea(widthMm, heightMm) {
  const ok = widthMm > 0 && heightMm > 0;
  previewProgram.workArea = ok ? { widthMm, heightMm } : null;
  if (imageState.preview?.kind === 'gcode') {
    checkWorkArea();
    renderPreview();
  }
}

/** Avisa (RF-GC-9) quando o caminho sai da área de trabalho configurada. */
function checkWorkArea() {
  el.previewWarning.classList.add('hidden');
  const bounds = previewProgram.program?.bounds;
  const wa = previewProgram.workArea;
  if (!bounds || !wa) return;
  const eps = 1e-6;
  const problems = [];
  if (bounds.xMin < -eps || bounds.yMin < -eps) {
    problems.push(t('preview.area.negative'));
  }
  if (bounds.xMax > wa.widthMm + eps) {
    problems.push(t('preview.area.xMax', { value: bounds.xMax.toFixed(1) }));
  }
  if (bounds.yMax > wa.heightMm + eps) {
    problems.push(t('preview.area.yMax', { value: bounds.yMax.toFixed(1) }));
  }
  if (problems.length === 0) return;
  el.previewWarning.textContent = t('preview.warning.area', {
    width: wa.widthMm,
    height: wa.heightMm,
    problems: problems.join(', '),
  });
  el.previewWarning.classList.remove('hidden');
  appendLine(t('err.areaExceeded', { problems: problems.join(', ') }), 'error');
}

/** Mostra a passada corrente na legenda quando há mais de uma (RF-GC-6). */
/** Último estado desenhado da legenda de passadas (evita escrita por quadro). */
let passLegendKey = '';

function updatePassLegend(done, okColor) {
  if (!el.lgPass || !el.lgPassSwatch) return;
  const total = previewProgram.passCount ?? 1;
  const show = total > 1;
  el.lgPass.classList.toggle('hidden', !show);
  el.lgPassSwatch.classList.toggle('hidden', !show);
  if (!show) return;
  const pass = currentPass(done);
  const key = `${pass}/${total}/${okColor}`;
  if (key === passLegendKey) return;
  passLegendKey = key;
  const palette = [okColor, ...PASS_COLORS];
  const idx = ((pass % palette.length) + palette.length) % palette.length;
  el.lgPassSwatch.style.background = palette[idx];
  el.lgPass.textContent = t('preview.pass', { n: pass + 1, total });
}

/**
 * Camadas em cache do preview de G-code.
 *
 * Redesenhar o caminho inteiro a cada quadro era o maior gasto de CPU do app
 * durante a gravação (o GRBL responde 10-20×/s e uma imagem tem centenas de
 * milhares de trechos). CPU ocupada atrasa o reabastecimento do buffer do GRBL,
 * que fica sem movimentos e **trava no meio da gravação**. Aqui:
 *  - `static`: área de trabalho + `G0` + queima completa — pintada uma vez por
 *    (programa, vista, tamanho, dpr, tema);
 *  - `done`: trechos já executados — **incremental** (só o que terminou desde o
 *    quadro anterior);
 *  - por quadro: dois `drawImage` + o crosshair.
 */
const previewLayers = {
  key: '',
  static: null,
  done: null,
  /** Índice em `moves` do próximo trecho a pintar na camada de progresso. */
  moveCursor: 0,
  /** Último `done` pintado (detecta reinício do job). */
  doneIndex: 0,
};

/** Canvas fora de tela do tamanho do preview, já na escala do `dpr`. */
function newLayer(rect, dpr) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx };
}

function drawGcodePreview() {
  const { ctx, rect, dpr } = previewContext();
  ctx.clearRect(0, 0, rect.width, rect.height);
  const prog = previewProgram.program;

  el.previewLegend.classList.remove('hidden');
  if (!prog || prog.moves.length === 0) {
    previewLayers.key = '';
    el.previewHint.classList.remove('hidden');
    el.previewHint.textContent = prog
      ? t('preview.hint.noMoves')
      : t('preview.hint.empty');
    return;
  }
  el.previewHint.classList.add('hidden');

  const b = prog.bounds;
  if (!b) return;
  const padW = (b.xMax - b.xMin) * 0.05;
  const padH = (b.yMax - b.yMin) * 0.05;
  const pad = Math.max(1, padW, padH);
  const wx0 = b.xMin - pad;
  const wx1 = b.xMax + pad;
  const wy0 = b.yMin - pad;
  const wy1 = b.yMax + pad;
  const wmm = Math.max(1e-3, wx1 - wx0);
  const hmm = Math.max(1e-3, wy1 - wy0);
  const base = Math.min(rect.width / wmm, rect.height / hmm);
  const scale = base * previewProgram.view.scale;
  const cx = (wx0 + wx1) / 2;
  const cy = (wy0 + wy1) / 2;
  const { tx, ty } = previewProgram.view;
  const toX = (mm) => rect.width / 2 + (mm - cx) * scale + tx;
  const toY = (mm) => rect.height / 2 - (mm - cy) * scale + ty;

  const accent = cssColor('--accent', '#4cc2ff');
  const dim = cssColor('--text-disabled', '#6b6b6b');
  const okColor = cssColor('--ok', '#6ccb5f');

  const moves = prog.moves;
  const wa = previewProgram.workArea;
  const maxS = previewProgram.maxS ?? 0;
  const POWER_LEVELS = 12;

  /** Desenha `list` com alfa proporcional à potência (segue o `S` do gerador). */
  const strokePower = (target, list, color, alphaMin) => {
    if (!list || list.length === 0) return;
    const groups = new Map();
    for (const m of list) {
      const t = maxS > 0 ? Math.min(1, (m.s ?? 0) / maxS) : 1;
      const k = Math.round(t * (POWER_LEVELS - 1));
      const arr = groups.get(k);
      if (arr) arr.push(m);
      else groups.set(k, [m]);
    }
    for (const [level, arr] of [...groups.entries()].sort(
      (p, q) => p[0] - q[0],
    )) {
      const t = POWER_LEVELS > 1 ? level / (POWER_LEVELS - 1) : 1;
      target.strokeStyle = color;
      target.globalAlpha = alphaMin + (1 - alphaMin) * t;
      target.beginPath();
      for (const m of arr) {
        target.moveTo(toX(m.x0), toY(m.y0));
        target.lineTo(toX(m.x1), toY(m.y1));
      }
      target.stroke();
    }
    target.globalAlpha = 1;
  };

  // Chave da camada estática: qualquer mudança de vista/programa/tema/tamanho
  // invalida o cache (repinta uma vez, não a cada quadro).
  const layerKey = [
    previewProgram.epoch ?? 0,
    moves.length,
    rect.width,
    rect.height,
    dpr,
    scale,
    tx,
    ty,
    wa ? `${wa.widthMm}x${wa.heightMm}` : '',
    accent,
    dim,
  ].join('|');

  if (previewLayers.key !== layerKey || !previewLayers.static) {
    previewLayers.key = layerKey;
    previewLayers.static = newLayer(rect, dpr);
    previewLayers.done = newLayer(rect, dpr);
    previewLayers.moveCursor = 0;
    previewLayers.doneIndex = 0;
    const g = previewLayers.static.ctx;

    // Área de trabalho ($130/$131) tracejada.
    if (wa) {
      g.save();
      g.setLineDash([4, 3]);
      g.strokeStyle = dim;
      g.globalAlpha = 0.7;
      g.strokeRect(
        toX(0),
        toY(wa.heightMm),
        wa.widthMm * scale,
        wa.heightMm * scale,
      );
      g.restore();
    }

    // Deslocamentos (G0) em segundo plano.
    g.strokeStyle = dim;
    g.globalAlpha = 0.5;
    g.lineWidth = 1;
    g.beginPath();
    for (const m of moves) {
      if (!m.rapid) continue;
      g.moveTo(toX(m.x0), toY(m.y0));
      g.lineTo(toX(m.x1), toY(m.y1));
    }
    g.stroke();
    g.globalAlpha = 1;

    // Queima/corte (G1/G2/G3) com brilho por potência (`S`).
    strokePower(g, prog.burns ?? moves, accent, 0.18);
  }

  // Camada de progresso, colorida por passada (RF-PRV-5 / RF-GC-6) e pintada
  // de forma incremental: cada quadro acrescenta só os trechos recém-concluídos.
  const done = Math.max(0, previewProgram.done);
  if (done < previewLayers.doneIndex) {
    // Job recomeçou (retomada/passada nova): repinta do zero.
    previewLayers.done.ctx.clearRect(0, 0, rect.width, rect.height);
    previewLayers.moveCursor = 0;
    previewLayers.doneIndex = 0;
  }
  if (done > previewLayers.doneIndex) {
    const g = previewLayers.done.ctx;
    const byPass = new Map();
    let cursor = previewLayers.moveCursor;
    while (cursor < moves.length && moves[cursor].line < done) {
      const m = moves[cursor++];
      if (m.rapid) continue;
      const p = m.pass ?? 0;
      let list = byPass.get(p);
      if (!list) {
        list = [];
        byPass.set(p, list);
      }
      list.push(m);
    }
    const palette = [okColor, ...PASS_COLORS];
    g.lineWidth = 1.5;
    for (const p of [...byPass.keys()].sort((p, q) => p - q)) {
      strokePower(
        g,
        byPass.get(p),
        palette[((p % palette.length) + palette.length) % palette.length],
        0.3,
      );
    }
    previewLayers.moveCursor = cursor;
    previewLayers.doneIndex = done;
  }

  // Compõe o quadro: estático + progresso, depois o crosshair da posição.
  ctx.drawImage(previewLayers.static.canvas, 0, 0, rect.width, rect.height);
  ctx.drawImage(previewLayers.done.canvas, 0, 0, rect.width, rect.height);
  updatePassLegend(done, okColor);

  // Crosshair da posição (RF-PRV-3).
  const pos = previewProgram.lastPos;
  if (pos) {
    const hx = toX(pos.x);
    const hy = toY(pos.y);
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy);
    ctx.lineTo(hx + 8, hy);
    ctx.moveTo(hx, hy - 8);
    ctx.lineTo(hx, hy + 8);
    ctx.stroke();
  }
}

function renderPreview() {
  const preview = imageState.preview;
  if (preview?.kind === 'gcode') {
    el.previewLegend.classList.remove('hidden');
    drawGcodePreview();
    return;
  }
  el.previewLegend.classList.add('hidden');
  el.previewWarning.classList.add('hidden');

  if (!preview) {
    el.previewHint.classList.remove('hidden');
    el.previewHint.textContent = t('preview.hint.image');
    const { ctx, rect } = previewContext();
    ctx.clearRect(0, 0, rect.width, rect.height);
    return;
  }
  el.previewHint.classList.add('hidden');

  if (preview.kind === 'image') {
    drawSource(
      new ImageData(preview.data, preview.width, preview.height),
      preview.width,
      preview.height,
      true,
    );
    return;
  }

  // Grade processada: 1 = branco (não queima), 0 = preto (queima).
  const image = new ImageData(preview.cols, preview.rows);
  for (let i = 0; i < preview.rows * preview.cols; i++) {
    const v = Math.max(0, Math.min(1, preview.grid[i]));
    const g = Math.round(v * 255);
    image.data[i * 4] = g;
    image.data[i * 4 + 1] = g;
    image.data[i * 4 + 2] = g;
    image.data[i * 4 + 3] = 255;
  }
  // No modo vetor a grade fica discreta (só a matéria) e os contornos mandam.
  const hasContours = preview.contours && preview.contours.length > 0;
  const box = drawSource(
    image,
    preview.cols,
    preview.rows,
    imageState.algorithm !== 'dither',
    hasContours ? 0.22 : 1,
  );
  if (hasContours) drawContours(preview.contours, box);
}

/* ------------------------- zoom e pan (RF-PRV-4) ------------------------- */

let dragState = null;

/** `true` quando o preview está no modo caminho (G-code). */
function isPathPreview() {
  return imageState.preview?.kind === 'gcode';
}

el.previewCanvas.addEventListener(
  'wheel',
  (e) => {
    if (!isPathPreview()) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    previewProgram.view.scale = Math.min(
      50,
      Math.max(0.2, previewProgram.view.scale * factor),
    );
    renderPreview();
  },
  { passive: false },
);

el.previewCanvas.addEventListener('pointerdown', (e) => {
  if (imageState.preview?.kind !== 'gcode') return;
  dragState = {
    x: e.clientX,
    y: e.clientY,
    tx: previewProgram.view.tx,
    ty: previewProgram.view.ty,
  };
  el.previewCanvas.setPointerCapture(e.pointerId);
});

el.previewCanvas.addEventListener('pointermove', (e) => {
  if (!dragState) return;
  previewProgram.view.tx = dragState.tx + (e.clientX - dragState.x);
  previewProgram.view.ty = dragState.ty + (e.clientY - dragState.y);
  renderPreview();
});

el.previewCanvas.addEventListener('pointerup', (e) => {
  if (!dragState) return;
  dragState = null;
  try {
    el.previewCanvas.releasePointerCapture(e.pointerId);
  } catch {
    /* já liberado */
  }
});

el.previewCanvas.addEventListener('dblclick', () => {
  if (imageState.preview?.kind !== 'gcode') return;
  previewProgram.view = { scale: 1, tx: 0, ty: 0 };
  renderPreview();
});

let previewResize = null;
window.addEventListener('resize', () => {
  if (previewResize) cancelAnimationFrame(previewResize);
  previewResize = requestAnimationFrame(() => {
    previewResize = null;
    renderPreview();
  });
});

/** Re-renderiza no máximo uma vez por frame (status/progresso em alta taxa). */
let previewFrame = null;
function scheduleRenderPreview() {
  if (previewFrame) return;
  previewFrame = requestAnimationFrame(() => {
    previewFrame = null;
    renderPreview();
  });
}

// ----------------------------------------------------------------- console

el.consoleInput.addEventListener('keydown', (e) => {
  // Histórico de comandos (RF-CON-13).
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const history = state.consoleHistory;
    if (history.length === 0) return;
    e.preventDefault();
    if (e.key === 'ArrowUp') {
      if (state.consoleHistoryIndex < history.length - 1)
        state.consoleHistoryIndex += 1;
    } else {
      if (state.consoleHistoryIndex > -1) state.consoleHistoryIndex -= 1;
    }
    el.consoleInput.value =
      state.consoleHistoryIndex >= 0
        ? history[history.length - 1 - state.consoleHistoryIndex]
        : '';
    return;
  }
  if (e.key !== 'Enter') return;
  const cmd = el.consoleInput.value.trim();
  if (!cmd) return;
  if (!state.connected) {
    appendLine(t('conn.notConnected'), 'error');
    return;
  }
  window.grbl.writeLine(cmd);
  state.consoleHistory.push(cmd);
  if (state.consoleHistory.length > 100) state.consoleHistory.shift();
  state.consoleHistoryIndex = -1;
  el.consoleInput.value = '';
});

// ------------------------------------------------- tema, idioma e sobre (RF-APP-1/2)

/** Aplica um tema (id validado) e sincroniza o picker. */
function applyTheme(theme) {
  const id = THEMES.some((th) => th.id === theme) ? theme : 'dark';
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem('grbl-theme', id);
  } catch {
    /* ignora */
  }
  markActiveTheme();
}

/** Marca o tema ativo no grid de amostras. */
function markActiveTheme() {
  if (!el.themeGroups) return;
  const active = document.documentElement.dataset.theme;
  for (const btn of el.themeGroups.querySelectorAll('.theme-swatch-btn')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.theme === active));
  }
}

/** Constrói o grid de temas agrupado por variante (claro/escuro/HC). */
function buildThemePicker() {
  if (!el.themeGroups) return;
  el.themeGroups.replaceChildren();
  const groups = [
    ['light', 'theme.group.light'],
    ['dark', 'theme.group.dark'],
    ['hc', 'theme.group.hc'],
  ];
  for (const [variant, groupKey] of groups) {
    const list = I18N ? I18N.themesByVariant(variant) : [];
    if (!list.length) continue;
    const section = document.createElement('div');
    section.className = 'theme-group';
    const label = document.createElement('span');
    label.className = 'theme-group-label';
    label.textContent = t(groupKey);
    section.appendChild(label);
    const grid = document.createElement('div');
    grid.className = 'theme-grid';
    for (const theme of list) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-swatch-btn';
      btn.dataset.theme = theme.id;
      btn.title = t(theme.labelKey);
      const swatch = document.createElement('span');
      swatch.className = 'theme-swatch';
      swatch.style.setProperty('--sw-bg', theme.swatch.bg);
      swatch.style.setProperty('--sw-fg', theme.swatch.fg);
      swatch.style.setProperty('--sw-accent', theme.swatch.accent);
      const caption = document.createElement('span');
      caption.className = 'theme-name';
      caption.textContent = t(theme.labelKey);
      btn.append(swatch, caption);
      btn.addEventListener('click', () => {
        applyTheme(theme.id);
        persistPrefs({ theme: theme.id });
      });
      grid.appendChild(btn);
    }
    section.appendChild(grid);
    el.themeGroups.appendChild(section);
  }
  markActiveTheme();
}

/** Marca o idioma ativo no picker. */
function markActiveLang() {
  if (!el.langRow || !I18N) return;
  for (const btn of el.langRow.querySelectorAll('.lang-btn')) {
    btn.setAttribute(
      'aria-pressed',
      String(btn.dataset.lang === I18N.getLocale()),
    );
  }
}

/** Constrói os botões de idioma (os nomes nunca são traduzidos). */
function buildLangPicker() {
  if (!el.langRow || !I18N) return;
  el.langRow.replaceChildren();
  for (const lang of I18N.LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-btn';
    btn.dataset.lang = lang;
    btn.textContent = t(`lang.${lang}`);
    btn.addEventListener('click', () => changeLang(lang));
    el.langRow.appendChild(btn);
  }
  markActiveLang();
}

/** Troca o idioma e retraduz tudo (RF-APP-2). */
function changeLang(lang) {
  if (!I18N?.setLocale(lang)) return;
  try {
    localStorage.setItem('grbl-lang', lang);
  } catch {
    /* ignora */
  }
  document.documentElement.lang = lang;
  I18N.applyDom();
  refreshTexts();
  buildThemePicker();
  buildLangPicker();
  persistPrefs({ lang });
}

/** (Re)desenha o rótulo do arquivo atual (abertura/geração/troca de idioma). */
function renderFileInfo() {
  if (!el.fileInfo) return;
  el.fileInfo.textContent = state.fileInfoText
    ? t(state.fileInfoText.key, state.fileInfoText.params)
    : t('file.none');
}

/** (Re)desenha o rótulo da imagem atual (erro/limpeza/troca de idioma). */
function renderImageInfo() {
  if (!el.imageInfo) return;
  if (imageState.error) {
    el.imageInfo.textContent = `${imageState.error.title}: ${imageState.error.detail}`;
    el.imageInfo.classList.add('error');
    return;
  }
  el.imageInfo.classList.remove('error');
  const img = imageState.loaded;
  if (!img) {
    el.imageInfo.textContent = t('img.none');
    return;
  }
  const reduced =
    img.width !== img.naturalW || img.height !== img.naturalH
      ? t('img.reduced', { w: img.naturalW, h: img.naturalH })
      : '';
  el.imageInfo.textContent = `${img.name} — ${img.naturalW}×${img.naturalH}px${reduced}`;
}

/** Reaplica os textos dinâmicos depois de uma troca de idioma. */
function refreshTexts() {
  // O rótulo do botão do assistente depende do estado, não só do idioma;
  // não reinicia o passo do wizard (só retraduz).
  applyMode(document.body.classList.contains('basic') ? 'basic' : 'advanced', {
    resetWizard: false,
  });
  setConnection(state.connection);
  updateControls();
  updateWizard();
  updateSizeHint();
  updateSpeedHint();
  updateResumeInfo();
  renderFileInfo();
  renderImageInfo();
  renderImageStats();
  populateMachineProfiles();
  updateProfileTexts();
  if (materials) {
    populateMaterials();
    renderProfileHint();
  }
  populateGuideMaterials();
  renderMacroButtons();
  renderMacroEditor();
  setConsolePaused(state.consolePaused);
  renderAlarmHistory();
  renderFileDir();
  renderProfiles();
  if (el.frameOverlay && !el.frameOverlay.classList.contains('hidden')) {
    openFrameModal();
  }
  if (el.matTestOverlay && !el.matTestOverlay.classList.contains('hidden')) {
    // Re-traduz o modal (os valores dos inputs não mudam).
  }
  renderPreview();
}

/** Atualiza o título do botão Home e o hint do perfil conforme a máquina atual. */
function updateProfileTexts() {
  const prof =
    MACHINE_PROFILES.find((p) => p.id === el.machineProfile?.value) ||
    MACHINE_PROFILES[0];
  if (prof && el.homeBtn) {
    el.homeBtn.title = prof.homing
      ? t('jog.home.title')
      : t('jog.home.noHoming', { name: machineName(prof) });
  }
}

/** Metadados do app (preenchidos pelo IPC `app:info` — RF-APP-6/7). */
let APP_INFO = {};

/** Preenche versão/autor/links do rodapé e do modal Sobre. */
function applyAppInfo(info) {
  APP_INFO = { ...APP_INFO, ...(info || {}) };
  const short = APP_INFO.version ? `v${APP_INFO.version}` : '—';
  if (el.footerVersion) el.footerVersion.textContent = short;
  if (el.aboutVersion) {
    el.aboutVersion.textContent = APP_INFO.version
      ? `${t('about.version')} ${APP_INFO.version}`
      : '—';
  }
  if (el.aboutLicense) el.aboutLicense.textContent = APP_INFO.license || 'MIT';
  if (el.aboutAuthor) el.aboutAuthor.textContent = APP_INFO.author || '—';
}

/** Abre um link externo pelo main (whitelist em `shared/appInfo.ts`). */
async function openExternal(url) {
  try {
    await window.grbl.openExternal(url);
  } catch (err) {
    appendLine(t('err.prefix', { msg: err.message }), 'error');
  }
}

function openOverlay(node) {
  if (node) node.classList.remove('hidden');
}
function closeOverlay(node) {
  if (node) node.classList.add('hidden');
}

function openAppearance() {
  buildThemePicker();
  buildLangPicker();
  openOverlay(el.appearanceOverlay);
}

if (el.appearanceClose)
  el.appearanceClose.addEventListener('click', () =>
    closeOverlay(el.appearanceOverlay),
  );

if (el.aboutBtn)
  el.aboutBtn.addEventListener('click', () => openOverlay(el.aboutOverlay));
if (el.aboutClose)
  el.aboutClose.addEventListener('click', () => closeOverlay(el.aboutOverlay));
if (el.footerLab)
  el.footerLab.addEventListener('click', (e) => {
    e.preventDefault();
    openExternal(APP_INFO.url || 'https://lab.werneck.dev.br/');
  });
if (el.aboutLab)
  el.aboutLab.addEventListener('click', (e) => {
    e.preventDefault();
    openExternal(APP_INFO.url || 'https://lab.werneck.dev.br/');
  });
if (el.aboutRepo)
  el.aboutRepo.addEventListener('click', (e) => {
    e.preventDefault();
    openExternal(
      APP_INFO.repository || 'https://github.com/viniciuswerneck/GRBL-Studio',
    );
  });
if (el.aboutVisit)
  el.aboutVisit.addEventListener('click', () =>
    openExternal(APP_INFO.url || 'https://lab.werneck.dev.br/'),
  );

// ------------------------------------------- pasta de arquivos (RF-CFG-5)

/** Mostra a pasta configurada (ou a do sistema, quando não definida). */
function renderFileDir() {
  if (!el.fileDirValue) return;
  el.fileDirValue.textContent =
    state.prefs.fileDir || t('prefs.fileDir.default');
}

if (el.fileDirChoose)
  el.fileDirChoose.addEventListener('click', async () => {
    try {
      const dir = await window.grbl.pickDir();
      if (!dir) return;
      state.prefs.fileDir = dir;
      renderFileDir();
      appendLine(t('prefs.fileDir.changed', { path: dir }), 'ok');
    } catch (err) {
      appendLine(t('err.prefix', { msg: err.message }), 'error');
    }
  });

// Fecha overlays com Esc ou clique fora do modal.
for (const overlay of [
  el.appearanceOverlay,
  el.aboutOverlay,
  el.settingsOverlay,
  el.frameOverlay,
  el.matTestOverlay,
  el.designOverlay,
]) {
  if (!overlay) continue;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
}
/** Para o job em execução via teclado (DESIGN §5: Esc / Ctrl+X). */
function emergencyStopFromKeyboard(e) {
  if (state.jobState !== 'running' && state.jobState !== 'paused') return false;
  e.preventDefault();
  window.grbl.stopJob();
  return true;
}

document.addEventListener('keydown', (e) => {
  if (typingInField(e.target)) return;
  // Ctrl+X: parada de emergência sempre disponível durante o job.
  if (
    e.ctrlKey &&
    !e.altKey &&
    !e.metaKey &&
    (e.key === 'x' || e.key === 'X')
  ) {
    emergencyStopFromKeyboard(e);
    return;
  }
  if (e.key !== 'Escape') return;
  const overlays = [
    el.appearanceOverlay,
    el.aboutOverlay,
    el.settingsOverlay,
    el.frameOverlay,
    el.matTestOverlay,
    el.designOverlay,
  ].filter((o) => o && !o.classList.contains('hidden'));
  if (overlays.length) {
    for (const overlay of overlays) overlay.classList.add('hidden');
    return;
  }
  // Sem overlays abertos, Esc também para o job (botão crítico sempre acessível).
  emergencyStopFromKeyboard(e);
});

// Eventos vindos do menu nativo (RF-APP-1/2).
if (window.grbl.onAbout)
  window.grbl.onAbout(() => openOverlay(el.aboutOverlay));
if (window.grbl.onTheme)
  window.grbl.onTheme((theme) => {
    applyTheme(theme);
    markActiveTheme();
    // Persiste como o picker, para o estado sobreviver ao próximo boot.
    persistPrefs({ theme });
  });
if (window.grbl.onLang) window.grbl.onLang((lang) => changeLang(lang));
if (window.grbl.onAction)
  window.grbl.onAction((name) => {
    if (name === 'open-gcode') el.fileOpen.click();
    else if (name === 'open-image') el.imageOpen.click();
    else if (name === 'appearance') openAppearance();
    else if (name === 'open-logs')
      window.grbl.openLogs().catch((err) => {
        appendLine(t('err.prefix', { msg: err.message }), 'error');
      });
    else if (name === 'material-test') openMatTestModal();
    else if (name === 'open-svg') openSvgImport();
    else if (name === 'design') openDesignModal();
  });

// ----------------------------------------------------- unidades (RF-APP-3)

const IN_PER_MM = 1 / 25.4;

/**
 * Posição de trabalho (WPos) em mm — o sistema em que o G-code é escrito,
 * usado no DRO, no DTG e no crosshair do preview (RF-PRV-3).
 *
 * O GRBL reporta **só `MPos` ou só `WPos`** (nunca os dois) e manda o `WCO`
 * apenas de vez em quando (~10–30 relatórios). Como `WPos = MPos − WCO`, o
 * cache em `state.wco` é mantido pelo helper puro `GRBL_PREVIEW.workPosition`.
 */
function workPosition(s) {
  if (!s) return null;
  const api = window.GRBL_PREVIEW;
  if (!api?.workPosition) return s.wpos ?? s.mpos ?? null;
  const { pos, wco } = api.workPosition(s, state.wco ?? { x: 0, y: 0, z: 0 });
  state.wco = wco;
  return pos;
}

/**
 * Desenha o DRO na unidade escolhida. A máquina e o G-code continuam em mm;
 * "in" é só conversão de exibição, para não alterar o estado modal do GRBL.
 */
function updateDro() {
  const pos = workPosition(state.lastStatus);
  const fmt = (mm) =>
    state.units === 'in' ? (mm * IN_PER_MM).toFixed(4) : mm.toFixed(3);
  el.droX.textContent = pos ? fmt(pos.x) : '—';
  el.droY.textContent = pos ? fmt(pos.y) : '—';
  el.droZ.textContent = pos ? fmt(pos.z) : '—';
}

el.unitsSelect.addEventListener('change', () => {
  state.units = el.unitsSelect.value === 'in' ? 'in' : 'mm';
  persistPrefs({ units: state.units });
  updateDro();
});

// --------------------------------------------------- preferências (RF-CFG-5)

/** Grava preferências no main (melhor esforço; não bloqueia a UI). */
async function persistPrefs(patch) {
  state.prefs = { ...state.prefs, ...patch };
  try {
    state.prefs = await window.grbl.setPrefs(patch);
  } catch (err) {
    console.warn(t('err.prefix', { msg: err.message }), err);
  }
}

/** Carrega e aplica tema, unidade, baud (porta é aplicada após listar). */
async function loadPrefs() {
  try {
    state.prefs = (await window.grbl.getPrefs()) || {};
  } catch (err) {
    console.warn(t('err.prefix', { msg: err.message }), err);
    state.prefs = {};
  }

  if (state.prefs.lang && I18N) {
    I18N.setLocale(state.prefs.lang);
    document.documentElement.lang = state.prefs.lang;
    try {
      localStorage.setItem('grbl-lang', state.prefs.lang);
    } catch {
      /* ignora */
    }
  }

  let theme = state.prefs.theme;
  const themeValid = THEMES.some((th) => th.id === theme);
  if (!themeValid) {
    try {
      theme = localStorage.getItem('grbl-theme');
      if (!THEMES.some((th) => th.id === theme)) theme = 'dark';
    } catch {
      theme = 'dark';
    }
  }
  applyTheme(theme);

  state.units = state.prefs.units === 'in' ? 'in' : 'mm';
  el.unitsSelect.value = state.units;

  // Assistente aberto/fechado persistido (RF-APP-2 / §15).
  applyMode(state.prefs.mode === 'basic' ? 'basic' : 'advanced');

  if (state.prefs.baud) {
    const baud = String(state.prefs.baud);
    if ([...el.baudList.options].some((o) => o.value === baud)) {
      el.baudList.value = baud;
    }
  }

  // Transporte e credenciais WiFi (RF-CON-7).
  el.transportKind.value = state.prefs.transport === 'tcp' ? 'tcp' : 'serial';
  if (state.prefs.host) el.tcpHost.value = state.prefs.host;
  if (state.prefs.tcpPort) el.tcpPort.value = String(state.prefs.tcpPort);
  applyTransportVisibility();

  // Perfil de máquina (catálogo).
  populateMachineProfiles();
  const profile = state.prefs.machineProfile || 'sculpfun-c1';
  if (el.machineProfile) el.machineProfile.value = profile;
  applyMachineProfile(profile);

  // Histórico de alarmes (RF-STA-7) e pasta de arquivos (RF-CFG-5).
  state.alarms = Array.isArray(state.prefs.alarmHistory)
    ? state.prefs.alarmHistory
    : [];
  renderAlarmHistory();
  renderFileDir();
  renderProfiles();
}

/** Seleciona a última porta usada, quando ela ainda está disponível. */
function applyPortPrefs() {
  const saved = state.prefs.port;
  if (!saved) return;
  if ([...el.portList.options].some((o) => o.value === saved)) {
    el.portList.value = saved;
  }
}

/** Reconecta ao último transporte no boot, salvo se desligado (RF-CON-3). */
function maybeAutoConnect() {
  if (state.prefs.autoConnect === false) return;
  if (state.prefs.transport === 'tcp') {
    tryConnect(connectionOptions());
    return;
  }
  const path = state.prefs.port;
  if (!path || el.portList.value !== path) return;
  tryConnect(connectionOptions());
}

// -------------------------------------------- configurações da máquina ($$)

/** Últimas linhas lidas de `$$`, usadas para render e edição. */
let settingRows = [];
/** Aba ativa do modal: '' ($$), 'offsets', 'info' ou 'state'. */
let settingsTab = '';

function openSettings() {
  el.settingsOverlay.classList.remove('hidden');
  el.settingsFilter.value = '';
  renderProfiles();
  if (!state.connected) {
    el.settingsStatus.textContent = t('settings.connectFirst');
    return;
  }
  if (settingsTab === '') loadSettings();
  else runSpecial(settingsTab);
}

function closeSettings() {
  el.settingsOverlay.classList.add('hidden');
}

/** Alterna entre a tabela de `$$` e as consultas especiais ($#/$I/$G). */
function setSettingsTab(mode) {
  settingsTab = mode;
  for (const tab of el.settingsTabs) {
    tab.classList.toggle('active', (tab.dataset.special ?? '') === mode);
  }
  const special = mode !== '';
  el.specialOutput.classList.toggle('hidden', !special);
  el.settingsList.classList.toggle('hidden', special);
  el.settingsFilter.classList.toggle('hidden', special);
  el.settingsRefresh.classList.toggle('hidden', special);
  el.settingsStatus.textContent = '';
  if (!state.connected) {
    el.settingsStatus.textContent = t('settings.connectQuery');
    return;
  }
  if (special) runSpecial(mode);
  else loadSettings();
}

async function runSpecial(mode) {
  el.settingsStatus.textContent = t('settings.querying');
  try {
    const lines = await window.grbl.querySpecial(mode);
    el.specialOutput.textContent = lines.join('\n');
    el.settingsStatus.textContent = lines.length
      ? ''
      : t('settings.noResponse');
  } catch (err) {
    el.specialOutput.textContent = '';
    el.settingsStatus.textContent = t('settings.fail', { msg: err.message });
  }
}

/** Lê `$$` do GRBL, atualiza a área de trabalho e desenha a tabela. */
async function loadSettings() {
  el.settingsStatus.textContent = t('settings.reading');
  el.settingsRefresh.disabled = true;
  try {
    settingRows = await window.grbl.readSettings();
    applyWorkAreaFromSettings();
    if (settingsTab === '') renderSettings();
    renderProfiles();
    el.settingsStatus.textContent = settingRows.length
      ? t('settings.count', { count: settingRows.length })
      : t('settings.empty');
  } catch (err) {
    el.settingsStatus.textContent = t('settings.readFail', {
      msg: err.message,
    });
  } finally {
    el.settingsRefresh.disabled = false;
  }
}

/**
 * Velocidade máxima dos eixos lida da máquina (`$110`/`$111`). Acima disso o
 * GRBL corta a velocidade e só o tempo de queima cai — a peça sai mais clara
 * (RF-IMG-10).
 */
const machineLimits = { rateX: null, rateY: null };

/** Extrai $130/$131 (área de trabalho) e $110/$111 (limite de velocidade). */
function applyWorkAreaFromSettings() {
  const value = (code) => settingRows.find((r) => r.code === code)?.number;
  const width = value(130);
  const height = value(131);
  if (typeof width === 'number' && typeof height === 'number') {
    setWorkArea(width, height);
  }
  const rate = (code) => {
    const v = value(code);
    return typeof v === 'number' && v > 0 ? v : null;
  };
  machineLimits.rateX = rate(110);
  machineLimits.rateY = rate(111);
  updateSpeedHint();
}

/** Compara a velocidade pedida (com a velocidade no claro) com $110/$111. */
function updateSpeedHint() {
  if (!el.speedHint) return;
  const { rateX, rateY } = machineLimits;
  if (rateX === null || rateY === null) {
    el.speedHint.textContent = t('img.speed.unknown');
    el.speedHint.classList.remove('warn');
    return;
  }
  const max = Math.min(rateX, rateY);
  const speed = Number(el.imgSpeed.value) || 0;
  const adaptive = Math.max(1, Number(el.imgAdaptive?.value) || 1);
  const peak = Math.round(speed * adaptive);
  if (peak > max) {
    el.speedHint.textContent = t('img.speed.over', {
      peak,
      max: Math.round(max),
    });
    el.speedHint.classList.add('warn');
  } else {
    el.speedHint.textContent = t('img.speed.limits', {
      x: Math.round(rateX),
      y: Math.round(rateY),
    });
    el.speedHint.classList.remove('warn');
  }
}

for (const key of ['imgSpeed', 'imgAdaptive']) {
  el[key]?.addEventListener('input', updateSpeedHint);
}

function renderSettings() {
  el.settingsList.innerHTML = '';
  const filter = el.settingsFilter.value.trim().toLowerCase();
  const groups = new Map();
  for (const row of settingRows) {
    const haystack = `${row.name} $${row.code}`.toLowerCase();
    if (filter && !haystack.includes(filter)) continue;
    const group = row.group || t('settings.groupOther');
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(row);
  }

  if (groups.size === 0) {
    const empty = document.createElement('div');
    empty.className = 'hint';
    empty.textContent = t('settings.filterEmpty');
    el.settingsList.appendChild(empty);
    return;
  }

  for (const [group, rows] of groups) {
    const head = document.createElement('div');
    head.className = 'settings-group';
    head.textContent = group;
    el.settingsList.appendChild(head);
    for (const row of rows) el.settingsList.appendChild(settingNode(row));
  }
}

/** Uma linha da tabela: `$n`, nome + ajuda, valor editável. */
function settingNode(row) {
  const wrap = document.createElement('div');
  wrap.className = 'setting-row';

  const key = document.createElement('span');
  key.className = 'setting-key';
  key.textContent = `$${row.code}`;

  const main = document.createElement('div');
  main.className = 'setting-main';
  const name = document.createElement('div');
  name.className = 'setting-name';
  name.textContent =
    row.name || t('settings.fallbackName', { key: `$${row.code}` });
  const help = document.createElement('div');
  help.className = 'setting-help';
  help.textContent = row.help || t('settings.fallbackHelp');
  main.append(name, help);

  wrap.append(key, main, settingEditor(row));
  return wrap;
}

function settingEditor(row) {
  const wrap = document.createElement('div');
  wrap.className = 'setting-edit';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = row.value;
  input.spellcheck = false;
  input.setAttribute(
    'aria-label',
    t('settings.value', { key: `$${row.code}` }),
  );
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
  });
  input.addEventListener('change', () => applySetting(row, input));
  wrap.appendChild(input);

  if (row.unit) {
    const unit = document.createElement('span');
    unit.className = 'setting-unit';
    unit.textContent = row.unit;
    wrap.appendChild(unit);
  }
  return wrap;
}

async function applySetting(row, input) {
  const next = input.value.trim();
  if (next === row.value) return;
  el.settingsStatus.textContent = t('settings.applying', {
    key: `$${row.code}`,
  });
  input.disabled = true;
  try {
    await window.grbl.applySetting({ code: row.code, value: next });
    row.value = next;
    const parsed = Number(next);
    if (Number.isFinite(parsed)) row.number = parsed;
    appendLine(`$${row.code} = ${next}`, 'ok');
    el.settingsStatus.textContent = t('settings.updated', {
      key: `$${row.code}`,
    });
    if (row.code === 130 || row.code === 131) applyWorkAreaFromSettings();
  } catch (err) {
    el.settingsStatus.textContent = t('settings.applyFail', {
      key: `$${row.code}`,
      msg: err.message,
    });
    input.value = row.value;
  } finally {
    input.disabled = false;
  }
}

el.settingsBtn.addEventListener('click', openSettings);
el.settingsClose.addEventListener('click', closeSettings);
el.settingsOverlay.addEventListener('click', (e) => {
  if (e.target === el.settingsOverlay) closeSettings();
});
// O fechamento por `Escape` é tratado no handler global de teclado (para
// respeitar campos de texto e a ordem de overlays/parada de emergência).
el.settingsRefresh.addEventListener('click', () => loadSettings());
el.settingsFilter.addEventListener('input', renderSettings);
for (const tab of el.settingsTabs) {
  tab.addEventListener('click', () =>
    setSettingsTab(tab.dataset.special ?? ''),
  );
}
// ----------------------------------------- perfis de configuração (RF-CFG-4)

/** Valores atuais de `$$` como mapa `código -> valor`. */
function currentSettingValues() {
  const values = {};
  for (const row of settingRows) values[String(row.code)] = row.value;
  return values;
}

/** Perfis salvos pelo usuário (nunca `undefined`). */
function savedProfiles() {
  return Array.isArray(state.prefs.settingProfiles)
    ? state.prefs.settingProfiles
    : [];
}

/** (Re)desenha o seletor de perfis salvos. */
function renderProfiles() {
  if (!el.settingsProfiles) return;
  const profiles = savedProfiles();
  const previous = el.settingsProfiles.value;
  el.settingsProfiles.textContent = '';
  if (!profiles.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = t('settings.profile.none');
    el.settingsProfiles.appendChild(opt);
  } else {
    profiles.forEach((profile, index) => {
      const opt = document.createElement('option');
      opt.value = String(index);
      opt.textContent = profile.name;
      el.settingsProfiles.appendChild(opt);
    });
  }
  if (
    previous &&
    [...el.settingsProfiles.options].some((o) => o.value === previous)
  ) {
    el.settingsProfiles.value = previous;
  }
  const has = profiles.length > 0;
  if (el.settingsProfileApply) el.settingsProfileApply.disabled = !has;
  if (el.settingsProfileDelete) el.settingsProfileDelete.disabled = !has;
}

/** Salva os valores atuais de `$$` sob um nome (RF-CFG-4). */
function saveProfile() {
  const name = (el.settingsProfileName?.value || '').trim();
  if (!name) {
    el.settingsStatus.textContent = t('settings.profile.needName');
    return;
  }
  const next = [
    ...savedProfiles().filter((p) => p.name !== name),
    { name, values: currentSettingValues() },
  ];
  state.prefs.settingProfiles = next;
  persistPrefs({ settingProfiles: next });
  renderProfiles();
  if (el.settingsProfileName) el.settingsProfileName.value = '';
  el.settingsStatus.textContent = t('settings.profile.saved', { name });
}

/** Reaplica os valores de um perfil na máquina (RF-CFG-4). */
async function applyProfileValues() {
  const profile = savedProfiles()[Number(el.settingsProfiles.value)];
  if (!profile) return;
  el.settingsStatus.textContent = t('settings.querying');
  try {
    for (const [code, value] of Object.entries(profile.values)) {
      await window.grbl.applySetting({ code: Number(code), value });
    }
    await loadSettings();
    el.settingsStatus.textContent = t('settings.profile.applied', {
      name: profile.name,
    });
  } catch (err) {
    el.settingsStatus.textContent = t('settings.profile.applyFail', {
      msg: err.message,
    });
  }
}

/** Remove o perfil selecionado (RF-CFG-4). */
function deleteProfile() {
  const index = Number(el.settingsProfiles.value);
  const profile = savedProfiles()[index];
  if (!profile) return;
  const next = savedProfiles().filter((_, i) => i !== index);
  state.prefs.settingProfiles = next;
  persistPrefs({ settingProfiles: next });
  renderProfiles();
  el.settingsStatus.textContent = t('settings.profile.deleted', {
    name: profile.name,
  });
}

if (el.settingsProfileSave)
  el.settingsProfileSave.addEventListener('click', saveProfile);
if (el.settingsProfileApply)
  el.settingsProfileApply.addEventListener('click', applyProfileValues);
if (el.settingsProfileDelete)
  el.settingsProfileDelete.addEventListener('click', deleteProfile);

// ------------------------------------------------------- macros (RF-MAC)

const MACROS = window.GRBL_MACROS;

/** Macros atuais (ou os padrões); nunca `undefined`. */
function currentMacros() {
  if (!Array.isArray(state.macros)) {
    state.macros = MACROS ? [...MACROS.DEFAULT_MACROS] : [];
  }
  return state.macros;
}

/** Novo id de macro (o mesmo do arquivo/preferências). */
function macroId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `m${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
}

function runMacro(macro) {
  if (!state.connected) {
    appendLine(t('macro.notConnected'), 'error');
    return;
  }
  for (const line of MACROS.macroLines(macro)) window.grbl.writeLine(line);
  appendLine(`Macro: ${macro.label}`, 'ok');
}

/** Desenha os botões agrupados; esconde o grupo no estilo do console. */
function renderMacroButtons() {
  el.macroButtons.innerHTML = '';
  const groups = new Map();
  for (const macro of currentMacros()) {
    const group = macro.group || 'Outros';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(macro);
  }
  for (const [group, list] of groups) {
    const title = document.createElement('div');
    title.className = 'macro-group';
    title.textContent = macroGroup(group);
    el.macroButtons.appendChild(title);
    for (const macro of list) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = macroLabel(macro);
      button.title = macro.gcode;
      button.disabled = !state.connected;
      button.addEventListener('click', () => runMacro(macro));
      el.macroButtons.appendChild(button);
    }
  }
}

/** Grava macros (via prefs) e redesenha botões + editor. */
function commitMacros() {
  renderMacroButtons();
  renderMacroEditor();
  persistPrefs({ macros: currentMacros() });
}

function macroEditorNode(macro) {
  const row = document.createElement('div');
  row.className = 'macro-row';

  const label = document.createElement('input');
  label.type = 'text';
  label.value = macro.label;
  label.placeholder = t('macro.labelPlaceholder');
  label.addEventListener('change', () => {
    macro.label = label.value.trim() || macro.label;
    label.value = macro.label;
    commitMacros();
  });

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = '✕';
  remove.title = t('macro.remove');
  remove.addEventListener('click', () => {
    state.macros = currentMacros().filter((m) => m.id !== macro.id);
    commitMacros();
  });

  const group = document.createElement('select');
  const groups = new Set([...MACROS.MACRO_GROUPS, macro.group]);
  for (const value of groups) {
    if (!value) continue;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = macroGroup(value);
    group.appendChild(option);
  }
  group.value = macro.group;
  group.addEventListener('change', () => {
    macro.group = group.value;
    commitMacros();
  });

  const gcode = document.createElement('textarea');
  gcode.value = macro.gcode;
  gcode.rows = 2;
  gcode.spellcheck = false;
  gcode.placeholder = t('macro.gcodePlaceholder');
  gcode.addEventListener('change', () => {
    macro.gcode = gcode.value;
    commitMacros();
  });

  row.append(label, group, remove, gcode);
  return row;
}

function renderMacroEditor() {
  el.macroEditor.innerHTML = '';
  for (const macro of currentMacros()) {
    el.macroEditor.appendChild(macroEditorNode(macro));
  }
}

el.macroAdd.addEventListener('click', () => {
  state.macros = currentMacros().concat({
    id: macroId(),
    label: t('macro.new'),
    gcode: 'M5',
    group: 'Outros',
  });
  commitMacros();
});

el.macroReset.addEventListener('click', () => {
  state.macros = [...MACROS.DEFAULT_MACROS];
  commitMacros();
});

el.macroExport.addEventListener('click', async () => {
  try {
    const saved = await window.grbl.saveMacros(
      MACROS.serializeMacros(currentMacros()),
    );
    if (saved) appendLine(t('macro.exported', { path: saved }), 'ok');
  } catch (err) {
    appendLine(t('macro.exportFail', { msg: err.message }), 'error');
  }
});

el.macroImport.addEventListener('click', async () => {
  let opened;
  try {
    opened = await window.grbl.openMacros();
  } catch (err) {
    appendLine(t('macro.openFail', { msg: err.message }), 'error');
    return;
  }
  if (!opened) return;
  try {
    state.macros = MACROS.parseMacroFile(opened.text);
  } catch (err) {
    appendLine(t('macro.invalid', { msg: err.message }), 'error');
    return;
  }
  commitMacros();
  appendLine(t('macro.imported', { count: state.macros.length }), 'ok');
});

// ------------------------------------------------------- eventos do main

const STATE_CLASS = {
  Idle: 'idle',
  Run: 'run',
  Jog: 'run',
  Hold: 'hold',
  Alarm: 'alarm',
  Door: 'alarm',
};

/** Chave i18n do rótulo de cada estado do GRBL (`status.state`). */
const STATE_KEY = {
  Idle: 'status.idle',
  Run: 'status.run',
  Jog: 'status.jog',
  Hold: 'status.hold',
  Alarm: 'status.alarm',
  Door: 'status.door',
  Check: 'status.check',
  Home: 'status.home',
  Sleep: 'status.sleep',
};

/** Rótulo traduzido do estado; mantém o texto cru se for desconhecido. */
function stateLabel(name) {
  const key = STATE_KEY[name];
  return key && hasKey(key) ? t(key) : name;
}

/** Segmento em execução (DTG — RF-STA-2), com cursor amortizado (O(n) total). */
function currentTarget() {
  const prog = previewProgram.program;
  if (!prog?.moves.length) return null;
  const moves = prog.moves;
  let i = previewProgram.dtgCursor || 0;
  while (i < moves.length - 1 && moves[i + 1].line <= state.doneFile) i++;
  previewProgram.dtgCursor = i;
  return moves[i].line <= state.doneFile ? moves[i] : moves[0];
}

/** Distância (mm) até o fim do segmento em execução (RF-STA-2). */
function updateDtg(s) {
  if (!el.metaDtg) return;
  // Alvos do G-code estão em coordenadas de trabalho (WPos), como o crosshair.
  const pos = workPosition(s);
  const target =
    state.jobState === 'running' || state.jobState === 'paused'
      ? currentTarget()
      : null;
  if (!pos || !target) {
    el.metaDtg.textContent = '—';
    return;
  }
  const d = Math.hypot(target.x1 - pos.x, target.y1 - pos.y);
  el.metaDtg.textContent =
    state.units === 'in' ? (d * IN_PER_MM).toFixed(4) : d.toFixed(3);
}

/** Tempo restante estimado (RF-GC-5) a partir do progresso do job. */
function updateEta(p) {
  if (!el.progressEta) return;
  const total = state.estimatedSec;
  if (!total || !p.total) {
    el.progressEta.textContent = '';
    return;
  }
  const fraction = Math.min(1, Math.max(0, p.sent / p.total));
  const remaining = total * (1 - fraction);
  el.progressEta.textContent =
    remaining > 0.5 ? `${t('status.remaining')}: ${formatTime(remaining)}` : '';
}

/** Registra um alarme/erro no histórico da sessão (RF-STA-7). */
function recordAlarm(err) {
  state.alarms = [
    ...state.alarms,
    {
      ts: Date.now(),
      code: err.code,
      message: err.message,
      solution: err.solution,
    },
  ].slice(-100);
  renderAlarmHistory();
  persistPrefs({ alarmHistory: state.alarms });
}

/** (Re)desenha o histórico de alarmes no idioma/estado atuais. */
function renderAlarmHistory() {
  if (!el.alarmHistory) return;
  el.alarmHistory.textContent = '';
  if (!state.alarms.length) {
    const empty = document.createElement('div');
    empty.className = 'hint';
    empty.textContent = t('status.history.empty');
    el.alarmHistory.appendChild(empty);
    return;
  }
  for (const entry of [...state.alarms].reverse()) {
    const row = document.createElement('div');
    row.className = 'alarm-entry';
    const time = new Date(entry.ts).toLocaleTimeString();
    const code = entry.code !== undefined ? ` [${entry.code}]` : '';
    row.textContent = `${time}${code} ${entry.message}`;
    if (entry.solution) {
      const fix = document.createElement('div');
      fix.className = 'alarm-fix';
      fix.textContent = entry.solution;
      row.appendChild(fix);
    }
    el.alarmHistory.appendChild(row);
  }
}

if (el.alarmHistoryClear)
  el.alarmHistoryClear.addEventListener('click', () => {
    state.alarms = [];
    renderAlarmHistory();
    persistPrefs({ alarmHistory: [] });
  });

window.grbl.onConsole((line) => {
  appendLine(
    line.direction === 'out' ? `> ${line.text}` : line.text,
    line.kind,
  );
});

window.grbl.onStatus((s) => {
  state.lastStatus = s;
  if (s.state !== state.grblState) {
    state.grblState = s.state;
    updateControls();
  }
  const cls = STATE_CLASS[s.state] ?? '';
  el.stateBadge.className = `badge ${cls}`;
  el.stateBadge.textContent = stateLabel(s.state);

  updateDro();
  el.metaFeed.textContent = s.fs ? `${s.fs.feed}` : '—';
  el.metaS.textContent = s.fs ? `${s.fs.spindle}` : '—';
  updateDtg(s);

  if (s.ov) {
    el.ovrFeedValue.textContent = `${s.ov[0]}%`;
    el.ovrSpindleValue.textContent = `${s.ov[2]}%`;
    updateRapidButtons(s.ov[1]);
  }

  // Crosshair do preview segue a posição de trabalho (RF-PRV-3).
  const work = workPosition(s);
  if (work) {
    previewProgram.lastPos = { x: work.x, y: work.y };
    if (imageState.preview?.kind === 'gcode') scheduleRenderPreview();
  }
});

window.grbl.onConnection((conn) => setConnection(conn));

window.grbl.onJob((job) => {
  setJobState(job.state);
  if (job.state === 'finished') {
    appendLine(t('job.finished'), 'ok');
    // Volta o laser para a origem XY (caso precise repetir a gravação).
    if (state.connected) window.grbl.gotoZero();
    // Reabre o modal de posicionamento para repetir se necessário.
    openFrameModal();
  }
  if (job.state === 'aborted' && job.error)
    appendLine(t('job.aborted', { reason: job.error }), 'error');
});

window.grbl.onProgress((p) => {
  const pct = p.total ? Math.round((p.sent / p.total) * 100) : 0;
  el.progressBar.style.width = `${pct}%`;
  el.progressText.textContent = `${p.sent} / ${p.total} (${pct}%)`;
  if (el.jobBarProgress)
    el.jobBarProgress.textContent = `${p.sent} / ${p.total} (${pct}%)`;
  updateEta(p);

  // Mapeia o progresso do job para o índice no arquivo (retomada RF-GC-7).
  state.doneFile = state.jobStart + Math.max(0, p.sent - state.jobPreamble);
  updateResumeInfo();

  // Marca no preview o trecho já executado (RF-PRV-5).
  if (imageState.preview?.kind === 'gcode') {
    previewProgram.done = state.doneFile;
    scheduleRenderPreview();
  }
});

window.grbl.onError((err) => {
  el.stateBadge.className = 'badge alarm';
  el.stateBadge.textContent = t('status.error');
  appendLine(t('err.prefix', { msg: err.message }), 'error');
  // Ação recomendada para alarmes conhecidos (RF-STA-4).
  if (err.solution) appendLine(err.solution, 'message');
  // Só alarmes/erros do GRBL (com código) entram no histórico (RF-STA-7);
  // falhas de I/O/conexão não são alarmes.
  if (err.code !== undefined) recordAlarm(err);
  console.warn('GRBL:', err.message);
});

// -------------------------------------------------------------------- frame modal

if (el.frameClose) el.frameClose.addEventListener('click', closeFrameModal);
if (el.frameCancel) el.frameCancel.addEventListener('click', closeFrameModal);
if (el.frameOverlay)
  el.frameOverlay.addEventListener('click', (e) => {
    if (e.target === el.frameOverlay) closeFrameModal();
  });
if (el.matTestClose)
  el.matTestClose.addEventListener('click', closeMatTestModal);
if (el.matTestOverlay)
  el.matTestOverlay.addEventListener('click', (e) => {
    if (e.target === el.matTestOverlay) closeMatTestModal();
  });
if (el.matTestGenerate)
  el.matTestGenerate.addEventListener('click', generateMatTest);
if (el.matTestSave) el.matTestSave.addEventListener('click', saveMatTest);
if (el.frameYp) el.frameYp.addEventListener('click', () => frameJog('y', 1));
if (el.frameXm) el.frameXm.addEventListener('click', () => frameJog('x', -1));
if (el.frameXp) el.frameXp.addEventListener('click', () => frameJog('x', 1));
if (el.frameYm) el.frameYm.addEventListener('click', () => frameJog('y', -1));
if (el.frameHome)
  el.frameHome.addEventListener('click', () => window.grbl.home());
if (el.frameOrigin)
  el.frameOrigin.addEventListener('click', () => window.grbl.gotoZero());
if (el.frameSetOrigin)
  el.frameSetOrigin.addEventListener('click', () =>
    window.grbl.setOrigin(0, 0, 0),
  );
if (el.frameOutline)
  el.frameOutline.addEventListener('click', drawFrameOutline);
if (el.frameCenter) el.frameCenter.addEventListener('click', moveToFrameCenter);
if (el.framePassesMinus && el.framePasses) {
  el.framePassesMinus.addEventListener('click', () => {
    const v = Math.max(1, (Number(el.framePasses.value) || 1) - 1);
    el.framePasses.value = String(v);
  });
}
if (el.framePassesPlus && el.framePasses) {
  el.framePassesPlus.addEventListener('click', () => {
    const v = Math.min(99, (Number(el.framePasses.value) || 1) + 1);
    el.framePasses.value = String(v);
  });
}

if (el.frameSpeed && el.frameSpeedValue) {
  const updateSpeedLabel = () => {
    el.frameSpeedValue.textContent = `${el.frameSpeed.value} mm/min`;
  };
  el.frameSpeed.addEventListener('input', updateSpeedLabel);
  updateSpeedLabel();
}

if (el.framePower && el.framePowerValue) {
  const updatePowerLabel = () => {
    el.framePowerValue.textContent = `${el.framePower.value} %`;
  };
  el.framePower.addEventListener('input', updatePowerLabel);
  updatePowerLabel();
}
if (el.frameStart)
  el.frameStart.addEventListener('click', () => {
    if (el.framePower && el.imgSmax) {
      const pct = Math.max(0, Math.min(100, Number(el.framePower.value) || 0));
      el.imgSmax.value = String(Math.round(pct * 10));
    }
    if (el.frameSpeed && el.imgSpeed) {
      el.imgSpeed.value = String(el.frameSpeed.value);
    }
    if (el.framePasses && el.imgPasses) {
      el.imgPasses.value = String(el.framePasses.value);
    }
    if (el.frameStatus) el.frameStatus.textContent = t('frame.generating');
    autoStartAfterGenerate = true;
    generateGcode(true);
  });

// Assistente / guia iniciante (o antigo modo Básico/Avançado).
function applyMode(mode, { resetWizard = true } = {}) {
  const basic = mode === 'basic';
  document.body.classList.toggle('basic', basic);
  if (el.modeBtn) {
    el.modeBtn.textContent = basic ? t('assistant.close') : t('assistant.open');
    el.modeBtn.classList.toggle('active', basic);
    el.modeBtn.setAttribute('aria-pressed', String(basic));
  }
  if (basic) {
    if (resetWizard) wizardStep = 1;
    updateWizard();
  }
}

if (el.modeBtn) {
  el.modeBtn.addEventListener('click', () => {
    const next = document.body.classList.contains('basic')
      ? 'advanced'
      : 'basic';
    applyMode(next);
    persistPrefs({ mode: next });
  });
}

// Guia rápido do assistente (o antigo modo Básico).
function switchTab(name) {
  document.querySelectorAll('.sidebar-tabs .tab').forEach((t) => {
    t.classList.remove('active');
  });
  const tab = document.querySelector(`.sidebar-tabs .tab[data-tab="${name}"]`);
  if (tab) tab.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.panel !== name);
  });
}

if (el.guideConnect)
  el.guideConnect.addEventListener('click', async () => {
    switchTab('machine');
    if (el.refreshPorts) await refreshPorts();
    if (!el.portList?.value) {
      appendLine(t('err.noSerialPort'), 'error');
      return;
    }
    if (el.connectBtn) el.connectBtn.click();
  });
if (el.guideImage)
  el.guideImage.addEventListener('click', () => {
    switchTab('image');
    if (!imageState.loaded && el.imageOpen) el.imageOpen.click();
  });
if (el.guideGenerate)
  el.guideGenerate.addEventListener('click', () => {
    switchTab('image');
    if (el.imgGenerate && !el.imgGenerate.disabled) el.imgGenerate.click();
  });
if (el.guideFrame)
  el.guideFrame.addEventListener('click', () => {
    if (window.frameBounds) openFrameModal();
  });
if (el.guideRecord)
  el.guideRecord.addEventListener('click', () => {
    if (el.frameOverlay && !el.frameOverlay.classList.contains('hidden')) {
      if (el.frameStart) el.frameStart.click();
    } else if (state.connected && state.lines.length) {
      beginJob(0);
    }
  });

if (el.guideClose)
  el.guideClose.addEventListener('click', () => {
    applyMode('advanced');
    persistPrefs({ mode: 'advanced' });
  });

// Guia básico: tamanho sincroniza com a imagem.
if (el.guideWidth && el.imgWidth) {
  el.guideWidth.addEventListener('input', () => {
    el.imgWidth.value = el.guideWidth.value;
    applySizeFromAspect('w');
    el.guideHeight.value = el.imgHeight.value;
  });
}
if (el.guideHeight && el.imgHeight) {
  el.guideHeight.addEventListener('input', () => {
    el.imgHeight.value = el.guideHeight.value;
    applySizeFromAspect('h');
    el.guideWidth.value = el.imgWidth.value;
  });
}

// Tipo de gravação.
function setGuideType(algo) {
  if (el.imgAlgorithm) {
    el.imgAlgorithm.value = algo;
    updateAlgorithmVisibility();
  }
  if (el.guideTypePhoto)
    el.guideTypePhoto.classList.toggle('primary', algo === 'line');
  if (el.guideTypeBW)
    el.guideTypeBW.classList.toggle('primary', algo === 'dither');
  if (el.guideTypeVector)
    el.guideTypeVector.classList.toggle('primary', algo === 'vector');
}
if (el.guideTypePhoto)
  el.guideTypePhoto.addEventListener('click', () => setGuideType('line'));
if (el.guideTypeBW)
  el.guideTypeBW.addEventListener('click', () => setGuideType('dither'));
if (el.guideTypeVector)
  el.guideTypeVector.addEventListener('click', () => setGuideType('vector'));
setGuideType('line');

// Material no guia.
function populateGuideMaterials() {
  if (!materials || !el.guideMaterial) return;
  const module = el.profileModule ? el.profileModule.value : '3W';
  const list = materials.profilesFor(module, 'engrave');
  const previous = el.guideMaterial.value;
  el.guideMaterial.replaceChildren();
  for (const profile of list) {
    const opt = document.createElement('option');
    opt.value = profile.material;
    opt.textContent = materialName(profile.material);
    el.guideMaterial.appendChild(opt);
  }
  // Preserva a escolha (ex.: troca de idioma); senão, primeiro da lista.
  if (previous && list.some((p) => p.material === previous)) {
    el.guideMaterial.value = previous;
  } else if (list.length) {
    el.guideMaterial.value = list[0].material;
  }
}
if (materials) {
  populateGuideMaterials();
  if (el.profileModule)
    el.profileModule.addEventListener('change', populateGuideMaterials);
}
if (el.guideMaterial) {
  el.guideMaterial.addEventListener('change', () => {
    const module = el.profileModule ? el.profileModule.value : '3W';
    const profile = materials.findProfile(
      module,
      'engrave',
      el.guideMaterial.value,
    );
    if (!profile) return;
    const sMax = materials.powerPercentToS(profile.powerPercent);
    if (el.imgSpeed) el.imgSpeed.value = String(profile.speedMmMin);
    if (el.imgSmax) el.imgSmax.value = String(sMax);
    if (el.imgPasses) el.imgPasses.value = '1';
    if (el.frameSpeed) el.frameSpeed.value = String(profile.speedMmMin);
    if (el.framePower)
      el.framePower.value = String(Math.round(profile.powerPercent));
    if (el.frameSpeedValue)
      el.frameSpeedValue.textContent = `${profile.speedMmMin} mm/min`;
    if (el.framePowerValue)
      el.framePowerValue.textContent = `${Math.round(profile.powerPercent)} %`;
  });
}

if (el.wizardNext) {
  el.wizardNext.addEventListener('click', () => {
    if (wizardStep < 6) {
      wizardStep += 1;
      updateWizard();
    } else {
      // Concluir: fecha o assistente e volta aos controles completos.
      applyMode('advanced', { resetWizard: false });
      persistPrefs({ mode: 'advanced' });
    }
  });
}
if (el.wizardBack) {
  el.wizardBack.addEventListener('click', () => {
    if (wizardStep > 1) {
      wizardStep -= 1;
      updateWizard();
    }
  });
}

// -------------------------------------------------------------------- init

async function init() {
  // Preferências (tema/unidade/porta/baud) — RF-CFG-5, RF-CON-3.
  await loadPrefs();
  // Identidade do app (versão/autor/licença) — RF-APP-6/7.
  try {
    applyAppInfo(await window.grbl.getAppInfo());
  } catch (err) {
    console.warn(t('err.prefix', { msg: err.message }), err);
    applyAppInfo();
  }
  I18N.applyDom();
  document.documentElement.lang = I18N.getLocale();
  refreshTexts();
  updateWorkflow();
  updateWizard();

  // Macros (RF-MAC-1): preferências ou conjunto padrão.
  state.macros =
    state.prefs.macros ??
    (window.GRBL_MACROS ? [...window.GRBL_MACROS.DEFAULT_MACROS] : []);
  renderMacroButtons();
  renderMacroEditor();

  // Travamento de proporção: o usuário decide uma vez e a escolha permanece.
  try {
    const savedLock = localStorage.getItem(ASPECT_LOCK_KEY);
    if (savedLock !== null) el.imgKeepAspect.checked = savedLock === '1';
  } catch {
    /* ignora */
  }
  updateSizeHint();

  setConnection('disconnected');
  await refreshPorts();
  applyPortPrefs();
  maybeAutoConnect();
}

init();
