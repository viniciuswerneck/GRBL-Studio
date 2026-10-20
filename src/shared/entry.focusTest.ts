/**
 * Entrada do bundle `public/focusTest.js` (esbuild, IIFE, global
 * `GRBL_FOCUS_TEST`).
 *
 * Publica o gerador do teste de foco/spot (P2.13) para o renderer, que não
 * importa módulos (RNF-11: bundle mínimo, carregado só quando o modal é usado).
 */
export type {
  FocusTestLine,
  FocusTestOptions,
  FocusTestResult,
} from './focusTest';
export {
  FOCUS_MAX_STEPS,
  FOCUS_MIN_STEPS,
  FOCUS_Z_FEED,
  generateFocusTest,
} from './focusTest';
