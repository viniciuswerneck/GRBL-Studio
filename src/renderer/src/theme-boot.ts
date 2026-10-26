/**
 * Theme Boot — aplica tema ANTES do primeiro paint (sem flash).
 * Carregado sincronamente no <head> do index.html.
 * Versão standalone (sem imports) para evitar problema de alias no build.
 */

// Mínimo necessário do shared/themes.ts
const DEFAULT_THEME = 'dark';
const THEMES = [
  'light',
  'solarized-light',
  'sand',
  'arctic',
  'silver',
  'dark',
  'midnight',
  'solarized-dark',
  'oled',
  'hc-black',
  'hc-white',
] as const;

function isThemeId(value: string): value is (typeof THEMES)[number] {
  return THEMES.includes(value as any);
}

(() => {
  try {
    const cached = localStorage.getItem('grbl-theme');
    if (cached && isThemeId(cached)) {
      document.documentElement.dataset.theme = cached;
    } else {
      document.documentElement.dataset.theme = DEFAULT_THEME;
    }
  } catch {
    document.documentElement.dataset.theme = DEFAULT_THEME;
  }

  // Respeita prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--dur-fast', '0ms');
    document.documentElement.style.setProperty('--dur', '0ms');
  }
})();
