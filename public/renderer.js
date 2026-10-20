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

// Bundles carregados sob demanda (RNF-11): tabelas de QR/Data Matrix e de
// código de barras só são necessárias quando o modal é aberto. Ficam fora do
// caminho do primeiro paint; o modal espera o carregamento (instantâneo em
// `file://`, e já pré-aquecido em segundo plano — ver `prefetchBundles`).
const bundleLoads = new Map();
function loadBundle(file) {
  if (!bundleLoads.has(file)) {
    bundleLoads.set(
      file,
      new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = `./${file}`;
        tag.onload = () => resolve();
        tag.onerror = () => reject(new Error(`falha ao carregar ${file}`));
        document.head.appendChild(tag);
      }),
    );
  }
  return bundleLoads.get(file);
}

/** `loadBundle` com falha reportada no console (não derruba o modal). */
function requireBundle(file) {
  return loadBundle(file).catch((err) => {
    appendLine(t('err.prefix', { msg: err.message }), 'error');
  });
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
  pinChip: $('pinChip'),
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
  lgWork: $('lgWork'),
  lgWorkSwatch: $('lgWorkSwatch'),
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
  machineOverlay: $('machineOverlay'),
  machineClose: $('machineClose'),
  machineRefresh: $('machineRefresh'),
  machineCopy: $('machineCopy'),
  machineStatus: $('machineStatus'),
  machineGrid: $('machineGrid'),
  machineReport: $('machineReport'),
  preflightOverlay: $('preflightOverlay'),
  preflightClose: $('preflightClose'),
  preflightIntro: $('preflightIntro'),
  preflightList: $('preflightList'),
  preflightCancel: $('preflightCancel'),
  preflightGo: $('preflightGo'),
  preflightChip: $('preflightChip'),
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
  frameConnect: $('frameConnect'),
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
  qrOverlay: $('qrOverlay'),
  qrTitle: $('qrTitle'),
  qrClose: $('qrClose'),
  qrContent: $('qrContent'),
  qrSymbology: $('qrSymbology'),
  qrEccField: $('qrEccField'),
  qrEcc: $('qrEcc'),
  qrVersionField: $('qrVersionField'),
  qrVersion: $('qrVersion'),
  qrQuietField: $('qrQuietField'),
  qrSizeField: $('qrSizeField'),
  dmSizeField: $('dmSizeField'),
  dmSize: $('dmSize'),
  qrPdfEccField: $('qrPdfEccField'),
  qrPdfEcc: $('qrPdfEcc'),
  qrPdfColsField: $('qrPdfColsField'),
  qrPdfCols: $('qrPdfCols'),
  qrPdfRowHeightField: $('qrPdfRowHeightField'),
  qrPdfRowHeight: $('qrPdfRowHeight'),
  qrAztecEccField: $('qrAztecEccField'),
  qrAztecEcc: $('qrAztecEcc'),
  qrWidth: $('qrWidth'),
  qrHeight: $('qrHeight'),
  qrKeepAspect: $('qrKeepAspect'),
  qrModule: $('qrModule'),
  qrQuiet: $('qrQuiet'),
  qrLines: $('qrLines'),
  qrPower: $('qrPower'),
  qrFeed: $('qrFeed'),
  qrPasses: $('qrPasses'),
  qrMode: $('qrMode'),
  qrOverscan: $('qrOverscan'),
  qrInvert: $('qrInvert'),
  qrGrid: $('qrGrid'),
  qrGridColsField: $('qrGridColsField'),
  qrGridCols: $('qrGridCols'),
  qrGridGapField: $('qrGridGapField'),
  qrGridGap: $('qrGridGap'),
  qrStatus: $('qrStatus'),
  qrSave: $('qrSave'),
  qrGenerate: $('qrGenerate'),
  barcodeOverlay: $('barcodeOverlay'),
  barClose: $('barClose'),
  barSymbology: $('barSymbology'),
  barSymHint: $('barSymHint'),
  barContent: $('barContent'),
  barRatioField: $('barRatioField'),
  barRatio: $('barRatio'),
  barChecksumField: $('barChecksumField'),
  barChecksum: $('barChecksum'),
  barWidth: $('barWidth'),
  barXDim: $('barXDim'),
  barHeight: $('barHeight'),
  barQuiet: $('barQuiet'),
  barLines: $('barLines'),
  barHri: $('barHri'),
  barPower: $('barPower'),
  barFeed: $('barFeed'),
  barPasses: $('barPasses'),
  barMode: $('barMode'),
  barOverscan: $('barOverscan'),
  barInvert: $('barInvert'),
  barGrid: $('barGrid'),
  barGridColsField: $('barGridColsField'),
  barGridCols: $('barGridCols'),
  barGridGapField: $('barGridGapField'),
  barGridGap: $('barGridGap'),
  barStatus: $('barStatus'),
  tourOverlay: $('tourOverlay'),
  tourClose: $('tourClose'),
  tourSlides: $('tourSlides'),
  tourDots: $('tourDots'),
  tourStepLabel: $('tourStepLabel'),
  tourDontShow: $('tourDontShow'),
  tourSkip: $('tourSkip'),
  tourBack: $('tourBack'),
  tourNext: $('tourNext'),
  barSave: $('barSave'),
  barGenerate: $('barGenerate'),
  designOverlay: $('designOverlay'),
  designSizeOverlay: $('designSizeOverlay'),
  designArrayOverlay: $('designArrayOverlay'),
  designOffsetOverlay: $('designOffsetOverlay'),
  designBoolMenu: $('designBoolMenu'),
  designBoolPop: $('designBoolPop'),
  designClose: $('designClose'),
  designMaximize: $('designMaximize'),
  designCanvas: $('designCanvas'),
  designToolSelect: $('designToolSelect'),
  designToolRect: $('designToolRect'),
  designToolCircle: $('designToolCircle'),
  designToolLine: $('designToolLine'),
  designToolPen: $('designToolPen'),
  designToolNode: $('designToolNode'),
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
  /**
   * De onde veio o job carregado: `image` (conversão da imagem), `design`
   * (ferramenta de desenho), `file` (arquivo/SVG/teste de material). O modal de
   * posicionamento usa isso para saber se “Gravar” precisa regerar o G-code da
   * imagem ou apenas iniciar o programa já carregado.
   */
  jobSource: 'file',
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
  updateFrameConnectButton();
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
    ((previewProgram?.program?.cutBounds ?? previewProgram?.program?.bounds)
      ? {
          ...(previewProgram.program.cutBounds ??
            previewProgram.program.bounds),
        }
      : null);
  if (!el.frameOverlay) return;
  el.frameOverlay.classList.remove('hidden');
  // Sincroniza potência/velocidade/passadas com a origem do job: no fluxo de
  // imagem vêm dos campos da conversão; no desenho, dos campos da prancheta.
  if (state.jobSource === 'design') {
    const dSpeed = $('designSpeed');
    const dPower = $('designPower');
    const dPasses = $('designPasses');
    if (el.frameSpeed && dSpeed) el.frameSpeed.value = dSpeed.value;
    if (el.framePower && dPower) {
      el.framePower.value = String(
        Math.max(0, Math.min(100, Number(dPower.value) || 0)),
      );
    }
    if (el.framePasses && dPasses) el.framePasses.value = dPasses.value;
  } else {
    if (el.frameSpeed && el.imgSpeed) el.frameSpeed.value = el.imgSpeed.value;
    if (el.framePower && el.imgSmax) {
      const pct = Math.round(
        ((Number(el.imgSmax.value) || 0) / machineSMax()) * 100,
      );
      el.framePower.value = String(Math.max(0, Math.min(100, pct)));
    }
  }
  if (el.frameSpeedValue && el.frameSpeed)
    el.frameSpeedValue.textContent = `${el.frameSpeed.value} mm/min`;
  if (el.framePowerValue && el.framePower)
    el.framePowerValue.textContent = `${el.framePower.value} %`;
  // "Conectar" no próprio modal: quem esqueceu de conectar não precisa fechar
  // o desenho e começar tudo de novo.
  updateFrameConnectButton();
  updateFrameButtons();
}

/**
 * Habilita o que move/enquadra só com a máquina conectada, **sem job** e fora
 * de alarme: contorno/centro/origem enviam G-code, que ficaria na fila no meio
 * do corte (RF-STA-5).
 */
async function openSvgImport() {
  await ensureDesign();
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
    appendLine(
      t('file.loaded', { name: file.name, lines: gcode.split('\n').length }),
      'ok',
    );
    try {
      const path = await window.grbl.saveGcode(
        gcode,
        file.name.replace(/\.svg$/i, '.gcode'),
      );
      if (path) appendLine(t('file.saved', { path }), 'ok');
    } catch (err) {
      appendLine(t('err.prefix', { msg: err.message }), 'error');
    }
  } catch (err) {
    appendLine(t('err.prefix', { msg: err.message }), 'error');
  }
}

/**
 * Importa DXF ASCII (P2.4): converte os contornos em G-code e carrega na
 * Execução, como o SVG. O bundle `dxf.js` carrega sob demanda e já leva o
 * emissor de G-code junto (não depende do editor vetorial).
 */
async function openDxfImport() {
  await requireBundle('dxf.js');
  if (!window.GRBL_DXF) {
    appendLine(t('dxf.moduleMissing'), 'error');
    return;
  }
  try {
    const file = await window.grbl.openDxf();
    if (!file) return;
    let doc;
    try {
      doc = window.GRBL_DXF.parseDxf(file.text);
    } catch (err) {
      if (err && err.code === 'binary') {
        appendLine(t('dxf.binary'), 'error');
        return;
      }
      throw err;
    }
    if (doc.contours.length === 0) {
      appendLine(t('dxf.empty'), 'error');
      return;
    }
    const gcode = window.GRBL_DXF.dxfToGcode(doc, {
      feed: Number(el.imgSpeed ? el.imgSpeed.value : 1000) || 1000,
      travelFeed: 3000,
      scale: 1,
      flipY: false,
    });
    applyJobLines(file.name.replace(/\.dxf$/i, '.gcode'), gcode);
    appendLine(
      t('dxf.loaded', {
        contours: doc.contours.length,
        width: doc.width.toFixed(1),
        height: doc.height.toFixed(1),
        unit: doc.unit,
      }),
      'ok',
    );
    if (doc.hidden > 0) {
      appendLine(t('dxf.hidden', { n: doc.hidden }), 'warn');
    }
    const unsupported = Object.keys(doc.unsupported);
    if (unsupported.length) {
      const n = unsupported.reduce(
        (sum, type) => sum + doc.unsupported[type],
        0,
      );
      appendLine(
        t('dxf.ignored', { n, types: unsupported.join(', ') }),
        'warn',
      );
    }
    try {
      const path = await window.grbl.saveGcode(
        gcode,
        file.name.replace(/\.dxf$/i, '.gcode'),
      );
      if (path) appendLine(t('file.saved', { path }), 'ok');
    } catch (err) {
      appendLine(t('err.prefix', { msg: err.message }), 'error');
    }
  } catch (err) {
    appendLine(t('err.prefix', { msg: err.message }), 'error');
  }
}

/**
 * Importa PDF vetorial (P2.4/RF-DSN-15). O parse roda no main (precisa de
 * `zlib`); aqui só aplicamos o G-code e relatamos o que ficou de fora.
 */
async function openPdfImport() {
  if (!window.grbl.openPdf) {
    appendLine(t('pdf.moduleMissing'), 'error');
    return;
  }
  try {
    const res = await window.grbl.openPdf({
      feed: Number(el.imgSpeed ? el.imgSpeed.value : 1000) || 1000,
      travelFeed: 3000,
    });
    if (!res) return;
    if (res.error) {
      appendLine(
        t(res.error === 'encrypted' ? 'pdf.encrypted' : 'pdf.damaged'),
        'error',
      );
      return;
    }
    if (res.contours === 0) {
      appendLine(t('pdf.empty'), 'error');
      if (res.textSkipped) appendLine(t('pdf.text'), 'warn');
      return;
    }
    applyJobLines(res.name.replace(/\.pdf$/i, '.gcode'), res.gcode);
    appendLine(
      t('pdf.loaded', {
        contours: res.contours,
        width: res.width.toFixed(1),
        height: res.height.toFixed(1),
        pages: res.pages,
      }),
      'ok',
    );
    if (res.pages > 1) appendLine(t('pdf.pages', { pages: res.pages }), 'warn');
    if (res.textSkipped) appendLine(t('pdf.text'), 'warn');
    if (res.imagesSkipped > 0) {
      appendLine(t('pdf.images', { n: res.imagesSkipped }), 'warn');
    }
    const unsupported = Object.keys(res.unsupported);
    if (unsupported.length) {
      appendLine(
        t('pdf.unsupported', { types: unsupported.join(', ') }),
        'warn',
      );
    }
    try {
      const path = await window.grbl.saveGcode(
        res.gcode,
        res.name.replace(/\.pdf$/i, '.gcode'),
      );
      if (path) appendLine(t('file.saved', { path }), 'ok');
    } catch (err) {
      appendLine(t('err.prefix', { msg: err.message }), 'error');
    }
  } catch (err) {
    appendLine(t('err.prefix', { msg: err.message }), 'error');
  }
}
//
// Editor vetorial estilo CorelDRAW. A geometria pura vive em
// `src/shared/designEditor.ts` (bounds, grupos, hit-test, z-order, RDP) e a
// geração de G-code em `src/shared/design.ts`. Aqui fica **só a interação**
// (canvas, ponteiro, teclado) — nunca protocolo GRBL.

// O editor vetorial (~65 KB em 8 bundles) só é necessário ao abrir o Desenho
// ou importar SVG: carrega sob demanda, fora do caminho do primeiro paint
// (RNF-11). `DE`/`BOOL`/`OFFSET` são preenchidos por `ensureDesign()`.
let DE = null;
let BOOL = null;
let OFFSET = null;

const DESIGN_BUNDLES = [
  'svg.js',
  'design.js',
  'designEditor.js',
  'fonts.js',
  'hatch.js',
  'contour.js',
  'boolean.js',
  'offset.js',
];

let designReady = null;
function ensureDesign() {
  if (!designReady) {
    designReady = Promise.all(DESIGN_BUNDLES.map(requireBundle)).then(() => {
      DE = window.GRBL_DESIGN_EDITOR;
      BOOL = window.GRBL_BOOLEAN;
      OFFSET = window.GRBL_OFFSET;
    });
  }
  return designReady;
}
const RULER = 22; // espessura das réguas (px)
const D_MARGIN = 18; // margem do "ajustar à página" (px)
// Espessura do traço: relação px ↔ mm do campo de propriedades do objeto
// (4 px/mm ≈ 100 dpi — perto de como o traço aparece na tela em zoom normal).
const D_PX_MM = 0.25;
const HANDLE = 3.5; // meia-aresta do handle (px)
const HIT_PX = 3; // tolerância de clique (px)
const SNAP_PX = 8; // tolerância do snap a objetos (px)

const designState = {
  tool: 'select',
  shapes: [],
  selection: [],
  drawing: null,
  freehandPoints: [],
  nodeEdit: null,
  history: [],
  historyIdx: -1,
  view: { scale: 4, tx: 40, ty: 40 },
  page: { w: 150, h: 130 },
  grid: 5,
  snap: true,
  lockAspect: false,
  dpr: 1,
  pxW: 900,
  pxH: 600,
  cursor: { x: 0, y: 0, inside: false },
  marquee: null,
  drag: null,
  space: false,
  rotApplied: 0,
  textEdit: null,
  clipboard: null,
  seq: 0,
  /** Camadas/operações na ordem de execução (`Shape.layer` → `id`). */
  layers: [],
  /** Id da camada que recebe formas novas e cujos parâmetros são editados. */
  activeLayer: null,
  /** Id da camada sendo arrastada na lista (drag & drop). */
  dragLayer: null,
  /** Contador de ids de camada (`l1`, `l2`, …). */
  layerSeq: 1,
  /** Linhas de guia do snap a objetos em mm (`{x, y}`, `null` = sem guia). */
  guides: null,
};

// -------------------------------------------------------------- utilidades

function dNum(id, fallback) {
  const node = $(id);
  const v = node ? Number(node.value) : NaN;
  return Number.isFinite(v) ? v : fallback;
}

function dClamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function dSnapV(v) {
  if (!designState.snap) return v;
  const g = designState.grid > 0 ? designState.grid : 1;
  return Math.round(v / g) * g;
}

/**
 * Alvos de snap a objetos (mm): bordas e centro de cada entidade + bordas e
 * centro da página. Calculado **uma vez** no início do arrasto (RNF-11), pois
 * não muda enquanto o ponteiro se move.
 */
function dSnapTargets(skip) {
  const xs = [0, designState.page.w / 2, designState.page.w];
  const ys = [0, designState.page.h / 2, designState.page.h];
  for (const entity of DE.entityIndices(designState.shapes)) {
    let excluded = false;
    for (const i of entity) {
      if (skip.has(i)) {
        excluded = true;
        break;
      }
    }
    if (excluded) continue;
    const b = DE.entityBounds(designState.shapes, entity);
    if (!b) continue;
    xs.push(b.minX, (b.minX + b.maxX) / 2, b.maxX);
    ys.push(b.minY, (b.minY + b.maxY) / 2, b.maxY);
  }
  return { xs, ys };
}

/**
 * Delta do arrasto com snap: encaixa bordas/centro da caixa em outros objetos
 * e na página (tol. de `SNAP_PX` na tela); sem alvo por perto, cai na grade.
 * Devolve também as guias ativas, para desenhar a linha de alinhamento.
 */
function dSnapMoveDelta(b, dxRaw, dyRaw, targets) {
  const x = dSnapAxis(b.minX, b.maxX, dxRaw, targets.xs);
  const y = dSnapAxis(b.minY, b.maxY, dyRaw, targets.ys);
  return {
    dx: x.delta !== null ? x.delta : dSnapV(b.minX + dxRaw) - b.minX,
    dy: y.delta !== null ? y.delta : dSnapV(b.minY + dyRaw) - b.minY,
    guides: { x: x.line, y: y.line },
  };
}

/** Melhor encaixe de uma borda/centro (`min`..`max`) em uma lista de alvos. */
function dSnapAxis(min, max, raw, list) {
  const tol = SNAP_PX / Math.max(0.05, designState.view.scale);
  let delta = null;
  let line = null;
  let best = tol;
  for (const edge of [min, (min + max) / 2, max]) {
    for (const target of list) {
      const cand = target - edge;
      const dist = Math.abs(cand - raw);
      if (dist < best) {
        best = dist;
        delta = cand;
        line = target;
      }
    }
  }
  return { delta, line };
}

function dStatus(msg, kind) {
  const node = $('designStatus');
  if (!node) return;
  node.textContent = msg || '';
  node.classList.toggle('error', kind === 'error');
  node.classList.toggle('ok', kind === 'ok');
}

// -------------------------------------------------------- coordenadas visão

function dW2S(x, y) {
  const v = designState.view;
  return { x: x * v.scale + v.tx, y: y * v.scale + v.ty };
}

function dS2W(x, y) {
  const v = designState.view;
  return { x: (x - v.tx) / v.scale, y: (y - v.ty) / v.scale };
}

function dResizeCanvas() {
  const c = el.designCanvas;
  if (!c) return;
  const rect = c.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;
  const dpr = dClamp(window.devicePixelRatio || 1, 1, 2);
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  designState.pxW = w;
  designState.pxH = h;
  designState.dpr = dpr;
}

function dFitPage() {
  dResizeCanvas();
  const { pxW, pxH, page } = designState;
  const availW = Math.max(40, pxW - RULER - D_MARGIN * 2);
  const availH = Math.max(40, pxH - RULER - D_MARGIN * 2);
  const scale = dClamp(Math.min(availW / page.w, availH / page.h), 0.2, 40);
  designState.view.scale = scale;
  designState.view.tx = RULER + D_MARGIN + (availW - page.w * scale) / 2;
  designState.view.ty = RULER + D_MARGIN + (availH - page.h * scale) / 2;
}

function dZoomAt(sx, sy, factor) {
  const before = dS2W(sx, sy);
  designState.view.scale = dClamp(designState.view.scale * factor, 0.1, 60);
  const after = dW2S(before.x, before.y);
  designState.view.tx += sx - after.x;
  designState.view.ty += sy - after.y;
  dUpdateZoom();
  dRender();
}

function dUpdateZoom() {
  // `scale` é px por mm; 100 % = D_PX_MM px/mm (4 px/mm) — o mesmo valor que o
  // botão “100 %” e a tecla `0` restauram. Sem isso o rótulo sairia 4× maior.
  const label = `${Math.round(designState.view.scale * D_PX_MM * 100)}%`;
  const zl = $('designZoomLabel');
  if (zl) zl.textContent = label;
  const z100 = $('designZoom100');
  if (z100) z100.textContent = label;
}

// --------------------------------------------------------------- histórico

function dPushHistory() {
  designState.history = designState.history.slice(
    0,
    designState.historyIdx + 1,
  );
  designState.history.push(JSON.stringify(designState.shapes));
  if (designState.history.length > 80) designState.history.shift();
  designState.historyIdx = designState.history.length - 1;
  dUpdateButtons();
}

function dRestoreShapes(json) {
  designState.shapes = JSON.parse(json);
  designState.selection = [];
  designState.rotApplied = 0;
  dRender();
  dUpdateProps();
  dUpdateObjectList();
  dUpdateStatus();
  dUpdateButtons();
}

function dUndo() {
  if (designState.historyIdx <= 0) return;
  designState.historyIdx--;
  dRestoreShapes(designState.history[designState.historyIdx]);
  dStatus(t('design.status.undo'));
}

function dRedo() {
  if (designState.historyIdx >= designState.history.length - 1) return;
  designState.historyIdx++;
  dRestoreShapes(designState.history[designState.historyIdx]);
  dStatus(t('design.status.redo'));
}

// ---------------------------------------------------------------- seleção

function dSelectionSet() {
  return new Set(designState.selection);
}

function dClearSelection(paint) {
  if (!designState.selection.length) return;
  designState.selection = [];
  designState.rotApplied = 0;
  if (paint !== false) {
    dRender();
    dUpdateProps();
    dUpdateObjectList();
    dUpdateStatus();
    dUpdateButtons();
  }
}

function dAfterSelection() {
  designState.rotApplied = 0;
  dRender();
  dUpdateProps();
  dUpdateObjectList();
  dUpdateStatus();
  dUpdateButtons();
}

function dSelectShape(index, additive) {
  if (index < 0) {
    if (!additive) dClearSelection();
    return;
  }
  const idxs = DE.expandSelection(designState.shapes, index);
  if (additive) {
    const set = dSelectionSet();
    const allIn = idxs.every((i) => set.has(i));
    for (const i of idxs) {
      if (allIn) set.delete(i);
      else set.add(i);
    }
    designState.selection = [...set].sort((a, b) => a - b);
  } else {
    designState.selection = idxs.slice();
  }
  dAfterSelection();
}

function dSelectAll() {
  if (!designState.shapes.length) return;
  const set = new Set();
  for (let i = 0; i < designState.shapes.length; i++) set.add(i);
  designState.selection = [...set];
  dAfterSelection();
}

// -------------------------------------------------------------- geometria UI

function dSelectionBounds() {
  return DE
    ? DE.selectionBounds(designState.shapes, designState.selection)
    : null;
}

function dHandleScreenPoints(b) {
  const midX = (b.minX + b.maxX) / 2;
  const midY = (b.minY + b.maxY) / 2;
  return [
    dW2S(b.minX, b.minY),
    dW2S(midX, b.minY),
    dW2S(b.maxX, b.minY),
    dW2S(b.maxX, midY),
    dW2S(b.maxX, b.maxY),
    dW2S(midX, b.maxY),
    dW2S(b.minX, b.maxY),
    dW2S(b.minX, midY),
  ];
}

function dHandleIndexAt(b, sx, sy) {
  const pts = dHandleScreenPoints(b);
  for (let i = 0; i < pts.length; i++) {
    if (
      Math.abs(pts[i].x - sx) <= HANDLE + 2 &&
      Math.abs(pts[i].y - sy) <= HANDLE + 2
    )
      return i;
  }
  return -1;
}

function dRotateHandleAt(b, sx, sy) {
  const top = dW2S((b.minX + b.maxX) / 2, b.minY);
  const rp = { x: top.x, y: top.y - 26 };
  return Math.hypot(sx - rp.x, sy - rp.y) <= 9;
}

function dSnapshotSelection() {
  const idxs = designState.selection.slice();
  return {
    idxs,
    pts: idxs.map((i) =>
      designState.shapes[i].points.map((p) => ({ x: p.x, y: p.y })),
    ),
    bbox: dSelectionBounds(),
  };
}

function dApplyOrig(orig, fn) {
  for (let k = 0; k < orig.idxs.length; k++) {
    const sh = designState.shapes[orig.idxs[k]];
    if (!sh) continue;
    const src = orig.pts[k];
    for (let i = 0; i < sh.points.length; i++) fn(sh.points[i], src[i], i);
  }
}

// -------------------------------------------------------------- operações

function dNextName(kind) {
  const label = t(`design.kind.${kind === 'circle' ? 'ellipse' : kind}`);
  let n = 0;
  for (const sh of designState.shapes) {
    if (sh.name?.startsWith(label)) n++;
  }
  return `${label} ${n + 1}`;
}

function dAddShape(shape) {
  // Formas novas nascem na camada ativa (a primeira, por padrão).
  if (!shape.layer && designState.activeLayer) {
    shape.layer = designState.activeLayer;
  }
  designState.shapes.push(shape);
  dPushHistory();
  designState.selection = designState.shapes
    .map((_, i) => i)
    .filter((i) => {
      const g = shape.group;
      return g
        ? designState.shapes[i].group === g
        : i === designState.shapes.length - 1;
    });
  dAfterSelection();
}

function dDeleteSelection() {
  if (!designState.selection.length) return;
  const set = dSelectionSet();
  designState.shapes = designState.shapes.filter((_, i) => !set.has(i));
  designState.selection = [];
  designState.rotApplied = 0;
  dPushHistory();
  dRender();
  dUpdateProps();
  dUpdateObjectList();
  dUpdateStatus();
  dUpdateButtons();
}

function dClearAll() {
  if (!designState.shapes.length) return;
  designState.shapes = [];
  designState.selection = [];
  designState.rotApplied = 0;
  dPushHistory();
  dRender();
  dUpdateProps();
  dUpdateObjectList();
  dUpdateStatus();
  dUpdateButtons();
}

function dDuplicateSelection() {
  if (!designState.selection.length) return;
  const off = designState.grid > 0 ? designState.grid * 2 : 4;
  const map = new Map();
  const clones = [];
  const newIdx = [];
  for (const i of designState.selection) {
    const src = designState.shapes[i];
    const clone = JSON.parse(JSON.stringify(src));
    clone.points = clone.points.map((p) => ({ x: p.x + off, y: p.y + off }));
    if (clone.group) {
      if (!map.has(clone.group)) map.set(clone.group, `g${designState.seq++}`);
      clone.group = map.get(clone.group);
    }
    clones.push(clone);
  }
  const base = designState.shapes.length;
  designState.shapes.push(...clones);
  for (let i = 0; i < clones.length; i++) newIdx.push(base + i);
  dPushHistory();
  designState.selection = newIdx;
  dAfterSelection();
}

function dCopySelection() {
  if (!designState.selection.length) return;
  designState.clipboard = designState.selection.map((i) =>
    JSON.parse(JSON.stringify(designState.shapes[i])),
  );
  dStatus(t('design.status.copied', { n: designState.clipboard.length }), 'ok');
}

function dPasteClipboard() {
  if (!designState.clipboard?.length) return;
  const off = designState.grid > 0 ? designState.grid * 2 : 4;
  const map = new Map();
  const clones = designState.clipboard.map((src) => {
    const clone = JSON.parse(JSON.stringify(src));
    clone.points = clone.points.map((p) => ({ x: p.x + off, y: p.y + off }));
    if (clone.group) {
      if (!map.has(clone.group)) map.set(clone.group, `g${designState.seq++}`);
      clone.group = map.get(clone.group);
    }
    return clone;
  });
  const base = designState.shapes.length;
  designState.shapes.push(...clones);
  dPushHistory();
  designState.selection = clones.map((_, i) => base + i);
  dAfterSelection();
}

function dGroupSelection() {
  if (designState.selection.length < 2) return;
  const g = `g${designState.seq++}`;
  for (const i of designState.selection) designState.shapes[i].group = g;
  dPushHistory();
  dAfterSelection();
  dStatus(t('design.status.grouped'), 'ok');
}

function dUngroupSelection() {
  let changed = false;
  for (const i of designState.selection) {
    if (designState.shapes[i].group) {
      delete designState.shapes[i].group;
      changed = true;
    }
  }
  if (!changed) return;
  dPushHistory();
  dAfterSelection();
  dStatus(t('design.status.ungrouped'), 'ok');
}

function dReorder(mode) {
  if (!designState.selection.length) return;
  designState.shapes = DE.reorderEntities(
    designState.shapes,
    dSelectionSet(),
    mode,
  );
  dPushHistory();
  dAfterSelection();
}

function dAlign(mode) {
  const b = dSelectionBounds();
  if (!b) return;
  const { w, h } = designState.page;
  let dx = 0;
  let dy = 0;
  if (mode === 'left') dx = -b.minX;
  else if (mode === 'center') dx = w / 2 - (b.minX + b.maxX) / 2;
  else if (mode === 'right') dx = w - b.maxX;
  else if (mode === 'top') dy = -b.minY;
  else if (mode === 'middle') dy = h / 2 - (b.minY + b.maxY) / 2;
  else if (mode === 'bottom') dy = h - b.maxY;
  dTranslate(dx, dy);
}

function dTranslate(dx, dy) {
  if (!designState.selection.length || (dx === 0 && dy === 0)) return;
  for (const i of designState.selection) {
    for (const p of designState.shapes[i].points) {
      p.x += dx;
      p.y += dy;
    }
  }
  dPushHistory();
  dRender();
  dUpdateProps();
  dUpdateStatus();
}

function dNudge(dx, dy) {
  if (!designState.selection.length) return;
  dTranslate(dx, dy);
}

/** Espelha a seleção em torno do centro da própria caixa (`h` = X, `v` = Y). */
function dMirror(axis) {
  if (!designState.selection.length) return;
  designState.shapes = DE.mirrorEntities(
    designState.shapes,
    dSelectionSet(),
    axis,
  );
  dPushHistory();
  dRender();
  dUpdateProps();
  dUpdateObjectList();
  dStatus(
    t(axis === 'h' ? 'design.mirror.h.done' : 'design.mirror.v.done'),
    'ok',
  );
}

/** Distribui as entidades selecionadas com folga igual (precisa de 3+). */
function dDistribute(axis) {
  if (DE.selectedEntities(designState.shapes, dSelectionSet()).length < 3) {
    dStatus(t('design.distribute.need3'), 'error');
    return;
  }
  designState.shapes = DE.distributeEntities(
    designState.shapes,
    dSelectionSet(),
    axis,
  );
  dPushHistory();
  dAfterSelection();
  dStatus(
    t(axis === 'h' ? 'design.distribute.h.done' : 'design.distribute.v.done'),
    'ok',
  );
}

// ------------------------------------------------------ booleanas e offset

/** Contornos fechados de uma entidade (buracos entram por paridade). */
function dEntityLoops(entity) {
  const loops = [];
  for (const i of entity) {
    const sh = designState.shapes[i];
    if (sh?.closed && sh.points.length >= 3) loops.push(sh.points);
  }
  return loops;
}

/** Objetos (entidades) selecionados com contornos fechados, em ordem Z. */
function dSelectedObjects() {
  if (!DE || !designState.shapes.length) return [];
  const sel = dSelectionSet();
  const out = [];
  for (const entity of DE.entityIndices(designState.shapes)) {
    let hit = false;
    for (const i of entity) if (sel.has(i)) hit = true;
    if (!hit) continue;
    const loops = dEntityLoops(entity);
    if (loops.length) out.push({ entity, loops });
  }
  return out;
}

/** Estilo de gravação (potência/velocidade/passadas) herdado de uma forma. */
function dStyleOf(shape) {
  const style = {};
  if (!shape) return style;
  if (shape.speed !== undefined) style.speed = shape.speed;
  if (shape.power !== undefined) style.power = shape.power;
  if (shape.passes !== undefined) style.passes = shape.passes;
  if (shape.layer !== undefined) style.layer = shape.layer;
  return style;
}

/** Aninhamento de cada contorno: 0 = externo, 1 = furo, 2 = ilha… */
function dLoopDepths(loops) {
  const areas = loops.map((l) => Math.abs(BOOL.signedArea(l)));
  return loops.map((loop, i) => {
    const probe = loop[0];
    let depth = 0;
    for (let j = 0; j < loops.length; j++) {
      if (j === i || areas[j] <= areas[i]) continue;
      if (DE.pointInPolygon(loops[j], probe.x, probe.y)) depth++;
    }
    return depth;
  });
}

/** Troca os objetos de `objs` pelos contornos `loops` (estilo herdado). */
function dApplyContours(loops, objs, style, label, keepSources) {
  const groups = BOOL.groupNestedLoops(loops);
  const remove = new Set();
  if (!keepSources) {
    for (const o of objs) for (const i of o.entity) remove.add(i);
  }
  const made = [];
  let n = 0;
  for (const group of groups) {
    // Contornos aninhados (externo + furos/ilhas) andam juntos.
    const groupId = group.length > 1 ? `g${designState.seq++}` : undefined;
    for (const k of group) {
      n++;
      const sh = {
        kind: 'polygon',
        points: loops[k].map((p) => ({ x: p.x, y: p.y })),
        closed: true,
        name: `${label} ${n}`,
        ...style,
      };
      if (groupId) sh.group = groupId;
      made.push(sh);
    }
  }
  if (!made.length) return [];
  const kept = [];
  for (let i = 0; i < designState.shapes.length; i++) {
    if (!remove.has(i)) kept.push(designState.shapes[i]);
  }
  designState.shapes = kept.concat(made);
  designState.selection = made.map((_, k) => kept.length + k);
  dPushHistory();
  dAfterSelection();
  return made;
}

/** União / subtração / intersecção / exclusão dos objetos selecionados. */
function dBooleanOp(op) {
  if (!BOOL) {
    dStatus(t('design.bool.unavailable'), 'error');
    return;
  }
  const objs = dSelectedObjects();
  if (objs.length < 2) {
    dStatus(t('design.bool.need2'), 'error');
    return;
  }
  const label = t(`design.bool.${op}`);
  let loops = [];
  try {
    loops = BOOL.booleanObjects(
      objs.map((o) => o.loops),
      op,
    );
  } catch (err) {
    dStatus(t('design.bool.failed', { msg: String(err) }), 'error');
    return;
  }
  if (!loops.length) {
    dStatus(t('design.bool.empty'), 'error');
    return;
  }
  const style = dStyleOf(designState.shapes[objs[0].entity[0]]);
  const made = dApplyContours(loops, objs, style, label, false);
  if (made.length) dStatus(t('design.bool.done', { n: made.length }), 'ok');
}

function dOffsetDialogOpen() {
  const o = el.designOffsetOverlay;
  return Boolean(o && !o.classList.contains('hidden'));
}

function dOpenOffsetDialog() {
  if (!dSelectedObjects().length) {
    dStatus(t('design.offset.need1'), 'error');
    return;
  }
  const dist = $('designOffsetDist');
  const passes = $('designOffsetPasses');
  if (dist) dist.value = '1';
  if (passes) passes.value = '1';
  if (el.designOffsetOverlay) {
    el.designOffsetOverlay.classList.remove('hidden');
  }
  if (dist) {
    dist.focus();
    dist.select();
  }
}

function dCloseOffsetDialog() {
  if (el.designOffsetOverlay) el.designOffsetOverlay.classList.add('hidden');
}

/** Gera contornos paralelos (offset) das formas selecionadas. */
function dConfirmOffset() {
  if (!OFFSET || !BOOL) {
    dStatus(t('design.bool.unavailable'), 'error');
    return;
  }
  const objs = dSelectedObjects();
  if (!objs.length) {
    dStatus(t('design.offset.need1'), 'error');
    return;
  }
  const dist = dNum('designOffsetDist', 1);
  if (Math.abs(dist) < 1e-6) {
    dStatus(t('design.offset.zero'), 'error');
    return;
  }
  const passes = dClamp(Math.round(dNum('designOffsetPasses', 1)), 1, 50);
  const joinNode = $('designOffsetJoin');
  const join = joinNode ? joinNode.value : 'miter';
  const keepNode = $('designOffsetKeep');
  const keep = keepNode ? Boolean(keepNode.checked) : true;

  const loops = [];
  for (const o of objs) {
    const depths = dLoopDepths(o.loops);
    for (let k = 0; k < o.loops.length; k++) {
      // Furos andam ao contrário: num contorno crescido eles encolhem.
      const dir = depths[k] % 2 === 0 ? 1 : -1;
      for (const ring of OFFSET.offsetPasses(o.loops[k], dist * dir, passes, {
        join,
      })) {
        loops.push(ring);
      }
    }
  }
  dCloseOffsetDialog();
  if (!loops.length) {
    dStatus(t('design.offset.empty'), 'error');
    return;
  }
  const style = dStyleOf(designState.shapes[objs[0].entity[0]]);
  const made = dApplyContours(loops, objs, style, t('design.offset'), keep);
  if (made.length) dStatus(t('design.offset.done', { n: made.length }), 'ok');
}

// ------------------------------------------------------ menu de booleanas

function dBoolMenuOpen() {
  const p = el.designBoolPop;
  return Boolean(p && !p.classList.contains('hidden'));
}

function dOpenBoolMenu() {
  const p = el.designBoolPop;
  if (!p) return;
  dCloseOffsetDialog();
  p.classList.remove('hidden');
  if (el.designBoolMenu)
    el.designBoolMenu.setAttribute('aria-expanded', 'true');
}

function dCloseBoolMenu() {
  const p = el.designBoolPop;
  if (!p || p.classList.contains('hidden')) return;
  p.classList.add('hidden');
  if (el.designBoolMenu)
    el.designBoolMenu.setAttribute('aria-expanded', 'false');
}

function dToggleBoolMenu() {
  if (dBoolMenuOpen()) dCloseBoolMenu();
  else dOpenBoolMenu();
}

// ----------------------------------------------------------- matriz de cópias

function dArrayDialogOpen() {
  const o = el.designArrayOverlay;
  return Boolean(o && !o.classList.contains('hidden'));
}

/** Abre a matriz de cópias com o passo sugerido do tamanho da seleção. */
function dOpenArrayDialog() {
  if (!designState.selection.length) return;
  const b = dSelectionBounds();
  const w = b ? b.maxX - b.minX : designState.grid;
  const h = b ? b.maxY - b.minY : designState.grid;
  const cols = $('designArrayCols');
  const rows = $('designArrayRows');
  const sx = $('designArrayStepX');
  const sy = $('designArrayStepY');
  if (cols) cols.value = '2';
  if (rows) rows.value = '1';
  if (sx) sx.value = (w > 0.01 ? w : designState.grid).toFixed(1);
  if (sy) sy.value = (h > 0.01 ? h : designState.grid).toFixed(1);
  if (el.designArrayOverlay) el.designArrayOverlay.classList.remove('hidden');
  if (cols) {
    cols.focus();
    cols.select();
  }
}

function dCloseArrayDialog() {
  if (el.designArrayOverlay) el.designArrayOverlay.classList.add('hidden');
}

function dConfirmArray() {
  const cols = dClamp(Math.round(dNum('designArrayCols', 1)), 1, 200);
  const rows = dClamp(Math.round(dNum('designArrayRows', 1)), 1, 200);
  const stepX = dNum('designArrayStepX', 0);
  const stepY = dNum('designArrayStepY', 0);
  if (cols * rows <= 1) {
    dStatus(t('design.array.need2'), 'error');
    return;
  }
  if (cols * rows > 1000) {
    dStatus(t('design.array.tooMany'), 'error');
    return;
  }
  const clones = DE.arrayEntities(
    designState.shapes,
    dSelectionSet(),
    cols,
    rows,
    stepX,
    stepY,
    () => `g${designState.seq++}`,
  );
  dCloseArrayDialog();
  if (!clones.length) return;
  const base = designState.shapes.length;
  designState.shapes.push(...clones);
  dPushHistory();
  designState.selection = clones.map((_, i) => base + i);
  dAfterSelection();
  dStatus(t('design.array.done', { n: clones.length }), 'ok');
}

// -------------------------------------------------------------- propriedades

/**
 * Valor comum de uma propriedade opcional na seleção.
 * `undefined` = nada selecionado; `null` = valores misturados.
 */
function dCommonShapeProp(key) {
  const sel = designState.selection;
  if (!sel.length) return undefined;
  let value;
  for (let i = 0; i < sel.length; i++) {
    const sh = designState.shapes[sel[i]];
    const v = sh && typeof sh[key] === 'number' ? sh[key] : undefined;
    if (i === 0) value = v;
    else if (v !== value) return null;
  }
  return value;
}

/** Campos da barra de propriedades que só fazem sentido com algo selecionado. */
const D_PROP_FIELDS = [
  'designPropX',
  'designPropY',
  'designPropW',
  'designPropH',
  'designPropRot',
  'designObjPower',
  'designObjSpeed',
  'designObjPasses',
  'designObjWidth',
  'designObjWidthPx',
];

/** Liga/desliga os campos de propriedades (sem seleção, ficam inertes). */
function dSetPropsEnabled(on) {
  for (const id of D_PROP_FIELDS) {
    const node = $(id);
    if (node) node.disabled = !on;
  }
}

function dUpdateProps() {
  const px = $('designPropX');
  if (!px) return;
  const b = dSelectionBounds();
  if (!b) {
    for (const id of [
      'designPropX',
      'designPropY',
      'designPropW',
      'designPropH',
      'designPropRot',
    ]) {
      const node = $(id);
      if (node) node.value = '';
    }
    dUpdateObjStyleFields(null);
    dSetPropsEnabled(false);
    return;
  }
  dSetPropsEnabled(true);
  px.value = b.minX.toFixed(1);
  const py = $('designPropY');
  if (py) py.value = b.minY.toFixed(1);
  const pw = $('designPropW');
  if (pw) pw.value = (b.maxX - b.minX).toFixed(1);
  const ph = $('designPropH');
  if (ph) ph.value = (b.maxY - b.minY).toFixed(1);
  const pr = $('designPropRot');
  if (pr) pr.value = String(Math.round(designState.rotApplied));
  dUpdateObjStyleFields(designState.selection);
}

/**
 * Mostra a potência/velocidade do objeto selecionado. Campo vazio = usa o
 * parâmetro global, que aparece como `placeholder` (em cinza); seleções com
 * valores diferentes mostram `—`.
 */
function dUpdateObjStyleFields(selection) {
  const set = (id, key, globalId, digits = 0) => {
    const node = $(id);
    if (!node) return;
    if (!selection?.length) {
      node.value = '';
      node.placeholder = '—';
      return;
    }
    const v = dCommonShapeProp(key);
    const show = (n) =>
      digits > 0 ? String(Number(n.toFixed(digits))) : String(Math.round(n));
    node.value = typeof v === 'number' ? show(v) : '';
    if (v === null) node.placeholder = '—';
    else node.placeholder = show(dNum(globalId, 0) || 0);
  };
  set('designObjPower', 'power', 'designPower');
  set('designObjSpeed', 'speed', 'designSpeed');
  set('designObjPasses', 'passes', 'designPasses');
  // Espessura: sem global (vazio = 0, traço simples). Os dois campos (mm e px)
  // mostram a mesma medida — 1 px = 0,25 mm.
  const width = $('designObjWidth');
  const widthPx = $('designObjWidthPx');
  const v = selection?.length ? dCommonShapeProp('width') : undefined;
  const mm = typeof v === 'number' ? v : v === null ? null : 0;
  if (width) {
    width.value =
      typeof mm === 'number' && mm > 0 ? String(Number(mm.toFixed(2))) : '';
    width.placeholder = mm === null ? '—' : '0';
  }
  if (widthPx) {
    widthPx.value =
      typeof mm === 'number' && mm > 0
        ? String(Number((mm / D_PX_MM).toFixed(1)))
        : '';
    widthPx.placeholder = mm === null ? '—' : '0';
  }
}

/** Aplica potência/velocidade/espessura por objeto (vazio volta ao padrão). */
function dApplyObjStyle() {
  if (!designState.selection.length) return;
  const apply = (id, key, lo, hi) => {
    const node = $(id);
    if (!node) return;
    const raw = node.value.trim();
    if (raw === '') {
      for (const i of designState.selection) {
        const sh = designState.shapes[i];
        if (sh) sh[key] = undefined;
      }
      return;
    }
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    const v = dClamp(n, lo, hi);
    for (const i of designState.selection) {
      const sh = designState.shapes[i];
      if (sh) sh[key] = v;
    }
  };
  apply('designObjPower', 'power', 0, 100);
  apply('designObjSpeed', 'speed', 100, 20000);
  apply('designObjPasses', 'passes', 1, 99);
  apply('designObjWidth', 'width', 0, 100);
  dPushHistory();
  dRender();
  dUpdateProps();
  dUpdateObjectList();
}

/**
 * Espessura digitada em **px** (1 px = 0,25 mm): grava a mesma faixa do campo
 * em mm, só com outra unidade. Vazio = traço simples.
 */
function dApplyObjWidthPx() {
  if (!designState.selection.length) return;
  const node = $('designObjWidthPx');
  if (!node) return;
  const raw = node.value.trim();
  const px = raw === '' ? 0 : Number(raw.replace(',', '.'));
  if (!Number.isFinite(px)) return;
  const mm = dClamp(px * D_PX_MM, 0, 100);
  for (const i of designState.selection) {
    const sh = designState.shapes[i];
    if (sh) sh.width = mm > 0 ? mm : undefined;
  }
  dPushHistory();
  dRender();
  dUpdateProps();
  dUpdateObjectList();
}

/** Copia o estilo de gravação (potência/velocidade) do primeiro objeto. */
let dStyleClip = null;
function dCopyStyle() {
  const sel = designState.selection;
  if (!sel.length) {
    dStatus(t('design.style.none'), 'error');
    return;
  }
  const sh = designState.shapes[sel[0]] || {};
  const power = typeof sh.power === 'number' ? sh.power : null;
  const speed = typeof sh.speed === 'number' ? sh.speed : null;
  const passes = typeof sh.passes === 'number' ? sh.passes : null;
  const width = typeof sh.width === 'number' ? sh.width : null;
  dStyleClip = { power, speed, passes, width };
  dStatus(t('design.style.copied'));
  dUpdateButtons();
}

/** Aplica o estilo copiado a toda a seleção (Ctrl+Shift+V). */
function dPasteStyle() {
  if (!dStyleClip) {
    dStatus(t('design.style.empty'), 'error');
    return;
  }
  if (!designState.selection.length) {
    dStatus(t('design.style.none'), 'error');
    return;
  }
  for (const i of designState.selection) {
    const sh = designState.shapes[i];
    if (!sh) continue;
    sh.power = dStyleClip.power === null ? undefined : dStyleClip.power;
    sh.speed = dStyleClip.speed === null ? undefined : dStyleClip.speed;
    sh.passes = dStyleClip.passes === null ? undefined : dStyleClip.passes;
    sh.width = dStyleClip.width === null ? undefined : dStyleClip.width;
  }
  dPushHistory();
  dRender();
  dUpdateProps();
  dUpdateObjectList();
  dStatus(t('design.style.pasted'));
}

function dApplyProps() {
  const b = dSelectionBounds();
  if (!b || !designState.selection.length) return;
  const nx = dNum('designPropX', b.minX);
  const ny = dNum('designPropY', b.minY);
  const nw = dNum('designPropW', b.maxX - b.minX);
  const nh = dNum('designPropH', b.maxY - b.minY);
  const ow = b.maxX - b.minX || 1;
  const oh = b.maxY - b.minY || 1;
  let sx = nw / ow;
  let sy = nh / oh;
  if (designState.lockAspect) {
    const s = Math.abs(nw / ow - 1) > Math.abs(nh / oh - 1) ? nw / ow : nh / oh;
    sx = s;
    sy = s;
  }
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx <= 0 || sy <= 0)
    return;
  for (const i of designState.selection) {
    for (const p of designState.shapes[i].points) {
      p.x = nx + (p.x - b.minX) * sx;
      p.y = ny + (p.y - b.minY) * sy;
    }
  }
  const targetRot = dNum('designPropRot', designState.rotApplied);
  const delta = targetRot - designState.rotApplied;
  dPushHistory();
  if (delta) {
    // Gira em torno do centro real após o redimensionamento.
    const b2 = dSelectionBounds();
    const rcx = b2 ? (b2.minX + b2.maxX) / 2 : (nx + nw) / 2;
    const rcy = b2 ? (b2.minY + b2.maxY) / 2 : (ny + nh) / 2;
    const rad = (delta * Math.PI) / 180;
    for (const i of designState.selection) {
      for (const p of designState.shapes[i].points) {
        const np = DE.rotatePoint(p, rcx, rcy, rad);
        p.x = np.x;
        p.y = np.y;
      }
    }
    designState.rotApplied = targetRot;
  }
  dRender();
  dUpdateProps();
  dUpdateObjectList();
  dUpdateStatus();
}

// ---------------------------------------------------------------- listas UI

function dKindIconId(kind) {
  switch (kind) {
    case 'rect':
      return 'ic-rect';
    case 'circle':
    case 'ellipse':
      return 'ic-ellipse';
    case 'line':
      return 'ic-line';
    case 'text':
      return 'ic-text';
    default:
      return 'ic-rect';
  }
}

function dUpdateObjectList() {
  const ul = $('designObjectList');
  if (!ul) return;
  const entities = DE ? DE.entityIndices(designState.shapes) : [];
  const selSet = dSelectionSet();
  ul.textContent = '';
  const count = $('designObjCount');
  if (count) count.textContent = String(entities.length);
  if (!entities.length) {
    const li = document.createElement('li');
    li.className = 'design-obj-empty';
    li.textContent = t('design.objects.empty');
    ul.appendChild(li);
    return;
  }
  // topo primeiro (como o painel de camadas)
  for (let ei = entities.length - 1; ei >= 0; ei--) {
    const idxs = entities[ei];
    const sh = designState.shapes[idxs[0]];
    const selected = idxs.some((i) => selSet.has(i));
    const li = document.createElement('li');
    li.className = `design-obj${selected ? ' selected' : ''}`;
    li.draggable = false;

    const ic = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ic.setAttribute('class', 'design-ic');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${dKindIconId(sh.kind)}`);
    ic.appendChild(use);

    const label = document.createElement('span');
    label.className = 'design-obj-label';
    label.textContent = sh.name || sh.kind;

    // Gravação própria do objeto (potência/velocidade), se houver. Fica fora do
    // rótulo para não ser cortado pelo `ellipsis`.
    const meta = [];
    if (typeof sh.power === 'number') meta.push(`${Math.round(sh.power)}%`);
    if (typeof sh.speed === 'number') meta.push(`${Math.round(sh.speed)}`);
    if (sh.width && sh.width > 0)
      meta.push(`${Number(sh.width.toFixed(2))} mm`);
    const info = meta.length ? document.createElement('span') : null;
    if (info) {
      info.className = 'design-obj-meta';
      info.textContent = meta.join(' · ');
    }

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'design-obj-del';
    del.title = t('design.delete');
    del.textContent = '×';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      const set = new Set(idxs);
      designState.shapes = designState.shapes.filter((_, i) => !set.has(i));
      designState.selection = [];
      dPushHistory();
      dRender();
      dUpdateProps();
      dUpdateObjectList();
      dUpdateStatus();
      dUpdateButtons();
    });

    li.addEventListener('click', (e) => dSelectShape(idxs[0], e.shiftKey));
    // Marca da camada (mesma cor usada no canvas).
    const layer = dLayerById(sh.layer);
    if (layer) {
      const dot = document.createElement('span');
      dot.className = 'design-obj-layer';
      dot.style.background =
        layer.color || dLayerColor(designState.layers.indexOf(layer));
      dot.title = dLayerLabel(layer);
      li.appendChild(dot);
    }
    li.appendChild(ic);
    li.appendChild(label);
    if (info) li.appendChild(info);
    li.appendChild(del);
    ul.appendChild(li);
  }
}

// ------------------------------------------------------ camadas / operações
//
// A ordem da lista é a ordem de execução do job. Cada camada pode ter sua
// potência/velocidade/passadas/modo; campo vazio herda o padrão global da
// seção “Gravação” (que continua valendo para objetos sem camada).

const D_LAYERS_KEY = 'grbl-design-layers';
const D_LAYER_COLORS = [
  '#e05252',
  '#e0a252',
  '#7bbf5a',
  '#4bb3b3',
  '#5a8fe0',
  '#9b6be0',
  '#e05aa8',
  '#8a8a8a',
];

function dLayerColor(index) {
  return D_LAYER_COLORS[index % D_LAYER_COLORS.length];
}

function dLayerById(id) {
  return designState.layers.find((l) => l.id === id) || null;
}

function dActiveLayer() {
  return dLayerById(designState.activeLayer) || designState.layers[0] || null;
}

function dLayerLabel(layer) {
  if (!layer) return '';
  if (layer.name) return layer.name;
  const i = designState.layers.findIndex((l) => l.id === layer.id);
  return t('design.layer.defaultName', { n: i + 1 });
}

/** Garante ao menos uma camada válida e ids únicos (`l1`, `l2`, …). */
function dEnsureLayers() {
  if (!Array.isArray(designState.layers)) designState.layers = [];
  designState.layers = designState.layers
    .filter((l) => l && typeof l.id === 'string' && l.id)
    .map((l, i) => ({ ...l, color: l.color || dLayerColor(i) }));
  if (!designState.layers.length) {
    designState.layers.push({ id: 'l1', color: dLayerColor(0) });
  }
  let max = 0;
  for (const l of designState.layers) {
    const m = /^l(\d+)$/.exec(l.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  designState.layerSeq = Math.max(designState.layerSeq, max + 1);
  if (!dLayerById(designState.activeLayer)) {
    designState.activeLayer = designState.layers[0].id;
  }
  // Objetos apontando para camadas que não existem mais voltam ao padrão.
  const ids = new Set(designState.layers.map((l) => l.id));
  for (const sh of designState.shapes) {
    if (sh.layer && !ids.has(sh.layer)) delete sh.layer;
  }
}

function dSaveLayers() {
  try {
    localStorage.setItem(
      D_LAYERS_KEY,
      JSON.stringify({
        layers: designState.layers,
        active: designState.activeLayer,
      }),
    );
  } catch {
    /* sem localStorage: camadas só valem nesta sessão */
  }
}

function dRestoreLayers() {
  try {
    const raw = localStorage.getItem(D_LAYERS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p && Array.isArray(p.layers)) designState.layers = p.layers;
    if (p && typeof p.active === 'string') designState.activeLayer = p.active;
  } catch {
    /* preferência inválida: volta ao padrão */
  }
}

function dSetActiveLayer(id) {
  if (!dLayerById(id)) return;
  designState.activeLayer = id;
  dSaveLayers();
  dUpdateLayerList();
  dUpdateLayerEditor();
}

/** Liga/desliga os botões de camada conforme seleção e posição. */
function dUpdateLayerButtons() {
  const layer = dActiveLayer();
  const idx = layer ? designState.layers.indexOf(layer) : -1;
  const set = (id, disabled) => {
    const node = $(id);
    if (node) node.disabled = disabled;
  };
  set('designLayerDelete', designState.layers.length <= 1);
  set('designLayerUp', idx <= 0);
  set('designLayerDown', idx < 0 || idx >= designState.layers.length - 1);
  set('designLayerAssign', !layer || !designState.selection.length);
}

/** Lista de camadas (topo = primeira a executar), com drag & drop. */
function dUpdateLayerList() {
  const ul = $('designLayerList');
  if (!ul) return;
  ul.textContent = '';
  const active = dActiveLayer();
  for (let index = 0; index < designState.layers.length; index++) {
    const layer = designState.layers[index];
    const li = document.createElement('li');
    li.className = `design-layer${active && active.id === layer.id ? ' active' : ''}`;
    li.draggable = true;
    li.dataset.layer = layer.id;

    const grip = document.createElement('span');
    grip.className = 'design-layer-grip';
    grip.textContent = '⋮⋮';
    grip.setAttribute('aria-hidden', 'true');

    const dot = document.createElement('span');
    dot.className = 'design-layer-dot';
    dot.style.background = layer.color || dLayerColor(index);

    const label = document.createElement('span');
    label.className = 'design-layer-label';
    label.textContent = dLayerLabel(layer);

    const meta = [];
    if (typeof layer.power === 'number' && Number.isFinite(layer.power))
      meta.push(`${Math.round(layer.power)}%`);
    if (typeof layer.speed === 'number' && Number.isFinite(layer.speed))
      meta.push(`${Math.round(layer.speed)}`);
    if (typeof layer.passes === 'number' && Number.isFinite(layer.passes))
      meta.push(`×${Math.round(layer.passes)}`);

    li.append(grip, dot, label);
    if (meta.length) {
      const info = document.createElement('span');
      info.className = 'design-layer-meta';
      info.textContent = meta.join(' · ');
      li.appendChild(info);
    }

    li.addEventListener('click', () => dSetActiveLayer(layer.id));
    li.addEventListener('dragstart', (e) => {
      designState.dragLayer = layer.id;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', layer.id);
      }
      li.classList.add('dragging');
    });
    li.addEventListener('dragend', () => {
      designState.dragLayer = null;
      li.classList.remove('dragging');
      for (const row of ul.children) row.classList.remove('dragover');
    });
    li.addEventListener('dragover', (e) => {
      if (!designState.dragLayer || designState.dragLayer === layer.id) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      li.classList.add('dragover');
    });
    li.addEventListener('dragleave', () => li.classList.remove('dragover'));
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('dragover');
      dMoveLayer(designState.dragLayer, layer.id);
    });

    ul.appendChild(li);
  }
  dUpdateLayerButtons();
}

/** Reordena a camada `id` para a posição da camada `targetId`. */
function dMoveLayer(id, targetId) {
  if (!id || !targetId || id === targetId) return;
  const from = designState.layers.findIndex((l) => l.id === id);
  const target = designState.layers.findIndex((l) => l.id === targetId);
  if (from < 0 || target < 0) return;
  const [layer] = designState.layers.splice(from, 1);
  const after = designState.layers.findIndex((l) => l.id === targetId);
  const insertAt = from < target ? after + 1 : after;
  designState.layers.splice(insertAt, 0, layer);
  dSaveLayers();
  dUpdateLayerList();
  dUpdateLayerEditor();
}

function dMoveLayerBy(delta) {
  const layer = dActiveLayer();
  if (!layer) return;
  const i = designState.layers.indexOf(layer);
  const j = i + delta;
  if (j < 0 || j >= designState.layers.length) return;
  designState.layers.splice(i, 1);
  designState.layers.splice(j, 0, layer);
  dSaveLayers();
  dUpdateLayerList();
  dUpdateLayerEditor();
}

function dAddLayer() {
  const id = `l${designState.layerSeq++}`;
  designState.layers.push({
    id,
    color: dLayerColor(designState.layers.length),
  });
  designState.activeLayer = id;
  dSaveLayers();
  dUpdateLayerList();
  dUpdateLayerEditor();
  dRender();
}

function dDeleteLayer() {
  if (designState.layers.length <= 1) return;
  const layer = dActiveLayer();
  if (!layer) return;
  const label = dLayerLabel(layer);
  designState.layers = designState.layers.filter((l) => l.id !== layer.id);
  // Os objetos da camada não somem: voltam a usar os parâmetros globais.
  for (const sh of designState.shapes) {
    if (sh.layer === layer.id) delete sh.layer;
  }
  designState.activeLayer = designState.layers[0].id;
  dPushHistory();
  dSaveLayers();
  dRender();
  dUpdateLayerList();
  dUpdateLayerEditor();
  dUpdateObjectList();
  dStatus(t('design.layer.deleted', { name: label }), 'ok');
}

/** Move os objetos selecionados para a camada ativa. */
function dAssignSelectionToLayer() {
  const layer = dActiveLayer();
  if (!layer) return;
  if (!designState.selection.length) {
    dStatus(t('design.layer.needSelection'), 'error');
    return;
  }
  for (const i of designState.selection) {
    const sh = designState.shapes[i];
    if (sh) sh.layer = layer.id;
  }
  dPushHistory();
  dRender();
  dUpdateObjectList();
  dUpdateLayerButtons();
  dStatus(
    t('design.layer.assigned', {
      name: dLayerLabel(layer),
      n: designState.selection.length,
    }),
    'ok',
  );
}

/** Aplica um campo numérico da camada ativa (vazio = herda o global). */
function dApplyLayerParam(id, key, lo, hi) {
  const layer = dActiveLayer();
  const node = $(id);
  if (!layer || !node) return;
  const raw = node.value.trim();
  if (raw === '') {
    delete layer[key];
  } else {
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    layer[key] = dClamp(n, lo, hi);
  }
  dSaveLayers();
  dUpdateLayerList();
  dUpdateLayerEditor();
}

function dApplyLayerName() {
  const layer = dActiveLayer();
  const node = $('designLayerName');
  if (!layer || !node) return;
  const name = node.value.trim();
  if (name) layer.name = name;
  else delete layer.name;
  dSaveLayers();
  dUpdateLayerList();
  dUpdateLayerEditor();
}

function dApplyLayerMode() {
  const layer = dActiveLayer();
  const node = $('designLayerMode');
  if (!layer || !node) return;
  if (node.value === 'M3' || node.value === 'M4') layer.mode = node.value;
  else delete layer.mode;
  dSaveLayers();
  dUpdateLayerList();
  dUpdateLayerEditor();
}

/** Preenche os campos da camada ativa; vazio = herda (placeholder). */
function dUpdateLayerEditor() {
  const layer = dActiveLayer();
  for (const id of [
    'designLayerName',
    'designLayerPower',
    'designLayerSpeed',
    'designLayerPasses',
    'designLayerMode',
  ]) {
    const node = $(id);
    if (node) node.disabled = !layer;
  }

  const name = $('designLayerName');
  if (name) {
    name.value = layer?.name || '';
    name.placeholder = layer ? dLayerLabel(layer) : '';
  }

  const setNum = (id, key, globalId) => {
    const node = $(id);
    if (!node) return;
    const v = layer ? layer[key] : undefined;
    node.value =
      typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '';
    const g = dNum(globalId, 0);
    node.placeholder = g ? String(Math.round(g)) : '—';
  };
  setNum('designLayerPower', 'power', 'designPower');
  setNum('designLayerSpeed', 'speed', 'designSpeed');
  setNum('designLayerPasses', 'passes', 'designPasses');

  const mode = $('designLayerMode');
  if (mode) {
    mode.value = layer?.mode === 'M3' || layer?.mode === 'M4' ? layer.mode : '';
  }
  dUpdateLayerButtons();
}

function dUpdateStatus() {
  const info = $('designSelInfo');
  if (!info) return;
  const sel = designState.selection;
  if (!sel.length) {
    info.textContent = t('design.sel.none');
    return;
  }
  // Conta **blocos** (objetos), não contornos: um texto preenchido é 1 objeto,
  // ainda que tenha centenas de segmentos.
  const total = DE ? DE.entityIndices(designState.shapes).length : sel.length;
  const selSet = dSelectionSet();
  const blocks = DE
    ? DE.entityIndices(designState.shapes).filter((idxs) =>
        idxs.some((i) => selSet.has(i)),
      ).length
    : sel.length;
  info.textContent =
    total > 1 && blocks === total
      ? t('design.sel.all', { n: blocks })
      : blocks === 1
        ? t('design.sel.one')
        : t('design.sel.blocks', { n: blocks });
}

function dUpdateButtons() {
  const hasSel = designState.selection.length > 0;
  const multi = designState.selection.length > 1;
  for (const id of [
    'designDelete',
    'designDuplicate',
    'designAlignLeft',
    'designAlignCenter',
    'designAlignRight',
    'designAlignTop',
    'designAlignMiddle',
    'designAlignBottom',
    'designFront',
    'designForward',
    'designBackward',
    'designBack',
    'designCopyStyle',
    'designArray',
    'designMirrorH',
    'designMirrorV',
  ]) {
    const node = $(id);
    if (node) node.disabled = !hasSel;
  }
  // Distribuir exige 3+ objetos (o primeiro e o último ficam onde estão).
  const multi3 =
    DE.selectedEntities(designState.shapes, dSelectionSet()).length >= 3;
  for (const id of ['designDistH', 'designDistV']) {
    const node = $(id);
    if (node) node.disabled = !multi3;
  }
  const pasteStyle = $('designPasteStyle');
  if (pasteStyle) pasteStyle.disabled = !hasSel || !dStyleClip;
  // Booleanas exigem 2+ objetos fechados; o contorno paralelo, 1.
  const closedObjs = dSelectedObjects().length;
  const boolMenu = $('designBoolMenu');
  if (boolMenu) boolMenu.disabled = closedObjs < 1;
  for (const [id, min] of [
    ['designBoolUnion', 2],
    ['designBoolSubtract', 2],
    ['designBoolIntersect', 2],
    ['designBoolXor', 2],
    ['designBoolOffset', 1],
  ]) {
    const node = $(id);
    if (node) node.disabled = closedObjs < min;
  }
  const g = $('designGroup');
  if (g) g.disabled = !multi;
  const u = $('designUngroup');
  if (u) u.disabled = !hasSel;
  const undo = $('designUndo');
  if (undo) undo.disabled = designState.historyIdx <= 0;
  const redo = $('designRedo');
  if (redo)
    redo.disabled = designState.historyIdx >= designState.history.length - 1;
  const lock = $('designLockAspect');
  if (lock) lock.classList.toggle('active', designState.lockAspect);
  dUpdateLayerButtons();
}

function dUpdateDocBadge() {
  const badge = $('designDocBadge');
  if (badge)
    badge.textContent = `${designState.page.w} × ${designState.page.h} mm`;
}

// ------------------------------------------------------------------ render

let dRaf = 0;
function dRender() {
  if (dRaf) return;
  dRaf = requestAnimationFrame(() => {
    dRaf = 0;
    dPaint();
  });
}

function dPath(ctx, sh) {
  const pts = sh.points;
  if (!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (sh.closed && pts.length > 2) ctx.closePath();
}

function dPaint() {
  const c = el.designCanvas;
  if (!c) return;
  dResizeCanvas();
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const { pxW: w, pxH: h, dpr, page } = designState;
  const v = designState.view;
  const dark =
    getComputedStyle(document.documentElement).colorScheme !== 'light';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = dark ? '#262629' : '#d9d9dc';
  ctx.fillRect(0, 0, w, h);

  const p0 = dW2S(0, 0);
  const p1 = dW2S(page.w, page.h);

  // página (área útil da máquina)
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
  ctx.restore();

  // grade (só dentro da página)
  const gridMinor = dark ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.07)';
  const gridMajor = dark ? 'rgba(0,0,0,0.13)' : 'rgba(0,0,0,0.14)';
  const g = designState.grid > 0 ? designState.grid : 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
  ctx.clip();
  ctx.lineWidth = 1;
  if (g * v.scale >= 6) {
    ctx.strokeStyle = gridMinor;
    ctx.beginPath();
    for (let x = 0; x <= page.w + 1e-6; x += g) {
      const sx = Math.round(dW2S(x, 0).x) + 0.5;
      ctx.moveTo(sx, p0.y);
      ctx.lineTo(sx, p1.y);
    }
    for (let y = 0; y <= page.h + 1e-6; y += g) {
      const sy = Math.round(dW2S(0, y).y) + 0.5;
      ctx.moveTo(p0.x, sy);
      ctx.lineTo(p1.x, sy);
    }
    ctx.stroke();
  }
  const major = g * 5;
  if (major * v.scale >= 6) {
    ctx.strokeStyle = gridMajor;
    ctx.beginPath();
    for (let x = 0; x <= page.w + 1e-6; x += major) {
      const sx = Math.round(dW2S(x, 0).x) + 0.5;
      ctx.moveTo(sx, p0.y);
      ctx.lineTo(sx, p1.y);
    }
    for (let y = 0; y <= page.h + 1e-6; y += major) {
      const sy = Math.round(dW2S(0, y).y) + 0.5;
      ctx.moveTo(p0.x, sy);
      ctx.lineTo(p1.x, sy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // contorno da página
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.24)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    Math.round(p0.x) + 0.5,
    Math.round(p0.y) + 0.5,
    Math.round(p1.x - p0.x) - 1,
    Math.round(p1.y - p0.y) - 1,
  );

  // formas (espaço do mundo)
  const selSet = dSelectionSet();
  ctx.save();
  ctx.translate(v.tx, v.ty);
  ctx.scale(v.scale, v.scale);
  const accent = '#0a84ff';
  const baseLw = 1.4 / v.scale;
  const layerColors = new Map(
    designState.layers.map((l, i) => [l.id, l.color || dLayerColor(i)]),
  );
  for (let i = 0; i < designState.shapes.length; i++) {
    const sh = designState.shapes[i];
    if (!sh.points.length) continue;
    const selected = selSet.has(i);
    dPath(ctx, sh);
    if (sh.closed) {
      ctx.fillStyle = selected ? 'rgba(10,132,255,0.10)' : 'rgba(0,0,0,0.035)';
      ctx.fill();
    }
    // Fora da seleção, a cor identifica a camada/operação da forma.
    ctx.strokeStyle = selected
      ? accent
      : (sh.layer && layerColors.get(sh.layer)) || '#1b1b1b';
    // Espessura do traço em mm (mesma unidade do contexto), centrada no
    // caminho — é exatamente a faixa que a gravação cobre.
    const thick = sh.width && sh.width > 0 ? sh.width : 0;
    ctx.lineWidth = Math.max(selected ? 2 / v.scale : baseLw, thick);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  if (designState.drawing) {
    dPath(ctx, designState.drawing);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8 / v.scale;
    ctx.stroke();
  }

  // Caneta: prévia do traço livre (espaço do mundo)
  if (designState.tool === 'pen' && designState.freehandPoints.length >= 2) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5 / v.scale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    const first = dW2S(
      designState.freehandPoints[0].x,
      designState.freehandPoints[0].y,
    );
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < designState.freehandPoints.length; i++) {
      const p = dW2S(
        designState.freehandPoints[i].x,
        designState.freehandPoints[i].y,
      );
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Edição de nós: desenha os nós do shape em edição
  if (designState.nodeEdit) {
    const ne = designState.nodeEdit;
    const sh = designState.shapes[ne.shapeIndex];
    if (sh) {
      const NODE_R = 6 / v.scale;
      for (let i = 0; i < sh.points.length; i++) {
        const p = dW2S(sh.points[i].x, sh.points[i].y);
        const isActive = i === ne.nodeIndex;
        ctx.beginPath();
        ctx.arc(p.x, p.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#0a84ff' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = isActive ? '#0a84ff' : '#1b1b1b';
        ctx.lineWidth = 2 / v.scale;
        ctx.stroke();
      }
      // Linha pontilhada entre nós (contorno)
      ctx.strokeStyle = '#0a84ff';
      ctx.lineWidth = 1 / v.scale;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      dPath(ctx, sh);
      if (sh.closed) ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();

  // seleção (espaço da tela)
  const b = dSelectionBounds();
  if (b) {
    const tl = dW2S(b.minX, b.minY);
    const br = dW2S(b.maxX, b.maxY);
    ctx.strokeStyle = 'rgba(10,132,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.setLineDash([]);
    const pts = dHandleScreenPoints(b);
    for (const pt of pts) {
      ctx.beginPath();
      ctx.rect(pt.x - HANDLE, pt.y - HANDLE, HANDLE * 2, HANDLE * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0a84ff';
      ctx.stroke();
    }
    const top = dW2S((b.minX + b.maxX) / 2, b.minY);
    const rp = { x: top.x, y: top.y - 26 };
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(rp.x, rp.y);
    ctx.strokeStyle = 'rgba(10,132,255,0.7)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0a84ff';
    ctx.stroke();
  }

  // marquee
  if (designState.marquee) {
    const a = dW2S(designState.marquee.x0, designState.marquee.y0);
    const m = dW2S(designState.marquee.x1, designState.marquee.y1);
    const x = Math.min(a.x, m.x);
    const y = Math.min(a.y, m.y);
    const rw = Math.abs(m.x - a.x);
    const rh = Math.abs(m.y - a.y);
    ctx.fillStyle = 'rgba(10,132,255,0.12)';
    ctx.fillRect(x, y, rw, rh);
    ctx.strokeStyle = 'rgba(10,132,255,0.9)';
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(x + 0.5, y + 0.5, rw, rh);
    ctx.setLineDash([]);
  }

  // guias de alinhamento (snap a objetos)
  const guides = designState.guides;
  if (guides && (guides.x !== null || guides.y !== null)) {
    ctx.save();
    ctx.strokeStyle = dark ? '#ff6b6b' : '#e01b24';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    if (guides.x !== null) {
      const gx = Math.round(dW2S(guides.x, 0).x) + 0.5;
      ctx.beginPath();
      ctx.moveTo(gx, p0.y);
      ctx.lineTo(gx, p1.y);
      ctx.stroke();
    }
    if (guides.y !== null) {
      const gy = Math.round(dW2S(0, guides.y).y) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p0.x, gy);
      ctx.lineTo(p1.x, gy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  dDrawRulers(ctx, dark);
}

function dDrawRulers(ctx, dark) {
  const { pxW: w, pxH: h } = designState;
  const v = designState.view;
  const stripBg = dark ? '#1c1c1f' : '#e6e6e9';
  const line = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.3)';
  const text = dark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)';

  ctx.fillStyle = stripBg;
  ctx.fillRect(0, 0, w, RULER);
  ctx.fillRect(0, 0, RULER, h);

  // passo "maior" com ~64 px entre rótulos
  const steps = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  let major = steps[steps.length - 1];
  for (const s of steps) {
    if (s * v.scale >= 64) {
      major = s;
      break;
    }
  }
  const minor = major / 5;
  const fmt = (val) => (major < 1 ? val.toFixed(1) : String(Math.round(val)));

  ctx.strokeStyle = line;
  ctx.fillStyle = text;
  ctx.font = '9px system-ui, sans-serif';
  ctx.lineWidth = 1;

  // régua superior
  const wx0 = dS2W(0, 0).x;
  const wx1 = dS2W(w, 0).x;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let wx = Math.floor(wx0 / major) * major; wx <= wx1; wx += major) {
    const sx = Math.round(dW2S(wx, 0).x) + 0.5;
    if (sx < RULER || sx > w) continue;
    ctx.beginPath();
    ctx.moveTo(sx, RULER - 8);
    ctx.lineTo(sx, RULER);
    ctx.stroke();
    ctx.fillText(fmt(wx), sx, 2);
    for (let m = 1; m < 5; m++) {
      const smx = Math.round(dW2S(wx + m * minor, 0).x) + 0.5;
      if (smx < RULER || smx > w) continue;
      ctx.beginPath();
      ctx.moveTo(smx, RULER - 4);
      ctx.lineTo(smx, RULER);
      ctx.stroke();
    }
  }

  // régua esquerda
  const wy0 = dS2W(0, 0).y;
  const wy1 = dS2W(0, h).y;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let wy = Math.floor(wy0 / major) * major; wy <= wy1; wy += major) {
    const sy = Math.round(dW2S(0, wy).y) + 0.5;
    if (sy < RULER || sy > h) continue;
    ctx.beginPath();
    ctx.moveTo(RULER - 8, sy);
    ctx.lineTo(RULER, sy);
    ctx.stroke();
    ctx.fillText(fmt(wy), RULER - 10, sy);
    for (let m = 1; m < 5; m++) {
      const smy = Math.round(dW2S(0, wy + m * minor).y) + 0.5;
      if (smy < RULER || smy > h) continue;
      ctx.beginPath();
      ctx.moveTo(RULER - 4, smy);
      ctx.lineTo(RULER, smy);
      ctx.stroke();
    }
  }

  // canto (unidade) + bordas
  ctx.fillStyle = dark ? '#232327' : '#d9d9dd';
  ctx.fillRect(0, 0, RULER, RULER);
  ctx.fillStyle = text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '9px system-ui, sans-serif';
  ctx.fillText('mm', RULER / 2, RULER / 2 + 0.5);
  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.moveTo(RULER + 0.5, 0);
  ctx.lineTo(RULER + 0.5, h);
  ctx.moveTo(0, RULER + 0.5);
  ctx.lineTo(w, RULER + 0.5);
  ctx.stroke();
}

// ------------------------------------------------------- ferramenta de texto

function dOpenTextEditor(world, editing) {
  const box = $('designTextEditor');
  if (!box) return;
  designState.textEdit = {
    x: world.x,
    y: world.y,
    group: editing?.group ?? null,
    editing: Boolean(editing),
    name: editing ? editing.name : null,
    indices: editing?.indices ?? null,
  };
  if (editing) {
    const meta = editing.meta;
    const val = $('designTextValue');
    if (val) val.value = meta.value;
    const font = $('designTextFont');
    if (font) font.value = meta.font;
    const size = $('designTextSize');
    if (size) size.value = String(Math.round(meta.size * 10) / 10);
    const mode = $('designTextMode');
    if (mode) mode.value = meta.mode;
    const bold = $('designTextBold');
    if (bold) bold.checked = meta.bold !== false;
    const spacing = $('designTextSpacing');
    if (spacing) spacing.value = String(meta.spacing ?? 5);
  }
  dSyncTextModeUi();
  const p = dW2S(world.x, world.y);
  const wrap = $('designCanvasWrap');
  const ww = wrap ? wrap.clientWidth : designState.pxW;
  const wh = wrap ? wrap.clientHeight : designState.pxH;
  box.style.left = `${dClamp(p.x + 14, 8, Math.max(8, ww - 260))}px`;
  box.style.top = `${dClamp(p.y + 14, 8, Math.max(8, wh - 320))}px`;
  box.classList.remove('hidden');
  const val = $('designTextValue');
  if (val) {
    val.focus();
    val.select();
  }
}

function dCloseTextEditor() {
  const box = $('designTextEditor');
  if (box) box.classList.add('hidden');
  designState.textEdit = null;
}

/** O espaçamento de preenchimento só aparece no modo "Preenchido". */
function dSyncTextModeUi() {
  const mode = $('designTextMode') ? $('designTextMode').value : 'vector';
  const opts = $('designTextFillOpts');
  if (opts) opts.classList.toggle('hidden', mode !== 'fill');
}

/**
 * Completa o seletor de fontes com as famílias instaladas no sistema
 * (`fc-list`, via IPC). Roda uma vez; sem fontconfig fica a lista curada.
 */
let designFontsRequested = false;
async function dLoadSystemFonts() {
  if (designFontsRequested) return;
  designFontsRequested = true;
  const list = $('designFontList');
  if (!list || !window.grbl || typeof window.grbl.listFonts !== 'function')
    return;
  try {
    const families = await window.grbl.listFonts();
    if (!Array.isArray(families)) return;
    const known = new Set(
      [...list.querySelectorAll('option')].map((o) => o.value.toLowerCase()),
    );
    for (const name of families) {
      if (typeof name !== 'string' || !name) continue;
      const key = name.toLowerCase();
      if (known.has(key)) continue;
      known.add(key);
      const option = document.createElement('option');
      option.value = name;
      list.appendChild(option);
    }
  } catch {
    /* sem fontconfig: mantém a lista curada */
  }
}

/**
 * Gera as formas de um texto.
 * - `vector`: renderiza a fonte do sistema em alta resolução e traça o
 *   contorno (resultado cheio, como CorelDRAW/Photoshop);
 * - `stroke`: usa a fonte single-stroke embutida (rápida, ideal p/ gravação).
 * Devolve pontos em mm (y-down), com a caixa do texto no canto (x, y).
 */
/**
 * Aviso da última geração de texto (ex.: caracteres fora da fonte de traço
 * único). `dCommitText` mostra o aviso em vez do "pronto" genérico.
 */
let dTextWarn = '';

async function dTextToShapes(value, opts) {
  const { font, size, mode, bold, x, y } = opts;
  const spacing = Math.max(1, Math.min(20, Number(opts.spacing) || 5));
  dTextWarn = '';
  if (mode === 'stroke' && window.GRBL_FONTS) {
    if (typeof window.GRBL_FONTS.unsupportedChars === 'function') {
      const bad = window.GRBL_FONTS.unsupportedChars(value, 'simplex');
      if (bad.length) {
        dTextWarn = t('design.text.unsupported', { chars: bad.join(' ') });
      }
    }
    const out = window.GRBL_FONTS.textToShapes({
      text: value,
      fontId: 'simplex',
      size,
      x: 0,
      y: 0,
      letterSpacing: 0.08,
    });
    return dPlaceShapes(
      out.map((s) => ({ ...s })),
      x,
      y,
    );
  }
  if (!window.GRBL_CONTOUR) throw new Error(t('design.text.noContour'));
  const PX = 16;
  const fontPx = Math.max(12, Math.round(size * PX));
  const spec = `${bold ? '600 ' : ''}${fontPx}px "${font}", sans-serif`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = spec;
  const metrics = probe.measureText(value);
  const textW = Math.max(4, Math.ceil(metrics.width));
  const pad = Math.ceil(fontPx * 0.3);
  const canvas = document.createElement('canvas');
  canvas.width = textW + pad * 2;
  canvas.height = Math.ceil(fontPx * 1.6) + pad * 2;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = spec;
  ctx.textBaseline = 'top';
  ctx.fillText(value, pad, pad);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mask = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < mask.length; i++) mask[i] = img.data[i * 4] > 110 ? 1 : 0;
  const contours = window.GRBL_CONTOUR.traceContours(
    mask,
    canvas.width,
    canvas.height,
  );
  const tol = 0.9 / PX;
  const shapes = [];
  // O contorno vem sempre: no modo "cheio" ele é a borda nítida da letra.
  for (const cont of contours) {
    if (!cont || cont.length < 3) continue;
    const pts = cont.map((p) => ({ x: p.x / PX, y: p.y / PX }));
    const simp = DE.simplifyPolyline(pts, tol);
    if (simp.length >= 3)
      shapes.push({ kind: 'text', points: simp, closed: true });
  }
  if (mode === 'fill') {
    if (!window.GRBL_HATCH) throw new Error(t('design.text.noFill'));
    const spacingPx = Math.max(2, Math.round(PX / spacing));
    const segs = window.GRBL_HATCH.zigzagHatch(
      window.GRBL_HATCH.maskToHatchLines(mask, canvas.width, canvas.height, {
        spacingPx,
        minRunPx: Math.max(2, Math.round(PX * 0.12)),
      }),
    );
    for (const s of segs) {
      shapes.push({
        kind: 'text',
        points: [
          { x: s.x0 / PX, y: s.y0 / PX },
          { x: s.x1 / PX, y: s.y1 / PX },
        ],
        closed: false,
      });
    }
  }
  return dPlaceShapes(shapes, x, y);
}

/** Translada as formas para que a caixa do conjunto comece em (x, y). */
function dPlaceShapes(shapes, x, y) {
  let minX = Infinity;
  let minY = Infinity;
  for (const s of shapes) {
    for (const p of s.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
    }
  }
  if (!Number.isFinite(minX)) return [];
  const dx = x - minX;
  const dy = y - minY;
  for (const s of shapes) {
    for (const p of s.points) {
      p.x += dx;
      p.y += dy;
    }
  }
  return shapes;
}

async function dCommitText() {
  const valueNode = $('designTextValue');
  const value = valueNode ? valueNode.value.trim() : '';
  if (!value) {
    dStatus(t('design.status.textEmpty'), 'error');
    return;
  }
  const fontNode = $('designTextFont');
  const font = fontNode?.value || 'sans-serif';
  const size = dNum('designTextSize', 10) || 10;
  let mode = $('designTextMode') ? $('designTextMode').value : 'vector';
  const bold = $('designTextBold') ? $('designTextBold').checked : true;
  const spacing = dNum('designTextSpacing', 5) || 5;
  if (/simplex/i.test(font)) mode = 'stroke';

  const edit = designState.textEdit;
  const anchor = edit ? { x: edit.x, y: edit.y } : { x: 50, y: 50 };
  dStatus(t('design.status.generating'));

  let shapes;
  try {
    shapes = await dTextToShapes(value, {
      font,
      size,
      mode,
      bold,
      spacing,
      x: anchor.x,
      y: anchor.y,
    });
  } catch (err) {
    dStatus(err.message, 'error');
    return;
  }
  if (!shapes?.length) {
    dStatus(t('design.status.textFail'), 'error');
    return;
  }

  let group = edit?.group ?? `g${designState.seq++}`;
  const name = edit?.name ?? dNextName('text');

  // Reeditar não pode jogar fora a gravação do bloco: potência, velocidade e
  // espessura do traço voltam para os contornos novos.
  let keep = null;
  if (edit?.group)
    keep = designState.shapes.find((s) => s.group === edit.group) ?? null;
  else if (edit?.indices?.length)
    keep = designState.shapes[edit.indices[0]] ?? null;
  const style = {};
  if (keep) {
    for (const k of ['speed', 'power', 'passes', 'width', 'layer']) {
      if (keep[k] !== undefined) style[k] = keep[k];
    }
  }

  if (edit?.group) {
    // remove o bloco antigo e recria no mesmo lugar
    designState.shapes = designState.shapes.filter(
      (s) => s.group !== edit.group,
    );
  } else if (edit?.indices?.length) {
    const set = new Set(edit.indices);
    designState.shapes = designState.shapes.filter((_, i) => !set.has(i));
  }
  if (!group) group = `g${designState.seq++}`;

  for (const sh of shapes) {
    sh.group = group;
    sh.name = name;
    sh.text = { value, font, size, mode, bold, spacing };
    Object.assign(sh, style);
    if (!sh.layer && designState.activeLayer) {
      sh.layer = designState.activeLayer;
    }
  }
  const base = designState.shapes.length;
  designState.shapes.push(...shapes);
  dPushHistory();
  designState.selection = shapes.map((_, i) => base + i);
  dCloseTextEditor();
  dAfterSelection();
  dStatus(dTextWarn || t('design.status.done'), dTextWarn ? 'error' : 'ok');
}

// ------------------------------------------------------------------ ferramenta

function dSetTool(tool) {
  designState.tool = tool;
  designState.drawing = null;
  if (tool !== 'text') dCloseTextEditor();
  const map = {
    designToolSelect: 'select',
    designToolRect: 'rect',
    designToolCircle: 'circle',
    designToolLine: 'line',
    designToolPen: 'pen',
    designToolNode: 'node',
    designToolText: 'text',
  };
  for (const [id, name] of Object.entries(map)) {
    const node = $(id);
    if (node) node.classList.toggle('active', name === tool);
  }
  const c = el.designCanvas;
  if (c) c.style.cursor = tool === 'select' ? 'default' : 'crosshair';
  dRender();
}

// ------------------------------------------------------------------ ponteiro

function dCanvasPoint(e) {
  const c = el.designCanvas;
  const r = c.getBoundingClientRect();
  const sx = e.clientX - r.left;
  const sy = e.clientY - r.top;
  const wpt = dS2W(sx, sy);
  return { sx, sy, wx: wpt.x, wy: wpt.y };
}

function dCursorForSelect(sx, sy) {
  const b = dSelectionBounds();
  if (b && designState.selection.length) {
    if (dRotateHandleAt(b, sx, sy)) return 'grab';
    const hi = dHandleIndexAt(b, sx, sy);
    if (hi >= 0) {
      return [
        'nwse-resize',
        'ns-resize',
        'nesw-resize',
        'ew-resize',
        'nwse-resize',
        'ns-resize',
        'nesw-resize',
        'ew-resize',
      ][hi];
    }
  }
  const p = dS2W(sx, sy);
  const tol = HIT_PX / designState.view.scale;
  if (DE.hitTest(designState.shapes, p.x, p.y, tol) >= 0) return 'move';
  return 'default';
}

function dOnPointerDown(e) {
  const c = el.designCanvas;
  if (e.button === 1 || (e.button === 0 && designState.space)) {
    designState.drag = {
      mode: 'pan',
      sx: e.clientX,
      sy: e.clientY,
      tx: designState.view.tx,
      ty: designState.view.ty,
    };
    c.setPointerCapture(e.pointerId);
    c.style.cursor = 'grabbing';
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;
  dCloseTextEditor();
  const pt = dCanvasPoint(e);

  if (designState.tool === 'text') {
    dOpenTextEditor({ x: dSnapV(pt.wx), y: dSnapV(pt.wy) });
    return;
  }

  if (designState.tool === 'select') {
    const b = dSelectionBounds();
    if (b && designState.selection.length) {
      if (dRotateHandleAt(b, pt.sx, pt.sy)) {
        const cx = (b.minX + b.maxX) / 2;
        const cy = (b.minY + b.maxY) / 2;
        designState.drag = {
          mode: 'rotate',
          orig: dSnapshotSelection(),
          cx,
          cy,
          startAngle: Math.atan2(pt.wy - cy, pt.wx - cx),
          shift: e.shiftKey,
        };
        c.setPointerCapture(e.pointerId);
        c.style.cursor = 'grabbing';
        return;
      }
      const hi = dHandleIndexAt(b, pt.sx, pt.sy);
      if (hi >= 0) {
        designState.drag = {
          mode: 'resize',
          handle: hi,
          orig: dSnapshotSelection(),
          shift: e.shiftKey,
        };
        c.setPointerCapture(e.pointerId);
        return;
      }
    }
    const tol = HIT_PX / designState.view.scale;
    const hit = DE.hitTest(designState.shapes, pt.wx, pt.wy, tol);
    if (hit >= 0) {
      const already = designState.selection.includes(hit);
      if (e.shiftKey) dSelectShape(hit, true);
      else if (!already) dSelectShape(hit, false);
      if (designState.selection.length) {
        designState.drag = {
          mode: 'move',
          start: { x: pt.wx, y: pt.wy },
          orig: dSnapshotSelection(),
          // Alvos de snap calculados uma vez (RNF-11): não mudam durante o arrasto.
          snapTargets: dSnapTargets(new Set(dSelectionSet())),
        };
        c.setPointerCapture(e.pointerId);
      }
      return;
    }
    if (!e.shiftKey) dClearSelection();
    designState.drag = {
      mode: 'marquee',
      start: { x: pt.wx, y: pt.wy },
      base: designState.selection.slice(),
    };
    designState.marquee = { x0: pt.wx, y0: pt.wy, x1: pt.wx, y1: pt.wy };
    c.setPointerCapture(e.pointerId);
    dRender();
    return;
  }

  // Modo edição de nós: precisa vir ANTES das ferramentas de criação para
  // evitar que o drag seja inicializado como 'create'.
  if (designState.tool === 'node' && designState.selection.length === 1) {
    const idx = designState.selection[0];
    const sh = designState.shapes[idx];
    if (sh && sh.points.length >= 2) {
      const tol = HIT_PX / designState.view.scale;
      const nodeHit = DE.hitTestNode(sh.points, pt.wx, pt.wy, tol);
      if (nodeHit) {
        designState.nodeEdit = {
          shapeIndex: idx,
          nodeIndex: nodeHit.nodeIndex,
          dragging: true,
        };
        designState.drag = { mode: 'node-edit', nodeIndex: nodeHit.nodeIndex };
        try {
          c.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic event */
        }
        return;
      }
      const segHit = DE.hitTestSegment(sh.points, pt.wx, pt.wy, tol, sh.closed);
      if (segHit) {
        // Clicou num segmento: insere nó e começa a arrastar
        const newPoints = DE.insertNode(
          sh.points,
          segHit.segmentIndex,
          segHit.point,
        );
        const newSh = { ...sh, points: newPoints };
        designState.shapes[idx] = newSh;
        designState.nodeEdit = {
          shapeIndex: idx,
          nodeIndex: segHit.segmentIndex + 1,
          dragging: true,
        };
        designState.drag = {
          mode: 'node-edit',
          nodeIndex: segHit.segmentIndex + 1,
        };
        dPushHistory();
        try {
          c.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic event */
        }
        return;
      }
    }
  }

  // ferramentas de criação (rect, circle, line, pen)
  const sx = dSnapV(pt.wx);
  const sy = dSnapV(pt.wy);
  designState.drag = { mode: 'create', start: { x: sx, y: sy } };
  designState.drawing = null;
  designState.freehandPoints = [];
  if (designState.tool === 'rect') {
    designState.drawing = { kind: 'rect', points: [], closed: true };
  } else if (designState.tool === 'circle') {
    designState.drawing = { kind: 'ellipse', points: [], closed: true };
  } else if (designState.tool === 'line') {
    designState.drawing = { kind: 'line', points: [], closed: false };
  } else if (designState.tool === 'pen') {
    // Caneta: inicia coleta de pontos livres
    designState.freehandPoints = [{ x: sx, y: sy }];
  }
  if (designState.drawing || designState.tool === 'pen')
    c.setPointerCapture(e.pointerId);
}

function dOnPointerMove(e) {
  const c = el.designCanvas;
  const pt = dCanvasPoint(e);
  designState.cursor = { x: pt.wx, y: pt.wy, inside: true };
  const cur = $('designCursor');
  if (cur) cur.textContent = `X ${pt.wx.toFixed(1)} · Y ${pt.wy.toFixed(1)} mm`;

  const d = designState.drag;

  if (d && d.mode === 'pan') {
    designState.view.tx = d.tx + (e.clientX - d.sx);
    designState.view.ty = d.ty + (e.clientY - d.sy);
    dRender();
    return;
  }

  if (d && d.mode === 'move') {
    let dx = pt.wx - d.start.x;
    let dy = pt.wy - d.start.y;
    if (designState.snap) {
      const s = dSnapMoveDelta(
        d.orig.bbox,
        dx,
        dy,
        d.snapTargets || { xs: [], ys: [] },
      );
      dx = s.dx;
      dy = s.dy;
      designState.guides = s.guides;
    } else {
      designState.guides = null;
    }
    dApplyOrig(d.orig, (p, src) => {
      p.x = src.x + dx;
      p.y = src.y + dy;
    });
    d.dirty = true;
    dRender();
    dUpdateProps();
    return;
  }

  if (d && d.mode === 'resize') {
    const b = d.orig.bbox;
    const px = designState.snap ? dSnapV(pt.wx) : pt.wx;
    const py = designState.snap ? dSnapV(pt.wy) : pt.wy;
    let nMinX = b.minX;
    let nMaxX = b.maxX;
    let nMinY = b.minY;
    let nMaxY = b.maxY;
    const hi = d.handle;
    if (hi === 0 || hi === 6 || hi === 7) nMinX = px;
    if (hi === 2 || hi === 3 || hi === 4) nMaxX = px;
    if (hi === 0 || hi === 1 || hi === 2) nMinY = py;
    if (hi === 4 || hi === 5 || hi === 6) nMaxY = py;
    const MIN = 0.5;
    if (nMaxX - nMinX < MIN) {
      if (hi === 0 || hi === 6 || hi === 7) nMinX = nMaxX - MIN;
      else nMaxX = nMinX + MIN;
    }
    if (nMaxY - nMinY < MIN) {
      if (hi === 0 || hi === 1 || hi === 2) nMinY = nMaxY - MIN;
      else nMaxY = nMinY + MIN;
    }
    let sx = (nMaxX - nMinX) / (b.maxX - b.minX || 1);
    let sy = (nMaxY - nMinY) / (b.maxY - b.minY || 1);
    const aspect = designState.lockAspect || d.shift;
    if (aspect) {
      let s = Math.abs(sx - 1) > Math.abs(sy - 1) ? sx : sy;
      if (!Number.isFinite(s) || s <= 0) s = 1;
      sx = s;
      sy = s;
      if (hi === 0 || hi === 6 || hi === 7)
        nMinX = nMaxX - (b.maxX - b.minX) * s;
      else nMaxX = nMinX + (b.maxX - b.minX) * s;
      if (hi === 0 || hi === 1 || hi === 2)
        nMinY = nMaxY - (b.maxY - b.minY) * s;
      else nMaxY = nMinY + (b.maxY - b.minY) * s;
    }
    dApplyOrig(d.orig, (p, src) => {
      p.x = nMinX + (src.x - b.minX) * sx;
      p.y = nMinY + (src.y - b.minY) * sy;
    });
    d.dirty = true;
    dRender();
    dUpdateProps();
    return;
  }

  if (d && d.mode === 'rotate') {
    let angle = Math.atan2(pt.wy - d.cy, pt.wx - d.cx) - d.startAngle;
    if (e.shiftKey || d.shift) {
      const step = Math.PI / 12; // 15°
      angle = Math.round(angle / step) * step;
    }
    const grad = angle * (180 / Math.PI);
    for (let k = 0; k < d.orig.idxs.length; k++) {
      const sh = designState.shapes[d.orig.idxs[k]];
      const src = d.orig.pts[k];
      for (let i = 0; i < sh.points.length; i++) {
        const np = DE.rotatePoint(src[i], d.cx, d.cy, angle);
        sh.points[i].x = np.x;
        sh.points[i].y = np.y;
      }
    }
    designState.rotApplied = grad;
    d.dirty = true;
    dRender();
    dUpdateProps();
    return;
  }

  if (d && d.mode === 'marquee') {
    designState.marquee = {
      x0: d.start.x,
      y0: d.start.y,
      x1: pt.wx,
      y1: pt.wy,
    };
    const mb = {
      minX: Math.min(d.start.x, pt.wx),
      minY: Math.min(d.start.y, pt.wy),
      maxX: Math.max(d.start.x, pt.wx),
      maxY: Math.max(d.start.y, pt.wy),
    };
    const hitIdx = [];
    for (let i = 0; i < designState.shapes.length; i++) {
      const sb = DE.shapeBounds(designState.shapes[i]);
      if (sb && DE.boundsIntersect(sb, mb)) hitIdx.push(i);
    }
    // Atualiza a seleção *sem* reconstruir a lista de objetos a cada quadro
    // (RNF-11): a lista/propriedades só são atualizadas ao soltar o ponteiro.
    const set = new Set(d.base);
    for (const i of hitIdx) {
      for (const j of DE.expandSelection(designState.shapes, i)) set.add(j);
    }
    designState.selection = [...set].sort((x, y) => x - y);
    dRender();
    return;
  }

  if (d && d.mode === 'create' && designState.drawing) {
    const tool = designState.tool;
    const start = d.start;
    let x = designState.snap ? dSnapV(pt.wx) : pt.wx;
    let y = designState.snap ? dSnapV(pt.wy) : pt.wy;
    if (tool === 'rect') {
      if (e.shiftKey) {
        const s = Math.max(Math.abs(x - start.x), Math.abs(y - start.y));
        x = start.x + Math.sign(x - start.x || 1) * s;
        y = start.y + Math.sign(y - start.y || 1) * s;
      }
      const minX = Math.min(start.x, x);
      const minY = Math.min(start.y, y);
      designState.drawing.points = [
        { x: minX, y: minY },
        { x: minX + Math.abs(x - start.x), y: minY },
        { x: minX + Math.abs(x - start.x), y: minY + Math.abs(y - start.y) },
        { x: minX, y: minY + Math.abs(y - start.y) },
      ];
    } else if (tool === 'circle') {
      // Elipse inscrita na caixa do arraste (como no CorelDRAW).
      let w = Math.abs(x - start.x);
      let h = Math.abs(y - start.y);
      let minX = Math.min(start.x, x);
      let minY = Math.min(start.y, y);
      if (e.shiftKey) {
        const s = Math.max(w, h);
        w = s;
        h = s;
        minX = x >= start.x ? start.x : start.x - s;
        minY = y >= start.y ? start.y : start.y - s;
      }
      designState.drawing.points = window.GRBL_DESIGN
        ? window.GRBL_DESIGN.makeEllipse(
            minX + w / 2,
            minY + h / 2,
            w / 2,
            h / 2,
            64,
          )
        : [];
    } else if (tool === 'line') {
      if (e.shiftKey) {
        const ang = Math.atan2(y - start.y, x - start.x);
        const step = Math.PI / 12;
        const snapped = Math.round(ang / step) * step;
        const len = Math.hypot(x - start.x, y - start.y);
        x = start.x + Math.cos(snapped) * len;
        y = start.y + Math.sin(snapped) * len;
      }
      designState.drawing.points = [
        { x: start.x, y: start.y },
        { x, y },
      ];
    }
    dRender();
    return;
  }

  // Caneta (freehand): acumula pontos durante o arrasto
  if (d && d.mode === 'create' && designState.tool === 'pen') {
    const x = designState.snap ? dSnapV(pt.wx) : pt.wx;
    const y = designState.snap ? dSnapV(pt.wy) : pt.wy;
    // Evita pontos duplicados muito próximos (filtro leve)
    const last =
      designState.freehandPoints[designState.freehandPoints.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 0.5) {
      designState.freehandPoints.push({ x, y });
    }
    dRender();
    return;
  }

  // Edição de nós: arrasta o nó selecionado
  if (d && d.mode === 'node-edit' && designState.nodeEdit?.dragging) {
    const ne = designState.nodeEdit;
    const x = designState.snap ? dSnapV(pt.wx) : pt.wx;
    const y = designState.snap ? dSnapV(pt.wy) : pt.wy;
    const sh = designState.shapes[ne.shapeIndex];
    if (sh && ne.nodeIndex >= 0 && ne.nodeIndex < sh.points.length) {
      sh.points = DE.moveNode(sh.points, ne.nodeIndex, x, y);
      dRender();
      dUpdateProps();
    }
    return;
  }

  // cursor ocioso
  if (!d) {
    c.style.cursor =
      designState.tool === 'select'
        ? dCursorForSelect(pt.sx, pt.sy)
        : 'crosshair';
  }
}

function dOnPointerUp(e) {
  const c = el.designCanvas;
  const d = designState.drag;
  designState.drag = null;
  designState.guides = null;
  if (c.hasPointerCapture?.(e.pointerId)) {
    try {
      c.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  if (d && d.mode === 'pan') {
    c.style.cursor = designState.tool === 'select' ? 'default' : 'crosshair';
    return;
  }

  if (d && d.mode === 'create' && designState.tool === 'pen') {
    designState.drag = null;
    const pts = designState.freehandPoints;
    designState.freehandPoints = [];
    if (pts.length >= 3) {
      const sh = window.GRBL_DESIGN_EDITOR
        ? window.GRBL_DESIGN_EDITOR.createFreehandShape(pts, {
            tolerance: 0.5,
            closeThreshold: 1.0,
          })
        : null;
      if (sh) {
        sh.name = dNextName(sh.closed ? 'polygon' : 'line');
        dAddShape(sh);
      }
    }
    dUpdateButtons();
    return;
  }

  if (d && d.mode === 'node-edit' && designState.nodeEdit?.dragging) {
    designState.nodeEdit = null;
    designState.drag = null;
    dPushHistory();
    dRender();
    dUpdateProps();
    dUpdateObjectList();
    return;
  }

  if (d && d.mode === 'create' && designState.drawing) {
    const sh = designState.drawing;
    designState.drawing = null;
    const pts = sh.points;
    if (sh.kind === 'line' && pts.length >= 2) {
      const len = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (len >= 0.5) {
        sh.name = dNextName('line');
        dAddShape(sh);
      }
    } else if (sh.kind !== 'line' && pts.length >= 3) {
      const b = DE.shapeBounds(sh);
      if (b && (b.maxX - b.minX > 0.5 || b.maxY - b.minY > 0.5)) {
        sh.name = dNextName(sh.kind);
        dAddShape(sh);
      }
    }
    dUpdateButtons();
    return;
  }

  if (d && d.mode === 'marquee') {
    designState.marquee = null;
    dAfterSelection();
    return;
  }

  if (d && (d.mode === 'move' || d.mode === 'resize' || d.mode === 'rotate')) {
    if (d.dirty) dPushHistory();
    dRender();
    dUpdateProps();
    dUpdateObjectList();
    dUpdateStatus();
    dUpdateButtons();
    return;
  }

  dRender();
}

function dOnDblClick(e) {
  if (designState.tool !== 'select') return;
  const pt = dCanvasPoint(e);
  const tol = HIT_PX / designState.view.scale;
  const hit = DE.hitTest(designState.shapes, pt.wx, pt.wy, tol);
  if (hit < 0) return;
  const sh = designState.shapes[hit];
  if (!sh.text || !sh.group) return;
  const idxs = DE.expandSelection(designState.shapes, hit);
  const b = DE.selectionBounds(designState.shapes, idxs);
  dSelectShape(hit, false);
  dOpenTextEditor(
    { x: b ? b.minX : pt.wx, y: b ? b.minY : pt.wy },
    { group: sh.group, meta: sh.text, name: sh.name, indices: idxs },
  );
}

function dOnWheel(e) {
  e.preventDefault();
  const c = el.designCanvas;
  const r = c.getBoundingClientRect();
  const sx = e.clientX - r.left;
  const sy = e.clientY - r.top;
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  dZoomAt(sx, sy, factor);
}

// ------------------------------------------------------------------ teclado

function dDesignOpen() {
  return el.designOverlay && !el.designOverlay.classList.contains('hidden');
}

function dOnKeyDown(e) {
  if (!dDesignOpen()) return;
  const sizeOpen =
    dSizeDialogOpen() || dArrayDialogOpen() || dOffsetDialogOpen();
  const editor = $('designTextEditor');
  const editorOpen = editor && !editor.classList.contains('hidden');

  if (e.key === 'Escape') {
    if (sizeOpen) {
      dCloseSizeDialog();
      dCloseArrayDialog();
      dCloseOffsetDialog();
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    // Menu de booleanas aberto fecha só ele.
    if (dBoolMenuOpen()) {
      dCloseBoolMenu();
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    // Modo edição de nós: Esc sai do modo
    if (designState.nodeEdit) {
      designState.nodeEdit = null;
      dRender();
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    // O modal de posicionamento ("frame") abre por cima do editor: Esc fecha
    // só ele, mantendo o desenho à vista.
    if (el.frameOverlay && !el.frameOverlay.classList.contains('hidden')) {
      el.frameOverlay.classList.add('hidden');
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (editorOpen) {
      dCloseTextEditor();
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (designState.selection.length) {
      dClearSelection();
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    return; // deixa o handler global fechar o modal
  }

  // O modal “Posicionar a gravadora” abre por cima do editor. Enquanto ele
  // estiver aberto, nenhum atalho do desenho pode agir: o desenho não está à
  // vista e a tecla cairia no objeto errado (só o Esc acima o fecha).
  if (el.frameOverlay && !el.frameOverlay.classList.contains('hidden')) return;

  if (sizeOpen) return;
  if (editorOpen || typingInField(e.target)) return;

  const mod = e.ctrlKey || e.metaKey;
  const key = e.key;

  if (mod) {
    const k = key.toLowerCase();
    if (k === 'z' && !e.shiftKey) {
      e.preventDefault();
      dUndo();
      return;
    }
    if (k === 'y' || (k === 'z' && e.shiftKey)) {
      e.preventDefault();
      dRedo();
      return;
    }
    if (k === 'a') {
      e.preventDefault();
      dSelectAll();
      return;
    }
    if (k === 'd') {
      e.preventDefault();
      dDuplicateSelection();
      return;
    }
    if (k === 'c') {
      e.preventDefault();
      if (e.shiftKey) dCopyStyle();
      else dCopySelection();
      return;
    }
    if (k === 'v') {
      e.preventDefault();
      if (e.shiftKey) dPasteStyle();
      else dPasteClipboard();
      return;
    }
    if (k === 'g') {
      e.preventDefault();
      if (e.shiftKey) dUngroupSelection();
      else dGroupSelection();
      return;
    }
    if (key === ']') {
      e.preventDefault();
      dReorder(e.shiftKey ? 'front' : 'forward');
      return;
    }
    if (key === '[') {
      e.preventDefault();
      dReorder(e.shiftKey ? 'back' : 'backward');
      return;
    }
    return;
  }

  if (key === 'Delete' || key === 'Backspace') {
    // No modo edição de nós: remove o nó ativo
    if (designState.nodeEdit) {
      const ne = designState.nodeEdit;
      const sh = designState.shapes[ne.shapeIndex];
      if (sh) {
        const minPts = sh.closed ? 3 : 2;
        if (sh.points.length > minPts) {
          sh.points = DE.removeNode(sh.points, ne.nodeIndex, sh.closed);
          // Ajusta o índice se removeu o último
          if (ne.nodeIndex >= sh.points.length)
            ne.nodeIndex = sh.points.length - 1;
          dPushHistory();
          dRender();
          dUpdateProps();
          dUpdateObjectList();
        }
      }
      e.preventDefault();
      return;
    }
    if (designState.selection.length) {
      e.preventDefault();
      dDeleteSelection();
    }
    return;
  }

  const step = designState.snap && designState.grid > 0 ? designState.grid : 1;
  const mult = e.shiftKey ? 10 : 1;
  if (key === 'ArrowLeft') {
    e.preventDefault();
    dNudge(-step * mult, 0);
    return;
  }
  if (key === 'ArrowRight') {
    e.preventDefault();
    dNudge(step * mult, 0);
    return;
  }
  if (key === 'ArrowUp') {
    e.preventDefault();
    dNudge(0, -step * mult);
    return;
  }
  if (key === 'ArrowDown') {
    e.preventDefault();
    dNudge(0, step * mult);
    return;
  }

  if (key === 'v' || key === 'V') dSetTool('select');
  else if (key === 'r' || key === 'R') dSetTool('rect');
  else if (key === 'e' || key === 'E') dSetTool('circle');
  else if (key === 'l' || key === 'L') dSetTool('line');
  else if (key === 'p' || key === 'P') dSetTool('pen');
  else if (key === 'n' || key === 'N') dSetTool('node');
  else if (key === 't' || key === 'T') dSetTool('text');
  else if (key === '+' || key === '=')
    dZoomAt(designState.pxW / 2, designState.pxH / 2, 1.2);
  else if (key === '-' || key === '_')
    dZoomAt(designState.pxW / 2, designState.pxH / 2, 1 / 1.2);
  else if (key === '0') {
    designState.view.scale = 4;
    dUpdateZoom();
    dRender();
  } else if (key === 'f' || key === 'F') {
    dFitPage();
    dUpdateZoom();
    dRender();
  }
}

// ------------------------------------------------------------------ página

function dApplyPageSize() {
  const w = dNum('designPageW', 150) || 150;
  const h = dNum('designPageH', 130) || 130;
  designState.page = { w: dClamp(w, 1, 2000), h: dClamp(h, 1, 2000) };
  try {
    localStorage.setItem('grbl-design-page', JSON.stringify(designState.page));
  } catch {
    /* ignore */
  }
  dUpdateDocBadge();
  dFitPage();
  dUpdateZoom();
  dRender();
}

/** Chave das preferências do desenho (parâmetros de gravação + texto). */
const D_PREFS_KEY = 'grbl-design-prefs';
/** Campos cuja alteração é persistida entre sessões. */
const D_PREF_IDS = new Set([
  'designSpeed',
  'designPower',
  'designPasses',
  'designMode',
  'designGrid',
  'designTextFont',
  'designTextSize',
  'designTextMode',
  'designTextBold',
  'designTextSpacing',
]);

/** Guarda velocidade/potência/passadas/modo e o último texto usado. */
function dSaveDesignPrefs() {
  try {
    localStorage.setItem(
      D_PREFS_KEY,
      JSON.stringify({
        speed: dNum('designSpeed', 1000) || 1000,
        power: dNum('designPower', 100) ?? 100,
        passes: dNum('designPasses', 1) || 1,
        mode: $('designMode') ? $('designMode').value : 'M4',
        grid: dNum('designGrid', 5) || 5,
        text: {
          font: $('designTextFont') ? $('designTextFont').value : '',
          size: dNum('designTextSize', 10) || 10,
          mode: $('designTextMode') ? $('designTextMode').value : 'vector',
          bold: $('designTextBold') ? $('designTextBold').checked : true,
          spacing: dNum('designTextSpacing', 5) || 5,
        },
      }),
    );
  } catch {
    /* sem localStorage: segue com os padrões */
  }
}

/** Restaura as preferências do desenho. */
function dRestoreDesignPrefs() {
  let p = null;
  try {
    const raw = localStorage.getItem(D_PREFS_KEY);
    if (raw) p = JSON.parse(raw);
  } catch {
    p = null;
  }
  if (!p || typeof p !== 'object') return;
  const put = (id, value) => {
    const node = $(id);
    if (node && value !== undefined && value !== null && value !== '') {
      node.value = String(value);
    }
  };
  put('designSpeed', p.speed);
  put('designPower', p.power);
  put('designPasses', p.passes);
  put('designGrid', p.grid);
  const mode = $('designMode');
  if (mode && (p.mode === 'M3' || p.mode === 'M4')) mode.value = p.mode;
  const text = p.text;
  if (text && typeof text === 'object') {
    put('designTextFont', text.font);
    put('designTextSize', text.size);
    put('designTextSpacing', text.spacing);
    const tm = $('designTextMode');
    if (tm && typeof text.mode === 'string') tm.value = text.mode;
    const tb = $('designTextBold');
    if (tb && typeof text.bold === 'boolean') tb.checked = text.bold;
  }
}

function dLoadPrefs() {
  let page = null;
  try {
    const raw = localStorage.getItem('grbl-design-page');
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.w > 0 && p.h > 0) page = { w: p.w, h: p.h };
    }
  } catch {
    /* ignore */
  }
  // Sem preferência salva, a página parte da área real da máquina ($130/$131):
  // quem tem 400 × 400 não precisa corrigir o tamanho toda vez.
  const wa = previewProgram?.workArea;
  if (!page && wa && wa.widthMm > 0 && wa.heightMm > 0) {
    page = { w: Math.round(wa.widthMm), h: Math.round(wa.heightMm) };
  }
  if (page) designState.page = page;
  const w = $('designPageW');
  if (w) w.value = String(designState.page.w);
  const h = $('designPageH');
  if (h) h.value = String(designState.page.h);
  dRestoreDesignPrefs();
  dRestoreLayers();
  dEnsureLayers();
}

// --------------------------------------------------------------- modal/open

async function openDesignModal() {
  if (!el.designOverlay) return;
  await ensureDesign();
  el.designOverlay.classList.remove('hidden');
  if (!DE) {
    appendLine('Módulo de edição não carregado.', 'error');
    return;
  }
  dLoadPrefs();
  const g = $('designGrid');
  if (g) designState.grid = Number(g.value) || 5;
  designState.tool = 'select';
  designState.drawing = null;
  designState.drag = null;
  designState.marquee = null;
  designState.rotApplied = 0;
  dCloseTextEditor();
  dSetTool('select');
  dLoadSystemFonts();
  if (!designState.history.length) dPushHistory();
  requestAnimationFrame(() => {
    dResizeCanvas();
    dFitPage();
    dUpdateZoom();
    dUpdateProps();
    dUpdateLayerList();
    dUpdateLayerEditor();
    dUpdateObjectList();
    dUpdateStatus();
    dUpdateButtons();
    dUpdateDocBadge();
    dRender();
  });
}

function closeDesignModal() {
  dCloseTextEditor();
  dCloseSizeDialog();
  dCloseArrayDialog();
  dCloseOffsetDialog();
  dCloseBoolMenu();
  if (el.designOverlay) el.designOverlay.classList.add('hidden');
}

// ------------------------------------------------------------ gerar G-code

function dReadEngraveOptions() {
  const sMax = Number($('imgSmax') ? $('imgSmax').value : 1000) || 1000;
  return {
    feed: dNum('designSpeed', 1000) || 1000,
    travelFeed: 3000,
    sMax,
    powerPercent: dNum('designPower', 100) || 100,
    passes: dNum('designPasses', 1) || 1,
    mode: $('designMode') && $('designMode').value === 'M3' ? 'M3' : 'M4',
  };
}

/**
 * Copia potência/velocidade/passadas do modal de posicionamento para os campos
 * de gravação da prancheta (o modal é onde o usuário confere antes de gravar).
 */
function dFrameParamsToDesign() {
  const put = (id, value) => {
    const input = $(id);
    if (input) input.value = String(value);
  };
  if (el.frameSpeed) {
    put(
      'designSpeed',
      Math.max(100, Math.min(20000, Number(el.frameSpeed.value) || 1000)),
    );
  }
  if (el.framePower) {
    put(
      'designPower',
      Math.max(0, Math.min(100, Number(el.framePower.value) || 0)),
    );
  }
  if (el.framePasses) {
    put(
      'designPasses',
      Math.max(1, Math.min(10, Number(el.framePasses.value) || 1)),
    );
  }
}

/**
 * Gera o G-code do desenho. Com `autoStart`, inicia o envio em seguida — usado
 * pelo "▶ Gravar" do modal de posicionamento.
 */
function designGenerate({ autoStart = false } = {}) {
  if (!window.GRBL_DESIGN) {
    appendLine('Módulo de desenho não carregado.', 'error');
    return;
  }
  if (!designState.shapes.length) {
    dStatus(t('design.status.needShape'), 'error');
    return;
  }
  dStatus(t('design.status.generating'));
  const gcode = window.GRBL_DESIGN.designToGcode(
    {
      shapes: designState.shapes,
      width: designState.page.w,
      height: designState.page.h,
      layers: designState.layers,
    },
    dReadEngraveOptions(),
  );
  applyJobLines('design.gcode', gcode, 'design');
  dStatus(t('design.status.done'), 'ok');
  if (autoStart && state.connected) {
    closeFrameModal();
    // O editor cobre a janela inteira: fechá-lo antes de queimar mostra o DRO,
    // o progresso e o Pausar/Cancelar durante o job.
    closeDesignModal();
    beginJob(0);
    return;
  }
  openFrameModal();
}

async function designSave() {
  if (!window.GRBL_DESIGN || !designState.shapes.length) return;
  const gcode = window.GRBL_DESIGN.designToGcode(
    {
      shapes: designState.shapes,
      width: designState.page.w,
      height: designState.page.h,
      layers: designState.layers,
    },
    dReadEngraveOptions(),
  );
  try {
    const path = await window.grbl.saveGcode(gcode, 'design.gcode');
    if (path) appendLine(t('file.saved', { path }), 'ok');
  } catch (err) {
    appendLine(t('err.prefix', { msg: err.message }), 'error');
  }
}

// ------------------------------------------------------- tamanho da arte
//
// "Gerar e visualizar" pergunta o tamanho final da arte. Com o cadeado
// travado (padrão), preencher um lado ajusta o outro na mesma proporção;
// destravado, permite redimensionar livremente (distorce).

function dArtBounds() {
  return DE.selectionBounds(
    designState.shapes,
    designState.shapes.map((_, i) => i),
  );
}

function dSizeDialogOpen() {
  const o = el.designSizeOverlay;
  return Boolean(o && !o.classList.contains('hidden'));
}

function dOpenSizeDialog() {
  if (!designState.shapes.length) {
    dStatus(t('design.status.needShape'), 'error');
    return;
  }
  const b = dArtBounds();
  if (!b) return;
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  designState.sizeBounds = b;
  designState.sizeAspect = w > 0.01 && h > 0.01 ? w / h : null;
  if (designState.sizeLock === undefined) designState.sizeLock = true;
  const W = $('designSizeW');
  const H = $('designSizeH');
  if (W) W.value = (w > 0.01 ? w : 1).toFixed(1);
  if (H) H.value = (h > 0.01 ? h : 1).toFixed(1);
  const lock = $('designSizeLock');
  if (lock) {
    lock.classList.toggle('active', designState.sizeLock);
    lock.disabled = designState.sizeAspect === null;
    lock.title = t('design.lockAspect');
  }
  const hint = $('designSizeHint');
  if (hint)
    hint.textContent = t('design.size.current', {
      w: w.toFixed(1),
      h: h.toFixed(1),
    });
  if (el.designSizeOverlay) el.designSizeOverlay.classList.remove('hidden');
  if (W) {
    W.focus();
    W.select();
  }
}

function dCloseSizeDialog() {
  if (el.designSizeOverlay) el.designSizeOverlay.classList.add('hidden');
}

/** Preenche o outro lado mantendo a proporção (cadeado travado). */
function dSizeSync(source) {
  if (!designState.sizeLock || !designState.sizeAspect) return;
  const W = $('designSizeW');
  const H = $('designSizeH');
  if (!W || !H) return;
  if (source === 'w') {
    const w = Number(W.value);
    if (Number.isFinite(w) && w > 0)
      H.value = (w / designState.sizeAspect).toFixed(1);
  } else {
    const h = Number(H.value);
    if (Number.isFinite(h) && h > 0)
      W.value = (h * designState.sizeAspect).toFixed(1);
  }
}

/** Aplica o tamanho pedido (escala a arte em torno do canto superior esquerdo). */
function dConfirmSize() {
  const b = designState.sizeBounds || dArtBounds();
  const w = dNum('designSizeW', 0);
  const h = dNum('designSizeH', 0);
  if (!b || !(w > 0) || !(h > 0)) {
    dStatus(t('design.size.invalid'), 'error');
    return;
  }
  const curW = b.maxX - b.minX;
  const curH = b.maxY - b.minY;
  const sx = curW > 0.01 ? w / curW : 1;
  const sy = curH > 0.01 ? h / curH : 1;
  if (Math.abs(sx - 1) > 1e-6 || Math.abs(sy - 1) > 1e-6) {
    for (const sh of designState.shapes) {
      for (const p of sh.points) {
        p.x = b.minX + (p.x - b.minX) * sx;
        p.y = b.minY + (p.y - b.minY) * sy;
      }
    }
    dPushHistory();
    dRender();
    dUpdateProps();
    dUpdateObjectList();
    dUpdateStatus();
  }
  dCloseSizeDialog();
  designGenerate();
}

// -------------------------------------------------------------------- wiring

(function wireDesign() {
  const overlay = el.designOverlay;
  const canvas = el.designCanvas;
  if (!overlay || !canvas) return;

  const closeBtn = $('designClose');
  if (closeBtn) closeBtn.addEventListener('click', closeDesignModal);
  const maxBtn = $('designMaximize');
  if (maxBtn) {
    maxBtn.addEventListener('click', () => {
      const m = overlay.querySelector('.design-modal');
      if (!m) return;
      m.classList.toggle('maximized');
      requestAnimationFrame(() => {
        dResizeCanvas();
        dFitPage();
        dUpdateZoom();
        dRender();
      });
    });
  }

  const toolTools = {
    designToolSelect: 'select',
    designToolRect: 'rect',
    designToolCircle: 'circle',
    designToolLine: 'line',
    designToolPen: 'pen',
    designToolNode: 'node',
    designToolText: 'text',
  };
  for (const [id, tool] of Object.entries(toolTools)) {
    const node = $(id);
    if (node) node.addEventListener('click', () => dSetTool(tool));
  }

  const actions = {
    designUndo: dUndo,
    designRedo: dRedo,
    designDelete: dDeleteSelection,
    designClear: dClearAll,
    designDuplicate: dDuplicateSelection,
    designArray: dOpenArrayDialog,
    designMirrorH: () => dMirror('h'),
    designMirrorV: () => dMirror('v'),
    designDistH: () => dDistribute('h'),
    designDistV: () => dDistribute('v'),
    designGroup: dGroupSelection,
    designUngroup: dUngroupSelection,
    designAlignLeft: () => dAlign('left'),
    designAlignCenter: () => dAlign('center'),
    designAlignRight: () => dAlign('right'),
    designAlignTop: () => dAlign('top'),
    designAlignMiddle: () => dAlign('middle'),
    designAlignBottom: () => dAlign('bottom'),
    designFront: () => dReorder('front'),
    designForward: () => dReorder('forward'),
    designBackward: () => dReorder('backward'),
    designBack: () => dReorder('back'),
    designZoomIn: () => dZoomAt(designState.pxW / 2, designState.pxH / 2, 1.2),
    designZoomOut: () =>
      dZoomAt(designState.pxW / 2, designState.pxH / 2, 1 / 1.2),
    designZoomFit: () => {
      dFitPage();
      dUpdateZoom();
      dRender();
    },
    designZoom100: () => {
      designState.view.scale = 4;
      dUpdateZoom();
      dRender();
    },
  };
  for (const [id, fn] of Object.entries(actions)) {
    const node = $(id);
    if (node) node.addEventListener('click', fn);
  }

  const lock = $('designLockAspect');
  if (lock) {
    lock.addEventListener('click', () => {
      designState.lockAspect = !designState.lockAspect;
      dUpdateButtons();
    });
  }

  const snap = $('designSnap');
  if (snap) {
    snap.checked = designState.snap;
    snap.addEventListener('change', () => {
      designState.snap = snap.checked;
    });
  }
  const grid = $('designGrid');
  if (grid) {
    grid.addEventListener('change', () => {
      designState.grid = dClamp(Number(grid.value) || 5, 0.5, 50);
      grid.value = String(designState.grid);
      dRender();
    });
  }

  for (const id of ['designPageW', 'designPageH']) {
    const node = $(id);
    if (node) node.addEventListener('change', dApplyPageSize);
  }

  for (const id of [
    'designPropX',
    'designPropY',
    'designPropW',
    'designPropH',
    'designPropRot',
  ]) {
    const node = $(id);
    if (node) node.addEventListener('change', dApplyProps);
  }
  // Potência/velocidade/passadas/espessura por objeto têm handler próprio: só
  // agem quando o campo é realmente editado (não apagam as exceções ao mexer na
  // geometria).
  for (const id of [
    'designObjPower',
    'designObjSpeed',
    'designObjPasses',
    'designObjWidth',
  ]) {
    const node = $(id);
    if (node) node.addEventListener('change', dApplyObjStyle);
  }
  // O campo em px é outra unidade da mesma espessura (1 px = 0,25 mm).
  const widthPx = $('designObjWidthPx');
  if (widthPx) widthPx.addEventListener('change', dApplyObjWidthPx);
  const styleCopy = $('designCopyStyle');
  if (styleCopy) styleCopy.addEventListener('click', dCopyStyle);
  const stylePaste = $('designPasteStyle');
  if (stylePaste) stylePaste.addEventListener('click', dPasteStyle);

  // camadas / multi-operação
  const layerAdd = $('designLayerAdd');
  if (layerAdd) layerAdd.addEventListener('click', dAddLayer);
  const layerDelete = $('designLayerDelete');
  if (layerDelete) layerDelete.addEventListener('click', dDeleteLayer);
  const layerUp = $('designLayerUp');
  if (layerUp) layerUp.addEventListener('click', () => dMoveLayerBy(-1));
  const layerDown = $('designLayerDown');
  if (layerDown) layerDown.addEventListener('click', () => dMoveLayerBy(1));
  const layerAssign = $('designLayerAssign');
  if (layerAssign)
    layerAssign.addEventListener('click', dAssignSelectionToLayer);
  const layerName = $('designLayerName');
  if (layerName) {
    layerName.addEventListener('input', dApplyLayerName);
    layerName.addEventListener('change', dApplyLayerName);
  }
  for (const [id, key, lo, hi] of [
    ['designLayerPower', 'power', 0, 100],
    ['designLayerSpeed', 'speed', 100, 20000],
    ['designLayerPasses', 'passes', 1, 99],
  ]) {
    const node = $(id);
    if (node) {
      node.addEventListener('change', () => dApplyLayerParam(id, key, lo, hi));
    }
  }
  const layerMode = $('designLayerMode');
  if (layerMode) layerMode.addEventListener('change', dApplyLayerMode);

  const genBtn = $('designGenerate');
  if (genBtn) genBtn.addEventListener('click', dOpenSizeDialog);
  const saveBtn = $('designSave');
  if (saveBtn) saveBtn.addEventListener('click', designSave);

  // diálogo "tamanho da arte"
  const sizeConfirm = $('designSizeConfirm');
  if (sizeConfirm) sizeConfirm.addEventListener('click', dConfirmSize);
  const sizeCancel = $('designSizeCancel');
  if (sizeCancel) sizeCancel.addEventListener('click', dCloseSizeDialog);
  const sizeClose = $('designSizeClose');
  if (sizeClose) sizeClose.addEventListener('click', dCloseSizeDialog);
  const sizeW = $('designSizeW');
  if (sizeW) {
    sizeW.addEventListener('input', () => dSizeSync('w'));
    sizeW.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        dConfirmSize();
      }
    });
  }
  const sizeH = $('designSizeH');
  if (sizeH) {
    sizeH.addEventListener('input', () => dSizeSync('h'));
    sizeH.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        dConfirmSize();
      }
    });
  }
  const sizeLock = $('designSizeLock');
  if (sizeLock) {
    sizeLock.addEventListener('click', () => {
      designState.sizeLock = !designState.sizeLock;
      sizeLock.classList.toggle('active', designState.sizeLock);
    });
  }
  if (el.designSizeOverlay) {
    el.designSizeOverlay.addEventListener('click', (e) => {
      if (e.target === el.designSizeOverlay) dCloseSizeDialog();
    });
  }

  // diálogo "matriz de cópias"
  const arrConfirm = $('designArrayConfirm');
  if (arrConfirm) arrConfirm.addEventListener('click', dConfirmArray);
  const arrCancel = $('designArrayCancel');
  if (arrCancel) arrCancel.addEventListener('click', dCloseArrayDialog);
  const arrClose = $('designArrayClose');
  if (arrClose) arrClose.addEventListener('click', dCloseArrayDialog);
  for (const id of [
    'designArrayCols',
    'designArrayRows',
    'designArrayStepX',
    'designArrayStepY',
  ]) {
    const node = $(id);
    if (node) {
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          dConfirmArray();
        }
      });
    }
  }
  if (el.designArrayOverlay) {
    el.designArrayOverlay.addEventListener('click', (e) => {
      if (e.target === el.designArrayOverlay) dCloseArrayDialog();
    });
  }

  // booleanas e contorno paralelo
  if (el.designBoolMenu) {
    el.designBoolMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      dToggleBoolMenu();
    });
  }
  for (const [id, op] of [
    ['designBoolUnion', 'union'],
    ['designBoolSubtract', 'difference'],
    ['designBoolIntersect', 'intersection'],
    ['designBoolXor', 'xor'],
  ]) {
    const node = $(id);
    if (node) {
      node.addEventListener('click', () => {
        dCloseBoolMenu();
        dBooleanOp(op);
      });
    }
  }
  const offsetBtn = $('designBoolOffset');
  if (offsetBtn) {
    offsetBtn.addEventListener('click', () => {
      dCloseBoolMenu();
      dOpenOffsetDialog();
    });
  }
  document.addEventListener('pointerdown', (e) => {
    if (!dBoolMenuOpen()) return;
    const wrap = el.designBoolMenu ? el.designBoolMenu.parentElement : null;
    if (wrap && e.target instanceof Node && wrap.contains(e.target)) return;
    dCloseBoolMenu();
  });
  for (const id of ['designOffsetDist', 'designOffsetPasses']) {
    const node = $(id);
    if (node) {
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          dConfirmOffset();
        }
      });
    }
  }
  const offsetConfirm = $('designOffsetConfirm');
  if (offsetConfirm) offsetConfirm.addEventListener('click', dConfirmOffset);
  const offsetCancel = $('designOffsetCancel');
  if (offsetCancel) offsetCancel.addEventListener('click', dCloseOffsetDialog);
  const offsetClose = $('designOffsetClose');
  if (offsetClose) offsetClose.addEventListener('click', dCloseOffsetDialog);
  if (el.designOffsetOverlay) {
    el.designOffsetOverlay.addEventListener('click', (e) => {
      if (e.target === el.designOffsetOverlay) dCloseOffsetDialog();
    });
  }

  // editor de texto
  const textAdd = $('designTextAdd');
  if (textAdd) textAdd.addEventListener('click', dCommitText);
  const textCancel = $('designTextCancel');
  if (textCancel) textCancel.addEventListener('click', dCloseTextEditor);
  const textClose = $('designTextClose');
  if (textClose) textClose.addEventListener('click', dCloseTextEditor);
  const textValue = $('designTextValue');
  if (textValue) {
    textValue.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        dCommitText();
      }
    });
  }
  const textMode = $('designTextMode');
  if (textMode) textMode.addEventListener('change', dSyncTextModeUi);
  dSyncTextModeUi();
  // Lembra parâmetros de gravação/texto entre sessões (abrir → desenhar → gravar).
  if (el.designOverlay) {
    el.designOverlay.addEventListener('change', (e) => {
      const id = e.target?.id;
      if (id && D_PREF_IDS.has(id)) dSaveDesignPrefs();
    });
  }

  // ponteiro/canvas
  canvas.addEventListener('pointerdown', dOnPointerDown);
  canvas.addEventListener('pointermove', dOnPointerMove);
  canvas.addEventListener('pointerup', dOnPointerUp);
  canvas.addEventListener('pointercancel', dOnPointerUp);
  canvas.addEventListener('dblclick', dOnDblClick);
  canvas.addEventListener('wheel', dOnWheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerleave', () => {
    designState.cursor.inside = false;
  });

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      if (!dDesignOpen()) return;
      dResizeCanvas();
      dRender();
    });
    ro.observe(canvas);
  }

  document.addEventListener('keydown', dOnKeyDown);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && dDesignOpen() && !typingInField(e.target)) {
      designState.space = true;
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') designState.space = false;
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDesignModal();
  });
})();

/** Alterna o rótulo Conectar/Desconectar do botão dentro do modal (RF-CON-1). */
function updateFrameConnectButton() {
  if (!el.frameConnect) return;
  const connecting = state.connection === 'connecting';
  el.frameConnect.textContent = state.connected
    ? t('conn.disconnect')
    : t('frame.connect');
  el.frameConnect.classList.toggle('primary', !state.connected && !connecting);
  el.frameConnect.disabled = connecting;
  if (el.frameStatus) {
    el.frameStatus.textContent = state.connected
      ? t('frame.status.connected')
      : connecting
        ? t('conn.connecting')
        : t('frame.status.disconnected');
  }
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

// ------------------------------------------------------ QR Code (v0.6, RF-SYM-1)

/** Preenche o seletor de versão (0 = automática) uma única vez. */
function populateQrVersions() {
  if (!el.qrVersion || el.qrVersion.options.length > 1) return;
  for (let v = 1; v <= 40; v++) {
    const opt = document.createElement('option');
    opt.value = String(v);
    opt.textContent = String(v);
    el.qrVersion.appendChild(opt);
  }
}

async function openQrModal() {
  if (!el.qrOverlay) return;
  await requireBundle('qrcode.js');
  populateQrVersions();
  populateDmSizes();
  syncQrSymbology({ applyDefaults: false });
  syncGridField(el.qrGrid, el.qrGridColsField, el.qrGridGapField);
  el.qrOverlay.classList.remove('hidden');
  if (el.qrStatus) el.qrStatus.textContent = '';
  if (el.qrContent) el.qrContent.focus();
}

/** Preenche o seletor de tamanho do Data Matrix (0 = automático) uma vez. */
function populateDmSizes() {
  if (!el.dmSize || el.dmSize.options.length > 0) return;
  const auto = document.createElement('option');
  auto.value = '0';
  auto.textContent = t('dm.sizeAuto');
  el.dmSize.appendChild(auto);
  const sizes = window.GRBL_QR?.DATA_MATRIX_SIZES ?? [];
  for (const entry of sizes) {
    const opt = document.createElement('option');
    opt.value = String(entry.size);
    opt.textContent = `${entry.size} × ${entry.size}`;
    el.dmSize.appendChild(opt);
  }
}

/** Mostra só os campos do símbolo escolhido (QR, Data Matrix, PDF417 ou Aztec). */
function syncQrSymbology({ applyDefaults = true } = {}) {
  const value = el.qrSymbology?.value;
  const kind =
    value === 'datamatrix'
      ? 'datamatrix'
      : value === 'pdf417'
        ? 'pdf417'
        : value === 'aztec'
          ? 'aztec'
          : 'qr';
  const isDm = kind === 'datamatrix';
  const isPdf = kind === 'pdf417';
  const isAztec = kind === 'aztec';
  if (el.qrEccField)
    el.qrEccField.classList.toggle('hidden', isDm || isPdf || isAztec);
  if (el.qrVersionField)
    el.qrVersionField.classList.toggle('hidden', isDm || isPdf || isAztec);
  // A quiet zone do Data Matrix é 1 módulo (norma) — mostrada no status.
  if (el.qrQuietField) el.qrQuietField.classList.toggle('hidden', isDm);
  if (el.dmSizeField) el.dmSizeField.classList.toggle('hidden', !isDm);
  // O PDF417 cresce em linhas; o tamanho é dirigido por módulo + altura da linha.
  if (el.qrSizeField) el.qrSizeField.classList.toggle('hidden', isPdf);
  if (el.qrPdfEccField) el.qrPdfEccField.classList.toggle('hidden', !isPdf);
  if (el.qrPdfColsField) el.qrPdfColsField.classList.toggle('hidden', !isPdf);
  if (el.qrPdfRowHeightField) {
    el.qrPdfRowHeightField.classList.toggle('hidden', !isPdf);
  }
  // O Aztec tem correção de erro em % (ISO/IEC 24778 pede no mínimo 23 %).
  if (el.qrAztecEccField)
    el.qrAztecEccField.classList.toggle('hidden', !isAztec);
  if (applyDefaults && el.qrQuiet) {
    el.qrQuiet.value = isDm ? '1' : isPdf ? '2' : isAztec ? '1' : '4';
  }
  if (el.qrTitle) {
    el.qrTitle.textContent = isDm
      ? t('dm.title')
      : isPdf
        ? t('pdf.title')
        : isAztec
          ? t('aztec.title')
          : t('qr.title');
  }
  if (el.qrModule && applyDefaults) el.qrModule.value = isPdf ? '0.4' : '0.5';
  if (el.qrPdfEcc && el.qrPdfEcc.options.length === 0) {
    populatePdfEcc();
  }
}

/** Preenche o seletor de nível de correção de erro do PDF417 uma única vez. */
function populatePdfEcc() {
  if (!el.qrPdfEcc || el.qrPdfEcc.options.length > 0) return;
  for (let level = 0; level <= 8; level++) {
    const opt = document.createElement('option');
    opt.value = String(level);
    opt.textContent = t('qr.pdf.eccOption', {
      level,
      ec: 2 ** (level + 1),
    });
    el.qrPdfEcc.appendChild(opt);
  }
  el.qrPdfEcc.value = '2';
}

function closeQrModal() {
  if (el.qrOverlay) el.qrOverlay.classList.add('hidden');
}

/** Lista de conteúdos da grade: uma linha não vazia por símbolo (RF-SYM-9). */
function gridItems(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Mostra/esconde os campos de colunas/espaçamento conforme a grade. */
function syncGridField(toggle, colsField, gapField) {
  const on = Boolean(toggle?.checked);
  if (colsField) colsField.classList.toggle('hidden', !on);
  if (gapField) gapField.classList.toggle('hidden', !on);
}

/** Status da grade (comum a 2D e 1D): dimensões e avisos agregados. */
function gridStatusText(result, warnPrefix) {
  const parts = [
    t('sym.status.grid', {
      count: result.count,
      cols: result.columns,
      rows: result.rows,
      w: result.widthMm.toFixed(1),
      h: result.heightMm.toFixed(1),
    }),
  ];
  if (result.warnings?.length) {
    parts.push(
      ...result.warnings.map((code) => `⚠ ${t(`${warnPrefix}.${code}`)}`),
    );
  }
  return parts.join(' ');
}

function readQrOptions() {
  const clampNum = (input, min, max, fallback) => {
    const raw = Number(input ? input.value : Number.NaN);
    if (!Number.isFinite(raw)) return fallback;
    return Math.max(min, Math.min(max, raw));
  };
  /** Alvo de tamanho em mm: vazio/inválido = `undefined` (usa o módulo). */
  const targetNum = (input) => {
    const raw = Number(input ? input.value : Number.NaN);
    if (!Number.isFinite(raw) || raw <= 0) return undefined;
    return Math.max(1, Math.min(1000, raw));
  };
  const version = clampNum(el.qrVersion, 0, 40, 0);
  const value = el.qrSymbology?.value;
  const isDm = value === 'datamatrix';
  const isPdf = value === 'pdf417';
  const isAztec = value === 'aztec';
  const dmSize = clampNum(el.dmSize, 0, 144, 0);
  /** Inteiro positivo do input, ou `'auto'` quando vazio/inválido. */
  const autoInt = (input, min, max) => {
    const raw = Number(input ? input.value : Number.NaN);
    if (!Number.isFinite(raw) || raw <= 0) return 'auto';
    return Math.round(Math.max(min, Math.min(max, raw)));
  };
  return {
    symbology: isDm
      ? 'datamatrix'
      : isPdf
        ? 'pdf417'
        : isAztec
          ? 'aztec'
          : 'qr',
    ecc: el.qrEcc?.value || 'M',
    version: version > 0 ? Math.round(version) : 'auto',
    size: dmSize > 0 ? Math.round(dmSize) : 'auto',
    // PDF417 (RF-SYM-7).
    pdfEcc: Math.round(clampNum(el.qrPdfEcc, 0, 8, 2)),
    pdfColumns: autoInt(el.qrPdfCols, 1, 30),
    pdfRowHeightMm: clampNum(el.qrPdfRowHeight, 0.1, 50, 1.2),
    // Aztec (RF-SYM-7): correção de erro em % (a norma pede no mínimo 23 %).
    aztecEccPercent: Math.round(clampNum(el.qrAztecEcc, 23, 90, 33)),
    targetWidthMm: targetNum(el.qrWidth),
    targetHeightMm: targetNum(el.qrHeight),
    moduleMm: clampNum(el.qrModule, 0.05, 20, isPdf ? 0.4 : 0.5),
    // Data Matrix: quiet zone de 1 módulo (ISO/IEC 16022), não configurável.
    quietZoneModules: isDm
      ? 1
      : Math.round(clampNum(el.qrQuiet, 0, 10, isPdf ? 2 : 4)),
    linesPerMm: Math.round(clampNum(el.qrLines, 1, 40, 10)),
    powerPercent: clampNum(el.qrPower, 0, 100, 100),
    feed: Math.round(clampNum(el.qrFeed, 1, 20000, 1000)),
    passes: Math.round(clampNum(el.qrPasses, 1, 10, 1)),
    mode: el.qrMode && el.qrMode.value === 'M3' ? 'M3' : 'M4',
    overscanMm: clampNum(el.qrOverscan, 0, 5, 0),
    invert: Boolean(el.qrInvert?.checked),
    grid: Boolean(el.qrGrid?.checked),
    gridColumns: Math.round(clampNum(el.qrGridCols, 0, 50, 0)),
    gridGapMm: clampNum(el.qrGridGap, 0, 200, 5),
  };
}

/** "Quadrado" ligado copia a largura na altura (e vice-versa) ao digitar. */
function syncQrSize(source) {
  if (!source || !el.qrKeepAspect?.checked) return;
  const other = source === el.qrWidth ? el.qrHeight : el.qrWidth;
  if (other) other.value = source.value;
}

/** Texto da linha de status: dimensões, módulo e avisos de legibilidade. */
function qrStatusText(result) {
  if (result.count !== undefined) return gridStatusText(result, 'qr.warn');
  const fmt2 = (v) => v.toFixed(2);
  let done;
  if (result.pdf417) {
    done = t('pdf.status.done', {
      rows: result.pdf417.rows,
      cols: result.pdf417.columns,
      ecc: result.pdf417.eccLevel,
      w: result.widthMm.toFixed(1),
      h: result.heightMm.toFixed(1),
      module: fmt2(result.moduleMm),
      row: fmt2(result.rowHeightMm),
    });
  } else if (result.aztec) {
    done = t('aztec.status.done', {
      size: result.aztec.size,
      layers: result.aztec.layers,
      w: result.widthMm.toFixed(1),
      h: result.heightMm.toFixed(1),
      module: fmt2(result.moduleMm),
    });
  } else {
    const moduleText =
      Math.abs(result.moduleMm - result.moduleYMm) < 1e-9
        ? fmt2(result.moduleMm)
        : `${fmt2(result.moduleMm)} × ${fmt2(result.moduleYMm)}`;
    done = result.datamatrix
      ? t('dm.status.done', {
          size: result.datamatrix.size,
          w: result.widthMm.toFixed(1),
          h: result.heightMm.toFixed(1),
          module: moduleText,
        })
      : t('qr.status.done', {
          version: `v${result.qr.version}-${result.qr.ecc}`,
          size: result.qr.size,
          w: result.widthMm.toFixed(1),
          h: result.heightMm.toFixed(1),
          module: moduleText,
        });
  }
  const parts = [done];
  if (result.warnings?.length) {
    parts.push(...result.warnings.map((code) => `⚠ ${t(`qr.warn.${code}`)}`));
  }
  return parts.join(' ');
}

async function generateQr() {
  if (!window.GRBL_QR) {
    appendLine(t('qr.moduleMissing'), 'error');
    return;
  }
  const opts = readQrOptions();
  const hasContent = opts.grid
    ? gridItems(el.qrContent?.value).length > 0
    : Boolean(el.qrContent?.value.trim());
  if (!hasContent) {
    const prefix = symbolErrPrefix(opts.symbology);
    if (el.qrStatus) el.qrStatus.textContent = t(`${prefix}.err.empty`);
    return;
  }
  if (el.qrStatus) el.qrStatus.textContent = t('qr.status.generating');
  let result;
  try {
    result = generate2dGcode(opts);
  } catch (err) {
    // QrError/DataMatrixError trazem um `code` estável → mensagem do i18n.
    // Sem `code` (falha inesperada do encoder) cai no genérico da simbologia.
    const prefix = symbolErrPrefix(opts.symbology);
    const key = `${prefix}.err.${err?.code ?? 'unknown'}`;
    if (el.qrStatus) el.qrStatus.textContent = t(key, opts);
    appendLine(t(key, opts), 'error');
    return;
  }
  await persistSymbolPrefs('qr', opts);
  // Carrega como arquivo virtual (habilita Play e preview).
  applyJobLines(symbolFileName(opts, '2d'), result.gcode);
  if (el.qrStatus) el.qrStatus.textContent = qrStatusText(result);
  // Abre o posicionamento para alinhar a origem e gravar.
  openFrameModal();
}

/** Prefixo das chaves i18n do símbolo 2D (qr/dm/pdf/aztec). */
function symbolErrPrefix(symbology) {
  if (symbology === 'datamatrix') return 'dm';
  if (symbology === 'pdf417') return 'pdf';
  if (symbology === 'aztec') return 'aztec';
  return 'qr';
}

/** Nome do arquivo virtual do símbolo conforme simbologia e grade (RF-SYM-9). */
function symbolFileName(opts, kind) {
  const dm = opts.symbology === 'datamatrix';
  const pdf = opts.symbology === 'pdf417';
  const aztec = opts.symbology === 'aztec';
  if (kind === '2d') {
    if (opts.grid) {
      return dm
        ? 'datamatrix-grid.gcode'
        : pdf
          ? 'pdf417-grid.gcode'
          : aztec
            ? 'aztec-grid.gcode'
            : 'qr-code-grid.gcode';
    }
    return dm
      ? 'datamatrix.gcode'
      : pdf
        ? 'pdf417.gcode'
        : aztec
          ? 'aztec.gcode'
          : 'qr-code.gcode';
  }
  return opts.grid ? 'barcode-grid.gcode' : 'barcode.gcode';
}

/** Gera o G-code do símbolo 2D escolhido (QR, Data Matrix, PDF417 ou Aztec). */
function generate2dGcode(opts) {
  const common = {
    ...opts,
    sMax: machineSMax(),
    travelFeed: 3000,
    columns: opts.gridColumns,
    gapXMm: opts.gridGapMm,
    gapYMm: opts.gridGapMm,
  };
  if (opts.symbology === 'pdf417') {
    const pdf = {
      ...common,
      dataColumns: opts.pdfColumns,
      eccLevel: opts.pdfEcc,
      rowHeightMm: opts.pdfRowHeightMm,
    };
    delete pdf.ecc;
    delete pdf.version;
    delete pdf.size;
    delete pdf.targetHeightMm;
    if (opts.grid) {
      return window.GRBL_QR.pdf417GridToGcode(
        gridItems(el.qrContent?.value),
        pdf,
      );
    }
    return window.GRBL_QR.pdf417ToGcode(el.qrContent.value.trim(), pdf);
  }
  if (opts.symbology === 'aztec') {
    const aztec = {
      ...common,
      eccPercent: opts.aztecEccPercent,
    };
    delete aztec.ecc;
    delete aztec.version;
    delete aztec.size;
    delete aztec.targetHeightMm;
    if (opts.grid) {
      return window.GRBL_QR.aztecGridToGcode(
        gridItems(el.qrContent?.value),
        aztec,
      );
    }
    return window.GRBL_QR.aztecToGcode(el.qrContent.value.trim(), aztec);
  }
  if (opts.grid) {
    const items = gridItems(el.qrContent?.value);
    if (opts.symbology === 'datamatrix') {
      delete common.ecc;
      delete common.version;
      return window.GRBL_QR.dataMatrixGridToGcode(items, common);
    }
    delete common.size;
    return window.GRBL_QR.qrGridToGcode(items, common);
  }
  if (opts.symbology === 'datamatrix') {
    return window.GRBL_QR.dataMatrixToGcode(el.qrContent.value.trim(), common);
  }
  delete common.size;
  return window.GRBL_QR.qrToGcode(el.qrContent.value.trim(), common);
}

async function saveQr() {
  if (!window.GRBL_QR) return;
  const opts = readQrOptions();
  const hasContent = opts.grid
    ? gridItems(el.qrContent?.value).length > 0
    : Boolean(el.qrContent?.value.trim());
  if (!hasContent) {
    const prefix = symbolErrPrefix(opts.symbology);
    if (el.qrStatus) el.qrStatus.textContent = t(`${prefix}.err.empty`);
    return;
  }
  try {
    const result = generate2dGcode(opts);
    await persistSymbolPrefs('qr', opts);
    const path = await window.grbl.saveGcode(
      result.gcode,
      symbolFileName(opts, '2d'),
    );
    if (path) appendLine(t('file.saved', { path }), 'ok');
  } catch (err) {
    const prefix = symbolErrPrefix(opts.symbology);
    const key = `${prefix}.err.${err?.code ?? 'unknown'}`;
    appendLine(t(key, opts), 'error');
  }
}

// ------------------------------------------------ boas-vindas (P0.4)

/** Versão do tour: mudou o conteúdo? Suba o número para reapresentar. */
const TOUR_VERSION = 1;
const TOUR_STEPS = 5;
let tourStep = 1;

/** Mostra só o passo atual, acende o ponto e acerta os botões. */
function syncTour() {
  if (el.tourSlides) {
    for (const slide of el.tourSlides.querySelectorAll('.tour-slide')) {
      slide.classList.toggle('hidden', Number(slide.dataset.step) !== tourStep);
    }
  }
  if (el.tourDots) {
    if (el.tourDots.children.length !== TOUR_STEPS) {
      el.tourDots.replaceChildren(
        ...Array.from({ length: TOUR_STEPS }, () => {
          const dot = document.createElement('span');
          dot.className = 'tour-dot';
          return dot;
        }),
      );
    }
    [...el.tourDots.children].forEach((dot, i) => {
      dot.classList.toggle('active', i + 1 === tourStep);
    });
  }
  if (el.tourStepLabel) {
    el.tourStepLabel.textContent = t('tour.step', {
      n: tourStep,
      total: TOUR_STEPS,
    });
  }
  if (el.tourBack) el.tourBack.disabled = tourStep <= 1;
  if (el.tourNext) {
    el.tourNext.textContent =
      tourStep >= TOUR_STEPS ? t('tour.finish') : t('tour.next');
  }
}

function openTour() {
  if (!el.tourOverlay) return;
  tourStep = 1;
  if (el.tourDontShow) el.tourDontShow.checked = true;
  syncTour();
  el.tourOverlay.classList.remove('hidden');
  if (el.tourNext) el.tourNext.focus();
}

/**
 * Fecha o tour. Marcado "não mostrar" (padrão) → não volta na próxima
 * abertura; desmarcado → volta (o usuário quer rever).
 */
function closeTour() {
  if (!el.tourOverlay || el.tourOverlay.classList.contains('hidden')) return;
  el.tourOverlay.classList.add('hidden');
  const done = !el.tourDontShow || el.tourDontShow.checked;
  persistPrefs({ onboarding: done ? TOUR_VERSION : 0 });
}

/** Primeira execução (ou tour novo): apresenta o fluxo de 5 passos. */
function maybeShowTour() {
  if (Number(state.prefs.onboarding) >= TOUR_VERSION) return;
  openTour();
}

function tourGo(delta) {
  const next = Math.max(1, Math.min(TOUR_STEPS, tourStep + delta));
  if (next === tourStep) return;
  tourStep = next;
  syncTour();
}

// -------------------------------------------------- código de barras (1D)

/** Nomes das simbologias (produto, não se traduz). */
const BAR_SYM_NAMES = {
  code128: 'Code 128',
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  upca: 'UPC-A',
  code39: 'Code 39',
  itf14: 'ITF-14',
  codabar: 'Codabar',
  code93: 'Code 93',
  'gs1-128': 'GS1-128',
};

/** Dica extra de cada simbologia (o que o usuário precisa saber para digitar). */
const BAR_SYM_HINTS = {
  itf14: 'bar.hint.itf14',
  codabar: 'bar.hint.codabar',
  code93: 'bar.hint.code93',
  'gs1-128': 'bar.hint.gs1',
};

/** Mostra os campos que só valem para o Code 39 (razão e mod 43). */
function syncBarSymbology() {
  const sym = el.barSymbology ? el.barSymbology.value : 'code128';
  const isCode39 = sym === 'code39';
  if (el.barRatioField) el.barRatioField.classList.toggle('hidden', !isCode39);
  if (el.barChecksumField)
    el.barChecksumField.classList.toggle('hidden', !isCode39);
  // A dica de conteúdo passa a ser o exemplo da simbologia escolhida.
  const spec = window.GRBL_BARCODE?.BARCODE_SPECS?.[sym];
  if (spec && el.barContent) el.barContent.placeholder = spec.example;
  // Cada simbologia tem uma regra de conteúdo própria (verificador, guards…).
  const hintKey = BAR_SYM_HINTS[sym];
  if (el.barSymHint) {
    el.barSymHint.classList.toggle('hidden', !hintKey);
    el.barSymHint.textContent = hintKey ? t(hintKey) : '';
  }
}

/**
 * Aplica os padrões da norma ao trocar de simbologia (quiet zone, X-dimension e
 * altura das barras): o EAN precisa de quiet zone maior que o Code 128, por
 * exemplo. Trocar de simbologia é uma decisão explícita do usuário.
 */
function applyBarDefaults(sym) {
  const spec = window.GRBL_BARCODE?.BARCODE_SPECS?.[sym];
  if (!spec) return;
  if (el.barQuiet) el.barQuiet.value = String(spec.quietZoneMinModules);
  if (el.barXDim) el.barXDim.value = String(spec.defaultXDimMm);
  if (el.barHeight) el.barHeight.value = String(spec.defaultBarHeightMm);
}

async function openBarModal() {
  if (!el.barcodeOverlay) return;
  await requireBundle('barcode.js');
  syncBarSymbology();
  syncGridField(el.barGrid, el.barGridColsField, el.barGridGapField);
  el.barcodeOverlay.classList.remove('hidden');
  if (el.barStatus) el.barStatus.textContent = '';
  if (el.barContent) el.barContent.focus();
}

function closeBarModal() {
  if (el.barcodeOverlay) el.barcodeOverlay.classList.add('hidden');
}

function readBarOptions() {
  const clampNum = (input, min, max, fallback) => {
    const raw = Number(input ? input.value : Number.NaN);
    if (!Number.isFinite(raw)) return fallback;
    return Math.max(min, Math.min(max, raw));
  };
  /** Largura final em mm: vazio/inválido = `undefined` (usa o X-dimension). */
  const target = Number(el.barWidth ? el.barWidth.value : Number.NaN);
  const ratio = Number(el.barRatio ? el.barRatio.value : 3);
  return {
    symbology: el.barSymbology ? el.barSymbology.value : 'code128',
    code128Charset: 'auto',
    code39Ratio: ratio === 2 ? 2 : 3,
    code39Checksum: Boolean(el.barChecksum?.checked),
    targetWidthMm:
      Number.isFinite(target) && target > 0
        ? Math.max(1, Math.min(1000, target))
        : undefined,
    xDimMm: clampNum(el.barXDim, 0.05, 20, 0.5),
    barHeightMm: clampNum(el.barHeight, 1, 200, 10),
    quietZoneModules: Math.round(clampNum(el.barQuiet, 0, 30, 10)),
    linesPerMm: Math.round(clampNum(el.barLines, 1, 40, 10)),
    hri: Boolean(el.barHri?.checked),
    powerPercent: clampNum(el.barPower, 0, 100, 100),
    feed: Math.round(clampNum(el.barFeed, 1, 20000, 1000)),
    passes: Math.round(clampNum(el.barPasses, 1, 10, 1)),
    mode: el.barMode && el.barMode.value === 'M3' ? 'M3' : 'M4',
    overscanMm: clampNum(el.barOverscan, 0, 5, 0),
    invert: Boolean(el.barInvert?.checked),
    grid: Boolean(el.barGrid?.checked),
    gridColumns: Math.round(clampNum(el.barGridCols, 0, 50, 0)),
    gridGapMm: clampNum(el.barGridGap, 0, 200, 5),
  };
}

/**
 * Guarda os últimos ajustes de um modal de símbolo (RF-CFG-5). O **conteúdo**
 * nunca é persistido; só o que o usuário ajustou.
 */
function persistSymbolPrefs(kind, opts) {
  const symbols = { ...(state.prefs.symbols || {}) };
  if (kind === 'qr') {
    symbols.qr = {
      symbology: opts.symbology,
      ecc: opts.ecc,
      version: opts.version === 'auto' ? 0 : opts.version,
      dmSize: opts.size === 'auto' ? 0 : opts.size,
      pdfEcc: opts.pdfEcc,
      pdfColumns: opts.pdfColumns,
      pdfRowHeightMm: opts.pdfRowHeightMm,
      aztecEccPercent: opts.aztecEccPercent,
      moduleMm: opts.moduleMm,
      quietZoneModules: opts.quietZoneModules,
      linesPerMm: opts.linesPerMm,
      widthMm: opts.targetWidthMm ?? 0,
      heightMm: opts.targetHeightMm ?? 0,
      keepAspect: Boolean(el.qrKeepAspect?.checked),
      powerPercent: opts.powerPercent,
      feed: opts.feed,
      passes: opts.passes,
      mode: opts.mode,
      overscanMm: opts.overscanMm,
      invert: opts.invert,
    };
  } else {
    symbols.barcode = {
      symbology: opts.symbology,
      targetWidthMm: opts.targetWidthMm ?? 0,
      xDimMm: opts.xDimMm,
      barHeightMm: opts.barHeightMm,
      quietZoneModules: opts.quietZoneModules,
      linesPerMm: opts.linesPerMm,
      hri: opts.hri,
      code39Ratio: opts.code39Ratio,
      code39Checksum: opts.code39Checksum,
      powerPercent: opts.powerPercent,
      feed: opts.feed,
      passes: opts.passes,
      mode: opts.mode,
      overscanMm: opts.overscanMm,
      invert: opts.invert,
    };
  }
  return persistPrefs({ symbols });
}

/** Restaura os últimos ajustes dos símbolos (chamado no boot). */
function applySymbolPrefs() {
  const qr = state.prefs.symbols?.qr;
  populateQrVersions();
  populateDmSizes();
  populatePdfEcc();
  if (qr) {
    if (el.qrSymbology && qr.symbology) el.qrSymbology.value = qr.symbology;
    if (el.qrEcc && qr.ecc) el.qrEcc.value = qr.ecc;
    if (el.qrVersion) el.qrVersion.value = String(qr.version || 0);
    if (el.dmSize) el.dmSize.value = String(qr.dmSize || 0);
    if (el.qrPdfEcc && qr.pdfEcc != null) {
      el.qrPdfEcc.value = String(qr.pdfEcc);
    }
    if (el.qrPdfCols) {
      el.qrPdfCols.value =
        typeof qr.pdfColumns === 'number' ? String(qr.pdfColumns) : '';
    }
    if (el.qrPdfRowHeight && qr.pdfRowHeightMm) {
      el.qrPdfRowHeight.value = String(qr.pdfRowHeightMm);
    }
    if (el.qrAztecEcc && qr.aztecEccPercent != null) {
      el.qrAztecEcc.value = String(qr.aztecEccPercent);
    }
    if (el.qrModule && qr.moduleMm) el.qrModule.value = String(qr.moduleMm);
    if (el.qrQuiet && qr.quietZoneModules != null) {
      el.qrQuiet.value = String(qr.quietZoneModules);
    }
    if (el.qrLines && qr.linesPerMm) el.qrLines.value = String(qr.linesPerMm);
    if (el.qrWidth) {
      el.qrWidth.value = qr.widthMm ? String(qr.widthMm) : '';
    }
    if (el.qrHeight) {
      el.qrHeight.value = qr.heightMm ? String(qr.heightMm) : '';
    }
    if (el.qrKeepAspect) el.qrKeepAspect.checked = qr.keepAspect !== false;
    if (el.qrPower && qr.powerPercent != null) {
      el.qrPower.value = String(qr.powerPercent);
    }
    if (el.qrFeed && qr.feed) el.qrFeed.value = String(qr.feed);
    if (el.qrPasses && qr.passes) el.qrPasses.value = String(qr.passes);
    if (el.qrMode && qr.mode) el.qrMode.value = qr.mode;
    if (el.qrOverscan && qr.overscanMm != null) {
      el.qrOverscan.value = String(qr.overscanMm);
    }
    if (el.qrInvert) el.qrInvert.checked = Boolean(qr.invert);
  }
  const bar = state.prefs.symbols?.barcode;
  if (bar) {
    if (el.barSymbology && bar.symbology) {
      el.barSymbology.value = bar.symbology;
    }
    if (el.barWidth) {
      el.barWidth.value = bar.targetWidthMm ? String(bar.targetWidthMm) : '';
    }
    if (el.barXDim && bar.xDimMm) el.barXDim.value = String(bar.xDimMm);
    if (el.barHeight && bar.barHeightMm) {
      el.barHeight.value = String(bar.barHeightMm);
    }
    if (el.barQuiet && bar.quietZoneModules != null) {
      el.barQuiet.value = String(bar.quietZoneModules);
    }
    if (el.barLines && bar.linesPerMm) {
      el.barLines.value = String(bar.linesPerMm);
    }
    if (el.barHri) el.barHri.checked = bar.hri !== false;
    if (el.barRatio && bar.code39Ratio) {
      el.barRatio.value = String(bar.code39Ratio);
    }
    if (el.barChecksum) el.barChecksum.checked = Boolean(bar.code39Checksum);
    if (el.barPower && bar.powerPercent != null) {
      el.barPower.value = String(bar.powerPercent);
    }
    if (el.barFeed && bar.feed) el.barFeed.value = String(bar.feed);
    if (el.barPasses && bar.passes) el.barPasses.value = String(bar.passes);
    if (el.barMode && bar.mode) el.barMode.value = bar.mode;
    if (el.barOverscan && bar.overscanMm != null) {
      el.barOverscan.value = String(bar.overscanMm);
    }
    if (el.barInvert) el.barInvert.checked = Boolean(bar.invert);
  }
  syncBarSymbology();
  syncQrSymbology({ applyDefaults: false });
}

/** Linha de status: dimensões, simbologia e avisos de legibilidade. */
function barStatusText(result) {
  if (result.count !== undefined) return gridStatusText(result, 'bar.warn');
  const parts = [
    t('bar.status.done', {
      sym: BAR_SYM_NAMES[result.barcode.symbology] || result.barcode.symbology,
      modules: result.barcode.totalModules,
      w: result.widthMm.toFixed(1),
      h: result.heightMm.toFixed(1),
      xdim: result.xDimMm.toFixed(3),
    }),
  ];
  if (result.warnings?.length) {
    parts.push(...result.warnings.map((code) => `⚠ ${t(`bar.warn.${code}`)}`));
  }
  return parts.join(' ');
}

/** Mensagem de erro (o `code` do BarcodeError vira chave i18n). */
function barErrorText(err, opts) {
  const code = err?.code ? err.code : 'bad-option';
  return t(`bar.err.${code}`, {
    sym: BAR_SYM_NAMES[opts.symbology] || opts.symbology,
    expected: err?.expected != null ? err.expected : '—',
    given: err?.given != null ? err.given : '—',
  });
}

/** Gera o G-code do código de barras, sozinho ou em grade (RF-SYM-9). */
function generateBarGcode(opts) {
  const common = { ...opts, sMax: machineSMax(), travelFeed: 3000 };
  if (opts.grid) {
    return window.GRBL_BARCODE.barcodeGridToGcode(
      gridItems(el.barContent?.value),
      {
        ...common,
        columns: opts.gridColumns,
        gapXMm: opts.gridGapMm,
        gapYMm: opts.gridGapMm,
      },
    );
  }
  return window.GRBL_BARCODE.barcodeToGcode(el.barContent.value.trim(), common);
}

async function generateBar() {
  if (!window.GRBL_BARCODE) {
    appendLine(t('bar.moduleMissing'), 'error');
    return;
  }
  const opts = readBarOptions();
  const hasContent = opts.grid
    ? gridItems(el.barContent?.value).length > 0
    : Boolean(el.barContent?.value.trim());
  if (!hasContent) {
    if (el.barStatus) el.barStatus.textContent = t('bar.err.empty');
    return;
  }
  if (el.barStatus) el.barStatus.textContent = t('bar.status.generating');
  let result;
  try {
    result = generateBarGcode(opts);
  } catch (err) {
    // Status traduzido (com o esperado × informado do verificador); o log
    // recebe a mensagem precisa do encoder.
    if (el.barStatus) el.barStatus.textContent = barErrorText(err, opts);
    appendLine(err?.message ? err.message : String(err), 'error');
    return;
  }
  await persistSymbolPrefs('barcode', opts);
  // Carrega como arquivo virtual (habilita Play e preview).
  applyJobLines(symbolFileName(opts, '1d'), result.gcode);
  if (el.barStatus) el.barStatus.textContent = barStatusText(result);
  openFrameModal();
}

async function saveBar() {
  if (!window.GRBL_BARCODE) return;
  const opts = readBarOptions();
  const hasContent = opts.grid
    ? gridItems(el.barContent?.value).length > 0
    : Boolean(el.barContent?.value.trim());
  if (!hasContent) {
    if (el.barStatus) el.barStatus.textContent = t('bar.err.empty');
    return;
  }
  try {
    const result = generateBarGcode(opts);
    await persistSymbolPrefs('barcode', opts);
    const path = await window.grbl.saveGcode(
      result.gcode,
      symbolFileName(opts, '1d'),
    );
    if (path) appendLine(t('file.saved', { path }), 'ok');
  } catch (err) {
    if (el.barStatus) el.barStatus.textContent = barErrorText(err, opts);
    appendLine(err?.message ? err.message : String(err), 'error');
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
  const sPower = pointingPowerS(); // ~0,5 % da máquina: contorno bem fraco
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
  // (≈0,5 % da máquina, do perfil) por um breve instante, para o usuário ver
  // com a ponta onde será o centro — igual ao contorno, sem queimar.
  // Usa M3 (potência constante): em M4 a potência é proporcional à
  // velocidade e durante o dwell (G4) a velocidade é zero → o laser não
  // acende. M3 mantém o laser ligado mesmo parado.
  const sPower = pointingPowerS();
  const step = 0.3;
  for (const line of [
    'G90',
    'M5',
    `G0 X${cx.toFixed(3)} Y${cy.toFixed(3)}`,
    `M3 S${sPower}`, // M3 = potência constante (acende mesmo parado/lento)
    `G1 X${(cx + step).toFixed(3)} Y${cy.toFixed(3)} F300`,
    `G1 X${(cx - step).toFixed(3)} Y${cy.toFixed(3)} F300`,
    `G1 X${cx.toFixed(3)} Y${cy.toFixed(3)} F300`,
    'M5',
  ]) {
    window.grbl.writeLine(line);
  }
  if (el.frameStatus) el.frameStatus.textContent = t('frame.center.done');
}

/**
 * Perfis de máquina — catálogo **tipado e testado** em `src/shared/machines.ts`,
 * empacotado por esbuild em `public/machines.js` (`GRBL_MACHINES`).
 *
 * Nenhum valor de máquina é chumbado aqui: curso, homing, `S-max`, módulo do
 * laser e potência do laser "de apontar" vêm do perfil (RF-MAQ-10).
 */
const machines = window.GRBL_MACHINES;

/** Sem o bundle (build incompleto), sobra um perfil genérico — sem curso,
 * sem homing e sem settings — para o app não quebrar. */
const MACHINE_PROFILES =
  machines?.MACHINE_PROFILES?.length > 0
    ? machines.MACHINE_PROFILES
    : [
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
    el.machineProfile.value = machines?.DEFAULT_MACHINE_ID ?? 'generic';
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
  // Módulo de laser e `S-max` são propriedades da **máquina**: alimentam o
  // catálogo de materiais (RF-IMG-8) e a conversão % → `S`. Valores no perfil,
  // não chumbados no código.
  if (el.profileModule && prof.module) {
    el.profileModule.value = prof.module;
    populateMaterials();
  }
  if (el.imgSmax) {
    // O perfil semeia o `$30` da interface; sem `sMax` no perfil, o padrão do
    // app. Sempre escreve, para trocar de máquina não herdar o valor anterior.
    const sMax = Number(prof.sMax);
    el.imgSmax.value = String(
      Number.isFinite(sMax) && sMax > 0
        ? sMax
        : (window.GRBL_MATERIALS?.PROFILE_MAX_S ?? 1000),
    );
  }
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
  for (const b of [
    el.jogXp,
    el.jogXm,
    el.jogYp,
    el.jogYm,
    el.jogZp,
    el.jogZm,
  ]) {
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

/** Perfil da máquina selecionada (nunca `undefined`). */
function currentMachineProfile() {
  const id = el.machineProfile?.value;
  if (machines?.machineProfile) return machines.machineProfile(id);
  return MACHINE_PROFILES.find((p) => p.id === id) || MACHINE_PROFILES[0];
}

/** O perfil de máquina atual declara homing de fábrica? */
function machineHoming() {
  return Boolean(currentMachineProfile()?.homing);
}

/**
 * Referência de `S` da máquina (`$30`) — **uma só** para o app inteiro.
 *
 * O campo da interface manda (é o valor que o usuário vê e pode editar); o
 * perfil da máquina apenas **semeia** esse campo (`applyMachineProfile`). Sem
 * campo válido, vale o `sMax` do perfil e, por fim, o padrão do app.
 */
function machineSMax() {
  const fromField = Number(el.imgSmax?.value);
  if (Number.isFinite(fromField) && fromField > 0) return fromField;
  const fromProfile = Number(currentMachineProfile()?.sMax);
  if (Number.isFinite(fromProfile) && fromProfile > 0) return fromProfile;
  return window.GRBL_MATERIALS?.PROFILE_MAX_S ?? 1000;
}

/**
 * Potência `S` do laser "de apontar" (contorno da moldura e centro): bem fraca,
 * só para marcar a superfície — nunca queimar. O percentual fica no perfil da
 * máquina (`pointPercent`), porque o mesmo `S` não significa a mesma potência
 * em módulos diferentes. Nunca devolve `0` (com `0` o laser não acende e o
 * usuário não vê onde vai gravar).
 */
function pointingPowerS() {
  const percent = Number(currentMachineProfile()?.pointPercent);
  const s = window.GRBL_MATERIALS?.powerPercentToS(
    Number.isFinite(percent) ? percent : 0.5,
    machineSMax(),
  );
  return Math.max(1, Number.isFinite(s) ? s : 1);
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

function applyJobLines(name, text, source = 'file') {
  state.lines = String(text)
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  state.fileName = name;
  state.jobSource = source;
  // A área do modal de posicionamento deve ser a do job atual: descarta a da
  // última imagem gerada (ela viria de `window.frameBounds`).
  window.frameBounds = null;
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
async function beginJob(startIndex = 0) {
  if (!state.connected || !state.lines.length) return;
  if (!(await confirmPreflight(state.lines))) return;
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
  state.jobSource = 'image';
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
 * A coluna "Power (%)" vira `S` sobre a referência da **máquina** (`$30`, do
 * perfil de máquina) — não sobre um `1000` fixo.
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

  const sMax = materials.powerPercentToS(profile.powerPercent, machineSMax());
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
    const feed = m.rapid ? RAPID : m.feed || 1000;
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
  if (el.simSeek)
    el.simSeek.value = String(
      Math.round((simState.time / simState.total) * 1000),
    );
}

function simTick(ts) {
  if (!simState.running) return;
  if (!simState.lastTs) simState.lastTs = ts;
  const dt = (ts - simState.lastTs) / 1000;
  simState.lastTs = ts;
  simState.time = Math.min(simState.total, simState.time + dt * simState.speed);
  const moves = simState.moves;
  while (
    simState.index < moves.length - 1 &&
    simState.cum[simState.index + 1] <= simState.time
  ) {
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
  while (i < simState.moves.length - 1 && simState.cum[i + 1] <= simState.time)
    i++;
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
  // A caixa tracejada da área de trabalho ($130/$131) é só referência: rotula
  // para não ser confundida com o caminho que será gravado.
  const hasWorkArea = Boolean(previewProgram.workArea);
  el.lgWork?.classList.toggle('hidden', !hasWorkArea);
  el.lgWorkSwatch?.classList.toggle('hidden', !hasWorkArea);
  if (!prog || prog.moves.length === 0) {
    previewLayers.key = '';
    el.previewHint.classList.remove('hidden');
    el.previewHint.textContent = prog
      ? t('preview.hint.noMoves')
      : t('preview.hint.empty');
    return;
  }
  el.previewHint.classList.add('hidden');

  // Enquadra pela área **queimada**: num desenho longe da origem a área total
  // (com o `G0` até 0,0) deixaria a arte pequena num canto do preview.
  const b = prog.cutBounds ?? prog.bounds;
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
    // Usa só os trechos que queimam (`previewProgram.burns`): `prog` é o
    // programa interpretado e **não** tem `burns`, então `prog.burns ?? moves`
    // pintava também os `G0` na cor de queima (a diagonal do retorno a 0,0
    // herdava o `S` do último `M4` e parecia uma linha gravada).
    strokePower(g, previewProgram.burns ?? prog.moves, accent, 0.18);
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
  updatePinChip(state.lastStatus);
  // O editor de desenho monta as listas com `t()`; ao trocar de idioma,
  // re-renderiza (nomes de camada, objetos e botões contextuais).
  if (el.designOverlay && !el.designOverlay.classList.contains('hidden')) {
    dUpdateObjectList();
    dUpdateLayerList();
    dUpdateLayerEditor();
  }
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
  el.machineOverlay,
  el.preflightOverlay,
  el.frameOverlay,
  el.matTestOverlay,
  el.qrOverlay,
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

/** Overlays abertos, na ordem em que o Esc deve fechá-los. */
function openOverlays() {
  return [
    el.appearanceOverlay,
    el.aboutOverlay,
    el.settingsOverlay,
    el.machineOverlay,
    el.preflightOverlay,
    el.frameOverlay,
    el.matTestOverlay,
    el.qrOverlay,
    el.barcodeOverlay,
    el.tourOverlay,
    el.designOverlay,
  ].filter((o) => o && !o.classList.contains('hidden'));
}

document.addEventListener('keydown', (e) => {
  // Parada de emergência **sempre** disponível: o operador pode estar com o
  // foco no console (ou num campo do modal) quando precisa abortar — Ctrl+X
  // vale em qualquer foco (DESIGN §5). Sem job rodando ele devolve `false` e o
  // recortar nativo continua funcionando.
  if (
    e.ctrlKey &&
    !e.altKey &&
    !e.metaKey &&
    (e.key === 'x' || e.key === 'X')
  ) {
    if (emergencyStopFromKeyboard(e)) return;
  }
  // Esc para o job mesmo com o foco num campo — mas só sem diálogo aberto: com
  // diálogo, o Esc fecha o diálogo (o Ctrl+X segue sendo a parada garantida).
  if (e.key === 'Escape' && openOverlays().length === 0) {
    if (emergencyStopFromKeyboard(e)) return;
  }
  if (typingInField(e.target)) return;
  if (e.key !== 'Escape') return;
  const overlays = openOverlays();
  if (overlays.length) {
    for (const overlay of overlays) {
      // O editor de desenho tem desmontagem própria (fecha diálogos, menu de
      // booleanas e editor de texto); esconder na mão deixaria estado preso.
      if (overlay === el.designOverlay) closeDesignModal();
      else if (overlay === el.tourOverlay) closeTour();
      else overlay.classList.add('hidden');
    }
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
    else if (name === 'qr-code') openQrModal();
    else if (name === 'bar-code') openBarModal();
    else if (name === 'machine') openMachineModal();
    else if (name === 'open-svg') openSvgImport();
    else if (name === 'open-dxf') openDxfImport();
    else if (name === 'open-pdf') openPdfImport();
    else if (name === 'design') openDesignModal();
    else if (name === 'tour') openTour();
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
  const profile =
    state.prefs.machineProfile || machines?.DEFAULT_MACHINE_ID || 'generic';
  if (el.machineProfile) el.machineProfile.value = profile;
  applyMachineProfile(profile);

  // Últimos ajustes das ferramentas de símbolo (RF-CFG-5).
  applySymbolPrefs();

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

// ------------------------------------------------- painel "Máquina" (P0.7)

/** Último retrato parseado — o relatório e os cartões saem daqui. */
state.machine = null;

/** Nome do transporte atual, para o diagnóstico (sem caminho de usuário). */
function machineTransportLabel() {
  const p = state.prefs ?? {};
  if (p.transport === 'tcp') return `tcp ${p.host ?? '?'}:${p.tcpPort ?? 23}`;
  if (p.port) return `serial ${p.port} @ ${p.baud ?? '?'}`;
  return undefined;
}

/** Número com casas fixas e sem zeros à toa; ausente → "não informado". */
function machineNum(value, digits = 1, unit = '') {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return t('machine.notInformed');
  }
  const n = Number(value.toFixed(digits));
  return unit ? `${n} ${unit}` : String(n);
}

function machineVec(vec, digits = 1, unit = '') {
  if (!vec) return t('machine.notInformed');
  return ['x', 'y', 'z']
    .map((axis) => machineNum(vec[axis], digits, ''))
    .join(' × ')
    .concat(unit ? ` ${unit}` : '');
}

function machineBool(value) {
  if (value === undefined || value === null) return t('machine.notInformed');
  return value ? t('machine.on') : t('machine.off');
}

function machineCard(titleKey, rows) {
  const card = document.createElement('section');
  card.className = 'machine-card';
  const title = document.createElement('h4');
  title.textContent = t(titleKey);
  const list = document.createElement('dl');
  for (const [labelKey, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = t(labelKey);
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.append(dt, dd);
  }
  card.append(title, list);
  return card;
}

/** Cartões do painel. Tudo que o firmware não informa aparece explicitamente. */
function renderMachineCards(snap, parsed) {
  const { firmware: fw, facts, modal, offsets, startup } = parsed;
  const options = fw.options ?? {};
  const enabled = Object.entries(options)
    .filter(([, on]) => on)
    .map(([key]) =>
      t(
        `machine.opt.${key === 'variableSpindle' ? 'V' : key === 'coreXY' ? 'C' : 'M'}`,
      ),
    );
  const pins = snap.status?.pn ?? '';

  const cards = [
    machineCard('machine.section.firmware', [
      ['machine.firmware.version', fw.version ?? t('machine.notInformed')],
      ['machine.firmware.build', fw.build ?? t('machine.notInformed')],
      ['machine.firmware.platform', fw.platform ?? t('machine.notInformed')],
      [
        'machine.firmware.options',
        enabled.length ? enabled.join(' · ') : t('machine.notInformed'),
      ],
      [
        'machine.firmware.planner',
        fw.plannerBlocks === undefined
          ? t('machine.notInformed')
          : `${machineNum(fw.plannerBlocks, 0, '')} ${t('machine.unit.blocks')}`,
      ],
      [
        'machine.firmware.buffer',
        fw.rxBufferSize === undefined
          ? t('machine.notInformed')
          : `${machineNum(fw.rxBufferSize, 0, '')} ${t('machine.unit.bytes')}`,
      ],
    ]),
    machineCard('machine.section.travel', [
      [
        'machine.travel.x',
        machineNum(facts.travel?.x, 1, t('machine.unit.mm')),
      ],
      [
        'machine.travel.y',
        machineNum(facts.travel?.y, 1, t('machine.unit.mm')),
      ],
      [
        'machine.travel.z',
        machineNum(facts.travel?.z, 1, t('machine.unit.mm')),
      ],
      ['machine.limits.soft', machineBool(facts.softLimits)],
      ['machine.limits.hard', machineBool(facts.hardLimits)],
      ['machine.limits.homing', machineBool(facts.homing)],
    ]),
    machineCard('machine.section.laser', [
      ['machine.laser.mode', machineBool(facts.laserMode)],
      ['machine.laser.smax', machineNum(facts.sMax, 0, '')],
      ['machine.laser.smin', machineNum(facts.sMin, 0, '')],
      ['machine.laser.pwm', machineNum(facts.pwmFreq, 0, t('machine.unit.hz'))],
    ]),
    machineCard('machine.section.motion', [
      [
        'machine.motion.maxRate',
        machineVec(facts.maxRate, 0, t('machine.unit.mmmin')),
      ],
      [
        'machine.motion.accel',
        machineVec(facts.accel, 0, `${t('machine.unit.mm')}/s²`),
      ],
      ['machine.motion.steps', machineVec(facts.stepsPerMm, 3, '')],
    ]),
    machineCard('machine.section.modal', [
      [
        'machine.status',
        snap.status ? stateLabel(snap.status.state) : t('machine.notInformed'),
      ],
      ['machine.modal.motion', modal.motion ?? t('machine.notInformed')],
      ['machine.modal.wcs', modal.wcs ?? t('machine.notInformed')],
      ['machine.modal.units', modal.units ?? t('machine.notInformed')],
      ['machine.modal.distance', modal.distance ?? t('machine.notInformed')],
      ['machine.modal.spindle', modal.spindle ?? t('machine.notInformed')],
      [
        'machine.modal.feed',
        machineNum(modal.feed, 0, t('machine.unit.mmmin')),
      ],
      ['machine.modal.speed', machineNum(modal.speed, 0, '')],
      ['machine.pins', pins || t('machine.pins.none')],
    ]),
  ];

  const work = ['g54', 'g55', 'g56', 'g57', 'g58', 'g59']
    .filter((key) => offsets[key])
    .map((key) => [
      key.toUpperCase(),
      machineVec(offsets[key], 3, t('machine.unit.mm')),
    ]);
  cards.push(
    machineCard('machine.section.offsets', [
      ...work,
      [
        'machine.offsets.refs',
        machineVec(offsets.g28 ?? offsets.g30, 3, t('machine.unit.mm')),
      ],
      ['machine.offsets.tlo', machineNum(offsets.tlo, 3, t('machine.unit.mm'))],
      ['machine.offsets.prb', machineVec(offsets.prb, 3, t('machine.unit.mm'))],
    ]),
  );

  cards.push(
    machineCard('machine.section.startup', [
      [
        'machine.section.startup',
        startup.length ? startup.join('\n') : t('machine.startup.none'),
      ],
      [
        'machine.startup.warn',
        startup.length ? t('machine.startup.warn') : '—',
      ],
    ]),
  );

  el.machineGrid.replaceChildren(...cards);
}

/** Snapshot da máquina convertido para os tipos da UI (sem tocar no DOM). */
async function readMachine() {
  const snap = await window.grbl.machineSnapshot();
  await loadBundle('machine.js');
  const M = window.GRBL_MACHINE;
  if (!M) throw new Error('bundle machine.js indisponível');
  const settingsMap = M.parseSettings(snap.settings ?? []);
  const startup = M.parseStartupBlocks(snap.startup ?? []);
  const parsed = {
    firmware: M.parseFirmware(snap.build ?? []),
    facts: M.deriveFacts(settingsMap, startup),
    modal: M.parseModalState(snap.modal ?? []),
    offsets: M.parseOffsets(snap.offsets ?? []),
    startup,
  };
  return { ...parsed, snap, settingsMap, M };
}

async function refreshMachine() {
  el.machineStatus.textContent = t('machine.reading');
  el.machineRefresh.disabled = true;
  try {
    const data = await readMachine();
    state.machine = data;
    renderMachineCards(data.snap, data);

    const settingsRecord = {};
    for (const [code, row] of data.settingsMap)
      settingsRecord[code] = row.value;
    const status = data.snap.status
      ? {
          state: data.snap.status.state,
          pin: data.snap.status.pn,
          mpos: data.snap.status.mpos,
          wpos: data.snap.status.wpos,
        }
      : undefined;
    el.machineReport.value = data.M.buildMachineReport({
      app: {
        name: APP_INFO.name || 'GRBL Studio',
        version: APP_INFO.version || '',
      },
      transport: machineTransportLabel(),
      firmware: data.firmware,
      settings: settingsRecord,
      facts: data.facts,
      modal: data.modal,
      offsets: data.offsets,
      status,
      alarms: (state.alarms ?? []).slice(-10).map((a) => {
        const kind = a.kind === 'alarm' ? 'ALARM' : 'error';
        const head = a.code !== undefined ? `${kind} ${a.code}` : kind;
        const cmd = a.command ? ` (cmd: ${a.command})` : '';
        return `${head}: ${a.message}${cmd}`;
      }),
    });
    el.machineStatus.textContent = '';
  } catch (err) {
    el.machineStatus.textContent = t('machine.fail', { msg: err.message });
    el.machineReport.value = '';
  } finally {
    el.machineRefresh.disabled = false;
  }
}

async function openMachineModal() {
  el.machineOverlay.classList.remove('hidden');
  if (!state.connected) {
    el.machineStatus.textContent = t('machine.connectFirst');
    el.machineGrid.replaceChildren();
    el.machineReport.value = '';
    return;
  }
  await refreshMachine();
}

function closeMachineModal() {
  el.machineOverlay.classList.add('hidden');
}

// ------------------------------------------------- pré-voo (P0.8, MX-1…15)

/** Resolve a confirmação do overlay; `null` = nenhum overlay aberto. */
let preflightResolve = null;

/** Fatos da máquina para as regras; lê uma vez e reaproveita (painel/pré-voo). */
async function ensureMachineFacts() {
  if (state.machine?.facts) return state.machine;
  state.machine = await readMachine();
  return state.machine;
}

/** Status atual no formato do contrato de pré-voo. */
function preflightStatus() {
  const s = state.lastStatus;
  if (!s) return undefined;
  return { state: s.state, pin: s.pn, mpos: s.mpos, wpos: s.wpos };
}

/** Contexto do app: perfil de potência e dados do firmware. */
function preflightContext(data) {
  const firmware = data?.firmware;
  return {
    profile: { sMax: machineSMax() },
    firmware: firmware
      ? {
          options: firmware.options,
          rxBufferSize: firmware.rxBufferSize,
          plannerBlocks: firmware.plannerBlocks,
        }
      : undefined,
  };
}

/** Monta a lista do overlay (i18n no renderer — o contrato não tem texto). */
function renderPreflight(issues) {
  const list = el.preflightList;
  list.replaceChildren();
  for (const issue of issues) {
    const item = document.createElement('li');
    item.className = `preflight-item ${issue.severity}`;

    const head = document.createElement('div');
    head.className = 'preflight-item-head';
    const severity = document.createElement('span');
    severity.className = 'preflight-sev';
    severity.textContent = t(`preflight.sev.${issue.severity}`);
    const title = document.createElement('strong');
    title.textContent = t(`preflight.${issue.id}.title`);
    head.append(severity, title);

    const detail = document.createElement('p');
    detail.textContent = t(`preflight.${issue.id}.detail`, issue.params ?? {});

    item.append(head, detail);
    if (issue.fix) {
      const fix = document.createElement('p');
      fix.className = 'hint';
      fix.textContent =
        issue.fix.kind === 'setting'
          ? t('preflight.fix.setting', {
              code: `$${issue.fix.code}`,
              value: issue.fix.value,
            })
          : t('preflight.fix.action', {
              action: t(`preflight.action.${issue.fix.action}`),
            });
      item.appendChild(fix);
    }
    list.appendChild(item);
  }

  const blocks = issues.filter((i) => i.severity === 'block').length;
  el.preflightIntro.textContent = blocks
    ? t('preflight.blocked', { n: blocks })
    : t('preflight.intro');
  el.preflightGo.classList.toggle('hidden', blocks === 0);
  el.preflightCancel.textContent = blocks ? t('nav.cancel') : t('nav.close');
}

/** Chip da barra de execução: contagem de avisos (some quando não há). */
function updatePreflightChip(issues) {
  state.preflight = issues;
  const visible = issues.length > 0;
  el.preflightChip.classList.toggle('hidden', !visible);
  el.preflightChip.classList.toggle(
    'danger',
    issues.some((i) => i.severity === 'block'),
  );
  el.preflightChip.textContent = visible
    ? t('preflight.chip', { n: issues.length })
    : '';
}

function closePreflight(result) {
  el.preflightOverlay.classList.add('hidden');
  const resolve = preflightResolve;
  preflightResolve = null;
  if (resolve) resolve(result);
}

/** Roda as regras e, se houver impedimento, pede confirmação antes de gravar. */
async function confirmPreflight(lines) {
  try {
    await loadBundle('preflight.js');
    const P = window.GRBL_PREFLIGHT;
    if (!P) throw new Error('bundle preflight.js indisponível');
    const data = await ensureMachineFacts();
    const issues = P.runPreflight(
      {
        lines,
        facts: data?.facts,
        status: preflightStatus(),
        useWorkCoords: true,
      },
      preflightContext(data),
    );
    updatePreflightChip(issues);
    if (!issues.some((i) => i.severity === 'block')) return true;

    renderPreflight(issues);
    el.preflightOverlay.classList.remove('hidden');
    return await new Promise((resolve) => {
      preflightResolve = resolve;
    });
  } catch (err) {
    // Pré-voo é consultivo: falha da checagem não pode impedir o job.
    console.warn('pré-voo:', err);
    return true;
  }
}

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
el.machineClose.addEventListener('click', closeMachineModal);
el.preflightClose.addEventListener('click', () => closePreflight(false));
el.preflightCancel.addEventListener('click', () => closePreflight(false));
el.preflightGo.addEventListener('click', () => closePreflight(true));
el.preflightChip.addEventListener('click', () => {
  const issues = state.preflight ?? [];
  if (!issues.length) return;
  renderPreflight(issues);
  el.preflightGo.classList.add('hidden');
  el.preflightCancel.textContent = t('nav.close');
  el.preflightOverlay.classList.remove('hidden');
});
el.machineRefresh.addEventListener('click', () => {
  if (state.connected) refreshMachine();
  else el.machineStatus.textContent = t('machine.connectFirst');
});
el.machineCopy.addEventListener('click', async () => {
  const text = el.machineReport.value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    el.machineStatus.textContent = t('machine.copied');
  } catch (err) {
    el.machineStatus.textContent = t('machine.copyFail', { msg: err.message });
  }
});
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

/**
 * Indicador de pinos `Pn` na barra de status (RF-MAQ-7). Fica **desabilitado
 * com explicação** quando o firmware não reporta pinos (máscara `$10`), sem
 * sugerir escrever setting por conta própria.
 */
function updatePinChip(s) {
  if (!el.pinChip) return;
  const parsePins = window.GRBL_MACHINES?.parsePins;
  const report = parsePins
    ? parsePins(s?.pn)
    : { reported: s?.pn !== undefined, pins: [] };
  const value = report.pins.length
    ? report.pins.join(' ')
    : t('machine.pins.none');
  el.pinChip.disabled = !report.reported;
  el.pinChip.classList.toggle('muted', !report.reported);
  el.pinChip.textContent = `${t('status.pins')}: ${
    report.reported ? value : '—'
  }`;
  el.pinChip.title = report.reported
    ? t('status.pinsHint')
    : t('status.pinsUnknown');
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
      // Sem a linha recusada, `error:3` no diagnóstico não diz o que falhou.
      command: err.command,
      kind: err.kind,
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
    const kind = entry.kind === 'alarm' ? 'ALARM' : 'error';
    const code = entry.code !== undefined ? ` ${kind} [${entry.code}]` : '';
    row.textContent = `${time}${code} ${entry.message}`;
    if (entry.command) {
      const cmd = document.createElement('div');
      cmd.className = 'alarm-cmd';
      cmd.textContent = `${t('status.history.command')} ${entry.command}`;
      row.appendChild(cmd);
    }
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
  updatePinChip(s);
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
if (el.qrClose) el.qrClose.addEventListener('click', closeQrModal);
if (el.qrOverlay)
  el.qrOverlay.addEventListener('click', (e) => {
    if (e.target === el.qrOverlay) closeQrModal();
  });
if (el.qrGenerate) el.qrGenerate.addEventListener('click', generateQr);
if (el.qrSave) el.qrSave.addEventListener('click', saveQr);
if (el.qrSymbology)
  el.qrSymbology.addEventListener('change', () => syncQrSymbology());
if (el.qrWidth)
  el.qrWidth.addEventListener('input', () => syncQrSize(el.qrWidth));
if (el.qrHeight)
  el.qrHeight.addEventListener('input', () => syncQrSize(el.qrHeight));
if (el.qrKeepAspect)
  el.qrKeepAspect.addEventListener('change', () => {
    if (!el.qrKeepAspect.checked) return;
    syncQrSize(el.qrWidth?.value ? el.qrWidth : el.qrHeight);
  });
if (el.qrGrid)
  el.qrGrid.addEventListener('change', () =>
    syncGridField(el.qrGrid, el.qrGridColsField, el.qrGridGapField),
  );
if (el.tourClose) el.tourClose.addEventListener('click', closeTour);
if (el.tourSkip) el.tourSkip.addEventListener('click', closeTour);
if (el.tourBack) el.tourBack.addEventListener('click', () => tourGo(-1));
if (el.tourNext)
  el.tourNext.addEventListener('click', () => {
    if (tourStep >= TOUR_STEPS) closeTour();
    else tourGo(1);
  });
if (el.tourOverlay)
  el.tourOverlay.addEventListener('click', (e) => {
    if (e.target === el.tourOverlay) closeTour();
  });
if (el.barClose) el.barClose.addEventListener('click', closeBarModal);
if (el.barcodeOverlay)
  el.barcodeOverlay.addEventListener('click', (e) => {
    if (e.target === el.barcodeOverlay) closeBarModal();
  });
if (el.barGenerate) el.barGenerate.addEventListener('click', generateBar);
if (el.barSave) el.barSave.addEventListener('click', saveBar);
if (el.barSymbology)
  el.barSymbology.addEventListener('change', () => {
    syncBarSymbology();
    applyBarDefaults(el.barSymbology.value);
  });
if (el.barGrid)
  el.barGrid.addEventListener('change', () =>
    syncGridField(el.barGrid, el.barGridColsField, el.barGridGapField),
  );
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
    if (state.jobSource === 'design') {
      // Desenho: os parâmetros do modal alimentam a prancheta e o G-code é
      // regerado a partir das formas — depois o envio inicia.
      dFrameParamsToDesign();
      if (!state.connected) {
        if (el.frameStatus)
          el.frameStatus.textContent = t('frame.status.disconnected');
        return;
      }
      closeFrameModal();
      designGenerate({ autoStart: true });
      return;
    }
    if (state.jobSource === 'image') {
      // Fluxo de imagem: copia os parâmetros do modal e regera o G-code.
      if (el.framePower && el.imgSmax) {
        const pct = Math.max(
          0,
          Math.min(100, Number(el.framePower.value) || 0),
        );
        el.imgSmax.value = String(Math.round((pct / 100) * machineSMax()));
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
      return;
    }
    // Arquivo aberto/SVG: o G-code já está pronto — só inicia o envio.
    if (!state.connected) {
      if (el.frameStatus)
        el.frameStatus.textContent = t('frame.status.disconnected');
      return;
    }
    closeFrameModal();
    beginJob(0);
  });

// Conectar direto do modal de posicionamento (quem esqueceu de conectar antes
// não precisa fechar o desenho e refazer tudo).
if (el.frameConnect)
  el.frameConnect.addEventListener('click', async () => {
    if (state.connected) {
      await window.grbl.disconnect();
      return;
    }
    if (state.connection === 'connecting') return;
    if (el.frameStatus) el.frameStatus.textContent = t('conn.connecting');
    await refreshPorts();
    const opts = connectionOptions();
    if (!opts) {
      if (el.frameStatus)
        el.frameStatus.textContent = t('frame.connect.noPort');
      return;
    }
    await tryConnect(opts);
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
    const sMax = materials.powerPercentToS(profile.powerPercent, machineSMax());
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
  // Primeira execução: tour de 5 passos (conectar → perfil → abrir → preview →
  // gravar). RF-ONB-1/P0.4; sai com "não mostrar" ou pelo menu Ajuda.
  maybeShowTour();

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

// Pré-aquece os bundles sob demanda depois que a janela já pintou: o primeiro
// clique em Ferramentas → QR/Código de barras não paga o parse das tabelas.
function prefetchBundles() {
  void requireBundle('qrcode.js');
  void requireBundle('barcode.js');
}
setTimeout(() => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(prefetchBundles, { timeout: 3000 });
  } else {
    prefetchBundles();
  }
}, 2000);
