#!/usr/bin/env node
/**
 * Sonda GRBL — SOMENTE LEITURA (GRBL Studio).
 *
 * Objetivo: coletar os dados que a máquina já reporta (firmware, settings,
 * offsets, estado modal, startup blocks e status) para (a) calibrar o painel
 * "Máquina", (b) alimentar o pré-voo e (c) gerar fixtures de teste reais.
 *
 * GARANTIAS DE SEGURANÇA (ver ALLOWED abaixo):
 *  - Só envia: `?`, `$I`, `$$`, `$#`, `$G`, `$N`.
 *  - NUNCA envia movimento (G0/G1/$J=/G28/$H), laser (M3/M4/M5) nem `$n=valor`.
 *  - A lista é um allowlist; qualquer comando fora dela faz o script ABORTAR.
 *
 * Uso:
 *   node scripts/probe-machine.mjs                 # porta automática, 115200
 *   node scripts/probe-machine.mjs --port /dev/ttyACM0
 *   node scripts/probe-machine.mjs --raw --out /tmp/grbl-probe.json
 */

import { SerialPort } from 'serialport';
import { writeFileSync } from 'node:fs';

/** Comandos permitidos — a sonda não conhece nenhum outro. */
const ALLOWED = ['?', '$I', '$$', '$#', '$G', '$N'];

const CMD_TIMEOUT_MS = 3000;

function parseArgs(argv) {
  const args = { port: undefined, baud: 115200, raw: false, out: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--port') args.port = argv[++i];
    else if (a === '--baud') args.baud = Number(argv[++i]);
    else if (a === '--raw') args.raw = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

/** Escolhe a porta: `--port`, senão o 1º USB-serial conhecido. */
async function pickPort(explicit) {
  const list = await SerialPort.list();
  if (explicit) {
    const found = list.find((p) => p.path === explicit);
    return { path: explicit, info: found };
  }
  const known = /ch340|ch341|arduino|ftdi|cp210|silicon|prolific|at32|wch/i;
  const candidates = list.filter((p) => /tty(USB|ACM)/.test(p.path));
  const best =
    candidates.find((p) => known.test(p.manufacturer ?? '')) ?? candidates[0];
  return { path: best?.path, info: best };
}

/** Abre a porta evitando togglar DTR/RTS (menos chance de resetar a placa). */
function openPort(path, baudRate) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path,
      baudRate,
      autoOpen: false,
      dtr: false,
      rts: false,
    });
    port.open((err) => (err ? reject(err) : resolve(port)));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      'Uso: node scripts/probe-machine.mjs [--port P] [--baud N] [--out F] [--raw]',
    );
    return;
  }

  const { path, info } = await pickPort(args.port);
  if (!path) {
    console.error(
      'Nenhuma porta USB-serial encontrada. A gravadora está ligada?',
    );
    process.exitCode = 2;
    return;
  }

  const transcript = []; // { dir, text }
  const responses = {}; // comando -> linhas
  let banner = [];

  const port = await openPort(path, args.baud).catch((err) => {
    console.error(`Não foi possível abrir ${path}: ${err.message}`);
    console.error(
      'Dica: feche a conexão no GRBL Studio e confirme o acesso à porta.',
    );
    process.exit(3);
  });

  port.on('error', (err) => console.error(`erro na porta: ${err.message}`));

  let buffer = '';
  /** Fila de espera: resolve quando a linha de terminação chega. */
  let pending = null;

  port.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const raw of parts) {
      const line = raw.replace(/\r$/, '').trim();
      if (!line) continue;
      transcript.push({ dir: 'in', text: line });
      if (pending) {
        pending.lines.push(line);
        if (pending.isDone(line)) {
          const p = pending;
          pending = null;
          clearTimeout(p.timer);
          p.resolve(p.lines);
        }
      } else {
        banner.push(line);
      }
    }
  });

  /** Envia um comando do allowlist e devolve as linhas até o terminador. */
  function send(cmd, { realtime = false } = {}) {
    if (!ALLOWED.includes(cmd)) {
      throw new Error(`Comando bloqueado pela sonda (somente leitura): ${cmd}`);
    }
    return new Promise((resolve) => {
      const lines = [];
      const isDone = realtime
        ? (line) => /^<.*>$/.test(line)
        : (line) => /^ok\b/i.test(line) || /^error:/i.test(line);
      const entry = { lines, isDone, resolve, timer: undefined };
      entry.timer = setTimeout(() => {
        if (pending === entry) pending = null;
        resolve(lines);
      }, CMD_TIMEOUT_MS);
      pending = entry;
      transcript.push({ dir: 'out', text: cmd });
      port.write(`${cmd}\n`);
    });
  }

  // A placa pode mandar o banner ao abrir (se resetar) ou não.
  await sleep(1200);
  const seenBanner = banner.slice();
  banner = [];

  // Status primeiro: confirma que a máquina está viva e em que estado está.
  responses['?'] = await send('?', { realtime: true });
  for (const cmd of ['$I', '$$', '$#', '$G', '$N']) {
    responses[cmd] = await send(cmd);
    await sleep(80);
  }

  await new Promise((r) => port.close(r));

  // ---------------------------------------------------------------- relatório
  const lines = (cmd) => responses[cmd] ?? [];
  const vera = lines('$I').find((l) => l.startsWith('[VER:')) ?? '(sem [VER:])';
  const opt = lines('$I').find((l) => l.startsWith('[OPT:')) ?? '(sem [OPT:])';
  const gc = lines('$G').find((l) => l.startsWith('[GC:')) ?? '(sem [GC:])';
  const st = responses['?']?.[0] ?? '(sem status)';
  const settings = new Map();
  for (const l of lines('$$')) {
    const m = l.match(/^\$(\d+)\s*=\s*(.+)$/);
    if (m) settings.set(Number(m[1]), m[2]);
  }
  const sv = (k, fb = '—') => settings.get(k) ?? fb;
  const offsets = lines('$#').filter((l) => l.startsWith('['));
  const startups = lines('$N').filter((l) => /^\$N\d+=/.test(l));

  const out = [];
  out.push(
    'GRBL Studio — sonda somente leitura (nenhum movimento, nenhum laser)',
  );
  out.push(
    `Porta: ${path} @ ${args.baud}${info?.manufacturer ? ` · ${info.manufacturer}` : ''}`,
  );
  out.push(`Enviado: ${ALLOWED.join(' ')}`);
  if (seenBanner.length) out.push(`Banner: ${seenBanner.join(' ')}`);
  out.push('');
  out.push(`[Firmware $I]   ${vera} · ${opt}`);
  out.push(`[Estado $G]     ${gc.replace(/^\[GC:|]$/g, '')}`);
  out.push(
    `[Curso $$]      X ${sv(130)} × Y ${sv(131)} × Z ${sv(132)} mm · máx ${sv(110)}/${sv(111)}/${sv(112)} mm/min · acc ${sv(120)}/${sv(121)}/${sv(122)} mm/s²`,
  );
  out.push(
    `[Passos/mm]     X ${sv(100)} · Y ${sv(101)} · Z ${sv(102)} · delay $1=${sv(1)} · pulso $0=${sv(0)} µs`,
  );
  out.push(
    `[Limites]       soft $20=${sv(20)} · hard $21=${sv(21)} · homing $22=${sv(22)} · inv. passo $3=${sv(3)} · inv. limites $5=${sv(5)} · sonda $6=${sv(6)}`,
  );
  out.push(
    `[Homing]        avanço $24=${sv(24)} · busca $25=${sv(25)} · debounce $26=${sv(26)} · dir $23=${sv(23)}`,
  );
  out.push(
    `[Laser/Spindle] modo laser $32=${sv(32)} · S ${sv(31)}…${sv(30)} · PWM $33=${sv(33)} Hz · ${sv(34)}`,
  );
  out.push(
    `[Relatório]     $10=${sv(10)} (máscara) · $13=${sv(13)} (1=polegadas) · $11=${sv(11)} · $12=${sv(12)}`,
  );
  out.push(`[Offsets $#]    ${offsets.join(' · ') || '(nenhum)'}`);
  out.push(`[Status ?]      ${st}`);
  out.push(
    `[Startup $N]    ${startups.length ? startups.join(' · ') : '(nenhum)'}`,
  );
  out.push('');
  out.push(
    `Firmware respondeu: $I=${lines('$I').length} linhas · $$=${lines('$$').length} · $#=${lines('$#').length} · $G=${lines('$G').length} · $N=${lines('$N').length}`,
  );
  console.log(out.join('\n'));

  if (args.raw) {
    console.log('\n--- transcript cru ---');
    for (const t of transcript)
      console.log(`${t.dir === 'out' ? '>' : '<'} ${t.text}`);
  }

  if (args.out) {
    writeFileSync(
      args.out,
      `${JSON.stringify(
        {
          port: path,
          baud: args.baud,
          device: info ?? null,
          banner: seenBanner,
          responses,
          transcript,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`\nDados crus salvos em ${args.out}`);
  }
}

await main();
