/**
 * Declarações globais de tipo para o renderer Svelte 5 do GRBL Studio.
 *
 * - `window.grbl`: API exposta pelo preload (contextBridge). Tipo compartilhado
 *   com `src/preload/index.ts` (GrblApi).
 * - `*.svelte`: permite imports de componentes Svelte em TypeScript estrito.
 */

import type { GrblApi } from '../../preload/index';

declare global {
  interface Window {
    grbl: GrblApi;
  }
}

declare module '*.svelte' {
  const content: any;
  export default content;
}

export {};
