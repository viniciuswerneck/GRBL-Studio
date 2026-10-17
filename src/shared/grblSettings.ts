/**
 * Catálogo das configurações `$$` do GRBL 1.1 (RF-CFG-1/2/6).
 *
 * Cada `$n` conhecido traz nome em pt-BR, ajuda contextual (o que faz e o
 * efeito de mudar), grupo, unidade e tipo de entrada. Chaves desconhecidas
 * (de builds com $140+ ou `$N`) continuam listadas, mas sem metadados ricos.
 *
 * O parse das linhas `$$` vive em `protocol.ts` (`parseSettings`); este módulo
 * só descreve e ordena as chaves para a UI.
 */

import type { ParsedSetting } from './protocol';
import { t } from './i18n';

/** Tipo de entrada sugerido para editar o valor. */
export type SettingValueType = 'bool' | 'int' | 'float' | 'mask' | 'text';

export interface SettingDescriptor {
  name: string;
  /** Ajuda contextual: o que o parâmetro faz e o efeito de alterá-lo. */
  help: string;
  group: string;
  type: SettingValueType;
  unit?: string;
  min?: number;
  max?: number;
}

/** Ordem de exibição dos grupos na UI. */
export const GROUP_ORDER: string[] = [
  'Passo e direção',
  'Relatório',
  'Limites',
  'Homming',
  'Spindle/Laser',
  'Eixo X',
  'Eixo Y',
  'Eixo Z',
  'Outros',
];

/** Grupo de exibição de uma chave. */
export function groupOf(key: number): string {
  return CATALOG[key]?.group ?? 'Outros';
}

/** Metadados por chave. Tudo em pt-BR, com ajuda contextual (RF-CFG-6). */
export const CATALOG: Record<number, SettingDescriptor> = {
  0: {
    name: 'Largura do pulso de passo',
    help: 'Duração do pulso STEP (µs). Ajuste para drivers lentos; o padrão (10 µs) cobre a maioria.',
    group: 'Passo e direção',
    type: 'float',
    unit: 'µs',
    min: 1,
  },
  1: {
    name: 'Atraso ocioso do passo',
    help: 'Tempo (ms) que o motor permanece energizado após parar. 255 = sempre ligado; 0 = desliga imediatamente.',
    group: 'Passo e direção',
    type: 'int',
    unit: 'ms',
    min: 0,
    max: 255,
  },
  2: {
    name: 'Inverter pulso de passo',
    help: 'Máscara (bits) que inverte o sinal do pulso. Use 0 se o eixo não anda.',
    group: 'Passo e direção',
    type: 'mask',
  },
  3: {
    name: 'Inverter direção',
    help: 'Máscara para inverter o sentido do eixo (X=1, Y=2, Z=4).',
    group: 'Passo e direção',
    type: 'mask',
  },
  4: {
    name: 'Inverter habilitar do driver',
    help: 'Inverte o pino de habilitação do driver de passo.',
    group: 'Passo e direção',
    type: 'bool',
  },
  5: {
    name: 'Inverter pinos de limite',
    help: 'Inverte a leitura dos chaves de fim de curso.',
    group: 'Limites',
    type: 'bool',
  },
  6: {
    name: 'Inverter pino de apalpador',
    help: 'Inverte a leitura do probe (apalpador).',
    group: 'Limites',
    type: 'bool',
  },
  10: {
    name: 'Máscara do relatório de status',
    help: 'Escolhe o que o `?` informa. Padrão 3 (posição de máquina e de trabalho).',
    group: 'Relatório',
    type: 'mask',
  },
  11: {
    name: 'Desvio de junção',
    help: 'Controla a suavização entre segmentos. Maior = cantos mais largos; padrão 0.010 mm.',
    group: 'Relatório',
    type: 'float',
    unit: 'mm',
    min: 0,
  },
  12: {
    name: 'Tolerância de arco',
    help: 'Erro máximo ao aproximar arcos por segmentos. Menor = mais preciso e mais G-code. 0.002 mm.',
    group: 'Relatório',
    type: 'float',
    unit: 'mm',
    min: 0,
  },
  13: {
    name: 'Relatar em polegadas',
    help: 'Se ligado, o status e os valores são reportados em polegadas (não muda o G-code).',
    group: 'Relatório',
    type: 'bool',
  },
  20: {
    name: 'Soft limits',
    help: 'Bloqueia movimentos que excederiam o curso ($130/$131). Requer homing antes.',
    group: 'Limites',
    type: 'bool',
  },
  21: {
    name: 'Hard limits',
    help: 'Interrompe ao acionar as chaves físicas de fim de curso.',
    group: 'Limites',
    type: 'bool',
  },
  22: {
    name: 'Ciclo de homing',
    help: 'Habilita a rotina de origem (`$H`). Desligue se não houver chaves.',
    group: 'Homming',
    type: 'bool',
  },
  23: {
    name: 'Inversão da direção de homing',
    help: 'Inverte a direção em que a máquina procura a chave de home.',
    group: 'Homming',
    type: 'mask',
  },
  24: {
    name: 'Feed do homing',
    help: 'Velocidade final de aproximação do homing.',
    group: 'Homming',
    type: 'float',
    unit: 'mm/min',
  },
  25: {
    name: 'Busca lenta do homming',
    help: 'Velocidade de busca rápida até a primeira detecção do fim de curso.',
    group: 'Homming',
    type: 'float',
    unit: 'mm/min',
  },
  26: {
    name: 'Debounce do fim de curso',
    help: 'Tempo de estabilização da chave. Padrão 250 ms.',
    group: 'Homming',
    type: 'int',
    unit: 'ms',
    min: 0,
  },
  27: {
    name: 'Recuo do homing',
    help: 'Distância que recua após tocar a chave de homing.',
    group: 'Homming',
    type: 'float',
    unit: 'mm',
    min: 0,
  },
  30: {
    name: 'RPM máximo do spindle',
    help: 'Escala o S máximo. Use 1000 para laser em vez de RPM; o S vai de 0 a este valor.',
    group: 'Spindle/Laser',
    type: 'float',
    min: 0,
  },
  31: {
    name: 'RPM mínimo do spindle',
    help: 'Valor mínimo onde o spindle/relé liga. Laser costuma ser 0.',
    group: 'Spindle/Laser',
    type: 'float',
    min: 0,
  },
  32: {
    name: 'Modo laser',
    help: '1 = M4 dinâmico (potência com a velocidade) e permite mover sem queimar. 0 = spindle.',
    group: 'Spindle/Laser',
    type: 'bool',
  },
  100: {
    name: 'Passos/mm do eixo X',
    help: 'Calibração: quantos passos fazem 1 mm. Motor de 200 passos, 16 micro, 2 mm/passo → 1600.',
    group: 'Eixo X',
    type: 'float',
    unit: 'steps/mm',
    min: 0,
  },
  101: {
    name: 'Passos/mm do eixo Y',
    help: 'Calibração: quantos passos fazem 1 mm.',
    group: 'Eixo Y',
    type: 'float',
    unit: 'steps/mm',
    min: 0,
  },
  102: {
    name: 'Passos/mm do eixo Z',
    help: 'Calibração: quantos passos fazem 1 mm.',
    group: 'Eixo Z',
    type: 'float',
    unit: 'steps/mm',
    min: 0,
  },
  110: {
    name: 'Velocidade máxima X',
    help: 'Rate (mm/min) que o eixo X alcança a caminho do repouso. Não é o uso; é a capacidade.',
    group: 'Eixo X',
    type: 'float',
    unit: 'mm/min',
    min: 0,
  },
  111: {
    name: 'Velocidade máxima Y',
    help: 'Rate máximo do eixo Y.',
    group: 'Eixo Y',
    type: 'float',
    unit: 'mm/min',
    min: 0,
  },
  112: {
    name: 'Velocidade máxima Z',
    help: 'Rate máximo do eixo Z.',
    group: 'Eixo Z',
    type: 'float',
    unit: 'mm/min',
    min: 0,
  },
  120: {
    name: 'Aceleração X',
    help: 'Aceleração em mm/s². Alta demais perde passo; baixa deixa o trabalho devagar.',
    group: 'Eixo X',
    type: 'float',
    unit: 'mm/s²',
    min: 0,
  },
  121: {
    name: 'Aceleração Y',
    help: 'Aceleração em mm/s².',
    group: 'Eixo Y',
    type: 'float',
    unit: 'mm/s²',
    min: 0,
  },
  122: {
    name: 'Aceleração Z',
    help: 'Aceleração em mm/s².',
    group: 'Eixo Z',
    type: 'float',
    unit: 'mm/s²',
    min: 0,
  },
  130: {
    name: 'Curso máximo X',
    help: 'Comprimento útil do eixo X. Usado nos limites suaves e no aviso de área de trabalho.',
    group: 'Eixo X',
    type: 'float',
    unit: 'mm',
    min: 0,
  },
  131: {
    name: 'Curso máximo Y',
    help: 'Comprimento útil do eixo Y. Usado nos limites suaves e no aviso de área de trabalho.',
    group: 'Eixo Y',
    type: 'float',
    unit: 'mm',
    min: 0,
  },
  132: {
    name: 'Curso máximo Z',
    help: 'Comprimento útil do eixo Z.',
    group: 'Eixo Z',
    type: 'float',
    unit: 'mm',
    min: 0,
  },
};

export function describeSetting(key: number): SettingDescriptor | undefined {
  return CATALOG[key];
}

/** Linha já pronta para a UI: valor + metadados. */
export interface SettingRow {
  code: number;
  value: string;
  number?: number;
  name: string;
  help: string;
  group: string;
  type: SettingValueType;
  unit?: string;
  min?: number;
  max?: number;
}

/** Chave i18n de cada grupo do catálogo (rótulo pt-BR → chave, RF-APP-2). */
const GROUP_KEYS: Record<string, string> = {
  'Passo e direção': 'setgroup.passo-e-direcao',
  Relatório: 'setgroup.relatorio',
  Limites: 'setgroup.limites',
  Homming: 'setgroup.homming',
  'Spindle/Laser': 'setgroup.spindle-laser',
  'Eixo X': 'setgroup.eixo-x',
  'Eixo Y': 'setgroup.eixo-y',
  'Eixo Z': 'setgroup.eixo-z',
  Outros: 'setgroup.outros',
};

/** Traduz o grupo (pt-BR do catálogo) para o idioma ativo. */
function groupLabel(ptGroup: string): string {
  const key = GROUP_KEYS[ptGroup];
  return key ? t(key) : ptGroup;
}

/** Monta as linhas (ordenadas por `$`) a partir de um mapa de `$$`. */
export function buildSettingRows(
  map: Map<number, ParsedSetting>,
): SettingRow[] {
  return [...map.values()]
    .sort((a, b) => a.key - b.key)
    .map((setting) => {
      const meta = CATALOG[setting.key];
      return {
        code: setting.key,
        value: setting.value,
        number: setting.number,
        name:
          meta?.name ?? t('settings.fallbackName', { key: `$${setting.key}` }),
        help: meta?.help ?? t('settings.fallbackHelp'),
        group: groupLabel(meta?.group ?? 'Outros'),
        type: meta?.type ?? (setting.number === undefined ? 'text' : 'float'),
        unit: meta?.unit,
        min: meta?.min,
        max: meta?.max,
      };
    });
}

/**
 * Valida um valor digitado para a chave, devolvendo uma mensagem ou `null`.
 * A edição é livre no limite do tipo; aqui só barramos erros óbvios.
 */
export function validateSettingValue(key: number, raw: string): string | null {
  const value = raw.trim();
  if (value === '') return t('validate.empty');
  const meta = CATALOG[key];
  if (!meta) return null;
  if (meta.type === 'text') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return t('validate.nan');
  if (meta.type === 'mask' || meta.type === 'int' || meta.type === 'float') {
    if (meta.type !== 'float' && !Number.isInteger(num))
      return t('validate.int');
  }
  if (meta.min !== undefined && num < meta.min)
    return t('validate.min', { min: meta.min });
  if (meta.max !== undefined && num > meta.max)
    return t('validate.max', { max: meta.max });
  return null;
}
