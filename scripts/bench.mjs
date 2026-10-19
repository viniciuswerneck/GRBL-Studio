#!/usr/bin/env node
/**
 * Benchmark dos orçamentos de performance (RNF-11/RNF-12) no Linux.
 *
 * Mede, com o app Electron real e sem hardware:
 *  - startup: spawn → janela visível, carregada e com o primeiro frame pintado;
 *  - RAM: RSS (e PSS) de toda a árvore de processos após `--dwell`;
 *  - CPU ociosa: amostras de `/proc/<pid>/stat` (sem job e sem porta aberta);
 *  - latência de interação: round trip main → renderer → IPC (`app:info`).
 *
 * FPS durante job, latência de status (`?`) com hardware e DPI são procedimentos
 * manuais — ver `docs/BENCHMARK.md`.
 *
 * Uso:
 *   npm run build
 *   node scripts/bench.mjs
 *   node scripts/bench.mjs --dwell=600000
 *   node scripts/bench.mjs --json > bench.json
 *
 * Requer display (X11/Wayland) ou `xvfb-run` e build prévio em `dist/`.
 */

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const require = createRequire(import.meta.url);
const APP_ROOT = path.resolve(import.meta.dirname, '..');
const MB = 1024 * 1024;

/**
 * Caminho do binário do Electron sem executar o `index.js` do pacote: ele pode
 * imprimir "Downloading Electron binary..." no stdout e corromper o `--json`.
 */
function electronBinary() {
  const electronDir = path.dirname(require.resolve('electron'));
  const pathFile = path.join(electronDir, 'path.txt');
  const executable = readText(pathFile).trim();
  if (executable) {
    const full = path.join(electronDir, 'dist', executable);
    if (fs.existsSync(full)) return full;
  }
  // Linux (escopo deste benchmark): binário padrão do pacote.
  const fallback = path.join(electronDir, 'dist', 'electron');
  if (fs.existsSync(fallback)) return fallback;
  throw new Error(
    'binário do Electron não encontrado; rode `npm install` no repositório',
  );
}

const ELECTRON = electronBinary();

/** `getconf CLK_TCK` (quase sempre 100); usado para converter ticks em s. */
function clockTicksPerSecond() {
  try {
    const value = Number(
      execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' }).trim(),
    );
    return Number.isFinite(value) && value > 0 ? value : 100;
  } catch {
    return 100;
  }
}

const CLK_TCK = clockTicksPerSecond();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function distroName() {
  const match = /^PRETTY_NAME="?([^"\n]+)"?$/m.exec(
    readText('/etc/os-release'),
  );
  return match?.[1] ?? `${os.type()} ${os.release()}`;
}

function cpuModel() {
  const match = /^model name\s*:\s*(.+)$/m.exec(readText('/proc/cpuinfo'));
  return match?.[1]?.trim() ?? os.cpus()[0]?.model ?? 'desconhecida';
}

function parseDwell(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) {
    throw new Error(`--dwell inválido: ${value} (use milissegundos)`);
  }
  return Math.round(ms);
}

function parseArgs(argv) {
  const options = {
    dwellMs: 30_000,
    json: false,
    strict: false,
    verbose: false,
    keep: false,
    sandbox: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--verbose') options.verbose = true;
    else if (arg === '--keep') options.keep = true;
    else if (arg === '--sandbox') options.sandbox = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--dwell') {
      const next = argv[i + 1];
      if (next === undefined) throw new Error('--dwell exige um valor em ms');
      options.dwellMs = parseDwell(next);
      i += 1;
    } else if (arg.startsWith('--dwell=')) {
      options.dwellMs = parseDwell(arg.slice('--dwell='.length));
    } else {
      throw new Error(`argumento desconhecido: ${arg}`);
    }
  }
  return options;
}

function usage() {
  console.log(`Benchmark dos orçamentos de performance (RNF-11) — GRBL Studio

Uso:
  node scripts/bench.mjs [opções]
  env -u WAYLAND_DISPLAY -u XDG_SESSION_TYPE \\
    xvfb-run -a node scripts/bench.mjs [opções]

Opções:
  --dwell=MS     Espera antes de medir RAM/CPU (padrão 30000; 600000 = 10 min)
  --json         Imprime JSON (sem a tabela markdown)
  --strict       Sai com código 1 se algum orçamento automático falhar
  --sandbox      Não passa --no-sandbox ao Electron
  --keep         Mantém o userData temporário (para investigar)
  --verbose      Ecoa stdout/stderr do app
  -h, --help     Esta ajuda

Requer display (use xvfb-run em ambiente headless) e npm run build prévio.`);
}

// ---------------------------------------------------------------- /proc

function readProcStat(pid) {
  const raw = readText(`/proc/${pid}/stat`);
  if (!raw) return null;
  const close = raw.lastIndexOf(')');
  if (close < 0) return null;
  const rest = raw
    .slice(close + 2)
    .trim()
    .split(/\s+/);
  const utime = Number(rest[11]);
  const stime = Number(rest[12]);
  const ppid = Number(rest[1]);
  if (!Number.isFinite(ppid)) return null;
  return {
    pid,
    ppid,
    state: rest[0] ?? '',
    ticks:
      (Number.isFinite(utime) ? utime : 0) +
      (Number.isFinite(stime) ? stime : 0),
  };
}

function listProcessTree(rootPid) {
  let entries = [];
  try {
    entries = fs.readdirSync('/proc');
  } catch {
    return [];
  }

  const stats = new Map();
  for (const entry of entries) {
    if (!/^\d+$/.test(entry)) continue;
    const stat = readProcStat(Number(entry));
    if (stat) stats.set(stat.pid, stat);
  }

  const children = new Map();
  for (const stat of stats.values()) {
    const list = children.get(stat.ppid) ?? [];
    list.push(stat.pid);
    children.set(stat.ppid, list);
  }

  const tree = [];
  const queue = [rootPid];
  const seen = new Set();
  while (queue.length > 0) {
    const pid = queue.shift();
    if (pid === undefined || seen.has(pid)) continue;
    seen.add(pid);
    const stat = stats.get(pid);
    if (!stat) continue;
    tree.push(stat);
    queue.push(...(children.get(pid) ?? []));
  }
  return tree;
}

function procMemory(pid) {
  const status = readText(`/proc/${pid}/status`);
  const rssKb = /^VmRSS:\s+(\d+)\s+kB$/m.exec(status)?.[1];
  const rollup = readText(`/proc/${pid}/smaps_rollup`);
  const pssKb = /^Pss:\s+(\d+)\s+kB$/m.exec(rollup)?.[1];
  return {
    rss: Number(rssKb ?? 0) * 1024,
    pss: pssKb === undefined ? null : Number(pssKb) * 1024,
  };
}

function processType(pid, rootPid, cmdline) {
  if (pid === rootPid) return 'main';
  if (cmdline.includes('--type=renderer')) return 'renderer';
  if (cmdline.includes('--type=gpu-process')) return 'gpu';
  if (cmdline.includes('--type=utility')) return 'utility';
  if (cmdline.includes('--type=zygote')) return 'zygote';
  return 'other';
}

function snapshotProcesses(rootPid) {
  const tree = listProcessTree(rootPid);
  const processes = tree.map((stat) => {
    const memory = procMemory(stat.pid);
    const cmdline = readText(`/proc/${stat.pid}/cmdline`)
      .split('\0')
      .filter(Boolean)
      .join(' ');
    return {
      pid: stat.pid,
      ppid: stat.ppid,
      state: stat.state,
      ticks: stat.ticks,
      rss: memory.rss,
      pss: memory.pss,
      type: processType(stat.pid, rootPid, cmdline),
    };
  });

  const rssByType = {};
  let totalRss = 0;
  let totalPss = 0;
  let pssComplete = processes.length > 0;
  for (const proc of processes) {
    totalRss += proc.rss;
    if (proc.pss === null) pssComplete = false;
    else totalPss += proc.pss;
    rssByType[proc.type] = (rssByType[proc.type] ?? 0) + proc.rss;
  }

  return { processes, totalRss, totalPss, pssComplete, rssByType };
}

function tickMap(rootPid) {
  const map = new Map();
  for (const stat of listProcessTree(rootPid)) {
    map.set(stat.pid, stat.ticks);
  }
  return map;
}

/** Igual a `tickMap`, mas com o tipo de cada processo (para atribuir a CPU). */
function tickMapTyped(rootPid) {
  const map = new Map();
  for (const stat of listProcessTree(rootPid)) {
    const cmdline = readText(`/proc/${stat.pid}/cmdline`).split('\0').join(' ');
    map.set(stat.pid, {
      ticks: stat.ticks,
      type: processType(stat.pid, rootPid, cmdline),
    });
  }
  return map;
}

async function sampleIdleCpu(rootPid, windows = 5, windowMs = 1000) {
  const samples = [];
  const ticksByType = new Map();
  for (let i = 0; i < windows; i += 1) {
    const before = tickMapTyped(rootPid);
    await delay(windowMs);
    const after = tickMapTyped(rootPid);
    let delta = 0;
    for (const [pid, info] of after) {
      const previous = before.get(pid);
      if (previous === undefined) continue;
      const spent = Math.max(0, info.ticks - previous.ticks);
      delta += spent;
      ticksByType.set(info.type, (ticksByType.get(info.type) ?? 0) + spent);
    }
    const percent = (delta / CLK_TCK / (windowMs / 1000)) * 100;
    samples.push(percent);
  }
  const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const max = Math.max(...samples);
  // A CPU da árvore inteira soma vários processos; sem esta quebra, um pico no
  // GPU ou no renderer fica indistinguível de um pico no main.
  const byTypePercent = {};
  for (const [type, ticks] of ticksByType) {
    byTypePercent[type] = Number(
      ((ticks / CLK_TCK / ((windowMs * windows) / 1000)) * 100).toFixed(3),
    );
  }
  return {
    windows: samples.length,
    windowMs,
    samples: samples.map((value) => Number(value.toFixed(3))),
    avgPercent: Number(avg.toFixed(3)),
    maxPercent: Number(max.toFixed(3)),
    avgPercentMachine: Number((avg / os.cpus().length).toFixed(4)),
    byTypePercent,
  };
}

/**
 * CPU ociosa **ao longo do dwell** (uma janela a cada `everyMs`).
 *
 * Uma única janela de 5 s no fim do dwell não distingue "ocioso o tempo todo"
 * de "pico que caiu justo na medição" — e foi assim que a 0.8.0 registrou
 * 7,40 % depois de 10 min (ver `docs/BENCHMARK.md` §6.4): sem a linha do tempo
 * não dá para saber se a CPU cresce (timer/vazamento) ou se o número veio de um
 * evento isolado. As amostras ficam no JSON (`cpu.timeline`).
 */
function startCpuTimeline(rootPid, everyMs = 30_000, windowMs = 1000) {
  const samples = [];
  const startedAt = performance.now();
  let stopped = false;
  let timer = null;
  const sleep = (ms) =>
    new Promise((resolve) => {
      timer = setTimeout(resolve, ms);
    });
  const tick = async () => {
    const before = tickMap(rootPid);
    await sleep(windowMs);
    if (stopped) return;
    const after = tickMap(rootPid);
    let delta = 0;
    for (const [pid, ticks] of after) {
      const previous = before.get(pid);
      if (previous !== undefined) delta += Math.max(0, ticks - previous);
    }
    samples.push({
      atMs: Math.round(performance.now() - startedAt),
      percent: Number(((delta / CLK_TCK / (windowMs / 1000)) * 100).toFixed(3)),
    });
    await sleep(Math.max(0, everyMs - windowMs));
    if (stopped) return;
    void tick();
  };
  void tick();
  return {
    windowMs,
    everyMs,
    samples,
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      return samples;
    },
  };
}

// ------------------------------------------------------------- medição

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function stopChild(child, timeoutMs = 10_000) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(force);
      resolve();
    };
    child.once('exit', finish);
    child.kill('SIGTERM');
    const force = setTimeout(() => {
      child.kill('SIGKILL');
      child.once('exit', finish);
      setTimeout(finish, 2000);
    }, timeoutMs);
  });
}

function spawnApp(options, userData) {
  const env = { ...process.env, GRBL_BENCH: '1' };
  delete env.GRBL_SMOKE_TEST;
  delete env.GRBL_E2E;

  const args = [
    APP_ROOT,
    `--user-data-dir=${userData}`,
    ...(options.sandbox ? [] : ['--no-sandbox']),
  ];

  const startedAt = performance.now();
  const child = spawn(ELECTRON, args, {
    cwd: APP_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { child, startedAt };
}

async function measure(options) {
  const loadAtStart = os.loadavg()[0];
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'grbl-bench-'));
  const { child, startedAt } = spawnApp(options, userData);
  const ready = deferred();
  const latency = deferred();
  // Evita "unhandled rejection" se uma das promessas falhar antes do await.
  ready.promise.catch(() => {});
  latency.promise.catch(() => {});

  const stderrTail = [];
  let appExited = false;
  let benchError = null;

  const stdout = readline.createInterface({ input: child.stdout });
  stdout.on('line', (line) => {
    if (options.verbose) console.error(`[app] ${line}`);
    if (!line.startsWith('BENCH_')) return;
    const separator = line.indexOf(' ');
    if (separator < 0) return;
    const event = line.slice('BENCH_'.length, separator);
    let payload;
    try {
      payload = JSON.parse(line.slice(separator + 1));
    } catch {
      return;
    }
    if (event === 'READY') ready.resolve(payload);
    else if (event === 'LATENCY') latency.resolve(payload);
    else if (event === 'ERROR') {
      benchError = String(payload.message ?? 'erro no modo benchmark');
      ready.reject(new Error(benchError));
      latency.reject(new Error(benchError));
    }
  });

  const stderr = readline.createInterface({ input: child.stderr });
  stderr.on('line', (line) => {
    stderrTail.push(line);
    if (stderrTail.length > 40) stderrTail.shift();
    if (options.verbose) console.error(`[app:stderr] ${line}`);
  });

  const exitMessage = () =>
    `Electron encerrou antes da medição${benchError ? `: ${benchError}` : ''}${
      stderrTail.length > 0 ? `\n${stderrTail.join('\n')}` : ''
    }`;

  child.once('exit', () => {
    appExited = true;
    ready.reject(new Error(exitMessage()));
    latency.reject(new Error(exitMessage()));
  });
  child.once('error', (err) => {
    ready.reject(err);
    latency.reject(err);
  });

  try {
    const readyPayload = await withTimeout(
      ready.promise,
      30_000,
      `timeout aguardando a janela carregar${
        stderrTail.length > 0 ? `\n${stderrTail.join('\n')}` : ''
      }`,
    );
    const startupMs = performance.now() - startedAt;
    const rootPid = readyPayload.pid ?? child.pid;

    const latencyResult = withTimeout(
      latency.promise,
      30_000,
      'timeout aguardando a medição de latência',
    )
      .then((value) => ({ ok: true, value }))
      .catch((err) => ({ ok: false, error: err.message }));

    // A RAM é medida exatamente após `--dwell` a partir da janela pronta.
    // Durante o dwell a CPU é amostrada a cada 30 s (linha do tempo): a janela
    // única do fim não mostra se o consumo cresce com o tempo.
    const timeline = startCpuTimeline(rootPid);
    await delay(options.dwellMs);
    timeline.stop();
    const memory = snapshotProcesses(rootPid);
    const cpu = await sampleIdleCpu(rootPid);
    cpu.timeline = {
      everyMs: timeline.everyMs,
      windowMs: timeline.windowMs,
      samples: timeline.samples,
    };
    const latencyOutcome = await latencyResult;

    if (appExited) throw new Error(exitMessage());

    return {
      ready: readyPayload,
      startupMs,
      memory,
      cpu,
      latency: latencyOutcome.ok ? latencyOutcome.value : null,
      latencyError: latencyOutcome.ok ? null : latencyOutcome.error,
      loadAtStart,
      loadAtEnd: os.loadavg()[0],
      userData,
      command: `node scripts/bench.mjs --dwell=${options.dwellMs}${
        options.json ? ' --json' : ''
      }${options.strict ? ' --strict' : ''}`,
    };
  } finally {
    stdout.close();
    stderr.close();
    await stopChild(child);
    if (options.keep) {
      console.error(`userData mantido: ${userData}`);
    } else {
      fs.rmSync(userData, { recursive: true, force: true });
    }
  }
}

// ------------------------------------------------------------- relatório

const number = (value, digits = 0) =>
  Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const mb = (bytes) => bytes / MB;

function grade(value, good, warn) {
  if (value === null || !Number.isFinite(value)) return 'n/d';
  if (value <= good) return '✅';
  if (value <= warn) return '⚠';
  return '❌';
}

function buildReport(run, options) {
  const now = new Date();
  const environment = {
    date: now.toISOString(),
    dateLocal: now.toLocaleString('pt-BR'),
    platform: `${os.platform()} ${os.arch()}`,
    distro: distroName(),
    kernel: os.release(),
    cpu: cpuModel(),
    cores: os.cpus().length,
    loadAverage1: Number(run.loadAtStart.toFixed(2)),
    loadAverageEnd: Number(run.loadAtEnd.toFixed(2)),
    loadHigh:
      run.loadAtStart > os.cpus().length || run.loadAtEnd > os.cpus().length,
    totalMemoryMB: Number(mb(os.totalmem()).toFixed(1)),
    electron: run.ready.electron ?? null,
    chrome: run.ready.chrome ?? null,
    nodeApp: run.ready.node ?? null,
    nodeScript: process.version,
    appVersion: run.ready.appVersion ?? null,
    // Electron escolhe Wayland quando WAYLAND_DISPLAY existe, mesmo com
    // DISPLAY setado (ex.: xvfb-run sem remover a sessão Wayland herdada).
    display: process.env.WAYLAND_DISPLAY
      ? `Wayland (WAYLAND_DISPLAY=${process.env.WAYLAND_DISPLAY})`
      : `X11 (DISPLAY=${process.env.DISPLAY ?? ''})`,
    displayServer: process.env.WAYLAND_DISPLAY ? 'wayland' : 'x11',
    displayEnv: {
      DISPLAY: process.env.DISPLAY ?? null,
      WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY ?? null,
      XDG_SESSION_TYPE: process.env.XDG_SESSION_TYPE ?? null,
    },
    sandbox: options.sandbox,
    dwellMs: options.dwellMs,
    userDataIsolated: true,
  };

  const latency = run.latency;
  const rssByType = {};
  for (const [type, bytes] of Object.entries(run.memory.rssByType)) {
    rssByType[type] = Number(mb(bytes).toFixed(2));
  }

  const budgets = [
    {
      key: 'startup',
      metric: 'Startup (spawn → janela pronta)',
      measured: Number(run.startupMs.toFixed(1)),
      unit: 'ms',
      display: `${number(run.startupMs, 0)} ms`,
      limit: '≤ 1 500 ms',
      status: grade(run.startupMs, 1500, 1800),
    },
    {
      key: 'rss',
      metric: `RAM (RSS total após ${number(options.dwellMs / 1000, 0)} s)`,
      measured: Number(mb(run.memory.totalRss).toFixed(1)),
      unit: 'MB',
      display: `${number(mb(run.memory.totalRss), 1)} MB`,
      limit: '≤ 200 MB',
      status: grade(mb(run.memory.totalRss), 200, 220),
    },
    {
      key: 'cpu',
      metric: `CPU ociosa (média de ${run.cpu.windows} s)`,
      measured: run.cpu.avgPercent,
      unit: '% de 1 core',
      display: `${number(run.cpu.avgPercent, 2)} % de 1 core`,
      limit: '≈ 0 % (≤ 1 %)',
      status: grade(run.cpu.avgPercent, 1, 3),
    },
    {
      key: 'latency',
      metric: 'Latência de interação (p95)',
      measured: latency?.p95Ms ?? null,
      unit: 'ms',
      display: latency ? `${number(latency.p95Ms, 1)} ms` : 'n/d (falhou)',
      limit: '≤ 100 ms',
      status: grade(latency?.p95Ms ?? null, 100, 150),
    },
    {
      key: 'fps',
      metric: 'FPS durante job',
      measured: null,
      unit: 'fps',
      display: '—',
      limit: '≥ 55 fps',
      status: 'manual',
    },
    {
      key: 'status-latency',
      metric: 'Latência de status (?)',
      measured: null,
      unit: 'ms',
      display: '—',
      limit: '≤ 200 ms',
      status: 'manual',
    },
    {
      key: 'dpi',
      metric: 'DPI 100/125/150/200 %',
      measured: null,
      unit: '—',
      display: '—',
      limit: 'nítido',
      status: 'manual',
    },
  ];

  const failed = budgets.some(
    (budget) => budget.status === '❌' || budget.status === 'n/d',
  );

  return {
    environment,
    command: run.command,
    startup: {
      spawnToReadyMs: Number(run.startupMs.toFixed(1)),
      mainReportedUptimeMs: run.ready.uptimeMs ?? null,
      phases: run.ready.timings ?? null,
    },
    memory: {
      dwellMs: options.dwellMs,
      totalRssMB: Number(mb(run.memory.totalRss).toFixed(2)),
      totalPssMB: run.memory.pssComplete
        ? Number(mb(run.memory.totalPss).toFixed(2))
        : null,
      rssByTypeMB: rssByType,
      processes: run.memory.processes.length,
      detail: run.memory.processes.map((proc) => ({
        pid: proc.pid,
        type: proc.type,
        rssMB: Number(mb(proc.rss).toFixed(2)),
        pssMB: proc.pss === null ? null : Number(mb(proc.pss).toFixed(2)),
      })),
    },
    cpu: run.cpu,
    latency: latency
      ? {
          ...latency,
          note: 'main → executeJavaScript → window.grbl.getAppInfo() → IPC',
        }
      : { error: run.latencyError },
    budgets,
    manual: [
      'FPS durante job (procedimento em docs/BENCHMARK.md)',
      'Latência de status (?) com hardware/emulador',
      'DPI 100/125/150/200 %',
      'Resposta visual de uma interação real (clique/paint)',
    ],
    failed,
  };
}

function markdown(report) {
  const lines = [];
  const env = report.environment;
  lines.push(`## Benchmark de performance — ${env.dateLocal}`);
  lines.push('');
  lines.push('### Orçamentos (RNF-11 / RNF-12)');
  lines.push('');
  lines.push('| Métrica | Medido | Orçamento | Status |');
  lines.push('| :--- | ---: | ---: | :---: |');
  for (const budget of report.budgets) {
    lines.push(
      `| ${budget.metric} | ${budget.display} | ${budget.limit} | ${budget.status} |`,
    );
  }
  lines.push('');
  lines.push(
    '> Linhas `manual` não são medidas por este script: exigem job real/emulador',
  );
  lines.push('> e avaliação visual. Ver `docs/BENCHMARK.md`.');
  lines.push('');
  lines.push('### Ambiente');
  lines.push('');
  lines.push('| Item | Valor |');
  lines.push('| :--- | :--- |');
  lines.push(`| Data | ${env.dateLocal} (${env.date}) |`);
  lines.push(`| Distro | ${env.distro} |`);
  lines.push(`| Kernel | ${env.kernel} |`);
  lines.push(`| CPU | ${env.cpu} |`);
  lines.push(`| Núcleos | ${env.cores} |`);
  lines.push(`| RAM total | ${number(env.totalMemoryMB, 1)} MB |`);
  lines.push(
    `| Carga do sistema (início / fim) | ${number(env.loadAverage1, 2)} / ${number(env.loadAverageEnd, 2)}${
      env.loadHigh ? ' ⚠️ alta (medição ruidosa)' : ''
    } |`,
  );
  lines.push(`| Electron | ${env.electron ?? '—'} |`);
  lines.push(`| Chrome | ${env.chrome ?? '—'} |`);
  lines.push(
    `| Node (app / script) | ${env.nodeApp ?? '—'} / ${env.nodeScript} |`,
  );
  lines.push(`| App | ${env.appVersion ?? '—'} |`);
  lines.push(`| Display | ${env.display} |`);
  lines.push(
    `| XDG_SESSION_TYPE | ${env.displayEnv.XDG_SESSION_TYPE ?? 'não definida'}${env.sandbox ? '' : ' · --no-sandbox'} |`,
  );
  lines.push(`| Dwell | ${number(env.dwellMs / 1000, 0)} s |`);
  lines.push('| userData | temporário/isolado |');
  lines.push('');
  lines.push('### Detalhes da medição');
  lines.push('');
  lines.push('| Item | Valor |');
  lines.push('| :--- | ---: |');
  lines.push(
    `| Startup interno (process.uptime) | ${report.startup.mainReportedUptimeMs ?? '—'} ms |`,
  );
  const phases = report.startup.phases;
  if (phases) {
    lines.push(
      `| Fases (hook / load / show / paint) | ${phases.hookInstalledMs} / ${phases.didFinishLoadMs} / ${phases.readyToShowMs} / ${phases.firstPaintMs} ms |`,
    );
  }
  for (const [type, value] of Object.entries(report.memory.rssByTypeMB)) {
    lines.push(`| RSS ${type} | ${number(value, 1)} MB |`);
  }
  lines.push(
    `| RSS total (árvore) | ${number(report.memory.totalRssMB, 1)} MB |`,
  );
  lines.push(
    `| PSS total | ${
      report.memory.totalPssMB === null
        ? '—'
        : `${number(report.memory.totalPssMB, 1)} MB`
    } |`,
  );
  lines.push(`| Processos | ${report.memory.processes} |`);
  lines.push(
    `| CPU (média / pico) | ${number(report.cpu.avgPercent, 2)} / ${number(report.cpu.maxPercent, 2)} % de 1 core |`,
  );
  lines.push(
    `| CPU machine-wide | ${number(report.cpu.avgPercentMachine, 3)} % |`,
  );
  const timeline = report.cpu.timeline?.samples ?? [];
  if (timeline.length > 0) {
    const avgOf = (list) =>
      list.length > 0
        ? list.reduce((sum, sample) => sum + sample.percent, 0) / list.length
        : 0;
    const head = timeline.filter((sample) => sample.atMs <= 60_000);
    const tail = timeline.filter((sample) => sample.atMs > 60_000);
    const peak = Math.max(...timeline.map((sample) => sample.percent));
    const windowS = report.cpu.timeline.windowMs / 1000;
    const detail =
      tail.length > 0
        ? `${number(avgOf(head), 2)} % no 1º min → ${number(avgOf(tail), 2)} % depois (pico ${number(peak, 2)} %)`
        : `${number(avgOf(head), 2)} %`;
    lines.push(
      `| CPU ociosa ao longo do dwell | ${detail} — ${timeline.length} amostras de ${windowS} s |`,
    );
  }
  const byType = Object.entries(report.cpu.byTypePercent ?? {}).sort(
    (a, b) => b[1] - a[1],
  );
  if (byType.length > 0) {
    lines.push(
      `| CPU por processo | ${byType
        .map(([type, value]) => `${type} ${number(value, 2)} %`)
        .join(' · ')} |`,
    );
  }
  if (report.latency.p95Ms !== undefined) {
    lines.push(
      `| Latência min / p50 / p95 / máx | ${number(report.latency.minMs, 1)} / ${number(report.latency.p50Ms, 1)} / ${number(report.latency.p95Ms, 1)} / ${number(report.latency.maxMs, 1)} ms |`,
    );
    lines.push(
      `| Amostras de latência | ${report.latency.samples} (após 5 de warm-up) |`,
    );
  } else {
    lines.push(`| Latência | erro: ${report.latency.error} |`);
  }
  lines.push(`| Comando | \`${report.command}\` |`);
  lines.push('');
  lines.push('### O que não é medido aqui');
  lines.push('');
  for (const item of report.manual) lines.push(`- ${item}`);
  lines.push('- Windows e macOS (este benchmark cobre apenas Linux).');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`bench: ${err.message}`);
    usage();
    return 2;
  }

  if (options.help) {
    usage();
    return 0;
  }

  if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    console.error(
      'bench: sem display. Rode com `xvfb-run -a node scripts/bench.mjs` (ou em uma sessão gráfica).',
    );
    return 2;
  }

  if (!fs.existsSync(path.join(APP_ROOT, 'dist/main/index.js'))) {
    console.error('bench: build ausente. Rode `npm run build` antes.');
    return 2;
  }

  let run;
  try {
    run = await measure(options);
  } catch (err) {
    console.error(`bench: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  const report = buildReport(run, options);
  if (report.environment.loadHigh) {
    console.error(
      `bench: aviso: carga do sistema ${report.environment.loadAverage1} em ${report.environment.cores} núcleos — números de startup/CPU podem estar inflados.`,
    );
  }
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else console.log(markdown(report));

  if (options.strict && report.failed) return 1;
  return 0;
}

main().then((code) => {
  process.exitCode = code;
});
