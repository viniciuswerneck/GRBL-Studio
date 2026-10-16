#!/usr/bin/env node
/**
 * Emulador GRBL mínimo — desenvolvimento e demonstração sem hardware.
 *
 * Cria um par de PTYs com `socat`, responde como um firmware GRBL 1.1 real
 * (banner, `ok`, status `<...>`, `$H`, `$X`, `$$`, jog) e imprime no stdout o
 * caminho que deve ser usado no app.
 *
 * Uso:
 *   node scripts/grbl-emulator.mjs
 *   # no app: informe o "lado do app" na caixa "Porta manual" e clique Conectar.
 *
 * Requisitos: socat no PATH.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';

const RED = '\x1b[31m';
const GRN = '\x1b[32m';
const DIM = '\x1b[2m';
const RST = '\x1b[0m';

function log(...args) {
  console.log(...args);
}

/** Cria o par de PTYs com socat e devolve os dois caminhos. */
function createPtyPair() {
  return new Promise((resolve, reject) => {
    const proc = spawn('socat', ['-d', '-d', 'pty,raw,echo=0', 'pty,raw,echo=0']);
    const paths = [];
    const timer = setTimeout(() => reject(new Error('timeout aguardando PTYs do socat')), 5000);

    proc.stderr.on('data', (buf) => {
      const found = buf.toString().match(/\/dev\/pts\/\d+/g);
      if (found) paths.push(...found);
      if (paths.length >= 2) {
        clearTimeout(timer);
        resolve({ proc, app: paths[0], emu: paths[1] });
      }
    });
    proc.on('error', reject);
  });
}

// ------------------------------------------------------------- estado do GRBL

const st = {
  x: 0,
  y: 0,
  z: 0,
  wco: 0, // offset G92 (Y usado aqui para efeito visual)
  mode: 'Idle', // Idle | Hold | Alarm | Jog
  feed: 0,
  laser: false,
};

const banner = "Grbl 1.1h ['$' for help]\r\n";
const settings = [
  '$0=10',
  '$1=25',
  '$2=0',
  '$3=0',
  '$4=0',
  '$5=0',
  '$6=0',
  '$10=1',
  '$11=0.010',
  '$12=0.002',
  '$13=0',
  '$20=0',
  '$21=0',
  '$22=1',
  '$23=0',
  '$24=25.000',
  '$25=500.000',
  '$26=250',
  '$27=1.000',
  '$30=1000',
  '$31=0.001',
  '$32=1',
  '$100=80.000',
  '$101=80.000',
  '$102=250.000',
  '$110=6000.000',
  '$111=6000.000',
  '$112=500.000',
];

const write = (data) => process.stdout.write(data);

/** Extrai um valor de palavra do eixo/parâmetro (ex.: X, Y, F, Z). */
function word(line, w) {
  const m = line.match(new RegExp(`(^|[=\\s])${w}(-?\\d+(?:\\.\\d+)?)`, 'i'));
  return m ? Number.parseFloat(m[2]) : undefined;
}

function statusReport() {
  const m = (v) => v.toFixed(3);
  return `<${st.mode}|MPos:${m(st.x)},${m(st.y)},${m(st.z)}|WCO:0.000,${m(st.wco)},0.000|FS:0,0>\r\n`;
}

function ok() {
  write('ok\r\n');
}

function applyRelative(line) {
  const x = word(line, 'X');
  const y = word(line, 'Y');
  const z = word(line, 'Z');
  if (x !== undefined) st.x += x;
  if (y !== undefined) st.y += y;
  if (z !== undefined) st.z += z;
  if (x !== undefined || y !== undefined || z !== undefined) st.mode = 'Jog';
}

function applyAbsolute(line) {
  const x = word(line, 'X');
  const y = word(line, 'Y');
  const z = word(line, 'Z');
  if (x !== undefined) st.x = x;
  if (y !== undefined) st.y = y;
  if (z !== undefined) st.z = z;
  st.mode = 'Idle';
}

/** Responde a uma linha G-code completa. */
function handleLine(raw) {
  const line = raw.replace(/\r$/, '').trim();
  if (!line) return;

  log(`${DIM}<<${RST} ${line}`);

  if (line === '$X') {
    st.mode = 'Idle';
    ok();
    return;
  }
  if (line === '$H') {
    st.x = 0;
    st.y = 0;
    st.z = 0;
    st.mode = 'Idle';
    log(`${GRN}   homing ok -> 0,0,0${RST}`);
    ok();
    return;
  }
  if (line === '$$') {
    for (const s of settings) write(`${s}\r\n`);
    ok();
    return;
  }
  if (line === '$G') {
    write('[G0 G54 G17 G21 G90 G94 M0 M5 M9 T0 F0.0 S0]\r\n');
    ok();
    return;
  }
  if (line === '$I') {
    write('[VER:1.1h.20220726:GRBL-Studio-EMU]\r\n[OPT:V,15,128]\r\n');
    ok();
    return;
  }

  if (/^\$J=/i.test(line)) {
    applyRelative(line.slice(3));
    log(`${GRN}   -> ${st.x.toFixed(3)}, ${st.y.toFixed(3)}, ${st.z.toFixed(3)}${RST}`);
    ok();
    return;
  }

  if (/^G92/i.test(line)) {
    const y = word(line, 'Y');
    if (y !== undefined) st.wco = y;
    ok();
    return;
  }

  if (/^G[01]\b/i.test(line) || /^G[01](?=\s|[XYZ])/i.test(line)) {
    applyAbsolute(line);
    ok();
    return;
  }

  if (/^M[34]/i.test(line)) {
    st.laser = true;
    ok();
    return;
  }
  if (/^M5/i.test(line)) {
    st.laser = false;
    ok();
    return;
  }

  ok();
}

/** Comandos de tempo real (bytes únicos, fora das linhas). */
function handleRealtime(byte, appPath, emuPath, proc) {
  if (byte === 0x3f) {
    // '?'
    write(statusReport());
    return;
  }
  if (byte === 0x21) {
    // '!' Feed Hold
    st.mode = 'Hold';
    log(`${RED}   [feed hold]${RST}`);
    return;
  }
  if (byte === 0x7e) {
    // '~' Cycle Start
    st.mode = 'Idle';
    log(`${GRN}   [cycle start]${RST}`);
    return;
  }
  if (byte === 0x18) {
    // Ctrl-X Soft Reset
    log(`${RED}   [soft reset]${RST}`);
    write(banner);
    return;
  }
  if (byte === 0x90 || byte === 0x91 || byte === 0x92 || byte === 0x93 || byte === 0x94) {
    log(`${DIM}   [override ${byte.toString(16)}]${RST}`);
    return;
  }
  void appPath;
  void emuPath;
  void proc;
}

// ------------------------------------------------------------------- execução

try {
  const { proc, app, emu } = await createPtyPair();

  const writeStream = fs.createWriteStream(emu);
  writeStream.on('error', () => undefined);

  // Linha para o app escrever/ler; abre antes de aceitar conexões.
  let writeFn = (data) => writeStream.write(data);

  const rx = fs.createReadStream(emu);
  rx.on('error', () => undefined);

  let buf = Buffer.alloc(0);

  rx.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);

    // 1) extrai comandos de tempo real (bytes únicos)
    let kept = Buffer.alloc(0);
    for (const byte of buf) {
      if (
        byte === 0x3f || // ?
        byte === 0x21 || // !
        byte === 0x7e || // ~
        byte === 0x18 || // Ctrl-X
        (byte >= 0x90 && byte <= 0x94)
      ) {
        handleRealtime(byte, app, emu, proc);
        continue;
      }
      kept = Buffer.concat([kept, Buffer.from([byte])]);
    }
    buf = kept;

    // 2) linhas completas
    const idx = buf.indexOf(0x0a);
    if (idx === -1) return;
    const line = buf.subarray(0, idx).toString('utf8');
    buf = buf.subarray(idx + 1);
    handleLine(line);
  });

  writeFn = (data) => writeStream.write(data);
  writeFn(banner);

  process.stdout.write(`\n${GRN}GRBL emulator ativo${RST} (sem hardware)\n`);
  process.stdout.write(`  ${GRN}lado do app    :${RST} ${app}\n`);
  process.stdout.write(`  ${DIM}lado do emulador:${RST} ${emu}\n\n`);
  process.stdout.write(`No app: cole "${app}" na caixa "Porta manual" e clique em Conectar.\n`);
  process.stdout.write(`(Ctrl-C encerra e libera a porta)\n\n`);

  const shutdown = () => {
    try {
      rx.close();
      writeStream.close();
    } catch {
      /* ignore */
    }
    proc.kill('SIGKILL');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  console.error(`${RED}Falha:${RST}`, err.message);
  process.exit(1);
}
