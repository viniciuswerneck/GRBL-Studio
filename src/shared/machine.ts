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
