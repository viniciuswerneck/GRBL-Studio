import { describe, expect, it } from 'vitest';
import {
  classifyLine,
  formatPosition,
  isStatusReport,
  parseSettingLine,
  parseSettings,
  parseStatusReport,
  splitLines,
} from '../src/shared/protocol';
import type { ParsedSetting } from '../src/shared/protocol';
import type { GrblState, LineKind, Vec3 } from '../src/shared/types';

/**
 * Fuzz determinístico do parser do protocolo (RNF-11/P0.6).
 *
 * Sem dependência externa: um PRNG mulberry32 com semente fixa gera as
 * entradas, então uma falha é sempre reproduzível. O objetivo é o DoD
 * "nenhum crash com entrada corrompida": nenhuma função pode lançar, nenhum
 * campo numérico pode virar `NaN`/`undefined` e entrada inválida precisa cair
 * no fallback documentado.
 *
 * As verificações são feitas sem `expect` dentro do laço (só acumulam
 * mensagens), para rodar milhares de casos dentro do orçamento de 2 s.
 */

const CASES = 6_000;
const CASE_BUDGET_MS = 100;
const TOTAL_BUDGET_MS = 2_000;
const MAX_REPORTED_FAILURES = 20;

const STATES: readonly GrblState[] = [
  'Idle',
  'Run',
  'Hold',
  'Door',
  'Home',
  'Alarm',
  'Check',
  'Jog',
  'Sleep',
  'Unknown',
];

const KINDS: ReadonlySet<LineKind> = new Set<LineKind>([
  'ok',
  'error',
  'alarm',
  'message',
  'status',
  'setting',
  'welcome',
  'other',
]);

/** PRNG determinístico (mulberry32) — mesma semente, mesma sequência. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let random = mulberry32(0x5eed_1a5e);
let int = (max: number): number => Math.floor(random() * max);
let pick = <T>(items: readonly T[]): T => items[int(items.length)]!;
let chance = (probability: number): boolean => random() < probability;

/**
 * A cobertura do V8 instrumenta as fontes e deixa o laço ~3x mais lento; o
 * orçamento de 2 s vale para a execução normal (sem `--coverage`).
 */
function coverageEnabled(): boolean {
  const worker = (
    globalThis as {
      __vitest_worker__?: { config?: { coverage?: { enabled?: boolean } } };
    }
  ).__vitest_worker__;
  return worker?.config?.coverage?.enabled === true;
}

const failures: string[] = [];

function report(message: string): void {
  if (failures.length < MAX_REPORTED_FAILURES) failures.push(message);
}

function describeInput(input: string): string {
  const preview = input.length > 120 ? `${input.slice(0, 120)}…` : input;
  return JSON.stringify(preview);
}

function check(condition: boolean, message: string): void {
  if (!condition) report(message);
}

function checkFinite(value: unknown, input: string, field: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    report(`${field} inválido (${String(value)}) em ${describeInput(input)}`);
  }
}

function checkVec3(value: Vec3, input: string, field: string): void {
  checkFinite(value.x, input, `${field}.x`);
  checkFinite(value.y, input, `${field}.y`);
  checkFinite(value.z, input, `${field}.z`);
}

const NUMERIC_JUNK = [
  '0',
  '0.000',
  '12.34',
  '-5.5',
  '+3',
  '1e3',
  '1e999',
  '-1e999',
  'Infinity',
  '-Infinity',
  'NaN',
  'abc',
  '',
  ' ',
  '.',
  ',',
  '1,2',
  '4294967296',
  '9'.repeat(400),
];

const STATE_TOKENS = [
  ...STATES,
  'idle',
  'run',
  'hold',
  'door',
  'home',
  'alarm',
  'check',
  'jog',
  'sleep',
  'Foobar',
  '',
  ' Idle ',
];

function numeric(maxLength = 1): string {
  if (chance(0.2)) return pick(NUMERIC_JUNK);
  if (chance(0.1)) {
    const digits = 1 + int(40);
    return `${chance(0.5) ? '-' : ''}${'9'.repeat(digits)}`;
  }
  return (random() * maxLength * 100 - maxLength * 50).toFixed(int(4));
}

function vec3(): string {
  const parts = 1 + int(4);
  return Array.from({ length: parts }, () => numeric(2)).join(',');
}

function randomBytes(): string {
  const length = int(40);
  let out = '';
  for (let i = 0; i < length; i++) out += String.fromCharCode(int(256));
  return out;
}

function statusLine(): string {
  const fields: string[] = [];
  const count = int(5);
  for (let i = 0; i < count; i++) {
    switch (int(10)) {
      case 0:
        fields.push(`MPos:${vec3()}`);
        break;
      case 1:
        fields.push(`WPos:${vec3()}`);
        break;
      case 2:
        fields.push(`WCO:${vec3()}`);
        break;
      case 3:
        fields.push(
          `FS:${Array.from({ length: int(3) }, () => numeric()).join(',')}`,
        );
        break;
      case 4:
        fields.push(`F:${numeric()}`);
        break;
      case 5:
        fields.push(
          `Ov:${Array.from({ length: int(4) }, () => numeric()).join(',')}`,
        );
        break;
      case 6:
        fields.push(
          `Bf:${Array.from({ length: int(3) }, () => numeric()).join(',')}`,
        );
        break;
      case 7:
        fields.push(`Pn:${pick(['XYZ', '', 'XY', '...'])}`);
        break;
      case 8:
        fields.push(`${pick(['Foo', '', 'MPos ', 'x'])}:${numeric()}`);
        break;
      default:
        fields.push(pick(['Probe', '', 'MPos', '|']));
        break;
    }
  }
  return `<${[pick(STATE_TOKENS), ...fields].join('|')}>`;
}

function settingLine(): string {
  const key = chance(0.15) ? numeric() : `${int(200)}`;
  const value = pick([
    numeric(),
    '1200.000',
    'abc',
    '1 2',
    '',
    ' ',
    '1e999',
    '9'.repeat(40),
  ]);
  return `$${key}${pick(['=', ' = ', '==', ' ', ''])}${value}`;
}

function classifiedLine(): string {
  switch (int(9)) {
    case 0:
      return pick(['ok', 'OK', 'ok\r', '@ok', 'ok!', 'not ok', '[MSG:Jog ok]']);
    case 1:
      return `error:${pick(['1', '9', '99', '', 'UNKNOWN', '9'.repeat(400)])}`;
    case 2:
      return `ALARM:${pick(['1', '9', '99', '', 'UNKNOWN', '9'.repeat(400)])}`;
    case 3:
      return pick(['$G', '$#', '$I', '$$']);
    case 4:
      return pick([
        "Grbl 1.1f ['$' for help]",
        'Grbl 0.9',
        '[MSG:Check Limits]',
        '[MSG:Jog ok]',
        '[MSG:]',
      ]);
    case 5:
      return statusLine();
    case 6:
      return settingLine();
    case 7:
      return pick(['', ' ', '\r', '\t\t', '\u0000', '\u0018']);
    default:
      return randomBytes();
  }
}

function randomLine(): string {
  switch (int(5)) {
    case 0:
      return statusLine();
    case 1:
      return settingLine();
    case 2:
      return classifiedLine();
    default:
      return randomBytes();
  }
}

function checkStatus(input: string): void {
  const status = parseStatusReport(input);
  const statusLike = isStatusReport(input);

  if (!statusLike) {
    check(
      status === null,
      `status de ${describeInput(input)} deveria ser null (fallback)`,
    );
    return;
  }

  if (status === null) {
    report(`status de ${describeInput(input)} não deveria ser null`);
    return;
  }

  check(
    typeof status.raw === 'string',
    `raw inválido em ${describeInput(input)}`,
  );
  check(
    STATES.includes(status.state),
    `state inválido (${status.state}) em ${describeInput(input)}`,
  );
  check(
    status.extra !== null && typeof status.extra === 'object',
    `extra inválido em ${describeInput(input)}`,
  );
  for (const value of Object.values(status.extra)) {
    check(
      typeof value === 'string',
      `extra inválido (${String(value)}) em ${describeInput(input)}`,
    );
  }

  if (status.mpos) checkVec3(status.mpos, input, 'mpos');
  if (status.wpos) checkVec3(status.wpos, input, 'wpos');
  if (status.wco) checkVec3(status.wco, input, 'wco');
  if (status.fs) {
    checkFinite(status.fs.feed, input, 'fs.feed');
    checkFinite(status.fs.spindle, input, 'fs.spindle');
  }
  if (status.ov) {
    check(
      status.ov.length === 3,
      `ov deveria ter 3 valores em ${describeInput(input)}`,
    );
    for (const [index, value] of status.ov.entries()) {
      checkFinite(value, input, `ov[${index}]`);
    }
  }
  if (status.bf) {
    checkFinite(status.bf.planned, input, 'bf.planned');
    checkFinite(status.bf.rx, input, 'bf.rx');
  }
  if (status.pn !== undefined) {
    check(
      typeof status.pn === 'string',
      `pn inválido em ${describeInput(input)}`,
    );
  }
}

function checkClassified(input: string): void {
  const line = classifyLine(input);

  check(
    KINDS.has(line.kind),
    `kind inválido (${line.kind}) em ${describeInput(input)}`,
  );
  check(
    typeof line.text === 'string',
    `text inválido em ${describeInput(input)}`,
  );
  if (line.code !== undefined) checkFinite(line.code, input, 'code');
  if (line.message !== undefined) {
    check(
      typeof line.message === 'string',
      `message inválido em ${describeInput(input)}`,
    );
  }

  const trimmed = input.replace(/\r$/, '').trim();
  if (trimmed === '') {
    check(
      line.kind === 'other',
      `linha vazia deveria ser other em ${describeInput(input)}`,
    );
    return;
  }

  // Cada classificação só pode acontecer quando o prefixo documentado existe.
  if (line.kind === 'status')
    check(isStatusReport(trimmed), 'status sem <...>');
  if (line.kind === 'error')
    check(/^error:/i.test(trimmed), 'error sem prefixo');
  if (line.kind === 'alarm')
    check(/^ALARM:/i.test(trimmed), 'alarm sem prefixo');
  if (line.kind === 'setting') {
    check(trimmed.startsWith('$'), 'setting sem $');
  }
  if (line.kind === 'message') {
    check(/^\[MSG:/i.test(trimmed), 'message sem [MSG:');
  }
  if (line.kind === 'welcome') {
    check(
      /^Grbl\s/i.test(trimmed) || /\['\$' for help\]/i.test(trimmed),
      'welcome sem banner',
    );
  }
  if (line.kind === 'ok') check(/ok\b/i.test(trimmed), 'ok sem ACK');
}

function checkSetting(input: string): void {
  const parsed = parseSettingLine(input);
  if (!parsed) return;

  checkFinite(parsed.key, input, 'key');
  check(
    Number.isSafeInteger(parsed.key),
    `key não inteira em ${describeInput(input)}`,
  );
  check(parsed.key >= 0, `key negativa em ${describeInput(input)}`);
  check(
    typeof parsed.value === 'string',
    `value inválido em ${describeInput(input)}`,
  );
  if (parsed.number !== undefined) checkFinite(parsed.number, input, 'number');
}

function checkSplit(input: string): void {
  const { lines, rest } = splitLines(input);
  check(Array.isArray(lines), `lines inválido em ${describeInput(input)}`);
  check(typeof rest === 'string', `rest inválido em ${describeInput(input)}`);
  for (const line of lines) {
    check(
      typeof line === 'string' && !line.includes('\n'),
      `linha inválida em ${describeInput(input)}`,
    );
  }

  const normalized = input.replace(/>(?!\n)/g, '>\n');
  const rebuilt = lines.length > 0 ? `${lines.join('\n')}\n${rest}` : rest;
  check(
    rebuilt === normalized,
    `split perdeu conteúdo em ${describeInput(input)}`,
  );
}

function checkFormatPosition(input: string): void {
  const finite = chance(0.8);
  const value = finite
    ? random() * 2000 - 1000
    : pick([Number.NaN, Infinity, -Infinity, undefined]);
  const decimals = int(7);
  const formatted = formatPosition(value, decimals);
  check(
    typeof formatted === 'string',
    `formato inválido em ${describeInput(input)}`,
  );
  if (value === undefined || !Number.isFinite(value)) {
    check(formatted === '—', `fallback de DRO inválido (${formatted})`);
  } else {
    check(
      formatted === value.toFixed(decimals),
      `DRO ${formatted} != ${value.toFixed(decimals)}`,
    );
  }
}

describe('fuzz determinístico do parser do protocolo', () => {
  it(`não lança nem devolve valor inválido em ${CASES} entradas`, () => {
    failures.length = 0;
    random = mulberry32(0x5eed_1a5e);
    int = (max) => Math.floor(random() * max);
    pick = (items) => items[int(items.length)]!;
    chance = (probability) => random() < probability;

    const runCase = (input: string): number => {
      const caseStarted = performance.now();

      check(
        typeof isStatusReport(input) === 'boolean',
        `isStatusReport inválido em ${describeInput(input)}`,
      );
      checkStatus(input);
      checkClassified(input);
      checkSetting(input);
      checkSplit(input);
      checkFormatPosition(input);

      const lines = Array.from({ length: 1 + int(4) }, randomLine);
      const map = parseSettings(lines);
      check(
        map instanceof Map,
        `parseSettings inválido em ${describeInput(input)}`,
      );

      const expected = new Map<number, ParsedSetting>();
      for (const line of lines) {
        const parsed = parseSettingLine(line);
        if (parsed) expected.set(parsed.key, parsed);
      }
      check(
        map.size === expected.size,
        `parseSettings size ${map.size} != ${expected.size}`,
      );
      for (const [key, parsed] of expected) {
        const actual = map.get(key);
        check(
          actual !== undefined &&
            actual.key === parsed.key &&
            actual.value === parsed.value &&
            Object.is(actual.number, parsed.number),
          `parseSettings[${key}] divergiu`,
        );
      }

      return performance.now() - caseStarted;
    };

    // Aquece JIT (fora do orçamento) para o caso 0 não pagar inicialização.
    for (let i = 0; i < 32; i++) runCase(randomLine());

    const started = performance.now();
    let slowest = 0;
    for (let i = 0; i < CASES; i++) {
      const elapsed = runCase(randomLine());
      slowest = Math.max(slowest, elapsed);
      if (elapsed >= CASE_BUDGET_MS) {
        report(
          `caso ${i} levou ${elapsed.toFixed(1)} ms (limite ${CASE_BUDGET_MS})`,
        );
      }
    }
    const total = performance.now() - started;

    expect(failures, failures.join('\n')).toEqual([]);
    expect(slowest, `caso mais lento: ${slowest.toFixed(1)} ms`).toBeLessThan(
      CASE_BUDGET_MS,
    );
    const totalBudget = coverageEnabled()
      ? TOTAL_BUDGET_MS * 3
      : TOTAL_BUDGET_MS;
    expect(total, `fuzz levou ${total.toFixed(1)} ms`).toBeLessThan(
      totalBudget,
    );
  });
});
