/**
 * Macros / botões customizados (RF-MAC-1…2).
 *
 * Funções puras: validar e normalizar a lista vinda das preferências ou de um
 * arquivo JSON de import, além de serializar para export. A execução (enviar
 * as linhas pelo `GrblClient`) fica no renderer/main, como o resto do app.
 */

export interface Macro {
  id: string;
  label: string;
  gcode: string;
  group: string;
}

/** Grupos sugeridos na UI (livre para o usuário). */
export const MACRO_GROUPS = [
  'Preparação',
  'Origem',
  'Laser',
  'Controle',
  'Outros',
];

/** Conjunto inicial de macros úteis e seguras (sem comandos de tempo real). */
export const DEFAULT_MACROS: Macro[] = [
  { id: 'unlock', label: 'Desbloquear ($X)', gcode: '$X', group: 'Preparação' },
  { id: 'home', label: 'Home ($H)', gcode: '$H', group: 'Preparação' },
  {
    id: 'report',
    label: 'Relatar estado ($G)',
    gcode: '$G',
    group: 'Preparação',
  },
  {
    id: 'goto-zero',
    label: 'Ir para zero (X0 Y0)',
    gcode: 'G90 G0 X0 Y0',
    group: 'Origem',
  },
  {
    id: 'set-zero',
    label: 'Definir zero aqui',
    gcode: 'G92 X0 Y0 Z0',
    group: 'Origem',
  },
  { id: 'laser-off', label: 'Laser desligado', gcode: 'M5', group: 'Laser' },
  {
    id: 'abs-mm',
    label: 'Absoluto em mm',
    gcode: 'G21 G90',
    group: 'Controle',
  },
];

/** Divide o `gcode` de uma macro em linhas limpas (sem vazias). */
export function macroLines(macro: Macro): string[] {
  return String(macro.gcode)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Normaliza um item desconhecido; `null` quando não dá para usar. */
function asMacro(input: unknown, index: number): Macro | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  const gcode = typeof raw.gcode === 'string' ? raw.gcode.trim() : '';
  if (!label || !gcode) return null;
  const group = typeof raw.group === 'string' ? raw.group.trim() : '';
  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `macro-${index}`;
  return { id, label, gcode, group: group || 'Outros' };
}

/** Filtra/normaliza uma lista vinda de preferências ou de arquivo. */
export function sanitizeMacros(input: unknown): Macro[] {
  if (!Array.isArray(input)) return [];
  const out: Macro[] = [];
  const seen = new Set<string>();
  input.forEach((item, index) => {
    const macro = asMacro(item, index);
    if (!macro) return;
    // Sem duplicar ids do arquivo (o renderer trabalha por id).
    let id = macro.id;
    let suffix = 1;
    while (seen.has(id)) id = `${macro.id}-${suffix++}`;
    seen.add(id);
    out.push({ ...macro, id });
  });
  return out;
}

/** Aceita `[...]` ou `{ "macros": [...] }`; lança se o JSON for inválido. */
export function parseMacroFile(text: string): Macro[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Arquivo de macros não é um JSON válido.');
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'macros' in parsed
      ? (parsed as { macros: unknown }).macros
      : null;
  if (!Array.isArray(list)) {
    throw new Error(
      'JSON de macros deve ser uma lista ou { "macros": [...] }.',
    );
  }
  const macros = sanitizeMacros(list);
  if (macros.length === 0) {
    throw new Error(
      'Nenhuma macro válida encontrada (rotule e informe G-code).',
    );
  }
  return macros;
}

/** Serializa para exportação (mesmo formato aceito na importação). */
export function serializeMacros(macros: Macro[]): string {
  return `${JSON.stringify({ version: 1, macros }, null, 2)}\n`;
}
