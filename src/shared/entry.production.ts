/**
 * Entrada do bundle `public/production.js` (esbuild, IIFE, global
 * `GRBL_PRODUCTION`).
 *
 * Publica a máquina de estados do modo produção (RF-GC-12) para o renderer,
 * que não importa módulos (RNF-11: bundle mínimo, carregado sob demanda).
 */
export type { ProductionPhase, ProductionState } from './production';
export {
  IDLE_PRODUCTION,
  PRODUCTION_MAX_COPIES,
  clampProductionCopies,
  productionCopyFinished,
  productionFailed,
  productionNextCopy,
  productionProgress,
  productionStart,
  productionStop,
} from './production';
