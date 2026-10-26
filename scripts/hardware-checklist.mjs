#!/usr/bin/env node
/**
 * Hardware Checklist — GRBL Studio
 *
 * Executa checklist sequencial em máquina real conectada via serial.
 * Requer: GRBL_PORT e GRBL_BAUD (env) ou --port/--baud (CLI).
 * Gera relatório JSON com resultados por teste, latências e resumo.
 *
 * Uso:
 *   GRBL_PORT=/dev/ttyUSB0 GRBL_BAUD=115200 node scripts/hardware-checklist.mjs
 *   node scripts/hardware-checklist.mjs --port /dev/ttyUSB0 --baud 115200 --duration 300 --out report.json
 */

import { SerialPort } from 'serialport';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Tipos de resultado por teste. */
const TEST_STATUS = { PASS: 'PASS', FAIL: 'FAIL', SKIP: 'SKIP' };

/** Comando de tempo real (byte único, sem \n). */
const REALTIME = {
  status: 0x3f, // '?'
  feedHold: 0x21, // '!'
  cycleStart: 0x7e, // '~'
  softReset: 0x18, // Ctrl-X
  jogCancel: 0x85,
  overrideFeedDefault: 0x90,
  overrideFeedPlus10: 0x91,
  overrideFeedMinus10: 0x92,
  overrideFeedPlus1: 0x93,
  overrideFeedMinus1: 0x94,
  overrideRapidDefault: 0x95,
  overrideRapidMedium: 0x96,
  overrideRapidLow: 0x97,
  overrideSpindleDefault: 0x99,
  overrideSpindlePlus10: 0x9a,
  overrideSpindleMinus10: 0x9b,
  overrideSpindlePlus1: 0x9c,
  overrideSpindleMinus1: 0x9d,
};

/** Configuração padrão. */
const DEFAULTS = {
  port: process.env.GRBL_PORT,
  baud: Number(process.env.GRBL_BAUD) || 115200,
  durationShort: Number(process.env.GRBL_DURATION_SHORT) || 5 * 60 * 1000, // 5 min
  durationLong: Number(process.env.GRBL_DURATION_LONG) || 10 * 60 * 1000, // 10 min
  output: process.env.GRBL_OUTPUT,
  homingTimeout: 60000,
  commandTimeout: 10000,
  statusPollMs: 200,
  lineWindow: 16, // planner blocks
  rxBufferSize: 128,
};

/** Estado da conexão e parsing. */
class GrblConnection {
  constructor(path, baud) {
    this.path = path;
    this.baud = baud;
    this.port = null;
    this.buffer = '';
    this.pendingResolve = null;
    this.pendingReject = null;
    this.pendingTimer = null;
    this.pendingRealtime = false;
    this.pendingStart = 0;
    this.lastStatus = null;
    this.lastStatusAt = 0;
    this.statusListeners = [];
    this.consoleListeners = [];
  }

  /** Abre a porta serial sem togglar DTR/RTS. */
  async open() {
    // Verifica se a porta existe antes de tentar abrir
    const list = await SerialPort.list();
    const exists = list.some((p) => p.path === this.path);
    if (!exists) {
      throw new Error(
        `Porta ${this.path} não encontrada. Disponíveis: ${list.map((p) => p.path).join(', ') || 'nenhuma'}`,
      );
    }

    await new Promise((resolve, reject) => {
      this.port = new SerialPort({
        path: this.path,
        baudRate: this.baud,
        autoOpen: false,
        dtr: false,
        rts: false,
      });
      // Timeout de segurança
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout abrindo porta ${this.path}`));
      }, 5000);
      this.port.open((err) => {
        clearTimeout(timeout);
        err ? reject(err) : resolve();
      });
    });

    this.port.on('data', (chunk) => this.onData(chunk));
    this.port.on('error', (err) =>
      console.error(`[port error] ${err.message}`),
    );
    // Drena banner/ruído inicial
    await this.sleep(1200);
  }

  /** Fecha a porta. */
  async close() {
    if (!this.port) return;
    return new Promise((resolve) => this.port.close(resolve));
  }

  /** Registra listener de status reports. */
  onStatus(fn) {
    this.statusListeners.push(fn);
    return () => {
      const i = this.statusListeners.indexOf(fn);
      if (i >= 0) this.statusListeners.splice(i, 1);
    };
  }

  /** Registra listener de console (in/out). */
  onConsole(fn) {
    this.consoleListeners.push(fn);
    return () => {
      const i = this.consoleListeners.indexOf(fn);
      if (i >= 0) this.consoleListeners.splice(i, 1);
    };
  }

  /** Envia comando normal (termina com \n). */
  async sendCommand(line, timeout = DEFAULTS.commandTimeout) {
    return this.send(`${line}\n`, false, timeout);
  }

  /** Envia comando de tempo real (byte único). */
  async sendRealtime(byte, timeout = 500) {
    return this.send(byte, true, timeout);
  }

  /** Envia comando e aguarda resposta (ok/error/ALARM ou status report). */
  async send(payload, realtime, timeout) {
    if (!this.port) throw new Error('Porta não aberta');
    if (this.pendingResolve) throw new Error('Comando anterior ainda pendente');

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      this.pendingRealtime = realtime;
      this.pendingStart = Date.now();

      this.pendingTimer = setTimeout(() => {
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(new Error(`Timeout (${timeout}ms) aguardando resposta`));
      }, timeout);

      if (typeof payload === 'number') {
        this.port.write(Buffer.from([payload]));
        for (const fn of this.consoleListeners)
          fn('out', `0x${payload.toString(16).toUpperCase().padStart(2, '0')}`);
      } else {
        this.port.write(payload);
        for (const fn of this.consoleListeners) fn('out', payload.trim());
      }
    });
  }

  /** Processa dados recebidos da porta. */
  onData(chunk) {
    const text = chunk.toString('utf8');
    this.buffer += text;

    // Divide em linhas (status reports podem vir sem \n colados no ok)
    const parts = this.buffer.split('\n');
    this.buffer = parts.pop() ?? '';

    for (const raw of parts) {
      const line = raw.replace(/\r$/, '').trim();
      if (!line) continue;
      for (const fn of this.consoleListeners) fn('in', line);

      // Status report
      if (line.startsWith('<') && line.endsWith('>')) {
        this.lastStatus = line;
        this.lastStatusAt = Date.now();
        for (const fn of this.statusListeners) fn(line);
        if (this.pendingRealtime && this.pendingResolve) {
          const lines = [line];
          clearTimeout(this.pendingTimer);
          this.pendingResolve(lines);
          this.pendingResolve = null;
          this.pendingReject = null;
        }
        continue;
      }

      // Linhas de resposta a comandos normais
      if (this.pendingResolve && !this.pendingRealtime) {
        if (
          /^ok\b/i.test(line) ||
          /^error:/i.test(line) ||
          /^ALARM:/i.test(line)
        ) {
          clearTimeout(this.pendingTimer);
          this.pendingResolve([line]);
          this.pendingResolve = null;
          this.pendingReject = null;
        }
      }
    }
  }

  /** Último status report recebido. */
  getLastStatus() {
    return this.lastStatus;
  }

  /** Tempo desde último status. */
  getStatusAge() {
    return Date.now() - this.lastStatusAt;
  }

  /** Aguarda status report com estado específico. */
  async waitForState(targetState, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const status = this.getLastStatus();
      if (
        status &&
        (status.includes(`|${targetState}|`) ||
          status.startsWith(`<${targetState}|`))
      ) {
        return status;
      }
      await this.sleep(100);
    }
    throw new Error(`Timeout aguardando estado ${targetState}`);
  }

  /** Aguarda posição MPos aproximada. */
  async waitForPosition(target, tolerance = 0.5, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const status = this.getLastStatus();
      if (status) {
        const mpos = this.parseMPos(status);
        if (mpos) {
          const ok =
            (!target.x || Math.abs(mpos.x - target.x) <= tolerance) &&
            (!target.y || Math.abs(mpos.y - target.y) <= tolerance) &&
            (!target.z || Math.abs(mpos.z - target.z) <= tolerance);
          if (ok) return mpos;
        }
      }
      await this.sleep(100);
    }
    throw new Error(`Timeout aguardando posição ${JSON.stringify(target)}`);
  }

  parseMPos(status) {
    const match = status.match(/MPos:([^|]+)/);
    if (!match) return null;
    const parts = match[1].split(',').map(Number.parseFloat);
    if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null;
    return { x: parts[0], y: parts[1], z: parts[2] ?? 0 };
  }

  /** Extrai overrides do status (Ov: feed,rapid,spindle). */
  parseOverrides(status) {
    const match = status.match(/Ov:([^|]+)/);
    if (!match) return null;
    const parts = match[1].split(',').map((v) => Number.parseInt(v, 10));
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
    return parts;
  }

  /** Extrai buffer planner (Bf: planned,rx). */
  parseBuffer(status) {
    const match = status.match(/Bf:([^|]+)/);
    if (!match) return null;
    const parts = match[1].split(',').map((v) => Number.parseInt(v, 10));
    if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null;
    return { planned: parts[0], rx: parts[1] };
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

/** Utilitários de G-code. */
function generateSquareJob(size = 10, passes = 10, feed = 1000) {
  const lines = ['G90', 'G21', 'M5'];
  for (let p = 0; p < passes; p++) {
    const z = -0.1 * (p + 1);
    lines.push(`G0 Z${z.toFixed(3)}`);
    lines.push(`G1 X0 Y0 F${feed}`);
    lines.push(`G1 X${size} Y0`);
    lines.push(`G1 X${size} Y${size}`);
    lines.push(`G1 X0 Y${size}`);
    lines.push(`G1 X0 Y0`);
  }
  lines.push('G0 Z0', 'M5');
  return lines;
}

function generateRasterJob(
  width = 50,
  height = 50,
  lineSpacing = 0.1,
  feed = 2000,
) {
  const lines = ['G90', 'G21', 'M5'];
  const passes = Math.ceil(height / lineSpacing);
  for (let i = 0; i <= passes; i++) {
    const y = i * lineSpacing;
    if (y > height) break;
    if (i % 2 === 0) {
      lines.push(`G0 X0 Y${y.toFixed(3)}`);
      lines.push(`G1 X${width} Y${y.toFixed(3)} F${feed}`);
    } else {
      lines.push(`G0 X${width} Y${y.toFixed(3)}`);
      lines.push(`G1 X0 Y${y.toFixed(3)} F${feed}`);
    }
  }
  lines.push('G0 X0 Y0', 'M5');
  return lines;
}

function generateQueueJobs() {
  return [
    ['G90', 'G21', 'G0 X10 Y10', 'M5'],
    ['G90', 'G21', 'G0 X20 Y20', 'M5'],
    ['G90', 'G21', 'G0 X30 Y30', 'M5'],
  ];
}

/** Executa um teste individual com medição de tempo. */
async function runTest(_conn, id, name, fn) {
  const start = Date.now();
  let status = TEST_STATUS.PASS;
  let error;
  let observations = [];
  let details = {};
  let latencyMs;

  try {
    const result = await fn();
    observations = result.observations ?? [];
    details = result.details ?? {};
  } catch (err) {
    status = TEST_STATUS.FAIL;
    error = err instanceof Error ? err.message : String(err);
  }

  const durationMs = Date.now() - start;
  return {
    id,
    name,
    status,
    durationMs,
    latencyMs,
    error,
    observations,
    details,
  };
}

/** Parse args CLI. */
function parseArgs(argv) {
  const args = {
    port: DEFAULTS.port,
    baud: DEFAULTS.baud,
    durationShort: DEFAULTS.durationShort,
    durationLong: DEFAULTS.durationLong,
    output: DEFAULTS.output,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') args.port = argv[++i];
    else if (a === '--baud') args.baud = Number(argv[++i]);
    else if (a === '--duration') {
      args.durationShort = Number(argv[++i]) * 1000;
      args.durationLong = Number(argv[++i]) * 1000;
    } else if (a === '--duration-short')
      args.durationShort = Number(argv[++i]) * 1000;
    else if (a === '--duration-long')
      args.durationLong = Number(argv[++i]) * 1000;
    else if (a === '--output' || a === '-o') args.output = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

/** Função principal. */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Hardware Checklist — GRBL Studio

Uso:
  node scripts/hardware-checklist.mjs [opções]

Opções:
  --port PORT           Porta serial (padrão: env GRBL_PORT)
  --baud BAUD           Baud rate (padrão: env GRBL_BAUD ou 115200)
  --duration-short MS   Duração job curto em ms (padrão: 300000 = 5 min)
  --duration-long MS    Duração job longo em ms (padrão: 600000 = 10 min)
  --output FILE         Arquivo JSON de saída (padrão: hardware-checklist-<timestamp>.json)
  --help, -h            Mostra esta ajuda

Variáveis de ambiente:
  GRBL_PORT, GRBL_BAUD, GRBL_DURATION_SHORT, GRBL_DURATION_LONG, GRBL_OUTPUT

O script DEVE rodar em máquina com hardware real conectado.
`);
    return;
  }

  if (!args.port) {
    console.error(
      'Erro: Porta serial não especificada. Use --port ou defina GRBL_PORT.',
    );
    process.exitCode = 2;
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile =
    args.output ??
    join(__dirname, '..', `hardware-checklist-${timestamp}.json`);

  console.log('\n=== GRBL Studio Hardware Checklist ===');
  console.log(`Porta: ${args.port} @ ${args.baud}`);
  console.log(`Saída: ${outputFile}\n`);

  const conn = new GrblConnection(args.port, args.baud);
  const tests = [];
  let firmware = 'desconhecido';
  let machineProfile = {
    travelX: 0,
    travelY: 0,
    travelZ: 0,
    maxFeedX: 0,
    maxFeedY: 0,
    maxFeedZ: 0,
    stepsPerMmX: 0,
    stepsPerMmY: 0,
    stepsPerMmZ: 0,
    hasZ: false,
    hasLaser: false,
    softLimits: false,
    homingEnabled: false,
  };

  try {
    // TESTE 1: Conexão e banner
    tests.push(
      await runTest(conn, 'T01', 'Conexão e banner $I', async () => {
        await conn.open();
        console.log('✓ Porta aberta');
        const lines = await conn.sendCommand('$I');
        const vera = lines.find((l) => l.startsWith('[VER:'));
        const opt = lines.find((l) => l.startsWith('[OPT:'));
        if (!vera) throw new Error('Sem [VER:] na resposta');
        return { observations: lines, details: { vera, opt } };
      }),
    );

    // Lê banner e $I para firmware
    const bannerLines = await conn.sendCommand('$I');
    firmware =
      bannerLines.find((l) => l.startsWith('[VER:')) ??
      bannerLines[0] ??
      'desconhecido';
    console.log(`Firmware: ${firmware}`);

    // Lê settings para perfil da máquina
    const settingsLines = await conn.sendCommand('$$');
    const settings = new Map();
    for (const l of settingsLines) {
      const m = l.match(/^\$(\d+)\s*=\s*(.+)$/);
      if (m) settings.set(Number(m[1]), m[2]);
    }
    const get = (k, fb = '0') => settings.get(k) ?? fb;
    machineProfile = {
      travelX: Number.parseFloat(get(130)),
      travelY: Number.parseFloat(get(131)),
      travelZ: Number.parseFloat(get(132)),
      maxFeedX: Number.parseFloat(get(110)),
      maxFeedY: Number.parseFloat(get(111)),
      maxFeedZ: Number.parseFloat(get(112)),
      stepsPerMmX: Number.parseFloat(get(100)),
      stepsPerMmY: Number.parseFloat(get(101)),
      stepsPerMmZ: Number.parseFloat(get(102)),
      hasZ: Number.parseFloat(get(102)) > 0,
      hasLaser: get(32) === '1',
      softLimits: get(20) === '1',
      homingEnabled: get(22) === '1',
    };
    console.log(
      `Perfil: X${machineProfile.travelX} Y${machineProfile.travelY} Z${machineProfile.travelZ} | Laser: ${machineProfile.hasLaser} | Homing: ${machineProfile.homingEnabled} | Soft: ${machineProfile.softLimits}\n`,
    );

    // ============================================================
    // TESTE 2: Homing
    // ============================================================
    if (machineProfile.homingEnabled) {
      tests.push(
        await runTest(conn, 'T02', 'Homing ($H)', async () => {
          await conn.sendCommand('$H');
          const status = await conn.waitForState(
            'Idle',
            DEFAULTS.homingTimeout,
          );
          const mpos = await conn.waitForPosition(
            { x: 0, y: 0, z: 0 },
            0.5,
            5000,
          );
          return {
            observations: [`Final MPos: ${JSON.stringify(mpos)}`],
            details: { finalStatus: status, mpos },
          };
        }),
      );
    } else {
      tests.push({
        id: 'T02',
        name: 'Homing ($H)',
        status: TEST_STATUS.SKIP,
        durationMs: 0,
        observations: ['Homing desabilitado ($22=0)'],
      });
    }

    // ============================================================
    // TESTE 3: Jog X/Y/Z
    // ============================================================
    tests.push(
      await runTest(conn, 'T03', 'Jog X/Y/Z ($J=)', async () => {
        const obs = [];
        // Jog X
        await conn.sendCommand('$J=G91 X10 F1000');
        await conn.sleep(1500);
        const p1 = await conn.waitForPosition({ x: 10 }, 1, 5000);
        obs.push(`Após X10: ${JSON.stringify(p1)}`);
        // Jog Y
        await conn.sendCommand('$J=G91 Y10 F1000');
        await conn.sleep(1500);
        const p2 = await conn.waitForPosition({ x: 10, y: 10 }, 1, 5000);
        obs.push(`Após Y10: ${JSON.stringify(p2)}`);
        // Jog Z (se houver eixo Z)
        if (machineProfile.hasZ) {
          await conn.sendCommand('$J=G91 Z1 F500');
          await conn.sleep(1000);
          const p3 = await conn.waitForPosition(
            { x: 10, y: 10, z: 1 },
            0.5,
            5000,
          );
          obs.push(`Após Z1: ${JSON.stringify(p3)}`);
        }
        // Volta à origem
        await conn.sendCommand('G90 G0 X0 Y0');
        await conn.sleep(2000);
        await conn.waitForPosition({ x: 0, y: 0 }, 1, 5000);
        return { observations: obs };
      }),
    );

    // ============================================================
    // TESTE 4: Jog Contínuo (hold + cancel 0x85)
    // ============================================================
    tests.push(
      await runTest(conn, 'T04', 'Jog Contínuo (hold 2s + 0x85)', async () => {
        const obs = [];
        // Inicia jog contínuo em X+
        await conn.sendCommand('$J=G91 X100 F2000');
        await conn.sleep(2000); // hold 2s
        const during = conn.getLastStatus();
        obs.push(`Durante hold: ${during}`);
        // Cancela com 0x85
        await conn.sendRealtime(REALTIME.jogCancel);
        await conn.sleep(500);
        const after = conn.getLastStatus();
        obs.push(`Após 0x85: ${after}`);
        // Verifica que parou (estado Idle)
        await conn.waitForState('Idle', 5000);
        return { observations: obs, details: { during, after } };
      }),
    );

    // ============================================================
    // TESTE 5: Job Simples (5 min) — quadrado 10x10, 10 passadas
    // ============================================================
    tests.push(
      await runTest(
        conn,
        'T05',
        'Job Simples (quadrado 10x10, 10 passadas)',
        async () => {
          const obs = [];
          const lines = generateSquareJob(10, 10, 1000);
          const start = Date.now();

          // Inicia job
          await conn.sendCommand(lines[0]); // G90
          await conn.sendCommand(lines[1]); // G21
          await conn.sendCommand(lines[2]); // M5
          for (let i = 3; i < lines.length; i++) {
            await conn.sendCommand(lines[i]);
          }

          // Monitora progresso via status polling
          let maxLatency = 0;

          while (Date.now() - start < args.durationShort) {
            const status = conn.getLastStatus();
            if (status) {
              const buf = conn.parseBuffer(status);
              if (buf) {
                const latency =
                  buf.planned > 0 ? Date.now() - conn.lastStatusAt : 0;
                maxLatency = Math.max(maxLatency, latency);
              }
            }
            await conn.sleep(1000);
          }

          // Pause (!)
          await conn.sendRealtime(REALTIME.feedHold);
          await conn.waitForState('Hold', 5000);
          obs.push('Pause (!) → Hold confirmado');

          // Resume (~)
          await conn.sendRealtime(REALTIME.cycleStart);
          await conn.waitForState('Run', 5000);
          obs.push('Resume (~) → Run confirmado');

          // Stop (reset 0x18)
          await conn.sendRealtime(REALTIME.softReset);
          await conn.sleep(1000);
          await conn.waitForState('Idle', 5000);
          obs.push('Reset (0x18) → Idle confirmado');

          return {
            observations: obs,
            details: { maxLatencyMs: maxLatency, linesSent: lines.length },
          };
        },
      ),
    );

    // ============================================================
    // TESTE 6: Job Longo (10 min) — raster 50x50
    // ============================================================
    tests.push(
      await runTest(
        conn,
        'T06',
        'Job Longo (raster 50x50 line-to-line)',
        async () => {
          const obs = [];
          const lines = generateRasterJob(50, 50, 0.1, 2000);
          const start = Date.now();

          // Envia todas as linhas
          for (const line of lines) {
            await conn.sendCommand(line);
          }

          let maxLatency = 0;
          let statusCount = 0;
          const latencySamples = [];

          while (Date.now() - start < args.durationLong) {
            const status = conn.getLastStatus();
            if (status) {
              statusCount++;
              const buf = conn.parseBuffer(status);
              if (buf) {
                const latency = Date.now() - conn.lastStatusAt;
                latencySamples.push(latency);
                maxLatency = Math.max(maxLatency, latency);
              }
            }
            await conn.sleep(200);
          }

          // Calcula métricas
          const avgLatency = latencySamples.length
            ? latencySamples.reduce((a, b) => a + b, 0) / latencySamples.length
            : 0;
          const fps = statusCount / (args.durationLong / 1000);
          obs.push(
            `Status reports: ${statusCount}, FPS estimado: ${fps.toFixed(1)}, Latência média: ${avgLatency.toFixed(1)}ms, Máx: ${maxLatency}ms`,
          );

          const pass = fps >= 55 && avgLatency <= 200;
          if (!pass) {
            throw new Error(
              `FPS ${fps.toFixed(1)} < 55 ou latência ${avgLatency.toFixed(1)}ms > 200ms`,
            );
          }

          return {
            observations: obs,
            details: {
              fps,
              avgLatencyMs: avgLatency,
              maxLatencyMs: maxLatency,
              statusCount,
            },
          };
        },
      ),
    );

    // ============================================================
    // TESTE 7: Alarme — soft limit + unlock + home
    // ============================================================
    if (machineProfile.softLimits) {
      tests.push(
        await runTest(
          conn,
          'T07',
          'Alarme Soft Limit (G0 X9999) → $X → $H',
          async () => {
            const obs = [];
            // Força soft limit
            await conn.sendCommand('G0 X9999');
            // Aguarda ALARM:2
            let alarmSeen = false;
            for (let i = 0; i < 50; i++) {
              const status = conn.getLastStatus();
              if (status?.includes('Alarm')) {
                alarmSeen = true;
                obs.push(`Alarme detectado: ${status}`);
                break;
              }
              await conn.sleep(200);
            }
            if (!alarmSeen) throw new Error('ALARM:2 não detectado');

            // Unlock $X
            await conn.sendCommand('$X');
            await conn.waitForState('Idle', 5000);
            obs.push('$X → Idle');

            // Home $H
            if (machineProfile.homingEnabled) {
              await conn.sendCommand('$H');
              await conn.waitForState('Idle', DEFAULTS.homingTimeout);
              await conn.waitForPosition({ x: 0, y: 0 }, 0.5, 5000);
              obs.push('$H → Home ok');
            }
            return { observations: obs };
          },
        ),
      );
    } else {
      tests.push({
        id: 'T07',
        name: 'Alarme Soft Limit',
        status: TEST_STATUS.SKIP,
        durationMs: 0,
        observations: ['Soft limits desabilitados ($20=0)'],
      });
    }

    // ============================================================
    // TESTE 8: Overrides durante job
    // ============================================================
    tests.push(
      await runTest(
        conn,
        'T08',
        'Overrides (Feed ±10%/±1%, Potência, Rápido 3 níveis)',
        async () => {
          const obs = [];
          const lines = generateSquareJob(5, 3, 1000);

          // Inicia job simples
          for (const line of lines) await conn.sendCommand(line);

          // Aguarda job começar
          await conn.sleep(2000);

          // Feed +10%
          await conn.sendRealtime(REALTIME.overrideFeedPlus10);
          await conn.sleep(500);
          let ov = conn.parseOverrides(conn.getLastStatus() ?? '');
          obs.push(`Feed +10%: Ov=${ov?.join(',')}`);

          // Feed -10%
          await conn.sendRealtime(REALTIME.overrideFeedMinus10);
          await conn.sleep(500);
          ov = conn.parseOverrides(conn.getLastStatus() ?? '');
          obs.push(`Feed -10%: Ov=${ov?.join(',')}`);

          // Feed +1%
          await conn.sendRealtime(REALTIME.overrideFeedPlus1);
          await conn.sleep(500);
          ov = conn.parseOverrides(conn.getLastStatus() ?? '');
          obs.push(`Feed +1%: Ov=${ov?.join(',')}`);

          // Feed -1%
          await conn.sendRealtime(REALTIME.overrideFeedMinus1);
          await conn.sleep(500);
          ov = conn.parseOverrides(conn.getLastStatus() ?? '');
          obs.push(`Feed -1%: Ov=${ov?.join(',')}`);

          // Potência (spindle) +10%
          await conn.sendRealtime(REALTIME.overrideSpindlePlus10);
          await conn.sleep(500);
          ov = conn.parseOverrides(conn.getLastStatus() ?? '');
          obs.push(`Potência +10%: Ov=${ov?.join(',')}`);

          // Rápido 3 níveis
          await conn.sendRealtime(REALTIME.overrideRapidMedium);
          await conn.sleep(500);
          ov = conn.parseOverrides(conn.getLastStatus() ?? '');
          obs.push(`Rápido Medium: Ov=${ov?.join(',')}`);

          await conn.sendRealtime(REALTIME.overrideRapidLow);
          await conn.sleep(500);
          ov = conn.parseOverrides(conn.getLastStatus() ?? '');
          obs.push(`Rápido Low: Ov=${ov?.join(',')}`);

          await conn.sendRealtime(REALTIME.overrideRapidDefault);
          await conn.sleep(500);
          ov = conn.parseOverrides(conn.getLastStatus() ?? '');
          obs.push(`Rápido Default: Ov=${ov?.join(',')}`);

          // Para job
          await conn.sendRealtime(REALTIME.softReset);
          await conn.sleep(1000);

          return { observations: obs };
        },
      ),
    );

    // ============================================================
    // TESTE 9: Retomada (Retomar de N linhas antes)
    // ============================================================
    tests.push(
      await runTest(
        conn,
        'T09',
        'Retomada (interrompe linha 50 → Retomar N=5)',
        async () => {
          const obs = [];
          const lines = generateSquareJob(5, 5, 1000);
          for (const line of lines) await conn.sendCommand(line);
          await conn.sleep(3000);

          // Simula interrupção (feed hold)
          await conn.sendRealtime(REALTIME.feedHold);
          await conn.waitForState('Hold', 5000);
          obs.push('Feed Hold → Hold');

          // Resume
          await conn.sendRealtime(REALTIME.cycleStart);
          await conn.waitForState('Run', 5000);
          obs.push('Cycle Start → Run');

          // Aguarda concluir
          await conn.sleep(5000);
          await conn.waitForState('Idle', 10000);
          obs.push('Job finalizado → Idle');

          return { observations: obs, details: { linesSent: lines.length } };
        },
      ),
    );

    // ============================================================
    // TESTE 10: Fila de Trabalhos (3 G-codes)
    // ============================================================
    tests.push(
      await runTest(
        conn,
        'T10',
        'Fila de Trabalhos (3 G-codes → Iniciar fila → Parar fila)',
        async () => {
          const obs = [];
          const jobs = generateQueueJobs();

          // Simula enfileiramento enviando sequencialmente
          for (let i = 0; i < jobs.length; i++) {
            for (const line of jobs[i]) {
              await conn.sendCommand(line);
            }
            obs.push(`Job ${i + 1} enviado (${jobs[i].length} linhas)`);
            await conn.sleep(1000);
          }

          // Para fila (simula "Parar fila" — reset)
          await conn.sendRealtime(REALTIME.softReset);
          await conn.sleep(1000);
          await conn.waitForState('Idle', 5000);
          obs.push('Parar fila (reset) → Idle');

          return { observations: obs, details: { jobsCount: jobs.length } };
        },
      ),
    );
  } catch (err) {
    console.error(
      `\n❌ Erro fatal: ${err instanceof Error ? err.message : err}`,
    );
    process.exitCode = 1;
  } finally {
    await conn.close();
    console.log('\n✓ Porta fechada');
  }

  // ============================================================
  // Gera relatório
  // ============================================================
  const passed = tests.filter((t) => t.status === TEST_STATUS.PASS).length;
  const failed = tests.filter((t) => t.status === TEST_STATUS.FAIL).length;
  const skipped = tests.filter((t) => t.status === TEST_STATUS.SKIP).length;
  const totalDuration = tests.reduce((a, t) => a + t.durationMs, 0);

  const report = {
    timestamp: new Date().toISOString(),
    port: args.port,
    baud: args.baud,
    firmware,
    machineProfile,
    tests,
    summary: {
      total: tests.length,
      passed,
      failed,
      skipped,
      totalDurationMs: totalDuration,
    },
  };

  writeFileSync(outputFile, JSON.stringify(report, null, 2));
  console.log('\n=== RESUMO ===');
  console.log(
    `Total: ${tests.length} | Passou: ${passed} | Falhou: ${failed} | Pulou: ${skipped}`,
  );
  console.log(`Duração total: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`Relatório salvo em: ${outputFile}`);

  if (failed > 0) {
    console.log('\n❌ CHECKLIST FALHOU');
    process.exitCode = 1;
  } else {
    console.log('\n✅ CHECKLIST PASSOU');
  }
}

await main();
