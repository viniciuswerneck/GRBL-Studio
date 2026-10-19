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
