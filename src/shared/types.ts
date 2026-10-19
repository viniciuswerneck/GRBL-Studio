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

/**
 * Retrato da máquina lido de uma vez (P0.7): linhas cruas de `$I`, `$$`, `$#`,
 * `$G` e `$N` + o último `?`. O parse é feito no renderer com as funções puras
 * de `shared/machine.ts` — o main não interpreta.
 */
export interface MachineSnapshot {
  /** `$I` — `[VER:…]`, `[OPT:…]`. */
  build: string[];
  /** `$$` — `$100=…` … */
  settings: string[];
  /** `$#` — `[G54:…]` … */
  offsets: string[];
  /** `$G` — `[GC:…]`. */
  modal: string[];
  /** `$N` — `$N0=…` (vazio se o firmware não suportar). */
  startup: string[];
  /** Último status reportado, se houver. */
  status: GrblStatus | null;
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
  /** Ação recomendada para alarmes conhecidos (RF-STA-4). */
  solution?: string;
}

/** Entrada do histórico de alarmes/erros da sessão (RF-STA-7). */
export interface AlarmEntry {
  /** Timestamp (epoch ms). */
  ts: number;
  code?: number;
  /** Causa (mensagem principal). */
  message: string;
  /** Ação recomendada (RF-STA-4), quando conhecida. */
  solution?: string;
}

/** Perfil de configuração `$$` salvo pelo usuário (RF-CFG-4). */
export interface SettingProfile {
  name: string;
  /** Mapa `código -> valor` (ex.: `{ "130": "400" }`). */
  values: Record<string, string>;
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
  /** Assistente aberto (`basic`) ou fechado (`advanced`) — RF-APP-4. */
  mode?: 'basic' | 'advanced';
  /**
   * Tour de boas-vindas já visto (P0.4/RF-ONB-1): número da versão mostrada.
   * Ausente/0 = nunca viu (ou pediu para rever).
   */
  onboarding?: number;
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
  /** Pasta padrão dos diálogos de arquivo (RF-CFG-5). */
  fileDir?: string;
  /** Perfis de configuração `$$` salvos pelo usuário (RF-CFG-4). */
  settingProfiles?: SettingProfile[];
  /** Histórico de alarmes/erros persistido (RF-STA-7). */
  alarmHistory?: AlarmEntry[];
  /**
   * Últimos ajustes das ferramentas de símbolo (RF-SYM-4/RF-CFG-5): o modal
   * reabre com o que o usuário usou por último. O **conteúdo** não é salvo.
   */
  symbols?: SymbolPrefs;
}

/** Símbolos 2D disponíveis no modal "Código 2D". */
export type Symbol2dKind = 'qr' | 'datamatrix';

/** Ajustes persistidos do modal 2D (QR Code / Data Matrix). */
export interface Symbol2dPrefs {
  symbology?: Symbol2dKind;
  /** QR: nível de correção. */
  ecc?: 'L' | 'M' | 'Q' | 'H';
  /** QR: versão fixa; 0/ausente = automática. */
  version?: number;
  /** Data Matrix: lado fixo em módulos; 0/ausente = automático. */
  dmSize?: number;
  moduleMm?: number;
  quietZoneModules?: number;
  linesPerMm?: number;
  /** Tamanho final em mm (vazio/ausente = usa o módulo). */
  widthMm?: number;
  heightMm?: number;
  keepAspect?: boolean;
  powerPercent?: number;
  feed?: number;
  passes?: number;
  mode?: 'M3' | 'M4';
  overscanMm?: number;
  invert?: boolean;
}

/** Ajustes persistidos do modal de código de barras 1D. */
export interface BarcodePrefs {
  symbology?: string;
  targetWidthMm?: number;
  xDimMm?: number;
  barHeightMm?: number;
  quietZoneModules?: number;
  linesPerMm?: number;
  hri?: boolean;
  /** Code 39: razão largo:estreito. */
  code39Ratio?: 2 | 3;
  /** Code 39: verificador mod 43. */
  code39Checksum?: boolean;
  powerPercent?: number;
  feed?: number;
  passes?: number;
  mode?: 'M3' | 'M4';
  overscanMm?: number;
  invert?: boolean;
}

/** Preferências das ferramentas de símbolo. */
export interface SymbolPrefs {
  qr?: Symbol2dPrefs;
  barcode?: BarcodePrefs;
}
