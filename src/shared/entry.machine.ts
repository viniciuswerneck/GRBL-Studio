/**
 * Entrada do bundle do painel "Máquina" (P0.7) para o renderer.
 *
 * O renderer é JS puro e não importa TS: o esbuild publica este módulo como
 * `GRBL_MACHINE` (`public/machine.js`), carregado sob demanda ao abrir o
 * painel. `parseSettings` vem do protocolo para que a UI não reimplemente
 * parsing de `$$`.
 */

export * from './machine';
export { parseSettings } from './protocol';
