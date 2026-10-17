/**
 * Tipos compartilhados entre main, preload e renderer.
 * Fonte da verdade dos contratos de dados do GRBL Studio.
 */

import type { Lang } from './i18n';
import type { Macro } from './macros';

export type { Lang };

/** Estado reportado pelo firmware GRBL no status report. */
export type GrblState =
  | 'Idle'
  | 'Run'
  | 'Hold'
  | 'Door'
  | 'Home'
  | 'Alarm'
  | 'Check'
  | 'Jog'
  | 'Sleep'
  | 'Unknown';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FeedSpindle {
  /** Feed rate real (mm/min). */
  feed: number;
  /** Rotação/valor do spindle ou potência do laser (S). */
  spindle: number;
}

export interface BufferState {
  /** Blocos planejados ainda no buffer de execução. */
  planned: number;
  /** Bytes livres no buffer RX (relevante para character-counting). */
  rx: number;
}

/** Resultado do parse de um status report `<...>`. */
export interface GrblStatus {
  /** Linha crua recebida. */
  raw: string;
  state: GrblState;
  /** Posição da máquina. */
  mpos?: Vec3;
  /** Posição de trabalho. */
  wpos?: Vec3;
  /** Offset de coordenada de trabalho. */
  wco?: Vec3;
  fs?: FeedSpindle;
  /** Overrides: feed, rapid, spindle (%). */
  ov?: [number, number, number];
  /** Pinos ativos (Pn). */
  pn?: string;
  /** Estado do buffer (Bf). */
  bf?: BufferState;
  /** Campos desconhecidos preservados. */
  extra: Record<string, string>;
}

/** Classificação de uma linha de resposta do GRBL. */
export type LineKind =
  | 'ok'
  | 'error'
  | 'alarm'
  | 'message'
  | 'status'
  | 'setting'
  | 'welcome'
  | 'other';

export interface ClassifiedLine {
  kind: LineKind;
  /** Texto sem quebras. */
  text: string;
  /** Código numérico quando aplicável (`error:9` -> 9). */
  code?: number;
  /** Mensagem amigável (ex.: descrição de alarme/erro). */
  message?: string;
}

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/** Evento de console (comando enviado ou linha recebida). */
export interface ConsoleLine {
  direction: 'out' | 'in';
  kind: LineKind;
  text: string;
  /** Timestamp (epoch ms). */
  ts: number;
}

export interface JobProgress {
  sent: number;
  total: number;
}

export type JobState = 'idle' | 'running' | 'paused' | 'finished' | 'aborted';

export interface JobInfo {
  state: JobState;
  name?: string;
  sent: number;
  total: number;
  error?: string;
}

/** Configuração de jog enviada pelo renderer. */
export interface JogCommand {
  x?: number;
  y?: number;
  z?: number;
  /** Feed rate (mm/min). */
  feed?: number;
  /** Se true, usa o modo de jog dedicado do GRBL ($J=). */
  useDollarJog?: boolean;
}

/** Tipo de transporte da conexão. */
export type TransportKind = 'serial' | 'tcp';

export interface ConnectOptions {
  /** Tipo de transporte (padrão: `serial`). */
  kind?: TransportKind;
  /** Serial: caminho da porta (ex.: `/dev/ttyUSB0`). */
  path?: string;
  /** Serial: baud rate. */
  baudRate?: number;
  /** WiFi/ESP8266: host (ex.: `192.168.4.1`). */
  host?: string;
  /** WiFi/ESP8266: porta TCP (ex.: `23`). */
  tcpPort?: number;
}

/** Porta serial exposta à UI. */
export interface PortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
}

/** Ações de override de feed. */
export type OverrideAction =
  | 'reset'
  | 'plus10'
  | 'minus10'
  | 'plus1'
  | 'minus1';

/** Níveis de override de deslocamento rápido (G0). */
export type RapidOverrideLevel = 'default' | 'medium' | 'low';

/** Payload do erro enviado à UI. */
export interface ErrorPayload {
  message: string;
  code?: number;
}

/** Imagem escolhida no diálogo nativo (main -> renderer). */
export interface OpenedImageFile {
  /** Caminho absoluto escolhido pelo usuário (informativo). */
  path: string;
  /** Nome do arquivo, sem diretório. */
  name: string;
  /** MIME inferido pela extensão. */
  mime: string;
  /** Bytes originais do arquivo. */
  data: Uint8Array;
}

/** Arquivo de texto (G-code) escolhido no diálogo nativo. */
export interface OpenedTextFile {
  path: string;
  name: string;
  text: string;
}

/** Consulta especial `$#`/`$I`/`$G` (RF-CFG-3). */
export type SpecialQuery = 'offsets' | 'info' | 'state';

/** Comando de escrita de uma configuração `$n=valor`. */
export interface SettingApplyRequest {
  code: number;
  value: string;
}

/** Unidade de exibição escolhida pelo usuário (RF-APP-3). */
export type Units = 'mm' | 'in';

/**
 * Informações do aplicativo servidas ao renderer via `app:info`
 * (RF-APP-6/7). Versão/autor/licença vêm do `main` — nunca hardcoded
 * no renderer (AGENTS.md).
 */
export interface AppInfo {
  name: string;
  version: string;
  author: string;
  license: string;
  /** Site institucional (WerneckLab). */
  url: string;
  /** Repositório público do projeto. */
  repository: string;
  /** Idioma detectado do sistema na primeira execução. */
  defaultLang: Lang;
}

/**
 * Preferências persistidas entre sessões (RF-CFG-5, RF-CON-3).
 * Guardadas em `<userData>/prefs.json`.
 */
export interface Prefs {
  /** Último caminho de porta selecionado (ex.: `/dev/ttyUSB0`). */
  port?: string;
  /** Último baud rate selecionado. */
  baud?: number;
  /** Tema escolhido (RF-APP-1) — id de `shared/themes`. */
  theme?: string;
  /** Unidade de exibição (DRO). */
  units?: Units;
  /** Idioma escolhido (RF-APP-2); ausente = detectado do sistema. */
  lang?: Lang;
  /** Modo Básico/Avançado (RF-APP-4). */
  mode?: 'basic' | 'advanced';
  /** Perfil de máquina escolhido (RF-IMG-8). */
  machineProfile?: string;
  /** Reconectar automaticamente à última porta ao abrir (padrão true). */
  autoConnect?: boolean;
  /** Macro/botões customizados (RF-MAC-1). */
  macros?: Macro[];
  /** Transporte escolhido (RF-CON-7). */
  transport?: TransportKind;
  /** WiFi: host padrão (RF-CON-7). */
  host?: string;
  /** WiFi: porta TCP padrão (RF-CON-7). */
  tcpPort?: number;
}
