/**
 * Parser puro do protocolo GRBL.
 *
 * Regras (ver AGENTS.md):
 *  - Funções puras, sem I/O e sem dependência de UI.
 *  - Tolerante a linhas malformadas e a variações de firmware.
 */

import type {
  ClassifiedLine,
  GrblState,
  GrblStatus,
  LineKind,
  Vec3,
} from './types';

/** Códigos de alarme do GRBL 1.1. */
export const ALARM_DESCRIPTIONS: Record<number, string> = {
  1: 'Hard limit acionado. Posição provavelmente perdida — re-home recomendado.',
  2: 'Soft limit: o alvo do movimento excede o curso da máquina. Pode destravar com segurança.',
  3: 'Reset durante movimento. Posição provavelmente perdida — re-home recomendado.',
  4: 'Falha de sonda: estado inicial inesperado antes do ciclo de sondagem.',
  5: 'Falha de sonda: a sonda não tocou a peça dentro do curso programado.',
  6: 'Falha de homing: reset durante o ciclo de homing.',
  7: 'Falha de homing: porta de segurança aberta durante o homing.',
  8: 'Falha de homing: o fim de curso não liberou ao recuar (aumente o pull-off/verifique a fiação).',
  9: 'Falha de homing: fim de curso não encontrado na distância de busca.',
};

/** Códigos de erro do GRBL 1.1 (string vazia = não documentado aqui). */
export const ERROR_DESCRIPTIONS: Record<number, string> = {
  1: 'Palavra G-code inválida: letra não encontrada.',
  2: 'Formato numérico inválido ou valor ausente.',
  3: 'Comando de sistema "$" não reconhecido ou não suportado.',
  4: 'Valor negativo recebido onde se esperava positivo.',
  5: 'Ciclo de homing não está habilitado nas configurações ($22).',
  6: 'Tempo mínimo de pulso de passo deve ser maior que 3 µs.',
  7: 'Falha de leitura da EEPROM. Reset para os valores padrão.',
  8: 'Comando "$" só pode ser usado em estado IDLE.',
  9: 'G-code bloqueado durante estado de alarme ou jog.',
  10: 'Soft limits não podem ser habilitados sem homing habilitado.',
  11: 'Máximo de caracteres por linha excedido; a linha foi ignorada.',
  12: 'Valor de configuração "$" excede a taxa de passo máxima suportada.',
  13: 'Porta de segurança aberta; estado de door iniciado.',
  14: 'Build info/startup excedeu o limite de linha da EEPROM.',
  15: 'Alvo do jog excede o curso da máquina; comando ignorado.',
  16: 'Comando de jog sem "=" ou contendo g-code proibido.',
  17: 'Modo laser requer saída PWM ($32=1).',
  20: 'Comando G-code não suportado ou inválido.',
  21: 'Mais de um comando do mesmo grupo modal na linha.',
  22: 'Feed rate não definido.',
  23: 'Comando G-code exige um valor inteiro.',
  24: 'Dois comandos que exigem as mesmas palavras de eixo na linha.',
  25: 'Palavra G-code repetida na linha.',
  26: 'Nenhuma palavra de eixo encontrada para o comando/estado modal.',
  27: 'Número de linha (N) fora da faixa válida.',
  28: 'Faltam valores obrigatórios (P/L) para o comando.',
  29: 'Sistema de coordenadas de trabalho não suportado.',
  30: 'G53 requer um modo de movimento (G0/G1) ativo.',
  31: 'Comando enviado sem um valor P ou L obrigatório.',
  32: 'Comando não suportado nesta configuração de firmware.',
};

const VALID_STATES: readonly GrblState[] = [
  'Idle',
  'Run',
  'Hold',
  'Door',
  'Home',
  'Alarm',
  'Check',
  'Jog',
  'Sleep',
];

/** Uma linha é um status report se começa com '<' (ignorando espaços). */
export function isStatusReport(line: string): boolean {
  const t = line.trim();
  return t.startsWith('<') && t.endsWith('>');
}

function parseVec3(value: string): Vec3 | undefined {
  const parts = value.split(',').map((p) => Number.parseFloat(p));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return undefined;
  return { x: parts[0]!, y: parts[1]!, z: parts[2] ?? 0 };
}

/**
 * Faz o parse de uma linha de status `<Estado|Campo:valor|...>`.
 * Retorna `null` se a linha não for um status report válido.
 */
export function parseStatusReport(line: string): GrblStatus | null {
  if (!isStatusReport(line)) return null;

  const body = line.trim().slice(1, -1);
  const segments = body.split('|');
  const stateToken = (segments.shift() ?? '').trim();

  const state: GrblState =
    (VALID_STATES.find((s) => s.toLowerCase() === stateToken.toLowerCase()) as
      | GrblState
      | undefined) ?? 'Unknown';

  const status: GrblStatus = { raw: line.trim(), state, extra: {} };

  for (const segment of segments) {
    const idx = segment.indexOf(':');
    if (idx === -1) {
      if (segment) status.extra[segment] = '';
      continue;
    }
    const key = segment.slice(0, idx).trim();
    const value = segment.slice(idx + 1).trim();

    switch (key) {
      case 'MPos':
        status.mpos = parseVec3(value);
        break;
      case 'WPos':
        status.wpos = parseVec3(value);
        break;
      case 'WCO':
        status.wco = parseVec3(value);
        break;
      case 'FS': {
        const [feed, spindle] = value
          .split(',')
          .map((v) => Number.parseFloat(v));
        status.fs = {
          feed: Number.isFinite(feed) ? feed! : 0,
          spindle: Number.isFinite(spindle) ? spindle! : 0,
        };
        break;
      }
      case 'F': {
        const feed = Number.parseFloat(value);
        status.fs = {
          feed: Number.isFinite(feed) ? feed : 0,
          spindle: status.fs?.spindle ?? 0,
        };
        break;
      }
      case 'Ov': {
        const ov = value.split(',').map((v) => Number.parseInt(v, 10));
        status.ov = [ov[0] ?? 100, ov[1] ?? 100, ov[2] ?? 100];
        break;
      }
      case 'Pn':
        status.pn = value;
        break;
      case 'Bf': {
        const [planned, rx] = value
          .split(',')
          .map((v) => Number.parseInt(v, 10));
        status.bf = { planned: planned ?? 0, rx: rx ?? 0 };
        break;
      }
      default:
        status.extra[key] = value;
    }
  }

  return status;
}

/** Extrai o código numérico de `error:N` ou `ALARM:N`. */
function extractCode(line: string): number | undefined {
  const match = line.match(/:(\d+)\s*$/);
  if (!match) return undefined;
  const n = Number.parseInt(match[1]!, 10);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Classifica uma linha de resposta do GRBL.
 * Nunca lança: linhas desconhecidas viram `kind: 'other'`.
 */
export function classifyLine(rawLine: string): ClassifiedLine {
  const text = rawLine.replace(/\r$/, '');
  const trimmed = text.trim();

  if (trimmed === '') return { kind: 'other', text };

  if (isStatusReport(trimmed)) return { kind: 'status', text: trimmed };

  if (/^ok\b/i.test(trimmed)) return { kind: 'ok', text: trimmed };

  if (/^error:/i.test(trimmed)) {
    const code = extractCode(trimmed);
    return {
      kind: 'error',
      text: trimmed,
      code,
      message:
        code !== undefined
          ? (ERROR_DESCRIPTIONS[code] ?? `Erro ${code}.`)
          : trimmed,
    };
  }

  if (/^ALARM:/i.test(trimmed)) {
    const code = extractCode(trimmed);
    return {
      kind: 'alarm',
      text: trimmed,
      code,
      message:
        code !== undefined
          ? (ALARM_DESCRIPTIONS[code] ?? `Alarme ${code}.`)
          : trimmed,
    };
  }

  if (trimmed.startsWith('[MSG:')) {
    const inner = trimmed
      .replace(/^\[MSG:/i, '')
      .replace(/\]$/, '')
      .trim();
    return { kind: 'message', text: trimmed, message: inner };
  }

  if (trimmed.startsWith('$')) {
    return { kind: 'setting', text: trimmed };
  }

  if (/^Grbl\s/i.test(trimmed) || /\['\$' for help\]/i.test(trimmed)) {
    return { kind: 'welcome', text: trimmed };
  }

  return { kind: 'other', text: trimmed };
}

/** Resultado do parse de uma linha `$n=valor`. */
export interface ParsedSetting {
  key: number;
  value: string;
  number?: number;
}

/** Faz o parse de `$110=1200.000`; retorna `null` se não for um setting válido. */
export function parseSettingLine(line: string): ParsedSetting | null {
  const match = line.trim().match(/^\$(\d+)\s*=\s*(.+?)\s*$/);
  if (!match) return null;
  const key = Number.parseInt(match[1]!, 10);
  const value = match[2]!;
  const num = Number.parseFloat(value);
  return { key, value, number: Number.isFinite(num) ? num : undefined };
}

/** Faz o parse de várias linhas de `$$`, devolvendo um mapa por chave. */
export function parseSettings(lines: string[]): Map<number, ParsedSetting> {
  const map = new Map<number, ParsedSetting>();
  for (const line of lines) {
    const parsed = parseSettingLine(line);
    if (parsed) map.set(parsed.key, parsed);
  }
  return map;
}

/**
 * Divide um buffer acumulado em linhas completas.
 * Retorna as linhas prontas e o restante (sem `\n`) para acumular.
 */
export function splitLines(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  return { lines: parts, rest };
}

/** Formata um número de posição para o DRO (3 casas, sem arredondar dados de comando). */
export function formatPosition(
  value: number | undefined,
  decimals = 3,
): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(decimals);
}

export type { ClassifiedLine, GrblStatus, LineKind };
