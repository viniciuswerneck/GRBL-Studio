/**
 * Entrada do bundle do **editor de G-code** (P1.10) para o renderer.
 *
 * O renderer é JS puro e não importa TS: o esbuild publica este módulo como
 * `GRBL_GCODE_EDITOR` (`public/gcodeEditor.js`), carregado sob demanda quando o
 * editor abre — o realce/edição vivem em `src/shared/gcodeEditor.ts`.
 */

export * from './gcodeEditor';
