/**
 * Entry point do renderer - vanilla JS (funcional).
 * O vanilla JS em public/renderer.js assume o controle da UI.
 */

import { setLocale, detectLocale } from '../../../shared/i18n';
import { DEFAULT_THEME, isThemeId } from '../../../shared/themes';

// Tema já aplicado pelo theme-boot.ts (sync localStorage -> data-theme)
// i18n: define locale do sistema ou cache
const cachedLang = localStorage.getItem('grbl-lang');
if (cachedLang) {
  setLocale(cachedLang);
} else {
  setLocale(detectLocale(navigator.language));
}

// Tema do cache
try {
  const cached = localStorage.getItem('grbl-theme');
  if (cached && isThemeId(cached)) {
    document.documentElement.dataset.theme = cached;
  }
} catch {
  /* localStorage indisponível */
}

// O vanilla JS (public/renderer.js) é carregado via script tag no index.html
// e assume o controle da UI. Este arquivo existe apenas para satisfazer
// o entry point do electron-vite.

console.log('[GRBL Studio] Renderer entry loaded - vanilla JS takes over');

// Exporta nada - o vanilla JS assume via window.grbl (preload)
export {};
