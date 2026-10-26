/**
 * I18nProvider — gerencia internacionalização (pt-BR, en, es) com reatividade Svelte 5.
 * Catálogos carregados do bundle GRBL_I18N (public/i18n.js).
 */

import { onMount } from 'svelte';
import type { Lang } from '../../../../../src/shared/types';

type I18nCatalog = Record<string, string>;
type I18nBundle = {
  t: (key: string, params?: Record<string, string | number>) => string;
  hasKey: (key: string) => boolean;
  slugify: (value: string) => string;
  setLocale: (lang: Lang) => void;
  getLocale: () => Lang;
  detectLocale: (systemLang: string) => Lang;
  THEMES: any[];
};

let i18n: I18nBundle | null = null;
let currentLang = $state<Lang>('pt-BR');
let isReady = $state(false);

export function I18nProvider({ children }: { children: any }) {
  onMount(() => {
    initI18n();
  });
  
  async function initI18n() {
    try {
      // Bundle global GRBL_I18N (public/i18n.js)
      if (typeof window !== 'undefined' && (window as any).GRBL_I18N) {
        i18n = (window as any).GRBL_I18N;
        
        // Locale do cache ou sistema
        let lang: Lang = 'pt-BR';
        try {
          const cached = localStorage.getItem('grbl-lang');
          if (cached && ['pt-BR', 'en', 'es'].includes(cached)) {
            lang = cached as Lang;
          } else {
            lang = i18n.detectLocale(navigator.language);
          }
        } catch {}
        
        i18n.setLocale(lang);
        currentLang = lang;
        isReady = true;
      }
    } catch (e) {
      console.error('[I18nProvider] Falha ao inicializar:', e);
      isReady = true; // evita travamento
    }
  }
  
  function setLang(lang: Lang) {
    if (i18n && ['pt-BR', 'en', 'es'].includes(lang)) {
      i18n.setLocale(lang);
      currentLang = lang;
      try { localStorage.setItem('grbl-lang', lang); } catch {}
    }
  }
  
  function t(key: string, params?: Record<string, string | number>): string {
    if (!i18n) return key;
    return i18n.t(key, params);
  }
  
  function hasKey(key: string): boolean {
    return i18n?.hasKey(key) ?? false;
  }
  
  function slugify(value: string): string {
    return i18n?.slugify(value) ?? value;
  }
  
  return children;
}

// Hooks para uso em componentes
export function useI18n() {
  return {
    get t() { return t; },
    get hasKey() { return hasKey; },
    get slugify() { return slugify; },
    get lang() { return currentLang; },
    setLang,
    get isReady() { return isReady; },
  };
}

export function t(key: string, params?: Record<string, string | number>): string {
  if (!i18n) return key;
  return i18n.t(key, params);
}