/**
 * Entrada do bundle `public/presets.js` (esbuild, IIFE, global `GRBL_PRESETS`).
 *
 * Publica o módulo puro de presets de material (P2.12/RF-IMG-8 + RF-IMG-10)
 * para o renderer, que não importa módulos. Carregado sob demanda (RNF-11).
 */
export type {
  MaterialPreset,
  PresetConversion,
  PresetImport,
} from './materialPresets';
export {
  MODULE_WATTS,
  PRESET_JSON_VERSION,
  PRESET_MAX,
  convertPresetTo,
  doseJPerMm,
  presetsFromJson,
  presetsToJson,
  removePreset,
  sanitizePreset,
  sanitizePresets,
  totalDoseJPerMm,
  upsertPreset,
} from './materialPresets';
