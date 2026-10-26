#!/usr/bin/env node
/**
 * Script de validação de benchmarks para CI gate (P1-2).
 *
 * Lê a saída do `npm run bench` (JSON lines `BENCH_READY`, `BENCH_LATENCY`)
 * e falha se exceder os thresholds definidos em `vitest.bench.config.ts`.
 *
 * Uso:
 *   npm run bench | node scripts/check-bench.mjs
 *   node scripts/bench.mjs | node scripts/check-bench.mjs
 */

/** Thresholds de performance para CI gate (P1-2) — inline para evitar dependência de build. */
const BENCH_THRESHOLDS = {
  startupMs: 1800,
  pssX11Mb: 300,
  pssWaylandMb: 320,
  fpsMin: 50,
  ipcP95Ms: 20,
};

/**
 * @typedef {object} BenchReady
 * @property {'READY'} event
 * @property {number} pid
 * @property {number} uptimeMs
 * @property {{ hookInstalledMs: number, didFinishLoadMs: number, readyToShowMs: number, firstPaintMs: number }} timings
 * @property {string} electron
 * @property {string} chrome
 * @property {string} node
 * @property {string} appVersion
 * @property {string} userData
 */

/**
 * @typedef {object} BenchLatency
 * @property {'LATENCY'} event
 * @property {number} samples
 * @property {number} minMs
 * @property {number} p50Ms
 * @property {number} p95Ms
 * @property {number} maxMs
 * @property {number} meanMs
 */

/**
 * @typedef {object} BenchError
 * @property {'ERROR'} event
 * @property {string} message
 */

/** @typedef {BenchReady | BenchLatency | BenchError} BenchLine */

/**
 * @param {string} line
 * @returns {BenchLine | null}
 */
function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('BENCH_')) return null;
  try {
    const jsonStart = trimmed.indexOf('{');
    if (jsonStart === -1) return null;
    return JSON.parse(trimmed.slice(jsonStart));
  } catch {
    return null;
  }
}

/** @param {number} ms */
function formatMs(ms) {
  return `${ms.toFixed(2)} ms`;
}

/** @param {number} bytes */
function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * @param {BenchReady} ready
 * @param {BenchLatency} latency
 * @returns {string[]}
 */
function checkThresholds(ready, latency) {
  /** @type {string[]} */
  const failures = [];

  // Startup: firstPaintMs (cold start)
  if (ready.timings.firstPaintMs > BENCH_THRESHOLDS.startupMs) {
    failures.push(
      `Startup ${formatMs(ready.timings.firstPaintMs)} > ${formatMs(BENCH_THRESHOLDS.startupMs)} (threshold)`,
    );
  }

  // IPC P95 latency
  if (latency.p95Ms > BENCH_THRESHOLDS.ipcP95Ms) {
    failures.push(
      `IPC P95 ${formatMs(latency.p95Ms)} > ${formatMs(BENCH_THRESHOLDS.ipcP95Ms)} (threshold)`,
    );
  }

  return failures;
}

async function main() {
  /** @type {BenchReady | null} */
  let ready = null;
  /** @type {BenchLatency | null} */
  let latency = null;
  let hadError = false;

  for await (const line of readLines()) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    switch (parsed.event) {
      case 'READY':
        ready = parsed;
        console.log(
          `[bench] READY: startup=${formatMs(ready.timings.firstPaintMs)}`,
        );
        break;
      case 'LATENCY':
        latency = parsed;
        console.log(
          `[bench] LATENCY: p50=${formatMs(latency.p50Ms)} p95=${formatMs(latency.p95Ms)} max=${formatMs(latency.maxMs)}`,
        );
        break;
      case 'ERROR':
        console.error(`[bench] ERROR: ${parsed.message}`);
        hadError = true;
        break;
    }
  }

  if (hadError) {
    console.error('[bench] Falha: evento ERROR recebido');
    process.exit(1);
  }

  if (!ready) {
    console.error('[bench] Falha: evento BENCH_READY não recebido');
    process.exit(1);
  }

  if (!latency) {
    console.error('[bench] Falha: evento BENCH_LATENCY não recebido');
    process.exit(1);
  }

  const failures = checkThresholds(ready, latency);

  if (failures.length > 0) {
    console.error('[bench] Thresholds excedidos:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log('[bench] ✓ Todos os thresholds dentro do limite');
}

/** @returns {AsyncIterable<string>} */
function readLines() {
  const decoder = new TextDecoder();
  let buffer = '';

  return {
    async *[Symbol.asyncIterator]() {
      for await (const chunk of process.stdin) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) yield line;
      }
      if (buffer) yield buffer;
    },
  };
}

main().catch((err) => {
  console.error('[bench] Erro fatal:', err);
  process.exit(1);
});
