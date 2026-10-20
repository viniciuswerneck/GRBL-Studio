/**
 * Catálogo de **perfis de máquina** (RF-MAQ-10) — o lugar dos valores
 * específicos de cada gravadora: curso, homing, módulo do laser, teto de `S`
 * (`$30`), potência do laser "de apontar" e o conjunto mínimo de `$` que o app
 * garante.
 *
 * Regra: **nada disso fica chumbado no código**. O renderer só consome
 * (`applyMachineProfile`); a máquina continua sendo a fonte da verdade — o
 * perfil é o ponto de partida (e o alvo do *smart connect*, P2.5).
 *
 * Aplicar um perfil **escreve** `settings` na máquina, e só com ela conectada.
 * Por isso a lista é mínima: modo laser, limites e curso. Salvar/restaurar o
 * `$$` inteiro é papel dos perfis de configuração (RF-CFG-4).
 *
 * Origem dos dados: `docs/PLANO_MAQUINA.md` §11 (coleta **somente leitura** de
 * 18/10/2026; fixture em `tests/fixtures/machine-sculpfun-c1.json`).
 */

import type { LaserModule } from './materials';

/** Acionamento do laser: `M4` = potência dinâmica · `M3` = potência constante. */
export type LaserDriveMode = 'M3' | 'M4';

export interface MachineProfile {
  /** Identificador estável (persistido nas preferências). */
  id: string;
  /** Marca/modelo — nome próprio, não se traduz. */
  name: string;
  /** Módulo instalado → escolhe o catálogo de material (RF-IMG-8). */
  module: LaserModule;
  /** Curso útil em mm (`$130`/`$131`); `[0, 0]` = desconhecido. */
  area: [number, number];
  /** Homing de fábrica (`$22=1`)? Habilita o botão Home. */
  homing: boolean;
  /** Diâmetro do ponto do laser em mm (resolução/legibilidade). */
  spot: number;
  /** Linhas por mm padrão na conversão de imagem. */
  lines: number;
  /** Modo padrão de acionamento do laser. */
  mode: LaserDriveMode;
  /** Teto de `S` da máquina (`$30`); sem ele assume-se `PROFILE_MAX_S`. */
  sMax?: number;
  /** Potência do laser "de apontar" (moldura/centro), em % — bem fraca. */
  pointPercent?: number;
  /** Settings garantidos pelo perfil, no formato `$<code>=<valor>`. */
  settings: Record<number, number>;
}

/** Máquina de referência do projeto (perfil aplicado por padrão). */
export const DEFAULT_MACHINE_ID = 'sculpfun-c1';

export const MACHINE_PROFILES: readonly MachineProfile[] = [
  {
    id: 'generic',
    name: 'Genérica (GRBL)',
    module: '5W',
    area: [0, 0],
    homing: false,
    spot: 0.08,
    lines: 8,
    mode: 'M4',
    settings: {},
  },
  /**
   * Sculpfun C1 (3 W) — máquina de referência do projeto.
   *
   * Dados **conferidos na máquina real** (18/10/2026,
   * `scripts/probe-machine.mjs`, somente leitura — `PLANO_MAQUINA.md` §11):
   * firmware `[VER:1.3a.20250324:]` (placa Artery AT32), curso
   * `$130/$131/$132 = 150/130/45`, `$30=1000`, homing de fábrica ligado
   * (`$22=1`), limites por hardware (`$21=1`), limites por software
   * desligados (`$20=0`) e modo laser ligado (`$32=1`).
   *
   * Coleta do app 0.8.0 (mesma máquina, `$$` idêntico linha a linha) confirmou
   * o perfil e revelou o que o app **não** deve prometer: `[OPT:H]` (sem
   * planner/buffer) e nenhuma garantia sobre o 1º comando depois de conectar —
   * nesse firmware a primeira leitura (`$I`) pode voltar `error:3`
   * (`PLANO_MAQUINA.md` §11.7). A lista de `settings` é mínima de propósito:
   * só o que o app garante escrever, e **só códigos que este firmware tem**
   * (`tests/machines.test.ts` confere contra a coleta — escrever `$` inexistente
   * responde `error:3`).
   */
  {
    id: 'sculpfun-c1',
    name: 'Sculpfun C1 (3 W)',
    module: '3W',
    area: [150, 130],
    homing: true,
    spot: 0.04,
    lines: 10,
    mode: 'M4',
    sMax: 1000,
    pointPercent: 0.5,
    settings: { 20: 0, 21: 1, 22: 1, 32: 1, 130: 150, 131: 130 },
  },
  {
    id: 'sculpfun-s6',
    name: 'Sculpfun S6 (5,5 W)',
    module: '5W',
    area: [410, 420],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 410, 131: 420 },
  },
  {
    id: 'sculpfun-s9',
    name: 'Sculpfun S9 (5,5 W)',
    module: '5W',
    area: [410, 420],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 410, 131: 420 },
  },
  {
    id: 'sculpfun-s10',
    name: 'Sculpfun S10 (10 W)',
    module: '10W',
    area: [410, 420],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 410, 131: 420 },
  },
  {
    id: 'sculpfun-s30',
    name: 'Sculpfun S30 (10-20 W)',
    module: '10W',
    area: [410, 420],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 410, 131: 420 },
  },
  {
    id: 'ortur-lm2',
    name: 'Ortur Laser Master 2',
    module: '5W',
    area: [400, 430],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 400, 131: 430 },
  },
  {
    id: 'ortur-lm3',
    name: 'Ortur Laser Master 3',
    module: '5W',
    area: [400, 400],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 400, 131: 400 },
  },
  {
    id: 'ortur-aufero2',
    name: 'Ortur Aufero 2',
    module: '5W',
    area: [390, 390],
    homing: false,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 0, 22: 0, 32: 1, 130: 390, 131: 390 },
  },
  {
    id: 'atomstack-a5',
    name: 'AtomStack A5 Pro',
    module: '5W',
    area: [410, 400],
    homing: true,
    spot: 0.06,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 410, 131: 400 },
  },
  {
    id: 'atomstack-x7',
    name: 'AtomStack X7 Pro',
    module: '10W',
    area: [410, 400],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 410, 131: 400 },
  },
  {
    id: 'twotrees-ts2',
    name: 'TwoTrees TS2',
    module: '5W',
    area: [300, 300],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 300, 131: 300 },
  },
  {
    id: 'twotrees-ts3',
    name: 'TwoTrees TS3',
    module: '10W',
    area: [300, 300],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 300, 131: 300 },
  },
  {
    id: 'foxalien-masuter',
    name: 'FoxAlien Masuter',
    module: '5W',
    area: [400, 400],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 400, 131: 400 },
  },
  {
    id: 'genmitsu-cubiko',
    name: 'Genmitsu Cubiko',
    module: '3W',
    area: [150, 150],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 150, 131: 150 },
  },
  {
    id: 'genmitsu-3018',
    name: 'Genmitsu 3018-PRO',
    module: '5W',
    area: [300, 180],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 300, 131: 180 },
  },
  {
    id: 'wainlux-k6',
    name: 'Wainlux K6 (portátil)',
    module: '3W',
    area: [80, 80],
    homing: false,
    spot: 0.03,
    lines: 10,
    mode: 'M4',
    settings: { 20: 0, 22: 0, 32: 1, 130: 80, 131: 80 },
  },
  {
    id: 'wainlux-k8',
    name: 'Wainlux K8 (portátil)',
    module: '3W',
    area: [80, 80],
    homing: false,
    spot: 0.03,
    lines: 10,
    mode: 'M4',
    settings: { 20: 0, 22: 0, 32: 1, 130: 80, 131: 80 },
  },
  {
    id: 'comgrow-z1',
    name: 'Comgrow Z1',
    module: '5W',
    area: [130, 150],
    homing: false,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 20: 0, 22: 0, 32: 1, 130: 130, 131: 150 },
  },
  {
    id: 'xtool-d1',
    name: 'xTool D1',
    module: '10W',
    area: [430, 390],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 430, 131: 390 },
  },
  {
    id: 'creality-falcon2',
    name: 'Creality Falcon 2',
    module: '10W',
    area: [400, 415],
    homing: true,
    spot: 0.1,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 400, 131: 415 },
  },
  {
    id: 'neje-master2',
    name: 'NEJE Master 2S',
    module: '10W',
    area: [400, 400],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 400, 131: 400 },
  },
  /**
   * Perfis acrescentados em 19/10/2026 (P2.5, "catálogo 30+").
   *
   * Regra de honestidade dos dados: o **curso** vem da especificação pública
   * do fabricante (é o valor que o app escreve em `$130`/`$131`); o **módulo**
   * (potência óptica) também; o **ponto** e o **homing** seguem a família (o
   * mesmo desenho/mecânica do modelo irmão já no catálogo) — quando não há
   * fonte, `homing` fica **desligado**, que é o lado seguro (não habilita
   * `$22=1` numa máquina sem chaves de fim de curso).
   *
   * Fontes: tabela de comparação da xTool (D1/D1 Pro = 432×406), revisão
   * técnica do TwoTrees TTS-55 (300×300) e do AtomStack A5 Pro (410×400),
   * ficha do NEJE Master 2 Plus (255×440) e do NEJE 3 (170×170), ficha do
   * Ortur Aufero 1 (180×180) e do Laser Master 2 Pro (400×400).
   */
  {
    id: 'ortur-aufero1',
    name: 'Ortur Aufero 1',
    module: '5W',
    area: [180, 180],
    homing: false,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 0, 22: 0, 32: 1, 130: 180, 131: 180 },
  },
  {
    id: 'ortur-lm2-pro',
    name: 'Ortur Laser Master 2 Pro',
    module: '5W',
    area: [400, 400],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 400, 131: 400 },
  },
  {
    id: 'xtool-d1-pro',
    name: 'xTool D1 Pro',
    module: '10W',
    area: [432, 406],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 432, 131: 406 },
  },
  {
    id: 'atomstack-a5-pro-v2',
    name: 'AtomStack A5 Pro V2',
    module: '5W',
    area: [400, 400],
    homing: true,
    spot: 0.06,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 400, 131: 400 },
  },
  {
    id: 'twotrees-tt55',
    name: 'TwoTrees TT-5.5',
    module: '5W',
    area: [300, 300],
    homing: true,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 300, 131: 300 },
  },
  {
    id: 'neje-master2-plus',
    name: 'NEJE Master 2 Plus',
    module: '10W',
    area: [255, 440],
    homing: true,
    spot: 0.06,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 255, 131: 440 },
  },
  {
    id: 'neje-3',
    name: 'NEJE 3',
    module: '5W',
    area: [170, 170],
    homing: false,
    spot: 0.05,
    lines: 10,
    mode: 'M4',
    settings: { 20: 0, 22: 0, 32: 1, 130: 170, 131: 170 },
  },
  {
    id: 'longer-ray5',
    name: 'Longer Ray5',
    module: '5W',
    area: [400, 400],
    homing: true,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    settings: { 20: 1, 22: 1, 32: 1, 130: 400, 131: 400 },
  },
];

/** Perfil pelo `id`; `undefined` quando não existe. */
export function findMachineProfile(id?: string): MachineProfile | undefined {
  return id ? MACHINE_PROFILES.find((profile) => profile.id === id) : undefined;
}
/** Perfil pelo `id`, caindo no padrão — nunca `undefined`. */
export function machineProfile(id?: string): MachineProfile {
  return findMachineProfile(id) ?? MACHINE_PROFILES[0];
}

/** Leitura do campo `Pn` do status (`?`) — indicador de pinos (RF-MAQ-7). */
export interface PinReport {
  /** `false` quando o firmware **não incluiu** `Pn` no status (máscara `$10`). */
  reported: boolean;
  /** Letras dos pinos ativos, na ordem em que o firmware reporta (`Pn:XYZ`). */
  pins: string[];
}

/**
 * Interpreta o campo `Pn` do status do GRBL (RF-MAQ-7):
 * - **ausente** (`undefined`) → o firmware não reporta pinos (ex.: `$10=1`);
 * - **vazio** (`Pn:`) → reporta, mas nenhum pino está ativo;
 * - **com letras** → pinos ativos (limite X/Y/Z, sonda `P`, etc.).
 *
 * Mora neste bundle (o de máquina, sempre carregado) porque a barra de status
 * precisa responder **sem** abrir o painel Máquina, que carrega sob demanda.
 */
export function parsePins(pn?: string): PinReport {
  if (pn === undefined) return { reported: false, pins: [] };
  const pins = pn
    .toUpperCase()
    .split('')
    .filter((ch) => ch >= 'A' && ch <= 'Z');
  return { reported: true, pins };
}

// ------------------------------------------------------- smart connect (P2.5)

/**
 * Fatos da máquina lidos do `$$` que bastam para **sugerir** um perfil do
 * catálogo (o que o app tem permission de escrever).
 */
export interface MachineMatchFacts {
  /** `$130`/`$131` — curso útil em mm. */
  travel?: { x?: number; y?: number };
  /** `$30` — teto de `S`. */
  sMax?: number;
  /** `$22` — homing ligado. */
  homing?: boolean;
}

/** Por que o perfil foi sugerido (o texto vem do i18n, na UI). */
export type MachineMatchReason = 'area' | 'smax' | 'homing';

export interface MachineSuggestion {
  /** O perfil do catálogo que casa com a máquina. */
  profile: MachineProfile;
  /** 0…100 — quanto a máquina bate com o perfil. */
  score: number;
  /** Os sinais que bateram (o mais forte primeiro). */
  reasons: MachineMatchReason[];
}

/** Tolerância (mm) para o curso da máquina bater com o do perfil. */
const AREA_TOLERANCE_MM = 1;

/**
 * Sugere o perfil do catálogo que melhor casa com a máquina lida — o
 * *smart connect* do P2.5.
 *
 * Regra de **segurança**: só sugere quando o **curso bate exatamente**
 * (≤ 1 mm de tolerância). O curso é o valor que o app escreve na máquina
 * (`$130`/`$131`): sugerir um perfil com o curso errado gravaria limites
 * errados. Os demais sinais (teto de `S`, homing) desempatam entre perfis que
 * compartilham o mesmo curso.
 *
 * A sugestão **não** escreve nada: a UI mostra o "antes/depois" e o usuário
 * confirma (RF-MAQ-9).
 */
export function suggestMachineProfile(
  facts: MachineMatchFacts,
  profiles: readonly MachineProfile[] = MACHINE_PROFILES,
): MachineSuggestion | undefined {
  const travelX = facts.travel?.x;
  const travelY = facts.travel?.y;
  if (
    !Number.isFinite(travelX) ||
    !Number.isFinite(travelY) ||
    (travelX as number) <= 0 ||
    (travelY as number) <= 0
  ) {
    return undefined;
  }

  let best: MachineSuggestion | undefined;
  for (const profile of profiles) {
    const [areaX, areaY] = profile.area;
    if (areaX <= 0 || areaY <= 0) continue; // "Genérica" nunca é sugestão
    if (
      Math.abs((travelX as number) - areaX) > AREA_TOLERANCE_MM ||
      Math.abs((travelY as number) - areaY) > AREA_TOLERANCE_MM
    ) {
      continue;
    }

    const reasons: MachineMatchReason[] = ['area'];
    let score = 60;
    if (profile.sMax && Number.isFinite(facts.sMax)) {
      if (Math.abs((facts.sMax as number) - profile.sMax) <= 1) {
        score += 25;
        reasons.push('smax');
      } else {
        score -= 10;
      }
    }
    if (typeof facts.homing === 'boolean') {
      if (facts.homing === profile.homing) {
        score += 15;
        reasons.push('homing');
      } else {
        score -= 10;
      }
    }
    if (!best || score > best.score) {
      best = { profile, score: Math.max(0, Math.min(100, score)), reasons };
    }
  }
  return best;
}

// ------------------------------------------------- import `.lbdev` (P2.5)

/** Dispositivo lido de um arquivo `.lbdev` (LightBurn). */
export interface LbdevDevice {
  /** Nome de exibição (`DisplayName`). */
  name: string;
  /** Tipo do controlador (`Name`): 'GRBL', 'Ruida', 'UDP'… */
  controller: string;
  /** Curso em mm (`Width` × `Height`). */
  area: [number, number];
  /** Homing no startup (`HomeOnStartup`). */
  homing: boolean;
  /** `Settings.S_Scale` — o teto de `S` da máquina (`$30`). */
  sMax?: number;
}

export type LbdevErrorCode = 'invalid-json' | 'no-device';

/** Resultado da leitura de um `.lbdev`. */
export interface LbdevResult {
  /** Dispositivos encontrados (o LightBurn guarda uma lista). */
  devices: LbdevDevice[];
  /** Código do erro, quando não deu para ler. */
  error?: LbdevErrorCode;
  /** Mensagem do erro (para o log). */
  message?: string;
}

function finiteNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Lê um `.lbdev` (LightBurn): JSON com `DeviceList`, cada dispositivo com
 * `DisplayName`, `Width`/`Height` (curso em mm), `HomeOnStartup` e
 * `Settings.S_Scale` (o teto de `S`).
 *
 * O arquivo é um **texto editável** no LightBurn; o app só lê — nada é
 * gravado na máquina sem o usuário confirmar (RF-MAQ-9).
 */
export function parseLbdev(text: string): LbdevResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return {
      devices: [],
      error: 'invalid-json',
      message: err instanceof Error ? err.message : 'JSON inválido',
    };
  }
  const list = (data as { DeviceList?: unknown })?.DeviceList;
  if (!Array.isArray(list) || list.length === 0) {
    return {
      devices: [],
      error: 'no-device',
      message: 'o arquivo não tem "DeviceList"',
    };
  }

  const devices: LbdevDevice[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const dev = entry as Record<string, unknown>;
    const settings = (dev.Settings ?? {}) as Record<string, unknown>;
    const width = finiteNumber(dev.Width) ?? 0;
    const height = finiteNumber(dev.Height) ?? 0;
    const sMax = finiteNumber(settings.S_Scale);
    devices.push({
      name:
        (typeof dev.DisplayName === 'string' && dev.DisplayName.trim()) ||
        (typeof dev.Name === 'string' && dev.Name) ||
        'Dispositivo',
      controller: typeof dev.Name === 'string' ? dev.Name : '',
      area: [width, height],
      homing: dev.HomeOnStartup === true,
      sMax: sMax && sMax > 0 ? sMax : undefined,
    });
  }
  if (devices.length === 0) {
    return {
      devices: [],
      error: 'no-device',
      message: 'nenhum dispositivo utilizável no arquivo',
    };
  }
  return { devices };
}

/**
 * Converte um dispositivo `.lbdev` em um **perfil local** (o app não altera o
 * catálogo embutido). O módulo do laser não vem no arquivo: quando o `S_Scale`
 * sugere uma potência, ele é derivado; senão, o app assume 5 W.
 */
export function lbdevToProfile(
  device: LbdevDevice,
  id = 'imported',
): MachineProfile {
  const module: LaserModule =
    device.sMax && device.sMax >= 1000
      ? '10W'
      : device.sMax && device.sMax >= 500
        ? '5W'
        : '3W';
  return {
    id,
    name: device.name,
    module,
    area: [device.area[0], device.area[1]],
    homing: device.homing,
    spot: 0.08,
    lines: 10,
    mode: 'M4',
    sMax: device.sMax,
    pointPercent: 0.5,
    settings: {
      20: 1,
      22: device.homing ? 1 : 0,
      32: 1,
      130: Math.round(device.area[0]),
      131: Math.round(device.area[1]),
    },
  };
}
