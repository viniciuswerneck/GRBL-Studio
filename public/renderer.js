/**
 * Renderer do GRBL Studio.
 * Fala com o main apenas via window.grbl (preload). Sem Node aqui.
 */

const $ = (id) => document.getElementById(id);

const el = {
  portList: $('portList'),
  baudList: $('baudList'),
  refreshPorts: $('refreshPorts'),
  connectBtn: $('connectBtn'),
  connDot: $('connDot'),
  connText: $('connText'),
  jogXp: $('jogXp'),
  jogXm: $('jogXm'),
  jogYp: $('jogYp'),
  jogYm: $('jogYm'),
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
  stopBtn: $('stopBtn'),
  runHint: $('runHint'),
  progressBar: $('progressBar'),
  progressText: $('progressText'),
  stateBadge: $('stateBadge'),
  droX: $('droX'),
  droY: $('droY'),
  droZ: $('droZ'),
  metaFeed: $('metaFeed'),
  metaS: $('metaS'),
  consoleOutput: $('consoleOutput'),
  consoleInput: $('consoleInput'),
  themeBtn: $('themeBtn'),
  imageOpen: $('imageOpen'),
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
  profileModule: $('profileModule'),
  profileAction: $('profileAction'),
  profileMaterial: $('profileMaterial'),
  profileHint: $('profileHint'),
  imgGenerate: $('imgGenerate'),
  imgSave: $('imgSave'),
  imgStats: $('imgStats'),
  previewCanvas: $('previewCanvas'),
  previewHint: $('previewHint'),
};

const state = {
  connected: false,
  connection: 'disconnected',
  jobState: 'idle',
  lines: [],
  fileName: '',
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
  if (nearBottom) el.consoleOutput.scrollTop = el.consoleOutput.scrollHeight;
}

// ----------------------------------------------------------------- conexão

function setConnection(conn) {
  state.connection = conn;
  state.connected = conn === 'connected';

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
    disconnected: 'Desconectado',
    connecting: 'Conectando…',
    connected: 'Conectado',
    error: 'Erro de conexão',
  };
  el.connText.textContent = labels[conn] ?? conn;
  el.connectBtn.textContent =
    state.connected || conn === 'connecting' ? 'Desconectar' : 'Conectar';
  el.connectBtn.classList.toggle(
    'primary',
    !state.connected && conn !== 'connecting',
  );

  if (!state.connected && state.jobState === 'running') setJobState('idle');
  updateControls();
}

function setJobState(jobState) {
  state.jobState = jobState;
  updateControls();
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

  el.playBtn.disabled = !conn || !hasFile || !idle;
  el.pauseBtn.disabled = !(running || paused);
  el.pauseBtn.textContent = paused ? '▶ Retomar' : '⏸ Pausar';
  el.stopBtn.disabled = !(running || paused);

  // Explica por que "Iniciar" está apagado (a dúvida mais comum da UI).
  const lines = state.lines.length;
  let hint;
  if (!hasFile && !conn) {
    hint =
      'Gere o G-code (Imagem → G-code) ou abra um .gcode e conecte a máquina para enviar.';
  } else if (!hasFile) {
    hint =
      'Nenhum G-code carregado: gere um em “Imagem → G-code” ou abra um arquivo .gcode.';
  } else if (!conn) {
    hint = `G-code pronto (${lines} linhas). Conecte a máquina em “Serial” para enviar.`;
  } else if (running) {
    hint = 'Enviando para a máquina…';
  } else {
    hint = `Pronto para enviar (${lines} linhas). Clique em ▶ Iniciar.`;
  }
  el.runHint.textContent = hint;
  el.runHint.classList.toggle('attention', hasFile && !conn);

  el.playBtn.title = !hasFile
    ? 'Nenhum G-code carregado'
    : !conn
      ? 'Conecte a máquina para enviar'
      : '';

  for (const b of [
    el.jogXp,
    el.jogXm,
    el.jogYp,
    el.jogYm,
    el.homeBtn,
    el.unlockBtn,
    el.resetBtn,
    el.setOriginBtn,
    el.gotoZeroBtn,
  ]) {
    b.disabled = !conn;
  }
}

// -------------------------------------------------------------------- portas

async function refreshPorts() {
  el.portList.innerHTML = '';
  let ports = [];
  try {
    ports = await window.grbl.listPorts();
  } catch (err) {
    appendLine(`Falha ao listar portas: ${err.message}`, 'error');
    return;
  }
  // Placas laser aparecem como ttyUSB* (CH340/CP2102) ou ttyACM* (Arduino).
  const hasUsbBoard = ports.some((p) => /\/tty(USB|ACM)\d/.test(p.path));
  el.portHint.classList.toggle('hidden', hasUsbBoard);
  if (!ports.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Nenhuma porta';
    el.portList.appendChild(opt);
    return;
  }
  for (const p of ports) {
    const opt = document.createElement('option');
    opt.value = p.path;
    opt.textContent = p.manufacturer ? `${p.path} — ${p.manufacturer}` : p.path;
    el.portList.appendChild(opt);
  }
}

// ------------------------------------------------------------------ conexão

el.refreshPorts.addEventListener('click', refreshPorts);

el.connectBtn.addEventListener('click', async () => {
  if (state.connected) {
    await window.grbl.disconnect();
    return;
  }
  const path = el.portList.value;
  if (!path) {
    appendLine('Selecione uma porta serial.', 'error');
    return;
  }
  setConnection('connecting');
  try {
    await window.grbl.connect({ path, baudRate: Number(el.baudList.value) });
  } catch (err) {
    setConnection('error');
    appendLine(`Erro ao conectar: ${err.message}`, 'error');
  }
});

// ----------------------------------------------------------------------- jog

function jog(axis, sign) {
  if (!state.connected) return;
  const step = Number(el.stepSelect.value) * sign;
  const feed = Number(el.feedSelect.value);
  const cmd = { feed };
  cmd[axis] = step;
  window.grbl.jog(cmd);
}

el.jogXp.addEventListener('click', () => jog('x', 1));
el.jogXm.addEventListener('click', () => jog('x', -1));
el.jogYp.addEventListener('click', () => jog('y', 1));
el.jogYm.addEventListener('click', () => jog('y', -1));
el.homeBtn.addEventListener('click', () => window.grbl.home());
el.setOriginBtn.addEventListener('click', () => window.grbl.setOrigin(0, 0, 0));
el.gotoZeroBtn.addEventListener('click', () => window.grbl.gotoZero());
el.unlockBtn.addEventListener('click', () => window.grbl.unlock());
el.resetBtn.addEventListener('click', () => window.grbl.reset());

// ------------------------------------------------------------------ arquivo

el.fileOpen.addEventListener('click', async () => {
  let opened;
  try {
    opened = await window.grbl.openGcode();
  } catch (err) {
    appendLine(`Falha ao abrir o arquivo: ${err.message}`, 'error');
    return;
  }
  if (!opened) return;

  applyJobLines(opened.name, opened.text);
  appendLine(
    `Arquivo carregado: ${opened.name} (${state.lines.length} linhas)`,
    'ok',
  );
});

function applyJobLines(name, text) {
  state.lines = String(text)
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  state.fileName = name;
  el.fileInfo.textContent = `${name} — ${state.lines.length} linhas`;
  // Arquivo aberto manualmente: o preview volta para a imagem (se houver).
  if (imageState.loaded) {
    imageState.preview = {
      kind: 'image',
      data: imageState.loaded.data,
      width: imageState.loaded.width,
      height: imageState.loaded.height,
    };
    renderPreview();
  }
  updateControls();
}

el.playBtn.addEventListener('click', () => {
  if (!state.connected || !state.lines.length) return;
  window.grbl.startJob(state.lines, state.fileName);
});

el.pauseBtn.addEventListener('click', () => {
  if (state.jobState === 'paused') window.grbl.resumeJob();
  else window.grbl.pauseJob();
});

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
};

let gcodeWorker = null;
let convertId = 0;

function ensureWorker() {
  if (gcodeWorker) return gcodeWorker;
  try {
    gcodeWorker = new Worker('./gcode.worker.js');
  } catch (err) {
    appendLine(`Worker de imagem indisponível: ${err.message}`, 'error');
    return null;
  }
  gcodeWorker.onmessage = onConvertResult;
  gcodeWorker.onerror = (e) => {
    appendLine(
      `Erro no worker de imagem: ${e.message || 'desconhecido'}`,
      'error',
    );
    endConvert();
  };
  return gcodeWorker;
}

function endConvert() {
  imageState.busy = false;
  el.imgGenerate.disabled = !imageState.loaded;
  el.imgGenerate.textContent = 'Gerar G-code';
  el.imgGenerate.title = imageState.loaded
    ? 'Converte a imagem em G-code'
    : 'Escolha uma imagem primeiro';
}

function onConvertResult(ev) {
  const msg = ev.data;
  if (!msg || msg.id !== convertId) return; // resposta obsoleta
  endConvert();

  if (!msg.ok) {
    el.imgStats.textContent = `Falha: ${msg.error}`;
    appendLine(`Falha ao gerar G-code: ${msg.error}`, 'error');
    return;
  }
  applyGenerated(msg.gcode, msg.stats, msg.grid, msg.contourPaths);
}

function applyGenerated(gcode, stats, grid, contourPaths) {
  const image = imageState.loaded;
  if (!image) return;

  state.lines = gcode.split(/\r?\n/).filter((l) => l.trim().length > 0);
  state.fileName = `${baseName(image.name)}.gcode`;
  el.fileInfo.textContent = `${state.fileName} — ${state.lines.length} linhas (gerado de ${image.name})`;

  imageState.stats = stats;
  imageState.grid = grid;
  el.imgSave.disabled = state.lines.length === 0;
  el.imgSave.title = el.imgSave.disabled
    ? 'Gere o G-code primeiro'
    : 'Salva o G-code em disco';
  el.imgStats.textContent = formatStats(stats);

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
    `G-code gerado: ${state.lines.length} linhas, ${formatBytes(stats.bytes)}, ` +
      `${stats.rows}×${stats.cols} amostras, ~${formatTime(stats.estimatedSec)}`,
    'ok',
  );
}

function baseName(name) {
  return String(name).replace(/\.[^.]+$/, '');
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

function formatStats(stats) {
  const contours =
    typeof stats.contours === 'number' && stats.contours > 0
      ? ` · ${stats.contours} contornos`
      : '';
  return (
    `${stats.rows} linhas × ${stats.cols} amostras · ${stats.segments} segmentos · ` +
    `${formatBytes(stats.bytes)} · ~${formatTime(stats.estimatedSec)}${contours}`
  );
}

// --------------------------------------------------------------- importação

el.imageOpen.addEventListener('click', async () => {
  let opened;
  try {
    opened = await window.grbl.openImage();
  } catch (err) {
    setImageError('Falha ao abrir a imagem', err.message);
    return;
  }
  if (!opened) return;
  loadImageBlob(
    opened.name,
    new Blob([toBytes(opened.data)], { type: opened.mime }),
  );
});

/** Normaliza o retorno do IPC (Uint8Array/Buffer/ArrayBuffer) para bytes. */
function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (ArrayBuffer.isView(data))
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Uint8Array(data);
}

function setImageError(title, detail) {
  el.imageInfo.textContent = `${title}: ${detail}`;
  el.imageInfo.classList.add('error');
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
      setImageError('Imagem inválida', `${name} não informa largura/altura.`);
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

    const reduced =
      w !== naturalW || h !== naturalH
        ? ` (reduzida de ${naturalW}×${naturalH})`
        : '';
    el.imageInfo.textContent = `${name} — ${naturalW}×${naturalH}px${reduced}`;
    el.imageInfo.classList.remove('error');
    el.imgStats.textContent = '';
    el.imgSave.disabled = true;
    el.imgGenerate.disabled = false;
    el.imgGenerate.title = 'Converte a imagem em G-code';
    applySizeFromAspect('w');
    renderPreview();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    setImageError(
      'Formato não suportado',
      `${name} não pôde ser decodificada. Use PNG, JPG, BMP, GIF, WebP ou AVIF.`,
    );
  };
  img.src = url;
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
    ? 'Proporção travada: a altura acompanha a largura.'
    : 'Proporção livre: largura e altura são independentes.';
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
    },
    algorithm: el.imgAlgorithm.value,
    passes: Number(el.imgPasses.value),
    // Só existe no modo vetor: assim o campo vazio nunca invalida os modos raster.
    ...(el.imgAlgorithm.value === 'vector'
      ? { simplifyPx: Number(el.imgSimplify.value) }
      : {}),
  };
}

// ------------------------------------------------------ perfil de material (RF-IMG-8)

/** Catálogo empacotado por esbuild em `public/materials.js` (fonte: shared/materials.ts). */
const materials = window.GRBL_MATERIALS;

/** Opção "vazio" no topo do select de material. */
const MATERIAL_PLACEHOLDER = '— escolher material —';

/** Preenche o select de material conforme módulo + ação escolhidos. */
function populateMaterials() {
  if (!materials) return;
  const module = el.profileModule.value;
  const action = el.profileAction.value;
  const list = materials.profilesFor(module, action);

  el.profileMaterial.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = MATERIAL_PLACEHOLDER;
  el.profileMaterial.appendChild(placeholder);
  for (const profile of list) {
    const option = document.createElement('option');
    option.value = profile.material;
    option.textContent = profile.material;
    el.profileMaterial.appendChild(option);
  }
  el.profileHint.textContent =
    'Escolha um material para ver a recomendação do manual.';
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
  el.profileHint.textContent = `${profile.powerPercent}% de potência (S-max ${sMax}) · ${profile.speedMmMin} mm/min · ${profile.notes}`;
}

if (materials) {
  el.profileModule.addEventListener('change', populateMaterials);
  el.profileAction.addEventListener('change', populateMaterials);
  el.profileMaterial.addEventListener('change', applyProfile);
  populateMaterials();
} else {
  // Sem `public/materials.js` (build ausente): não deixa o campo parecer útil.
  el.profileMaterial.disabled = true;
  el.profileHint.textContent = 'Perfis indisponíveis: rode `npm run build`.';
}

el.imgGenerate.addEventListener('click', () => {
  const image = imageState.loaded;
  if (!image || imageState.busy) return;

  const worker = ensureWorker();
  if (!worker) return;

  const options = readImageOptions();
  imageState.algorithm = options.algorithm;
  imageState.busy = true;
  el.imgGenerate.disabled = true;
  el.imgGenerate.textContent = 'Gerando…';

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
});

el.imgSave.addEventListener('click', async () => {
  if (!state.lines.length || !imageState.loaded) return;
  try {
    const path = await window.grbl.saveGcode(
      `${baseName(imageState.loaded.name)}.gcode`,
      `${state.lines.join('\n')}\n`,
    );
    if (path) appendLine(`G-code salvo em ${path}`, 'ok');
  } catch (err) {
    appendLine(`Falha ao salvar: ${err.message}`, 'error');
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
  return { ctx, rect: { width: rect.width, height: rect.height } };
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

function renderPreview() {
  const preview = imageState.preview;
  if (!preview) {
    el.previewHint.classList.remove('hidden');
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

let previewResize = null;
window.addEventListener('resize', () => {
  if (previewResize) cancelAnimationFrame(previewResize);
  previewResize = requestAnimationFrame(() => {
    previewResize = null;
    renderPreview();
  });
});

// ----------------------------------------------------------------- console

el.consoleInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const cmd = el.consoleInput.value.trim();
  if (!cmd) return;
  if (!state.connected) {
    appendLine('Não conectado.', 'error');
    return;
  }
  window.grbl.writeLine(cmd);
  el.consoleInput.value = '';
});

// --------------------------------------------------------------- tema

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('grbl-theme', theme);
  } catch {
    /* ignora */
  }
}

el.themeBtn.addEventListener('click', () => {
  const next =
    document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
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

window.grbl.onConsole((line) => {
  appendLine(
    line.direction === 'out' ? `> ${line.text}` : line.text,
    line.kind,
  );
});

window.grbl.onStatus((s) => {
  const cls = STATE_CLASS[s.state] ?? '';
  el.stateBadge.className = `badge ${cls}`;
  el.stateBadge.textContent = s.state;

  const pos = s.mpos ?? s.wpos;
  el.droX.textContent = pos ? pos.x.toFixed(3) : '—';
  el.droY.textContent = pos ? pos.y.toFixed(3) : '—';
  el.droZ.textContent = pos ? pos.z.toFixed(3) : '—';
  el.metaFeed.textContent = s.fs ? `${s.fs.feed}` : '—';
  el.metaS.textContent = s.fs ? `${s.fs.spindle}` : '—';
});

window.grbl.onConnection((conn) => setConnection(conn));

window.grbl.onJob((job) => {
  setJobState(job.state);
  if (job.state === 'finished') appendLine('Job concluído.', 'ok');
  if (job.state === 'aborted' && job.error)
    appendLine(`Job abortado: ${job.error}`, 'error');
});

window.grbl.onProgress((p) => {
  const pct = p.total ? Math.round((p.sent / p.total) * 100) : 0;
  el.progressBar.style.width = `${pct}%`;
  el.progressText.textContent = `${p.sent} / ${p.total} (${pct}%)`;
});

window.grbl.onError((err) => {
  el.stateBadge.className = 'badge alarm';
  el.stateBadge.textContent = 'Erro';
  console.warn('GRBL:', err.message);
});

// -------------------------------------------------------------------- init

try {
  const saved = localStorage.getItem('grbl-theme');
  applyTheme(saved === 'light' ? 'light' : 'dark');
} catch {
  /* ignora */
}

// Travamento de proporção: o usuário decide uma vez e a escolha permanece.
try {
  const savedLock = localStorage.getItem(ASPECT_LOCK_KEY);
  if (savedLock !== null) el.imgKeepAspect.checked = savedLock === '1';
} catch {
  /* ignora */
}
updateSizeHint();

setConnection('disconnected');
refreshPorts();
