/**
 * Informação da máquina (RF-MAQ-1…9 / P0.7 e P0.8) — **contratos**.
 *
 * Este módulo é o ponto único de verdade dos tipos usados por:
 * - `machine.ts`: leitura de `$I`, `$G`, `$#`, `$N`, `$$` e o diagnóstico;
 * - `preflight.ts`: regras MX-1…MX-15 antes de gravar;
 * - UI (painel "Máquina" e banner de pré-voo) e IPC (`machine:*`).
 *
 * Regra de ouro: **nada aqui lê a máquina nem formata texto de UI**. São
 * funções/estruturas puras; os textos visíveis ficam em `i18n` (`machine.*` e
 * `preflight.*`) e o diagnóstico copiável usa rótulos técnicos estáveis.
 *
 * Especificação: `docs/PLANO_MAQUINA.md` §4.
 */

/**
 * Vetor de 3 eixos (mm ou mm/min, conforme o campo) — o mesmo `Vec3` do
 * protocolo (`{ x, y, z }`), para não haver duas formas no mesmo app.
 */
export type { Vec3 } from './types';

/** `$I` — `[VER:…]` + `[OPT:…]`. */
import type { Vec3 } from './types';

export interface FirmwareInfo {
  /** Linha `[VER:…]` crua (para o diagnóstico). */
  raw: string;
  /** Ex.: `1.1h` (versão) — `[VER:1.1h.20190825:]`. */
  version?: string;
  /** Ex.: `20190825` (data de build). */
  build?: string;
  /** Plataforma/variante quando o firmware informa (`[VER:1.1h:…]`). */
  platform?: string;
  /** `[OPT:V,15,128]` → PWM/spindle variável (`V`), CoreXY (`C`), mist (`M`). */
  options?: {
    variableSpindle?: boolean;
    coreXY?: boolean;
    mist?: boolean;
  };
  /** Profundidade do planner em linhas (`[OPT:…,15,…]`). */
  plannerBlocks?: number;
  /** Buffer RX em bytes (`[OPT:…,…,128]`) — dimensiona a janela de envio. */
  rxBufferSize?: number;
}

/** Fatos derivados de `$$` (a máquina é a fonte da verdade). */
export interface MachineFacts {
  /** `$130/$131/$132` — curso útil em mm. */
  travel?: Vec3;
  /** `$110/$111/$112` — velocidade máxima por eixo. */
  maxRate?: Vec3;
  /** `$120/$121/$122` — aceleração por eixo. */
  accel?: Vec3;
  /** `$100/$101/$102` — passos/mm. */
  stepsPerMm?: Vec3;
  /** `$32=1` — modo laser. */
  laserMode?: boolean;
  /** `$30` — teto de `S`. */
  sMax?: number;
  /** `$31` — piso de `S`. */
  sMin?: number;
  /** `$33` — frequência do PWM (Hz). */
  pwmFreq?: number;
  /** `$20=1`. */
  softLimits?: boolean;
  /** `$21=1`. */
  hardLimits?: boolean;
  /** `$22=1`. */
  homing?: boolean;
  /** `$N0=…` — blocos que rodam a cada reset. */
  startupBlocks?: string[];
  /** `$10` — máscara de status (0, 1, 2 ou 3). */
  statusMask?: number;
  /** `$13=1` — relatório em polegadas. */
  reportInches?: boolean;
}

/** `$G` — `[GC:…]` (estado modal). */
export interface ModalState {
  motion?: string;
  wcs?: string;
  plane?: string;
  units?: string;
  distance?: string;
  arc?: string;
  programFlow?: string;
  spindle?: string;
  coolant?: string;
  tool?: number;
  feed?: number;
  speed?: number;
}

/** `$#` — offsets de trabalho e pontos de referência. */
export interface MachineOffsets {
  g54?: Vec3;
  g55?: Vec3;
  g56?: Vec3;
  g57?: Vec3;
  g58?: Vec3;
  g59?: Vec3;
  g28?: Vec3;
  g30?: Vec3;
  g92?: Vec3;
  tlo?: number;
  prb?: Vec3;
}

/** Severidade de uma regra de pré-voo (RF-MAQ-6). */
export type PreflightSeverity = 'block' | 'warn' | 'info';

/**
 * Ação de 1 clique para resolver/entender o achado.
 * `setting` propõe escrever um `$` (só com consentimento); `action` leva a UI
 * ao lugar certo (painel, enquadramento, redução de potência…).
 */
export interface PreflightFix {
  kind: 'setting' | 'action';
  /** `$` alvo quando `kind = 'setting'`. */
  code?: number;
  /** Valor sugerido quando `kind = 'setting'`. */
  value?: string;
  /** Ação de UI quando `kind = 'action'`. */
  action?:
    | 'open-machine'
    | 'fit-preview'
    | 'reduce-power'
    | 'change-route'
    | 'park';
}

/**
 * Um achado de pré-voo. **Sem texto de UI**: o renderer traduz
 * `preflight.<id>.title` / `.detail` e interpola `params`.
 */
export interface PreflightIssue {
  /** `MX-1`…`MX-15` (estável, usado como chave de i18n). */
  id: string;
  severity: PreflightSeverity;
  /** Valores para interpolação (ex.: `{ s: 1200, smax: 1000 }`). */
  params?: Record<string, string | number>;
  fix?: PreflightFix;
}

/** Entrada de `runPreflight()` — tudo já coletado, nada de I/O. */
export interface PreflightInput {
  /** Linhas do G-code a gravar (sem comentários, como vão para a máquina). */
  lines: string[];
  /** Fatos da máquina (`deriveFacts($$)`); `undefined` se não coletado. */
  facts?: MachineFacts;
  /** Último status (`?`) conhecido, para pinos/posição. */
  status?: {
    state?: string;
    pin?: string;
    /** Posição da máquina em mm (quando reportada). */
    mpos?: Vec3;
    /** Posição no espaço de trabalho em mm. */
    wpos?: Vec3;
  };
  /** O job usa coordenadas de trabalho (`G54`…)? */
  useWorkCoords?: boolean;
}

/**
 * Entrada de `buildMachineReport()` — diagnóstico copiável (RF-MAQ-8).
 * Rótulos são técnicos e estáveis (não traduzidos): o suporte lê
 * `firmware.version=…`, `settings.$130=…`. A UI adiciona o cabeçalho localizado.
 */
export interface MachineReportInput {
  app: { name: string; version: string };
  /** Ex.: `serial /dev/ttyUSB0 @ 115200` ou `tcp 192.168.0.10:23`. */
  transport?: string;
  firmware?: FirmwareInfo;
  /** `$$` já parseado (código → valor bruto). */
  settings?: Record<number, string>;
  facts?: MachineFacts;
  modal?: ModalState;
  offsets?: MachineOffsets;
  status?: PreflightInput['status'];
  /** Alarmes/erros recentes (`ALARM:1`, `error:9`…), na ordem. */
  alarms?: string[];
}

/*
 * API acordada (implementada nas lanes P0.7/P0.8):
 *
 *   parseFirmware(lines: string[]): FirmwareInfo
 *   parseModalState(lines: string[]): ModalState
 *   parseOffsets(lines: string[]): MachineOffsets
 *   parseStartupBlocks(lines: string[]): string[]
 *   deriveFacts(settings: Map<number, { value: string }> | Record<number, string>): MachineFacts
 *   buildMachineReport(input: MachineReportInput): string
 *
 *   runPreflight(input: PreflightInput): PreflightIssue[]   // em preflight.ts
 */

/*
 * Implementação (P0.7). Tudo puro: nada aqui lê a máquina nem formata texto
 * de UI (`docs/PLANO_MAQUINA.md` §4.1, §7 e §8).
 */

/** Valor bruto de `$<code>` numa coleta `$$` (Map de `parseSettings` ou Record). */
function rawSetting(
  settings: Map<number, { value: string }> | Record<number, string>,
  code: number,
): string | undefined {
  if (settings instanceof Map) return settings.get(code)?.value;
  return settings[code];
}

/** Número finito do valor bruto; `undefined` quando ausente ou ilegível. */
function settingNumber(
  settings: Map<number, { value: string }> | Record<number, string>,
  code: number,
): number | undefined {
  const raw = rawSetting(settings, code);
  if (raw === undefined) return undefined;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** Booleano (`$20=1`…) a partir do valor bruto; ausente/ilegível fica `undefined`. */
function settingBool(
  settings: Map<number, { value: string }> | Record<number, string>,
  code: number,
): boolean | undefined {
  const value = settingNumber(settings, code);
  return value === undefined ? undefined : value !== 0;
}

/**
 * `[x, y, z]` só quando os três eixos existem.
 * Eixo ausente fica `undefined` — nunca inventa `0` (o `0` é um valor real).
 */
function vec3FromSettings(
  settings: Map<number, { value: string }> | Record<number, string>,
  codes: readonly [number, number, number],
): Vec3 | undefined {
  const x = settingNumber(settings, codes[0]);
  const y = settingNumber(settings, codes[1]);
  const z = settingNumber(settings, codes[2]);
  if (x === undefined || y === undefined || z === undefined) return undefined;
  return { x, y, z };
}

/** `"1.000,2.000,3.000"` → `[1, 2, 3]` (aceita 2 eixos; `z` cai em 0). */
function parseVec3(text: string): Vec3 | undefined {
  const parts = text.split(',').map((part) => Number.parseFloat(part));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) {
    return undefined;
  }
  return { x: parts[0]!, y: parts[1]!, z: parts[2] ?? 0 };
}

/**
 * Corpo de `[VER:…]` → versão/build/plataforma.
 *
 * Formatos observados: `1.1h.20190825` (GRBL), `1.1h` (sem data),
 * `1.1h:plataforma` (grblHAL/FluidNC com variante) e `3.7.10 FluidNC`.
 */
function parseFirmwareBody(body: string): {
  version?: string;
  build?: string;
  platform?: string;
} {
  let inner = body.trim();
  // `[VER:1.1h.20190825:]` — o `:` final é o separador canônico do GRBL.
  if (inner.endsWith(':')) inner = inner.slice(0, -1).trim();

  const match = inner.match(/^\d+(?:\.\d+)+[A-Za-z]?/);
  if (!match) return inner ? { platform: inner } : {};

  const version = match[0];
  const rest = inner.slice(version.length);
  if (rest.startsWith('.')) {
    const parts = rest.slice(1).split(':');
    return {
      version,
      build: (parts[0] ?? '').trim() || undefined,
      platform: (parts[1] ?? '').trim() || undefined,
    };
  }
  if (rest.startsWith(':') || /^\s/.test(rest)) {
    const platform = rest.replace(/^[:\s]+/, '').trim();
    return { version, platform: platform || undefined };
  }
  return { version, build: rest.trim() || undefined };
}

/**
 * `$I` → `FirmwareInfo` (`[VER:…]` + `[OPT:…]`).
 * Tolerante a firmware que não responde (devolve `{ raw: '' }`) e a `[OPT:]`.
 */
export function parseFirmware(lines: string[]): FirmwareInfo {
  const info: FirmwareInfo = { raw: '' };

  for (const line of lines) {
    const text = line.trim();

    const ver = text.match(/^\[VER:([^\]]*)\]$/i);
    if (ver) {
      info.raw = text;
      const parsed = parseFirmwareBody(ver[1]!);
      if (parsed.version !== undefined) info.version = parsed.version;
      if (parsed.build !== undefined) info.build = parsed.build;
      if (parsed.platform !== undefined) info.platform = parsed.platform;
      continue;
    }

    const opt = text.match(/^\[OPT:([^\]]*)\]$/i);
    if (opt) {
      const fields = opt[1]!.split(',');
      const flags = (fields[0] ?? '').toUpperCase();
      info.options = {
        variableSpindle: flags.includes('V'),
        coreXY: flags.includes('C'),
        mist: flags.includes('M'),
      };
      const planner = Number.parseInt(fields[1] ?? '', 10);
      if (Number.isFinite(planner)) info.plannerBlocks = planner;
      const rx = Number.parseInt(fields[2] ?? '', 10);
      if (Number.isFinite(rx)) info.rxBufferSize = rx;
    }
  }

  return info;
}

/** `$G` → estado modal a partir de `[GC:…]` (ordem dos grupos conforme o GRBL). */
export function parseModalState(lines: string[]): ModalState {
  const state: ModalState = {};

  for (const line of lines) {
    const match = line.trim().match(/^\[GC:([^\]]*)\]$/i);
    if (!match) continue;

    for (const word of match[1]!.trim().split(/\s+/)) {
      const token = word.toUpperCase();
      if (token === '') continue;

      if (/^G0(?:\.\d)?$|^G1$|^G2$|^G3$|^G38(?:\.\d)?$|^G80$/.test(token)) {
        state.motion = token;
      } else if (/^G5[4-9](?:\.\d)?$/.test(token)) {
        state.wcs = token;
      } else if (/^G1[789]$/.test(token)) {
        state.plane = token;
      } else if (/^G2[01]$/.test(token)) {
        state.units = token;
      } else if (/^G9[01]$/.test(token)) {
        state.distance = token;
      } else if (/^G9[34]$/.test(token)) {
        state.arc = token;
      } else if (/^M(?:0|1|2|30)$/.test(token)) {
        state.programFlow = token;
      } else if (/^M[345]$/.test(token)) {
        state.spindle = token;
      } else if (/^M[789]$/.test(token)) {
        state.coolant = token;
      } else {
        const tool = token.match(/^T(\d+)$/);
        if (tool) {
          state.tool = Number.parseInt(tool[1]!, 10);
          continue;
        }
        const feed = token.match(/^F(-?\d+(?:\.\d+)?)$/);
        if (feed) {
          state.feed = Number.parseFloat(feed[1]!);
          continue;
        }
        const speed = token.match(/^S(-?\d+(?:\.\d+)?)$/);
        if (speed) state.speed = Number.parseFloat(speed[1]!);
      }
    }
  }

  return state;
}

type OffsetVecKey =
  | 'g54'
  | 'g55'
  | 'g56'
  | 'g57'
  | 'g58'
  | 'g59'
  | 'g28'
  | 'g30'
  | 'g92'
  | 'prb';

/** Guarda o vetor do offset quando o corpo traz eixos válidos. */
function assignOffsetVec(
  offsets: MachineOffsets,
  key: OffsetVecKey,
  body: string,
): void {
  // `[PRB:…:0]` traz um flag de sucesso após `:` que não é coordenada.
  const vec = parseVec3(body.split(':')[0]!);
  if (vec) offsets[key] = vec;
}

/** `$#` → offsets de trabalho e pontos de referência. */
export function parseOffsets(lines: string[]): MachineOffsets {
  const offsets: MachineOffsets = {};

  for (const line of lines) {
    const match = line
      .trim()
      .match(/^\[(G5[4-9]|G28|G30|G92|TLO|PRB):([^\]]*)\]$/i);
    if (!match) continue;

    const key = match[1]!.toUpperCase();
    const body = match[2]!.trim();

    switch (key) {
      case 'G54':
        assignOffsetVec(offsets, 'g54', body);
        break;
      case 'G55':
        assignOffsetVec(offsets, 'g55', body);
        break;
      case 'G56':
        assignOffsetVec(offsets, 'g56', body);
        break;
      case 'G57':
        assignOffsetVec(offsets, 'g57', body);
        break;
      case 'G58':
        assignOffsetVec(offsets, 'g58', body);
        break;
      case 'G59':
        assignOffsetVec(offsets, 'g59', body);
        break;
      case 'G28':
        assignOffsetVec(offsets, 'g28', body);
        break;
      case 'G30':
        assignOffsetVec(offsets, 'g30', body);
        break;
      case 'G92':
        assignOffsetVec(offsets, 'g92', body);
        break;
      case 'PRB':
        assignOffsetVec(offsets, 'prb', body);
        break;
      case 'TLO': {
        const tlo = Number.parseFloat(body);
        if (Number.isFinite(tlo)) offsets.tlo = tlo;
        break;
      }
      default:
        break;
    }
  }

  return offsets;
}

/**
 * `$N` → blocos de inicialização (`$N0=…`), na ordem do índice.
 * Valor vazio é ignorado (na C1, `$N0=`/`$N1=` não são blocos de verdade).
 */
export function parseStartupBlocks(lines: string[]): string[] {
  const indexed: { index: number; value: string }[] = [];

  for (const line of lines) {
    const match = line.trim().match(/^\$N(\d+)\s*=\s*(.*)$/);
    if (!match) continue;
    const index = Number.parseInt(match[1]!, 10);
    if (!Number.isSafeInteger(index)) continue;
    const value = match[2]!.trim();
    if (value === '') continue;
    indexed.push({ index, value });
  }

  indexed.sort((a, b) => a.index - b.index);
  return indexed.map((entry) => entry.value);
}

/**
 * `$$` → fatos da máquina. Cada campo é opcional e **nunca** recebe valor
 * inventado: setting ausente (ou ilegível) fica `undefined`.
 */
export function deriveFacts(
  settings: Map<number, { value: string }> | Record<number, string>,
  startupBlocks?: string[],
): MachineFacts {
  const facts: MachineFacts = {};

  const travel = vec3FromSettings(settings, [130, 131, 132]);
  if (travel) facts.travel = travel;
  const maxRate = vec3FromSettings(settings, [110, 111, 112]);
  if (maxRate) facts.maxRate = maxRate;
  const accel = vec3FromSettings(settings, [120, 121, 122]);
  if (accel) facts.accel = accel;
  const stepsPerMm = vec3FromSettings(settings, [100, 101, 102]);
  if (stepsPerMm) facts.stepsPerMm = stepsPerMm;

  const laserMode = settingBool(settings, 32);
  if (laserMode !== undefined) facts.laserMode = laserMode;
  const sMax = settingNumber(settings, 30);
  if (sMax !== undefined) facts.sMax = sMax;
  const sMin = settingNumber(settings, 31);
  if (sMin !== undefined) facts.sMin = sMin;
  const pwmFreq = settingNumber(settings, 33);
  if (pwmFreq !== undefined) facts.pwmFreq = pwmFreq;

  const softLimits = settingBool(settings, 20);
  if (softLimits !== undefined) facts.softLimits = softLimits;
  const hardLimits = settingBool(settings, 21);
  if (hardLimits !== undefined) facts.hardLimits = hardLimits;
  const homing = settingBool(settings, 22);
  if (homing !== undefined) facts.homing = homing;

  const statusMask = settingNumber(settings, 10);
  if (statusMask !== undefined) facts.statusMask = statusMask;
  const reportInches = settingBool(settings, 13);
  if (reportInches !== undefined) facts.reportInches = reportInches;

  if (startupBlocks !== undefined) facts.startupBlocks = startupBlocks;

  return facts;
}

/** `{x,y,z}` → `1,2,3`. */
function vecToText(vec: Vec3): string {
  return [vec.x, vec.y, vec.z].join(',');
}

/**
 * Diagnóstico copiável (RF-MAQ-8). Texto técnico **estável e não traduzido**
 * (`chave=valor`) na ordem de `docs/PLANO_MAQUINA.md` §7; campos ausentes são
 * pulados sem erro. Sem dados pessoais — o caminho da porta é preservado
 * (útil ao suporte). A UI acrescenta o cabeçalho localizado.
 */
export function buildMachineReport(input: MachineReportInput): string {
  const lines: string[] = [];
  const push = (
    key: string,
    value: string | number | boolean | undefined,
  ): void => {
    if (value === undefined) return;
    const text = typeof value === 'boolean' ? (value ? '1' : '0') : value;
    lines.push(`${key}=${text}`);
  };

  push('app', `${input.app.name} ${input.app.version}`);
  push('transport', input.transport);

  const firmware = input.firmware;
  if (firmware) {
    push('firmware.raw', firmware.raw || undefined);
    push('firmware.version', firmware.version);
    push('firmware.build', firmware.build);
    push('firmware.platform', firmware.platform);
    if (firmware.options) {
      const flags = `${firmware.options.variableSpindle ? 'V' : ''}${
        firmware.options.coreXY ? 'C' : ''
      }${firmware.options.mist ? 'M' : ''}`;
      push('firmware.options', flags);
    }
    push('firmware.planner', firmware.plannerBlocks);
    push('firmware.rx', firmware.rxBufferSize);
  }

  const modal = input.modal;
  if (modal) {
    push('modal.motion', modal.motion);
    push('modal.wcs', modal.wcs);
    push('modal.plane', modal.plane);
    push('modal.units', modal.units);
    push('modal.distance', modal.distance);
    push('modal.arc', modal.arc);
    push('modal.programFlow', modal.programFlow);
    push('modal.spindle', modal.spindle);
    push('modal.coolant', modal.coolant);
    push('modal.tool', modal.tool);
    push('modal.feed', modal.feed);
    push('modal.speed', modal.speed);
  }

  const facts = input.facts;
  if (facts) {
    if (facts.travel) push('facts.travel', vecToText(facts.travel));
    if (facts.maxRate) push('facts.maxRate', vecToText(facts.maxRate));
    if (facts.accel) push('facts.accel', vecToText(facts.accel));
    if (facts.stepsPerMm) push('facts.stepsPerMm', vecToText(facts.stepsPerMm));
    push('facts.laserMode', facts.laserMode);
    push('facts.softLimits', facts.softLimits);
    push('facts.hardLimits', facts.hardLimits);
    push('facts.homing', facts.homing);
    push('facts.sMin', facts.sMin);
    push('facts.sMax', facts.sMax);
    push('facts.pwmFreq', facts.pwmFreq);
    push('facts.statusMask', facts.statusMask);
    push('facts.reportInches', facts.reportInches);
  }

  const settings = input.settings;
  if (settings) {
    const codes = Object.keys(settings)
      .map((key) => Number.parseInt(key, 10))
      .filter((code) => Number.isSafeInteger(code))
      .sort((a, b) => a - b);
    for (const code of codes) {
      push(`settings.$${code}`, settings[code]);
    }
  }

  const offsets = input.offsets;
  if (offsets) {
    if (offsets.g54) push('offsets.g54', vecToText(offsets.g54));
    if (offsets.g55) push('offsets.g55', vecToText(offsets.g55));
    if (offsets.g56) push('offsets.g56', vecToText(offsets.g56));
    if (offsets.g57) push('offsets.g57', vecToText(offsets.g57));
    if (offsets.g58) push('offsets.g58', vecToText(offsets.g58));
    if (offsets.g59) push('offsets.g59', vecToText(offsets.g59));
    if (offsets.g28) push('offsets.g28', vecToText(offsets.g28));
    if (offsets.g30) push('offsets.g30', vecToText(offsets.g30));
    if (offsets.g92) push('offsets.g92', vecToText(offsets.g92));
    push('offsets.tlo', offsets.tlo);
    if (offsets.prb) push('offsets.prb', vecToText(offsets.prb));
  }

  const status = input.status;
  if (status) {
    push('status.state', status.state);
    push('status.pin', status.pin);
    if (status.mpos) push('status.mpos', vecToText(status.mpos));
    if (status.wpos) push('status.wpos', vecToText(status.wpos));
  }

  const startup = input.facts?.startupBlocks;
  if (startup) {
    startup.forEach((block, index) => {
      push(`startup.${index}`, block);
    });
  }

  input.alarms?.forEach((alarm, index) => {
    push(`alarm.${index}`, alarm);
  });

  return lines.join('\n');
}
