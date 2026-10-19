#!/usr/bin/env node
/**
 * Envia comandos GRBL explícitos (o "CLI" mínimo do GRBL Studio).
 *
 * Todo comando vai na linha de comando — nada escondido no script.
 * Sem `--yes` é apenas simulação (dry-run): mostra e não envia.
 *
 * Segurança:
 *  - `M3`/`M4` (ligar o laser) exigem `--laser` explícito.
 *  - `$RST=` (apaga settings) e `$SLP` são sempre bloqueados.
 *  - Comandos de tempo real: `?` (status), `!` (pausa), `~` (retomar), `RESET` (0x18).
 *
 * Uso:
 *   node scripts/grbl-send.mjs 'M5' '?' '$J=X5 F500' '?'
 *   node scripts/grbl-send.mjs --yes --port /dev/ttyACM0 -- 'M5' '$J=X-5 F500'
 */

import { SerialPort } from 'serialport';

const REALTIME = { '?': 'status', '!': 'hold', '~': 'resume', RESET: 'reset' };
const UNSAFE = /^\$RST\b|^\$SLP\b/i;
const LASER = /\bM(3|4)\b/i;

function parseArgs(argv) {
  const o = {
    port: undefined,
    baud: 115200,
    yes: false,
    laser: false,
    timeout: 3000,
    cmds: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--') {
      o.cmds.push(...argv.slice(i + 1));
      break;
    }
    if (a === '--port') o.port = argv[++i];
    else if (a === '--baud') o.baud = Number(argv[++i]);
    else if (a === '--timeout') o.timeout = Number(argv[++i]);
    else if (a === '--yes') o.yes = true;
    else if (a === '--laser') o.laser = true;
    else o.cmds.push(a);
  }
  return o;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.cmds.length) {
    console.error(
      "Nada para enviar. Ex.: node scripts/grbl-send.mjs --yes -- 'M5' '?'",
    );
    process.exitCode = 2;
    return;
  }

  for (const c of o.cmds) {
    if (UNSAFE.test(c)) {
      console.error(`BLOQUEADO (destrutivo): ${c}`);
      process.exitCode = 4;
      return;
    }
    if (LASER.test(c) && !o.laser) {
      console.error(
        `BLOQUEADO (liga o laser): ${c} — use --laser se for intencional`,
      );
      process.exitCode = 4;
      return;
    }
  }

  console.log(`Vou enviar ${o.cmds.length} comando(s):`);
  for (const c of o.cmds)
    console.log(`  ${REALTIME[c] ? `${c} (${REALTIME[c]})` : c}`);
  if (!o.yes) {
    console.log('\n(dry-run — acrescente --yes para enviar de verdade)');
    return;
  }

  const list = await SerialPort.list();
  const path = o.port ?? list.find((p) => /tty(USB|ACM)/.test(p.path))?.path;
  if (!path) {
    console.error('Porta USB-serial não encontrada.');
    process.exitCode = 3;
    return;
  }

  const port = await new Promise((resolve, reject) => {
    const p = new SerialPort({
      path,
      baudRate: o.baud,
      autoOpen: false,
      dtr: false,
      rts: false,
    });
    p.open((err) => (err ? reject(err) : resolve(p)));
  }).catch((err) => {
    console.error(`Não abriu ${path}: ${err.message} (o app está conectado?)`);
    process.exit(3);
  });

  let buffer = '';
  let pending = null;
  port.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const raw of parts) {
      const line = raw.replace(/\r$/, '').trim();
      if (!line || !pending) continue;
      console.log(`  < ${line}`);
      pending.lines.push(line);
      if (pending.isDone(line)) {
        const p = pending;
        pending = null;
        clearTimeout(p.timer);
        p.resolve(p.lines);
      }
    }
  });

  await sleep(700); // drena banner/ruído da abertura

  for (const cmd of o.cmds) {
    const realtime = cmd in REALTIME;
    const lines = await new Promise((resolve) => {
      const entry = {
        lines: [],
        isDone: realtime
          ? (l) => (cmd === '?' ? /^<.*>$/.test(l) : false)
          : (l) => /^ok\b/i.test(l) || /^error:/i.test(l),
        resolve,
      };
      entry.timer = setTimeout(
        () => {
          if (pending === entry) pending = null;
          resolve(entry.lines);
        },
        realtime ? 400 : o.timeout,
      );
      pending = entry;
      console.log(`> ${realtime ? `${cmd} (${REALTIME[cmd]})` : cmd}`);
      if (cmd === 'RESET') port.write(Buffer.from([0x18]));
      else if (realtime) port.write(cmd);
      else port.write(`${cmd}\n`);
    });
    if (!lines.length) console.log('  (sem resposta / sem terminador)');
    await sleep(realtime ? 300 : 60);
  }

  const st = await new Promise((resolve) => {
    const entry = { lines: [], isDone: (l) => /^<.*>$/.test(l), resolve };
    entry.timer = setTimeout(() => resolve(entry.lines), 800);
    pending = entry;
    port.write('?');
  });
  console.log(`status final: ${st[0] ?? '(sem resposta)'}`);

  await new Promise((r) => port.close(r));
}

await main();
