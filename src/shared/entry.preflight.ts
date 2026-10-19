/**
 * Entrada do bundle de pré-voo (P0.8) para o renderer.
 *
 * O renderer é JS puro e não importa TS: o esbuild publica este módulo como
 * `GRBL_PREFLIGHT` (`public/preflight.js`), carregado sob demanda no primeiro
 * "Iniciar" — as regras MX-1…MX-15 vivem em `src/shared/preflight.ts`.
 */

export * from './preflight';
