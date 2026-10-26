/**
 * ThemeProvider — gerencia tema (11 temas Fluent/Win11) com reatividade Svelte 5 (runes).
 * Aplica `data-theme` no `<html>` antes do primeiro paint (sem flash).
 */

import { onMount } from 'svelte';
import { DEFAULT_THEME, isThemeId, THEMES, type ThemeId } from '../../../../../src/shared/themes';

interface ThemeProviderProps {
  children: any;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Estado reativo
  let currentTheme = $state<ThemeId>(DEFAULT_THEME);
  
  // Inicializa do localStorage (ou detecta preferência do sistema)
  onMount(() => {
    try {
      const cached = localStorage.getItem('grbl-theme');
      if (cached && isThemeId(cached)) {
        currentTheme = cached;
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        currentTheme = 'dark';
      } else {
        currentTheme = 'light';
      }
    } catch {
      currentTheme = DEFAULT_THEME;
    }
    applyTheme(currentTheme);
  });
  
  // Aplica tema no DOM
  function applyTheme(theme: ThemeId) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('grbl-theme', theme); } catch {}
  }
  
  // Reage a mudanças
  $effect(() => {
    applyTheme(currentTheme);
  });
  
  // Respeita prefers-reduced-motion
  $effect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.style.setProperty('--dur-fast', reduceMotion ? '0ms' : '80ms');
    document.documentElement.style.setProperty('--dur', reduceMotion ? '0ms' : '150ms');
  });
  
  // Actions
  function setTheme(theme: ThemeId) {
    if (isThemeId(theme)) currentTheme = theme;
  }
  
  function toggleTheme() {
    const darkThemes = ['dark', 'midnight', 'solarized-dark', 'oled', 'hc-black'];
    const lightThemes = ['light', 'solarized-light', 'sand', 'arctic', 'silver', 'hc-white'];
    const isDark = darkThemes.includes(currentTheme);
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
  }
  
  // Exponha para componentes filhos via context (opcional)
  return children;
}

// Helper para usar fora do provider
export function useTheme() {
  return {
    get current() { return currentTheme; },
    set: (theme: ThemeId) => { if (isThemeId(theme)) currentTheme = theme; },
    toggle: () => {
      const darkThemes = ['dark', 'midnight', 'solarized-dark', 'oled', 'hc-black'];
      const isDark = darkThemes.includes(currentTheme);
      currentTheme = isDark ? 'light' : 'dark';
    },
    themes: THEMES,
  };
}

// Estado global (module-level) para acesso direto
let currentTheme = $state<ThemeId>(DEFAULT_THEME);