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
  fileInput: $('fileInput'),
  fileInfo: $('fileInfo'),
  playBtn: $('playBtn'),
  pauseBtn: $('pauseBtn'),
  stopBtn: $('stopBtn'),
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
  if (pendingLines.length > MAX_LINES * 2) pendingLines.splice(0, pendingLines.length - MAX_LINES);
  if (!flushScheduled) {
    flushScheduled = true;
    requestAnimationFrame(flushLines);
  }
}

function flushLines() {
  flushScheduled = false;
  const nearBottom =
    el.consoleOutput.scrollHeight - el.consoleOutput.scrollTop - el.consoleOutput.clientHeight < 40;

  const frag = document.createDocumentFragment();
  for (const { text, kind } of pendingLines) {
    const div = document.createElement('div');
    div.className = 'line-' + kind;
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

  el.connDot.className = 'dot' + (conn === 'connected' ? ' connected' : conn === 'connecting' ? ' connecting' : conn === 'error' ? ' error' : '');
  const labels = {
    disconnected: 'Desconectado',
    connecting: 'Conectando…',
    connected: 'Conectado',
    error: 'Erro de conexão',
  };
  el.connText.textContent = labels[conn] ?? conn;
  el.connectBtn.textContent = state.connected || conn === 'connecting' ? 'Desconectar' : 'Conectar';
  el.connectBtn.classList.toggle('primary', !state.connected && conn !== 'connecting');

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
  const idle = state.jobState === 'idle' || state.jobState === 'finished' || state.jobState === 'aborted';

  el.playBtn.disabled = !conn || !hasFile || !idle;
  el.playBtn.textContent = idle ? '▶ Iniciar' : '▶ Iniciar';
  el.pauseBtn.disabled = !(running || paused);
  el.pauseBtn.textContent = paused ? '▶ Retomar' : '⏸ Pausar';
  el.stopBtn.disabled = !(running || paused);

  for (const b of [el.jogXp, el.jogXm, el.jogYp, el.jogYm, el.homeBtn, el.unlockBtn, el.resetBtn, el.setOriginBtn, el.gotoZeroBtn]) {
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
    appendLine('Falha ao listar portas: ' + err.message, 'error');
    return;
  }
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
    appendLine('Erro ao conectar: ' + err.message, 'error');
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

el.fileInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    state.lines = String(ev.target.result)
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    state.fileName = file.name;
    el.fileInfo.textContent = `${file.name} — ${state.lines.length} linhas`;
    updateControls();
  };
  reader.readAsText(file);
});

el.playBtn.addEventListener('click', () => {
  if (!state.connected || !state.lines.length) return;
  window.grbl.startJob(state.lines, state.fileName);
});

el.pauseBtn.addEventListener('click', () => {
  if (state.jobState === 'paused') window.grbl.resumeJob();
  else window.grbl.pauseJob();
});

el.stopBtn.addEventListener('click', () => window.grbl.stopJob());

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
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
});

// ------------------------------------------------------- eventos do main

const STATE_CLASS = { Idle: 'idle', Run: 'run', Jog: 'run', Hold: 'hold', Alarm: 'alarm', Door: 'alarm' };

window.grbl.onConsole((line) => {
  appendLine(line.direction === 'out' ? `> ${line.text}` : line.text, line.kind);
});

window.grbl.onStatus((s) => {
  const cls = STATE_CLASS[s.state] ?? '';
  el.stateBadge.className = 'badge ' + cls;
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
  if (job.state === 'aborted' && job.error) appendLine('Job abortado: ' + job.error, 'error');
});

window.grbl.onProgress((p) => {
  const pct = p.total ? Math.round((p.sent / p.total) * 100) : 0;
  el.progressBar.style.width = pct + '%';
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

setConnection('disconnected');
refreshPorts();
