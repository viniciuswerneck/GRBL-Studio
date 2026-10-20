/**
 * **Presets de material** (P2.12 / RF-IMG-8 + RF-IMG-10).
 *
 * Um preset é a "receita que deu certo": material, módulo, ação (gravar/cortar),
 * potência (%), velocidade, passadas, modo e notas. Serve para repetir um
 * resultado sem refazer a grade de testes — e para **compartilhar** (JSON).
 *
 * A **dose** (RF-IMG-10) é a energia entregue por milímetro de traço:
 *
 *     dose [J/mm] = watts × potência(%) / 100 × 60 / velocidade(mm/min)
 *
 * (W = J/s; a `60` converte mm/min em mm/s). Ela é uma **aproximação** — não
 * modela o ponto do laser, o material nem a sobreposição de passadas — mas é
 * a grandeza certa para comparar receitas e **levar** uma receita de um módulo
 * para outro: a mesma dose no mesmo material tende a dar o mesmo resultado.
 *
 * Puro e testável: sem DOM, sem disco, sem IPC. O renderer gera `id`/`createdAt`
 * (é o único lugar com relógio e aleatoriedade) e este módulo normaliza,
 * mescla, serializa e converte.
 */

import type { LaserModule, ProfileAction } from './materials';

/** Teto de presets guardados (o JSON inteiro fica pequeno). */
export const PRESET_MAX = 100;
export const PRESET_NAME_MAX = 60;
export const PRESET_NOTES_MAX = 240;
export const PRESET_MATERIAL_MAX = 60;

/** Versão do formato de exportação (para migrar sem quebrar). */
export const PRESET_JSON_VERSION = 1;

/** Potência nominal de cada módulo, em watts (para a dose). */
export const MODULE_WATTS: Record<LaserModule, number> = {
  '3W': 3,
  '5W': 5,
  '10W': 10,
};

/** Receita salva pelo usuário. */
export interface MaterialPreset {
  /** Identificador estável (`crypto.randomUUID()`). */
  id: string;
  /** Nome curto dado pelo usuário ("MDF 3 mm — corte"). */
  name: string;
  /** Material do catálogo (pode ser vazio) — em pt-BR, como no manual. */
  material: string;
  /** Módulo a que a receita se refere. */
  module: LaserModule;
  /** Gravação ou corte. */
  action: ProfileAction;
  /** Potência, em % da potência máxima. */
  powerPercent: number;
  /** Velocidade, em mm/min. */
  speedMmMin: number;
  /** Passadas. */
  passes: number;
  /** Modo de acionamento do laser. */
  mode: 'M3' | 'M4';
  /** Observações livres (preparo, fixação…). */
  notes: string;
  /** Criação (ms desde a época); 0 quando desconhecida. */
  createdAt: number;
}

/** Resultado da importação de um arquivo JSON. */
export interface PresetImport {
  presets: MaterialPreset[];
  /** Entradas descartadas (inválidas ou repetidas dentro do próprio arquivo). */
  skipped: number;
  /** `invalid` = não é JSON / não tem lista; ausente = leu algo. */
  error?: 'invalid';
}

/** Ajustes convertidos para outro módulo (RF-IMG-10). */
export interface PresetConversion {
  module: LaserModule;
  powerPercent: number;
  speedMmMin: number;
  /** `true` quando o módulo de destino não alcança a dose nem a 100 %. */
  limited: boolean;
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MODULES: readonly LaserModule[] = ['3W', '5W', '10W'];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Texto de campo: sem controles, espaços colapsados, tamanho limitado. */
function cleanText(input: unknown, max: number): string {
  if (typeof input !== 'string') return '';
  // biome-ignore lint/suspicious/noControlCharactersInRegex: entrada do usuário
  const withoutControls = input.replace(/[\u0000-\u001f\u007f]/g, ' ');
  return withoutControls.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Número com 1 decimal (potência) — evita 33.333333 no JSON. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Normaliza **um** preset; `null` quando não dá para aproveitar (sem nome/id). */
export function sanitizePreset(input: unknown): MaterialPreset | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  const id = typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : '';
  const name = cleanText(raw.name, PRESET_NAME_MAX);
  if (!id || !name) return null;

  const module = MODULES.includes(raw.module as LaserModule)
    ? (raw.module as LaserModule)
    : '5W';
  const action: ProfileAction = raw.action === 'cut' ? 'cut' : 'engrave';
  const createdAt = Number(raw.createdAt);

  return {
    id,
    name,
    material: cleanText(raw.material, PRESET_MATERIAL_MAX),
    module,
    action,
    // 0 % é válido (laser "de apontar"), mas não faz sentido como receita.
    powerPercent: round1(clamp(Number(raw.powerPercent), 0, 100)),
    speedMmMin: Math.round(clamp(Number(raw.speedMmMin), 1, 20000)),
    passes: Math.round(clamp(Number(raw.passes), 1, 99)),
    mode: raw.mode === 'M3' ? 'M3' : 'M4',
    notes: cleanText(raw.notes, PRESET_NOTES_MAX),
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : 0,
  };
}

/**
 * Normaliza uma **lista** vinda do disco/JSON: descarta inválidos, remove ids
 * repetidos e corta no teto de `PRESET_MAX`.
 */
export function sanitizePresets(input: unknown): MaterialPreset[] {
  if (!Array.isArray(input)) return [];
  const out: MaterialPreset[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    const preset = sanitizePreset(item);
    if (!preset || seen.has(preset.id)) continue;
    seen.add(preset.id);
    out.push(preset);
    if (out.length >= PRESET_MAX) break;
  }
  return out;
}

/**
 * Insere ou atualiza um preset. Atualiza quando o `id` coincide **ou** quando
 * nome + módulo + ação são os mesmos (salvar de novo com o mesmo nome substitui
 * a receita em vez de duplicar). Sempre devolve uma lista nova e sanitizada.
 */
export function upsertPreset(
  list: readonly MaterialPreset[],
  preset: MaterialPreset,
): MaterialPreset[] {
  const clean = sanitizePreset(preset);
  if (!clean) return sanitizePresets(list);
  const next = sanitizePresets(list);
  const key = (p: MaterialPreset) =>
    `${p.name.toLocaleLowerCase()}\u0000${p.module}\u0000${p.action}`;
  const index = next.findIndex(
    (p) => p.id === clean.id || key(p) === key(clean),
  );
  if (index >= 0) {
    // Preserva a posição e a data de criação da receita original.
    next[index] = {
      ...clean,
      createdAt: next[index].createdAt || clean.createdAt,
    };
    return next;
  }
  next.push(clean);
  if (next.length > PRESET_MAX) {
    // Sem espaço: descarta a receita mais antiga (0 = desconhecida, sai antes),
    // sem reordenar o resto da lista.
    let oldest = 0;
    for (let i = 1; i < next.length; i++) {
      if ((next[i].createdAt || 0) < (next[oldest].createdAt || 0)) oldest = i;
    }
    next.splice(oldest, 1);
  }
  return next;
}

/** Remove pelo id (lista nova; id inexistente = lista igual). */
export function removePreset(
  list: readonly MaterialPreset[],
  id: string,
): MaterialPreset[] {
  return sanitizePresets(list).filter((preset) => preset.id !== id);
}

/**
 * Energia por milímetro de traço, em J/mm (RF-IMG-10).
 *
 * Aproximação de primeira ordem: `watts × potência × 60 / velocidade`.
 * Velocidade é normalizada para ≥ 1 mm/min, então o resultado é sempre finito.
 */
export function doseJPerMm(preset: MaterialPreset): number {
  const watts = MODULE_WATTS[preset.module] ?? MODULE_WATTS['5W'];
  const speed = Math.max(1, preset.speedMmMin);
  const power = clamp(preset.powerPercent, 0, 100) / 100;
  return (watts * power * 60) / speed;
}

/** Dose total da receita (dose por mm × passadas), em J/mm. */
export function totalDoseJPerMm(preset: MaterialPreset): number {
  return doseJPerMm(preset) * Math.max(1, preset.passes);
}

/**
 * Leva a receita para outro módulo mantendo a **dose** (RF-IMG-10).
 *
 * A velocidade é preservada por padrão (é o que se controla na máquina); o que
 * muda é a potência. Se o módulo de destino não alcançar a dose nem a 100 %,
 * `limited` avisa o chamador (a receita fica mais fraca que a original).
 */
export function convertPresetTo(
  preset: MaterialPreset,
  target: { module: LaserModule; speedMmMin?: number },
): PresetConversion {
  const speed = Math.max(
    1,
    Number.isFinite(Number(target.speedMmMin))
      ? Number(target.speedMmMin)
      : preset.speedMmMin,
  );
  const targetWatts = MODULE_WATTS[target.module] ?? MODULE_WATTS['5W'];
  const wantedWatts = (doseJPerMm(preset) * speed) / 60;
  const rawPercent = (wantedWatts / targetWatts) * 100;
  const powerPercent = round1(clamp(rawPercent, 0, 100));
  return {
    module: target.module,
    powerPercent,
    speedMmMin: Math.round(speed),
    limited: rawPercent > 100 + 1e-6,
  };
}

/** JSON de exportação (versionado, legível e determinístico). */
export function presetsToJson(list: readonly MaterialPreset[]): string {
  return `${JSON.stringify(
    {
      app: 'GRBL Studio',
      version: PRESET_JSON_VERSION,
      presets: sanitizePresets(list),
    },
    null,
    2,
  )}\n`;
}

/**
 * Lê o JSON exportado (ou um array "cru"). Tolerante: entradas inválidas são
 * contadas em `skipped` em vez de derrubar a importação inteira.
 */
export function presetsFromJson(text: string): PresetImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { presets: [], skipped: 0, error: 'invalid' };
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { presets?: unknown }).presets)
      ? (parsed as { presets: unknown[] }).presets
      : null;
  if (!list) return { presets: [], skipped: 0, error: 'invalid' };
  const presets = sanitizePresets(list);
  return { presets, skipped: Math.max(0, list.length - presets.length) };
}
