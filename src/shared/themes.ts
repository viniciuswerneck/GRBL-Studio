/**
 * Catálogo de temas do GRBL Studio (RF-APP-1).
 *
 * Fonte única compartilhada entre main (`PrefsStore`, menu) e renderer
 * (picker de aparência). O CSS correspondente vive em `public/tokens.css`
 * como blocos `html[data-theme="<id>"]` que **só sobrescrevem variáveis**
 * (DESIGN.md §6 — zero CSS duplicado).
 *
 * 11 temas: 5 claros + 4 escuros + 2 de alto contraste (WCAG AAA / estilo
 * Windows HC). Nos HC as cores são sempre sólidas — nada de transparência.
 */

/** Variante visual; define `color-scheme` e o agrupamento no picker. */
export type ThemeVariant = 'light' | 'dark' | 'hc';

export interface ThemeDef {
  /** Valor de `html[data-theme]` (e de `prefs.theme`). */
  id: string;
  variant: ThemeVariant;
  /** Chave de i18n do nome exibido. */
  labelKey: string;
  /** Amostra para o picker: fundo, texto e acento (hex). */
  swatch: { bg: string; fg: string; accent: string };
}

/** Ordem de exibição no picker: claros, escuros e alto contraste. */
export const THEMES: readonly ThemeDef[] = [
  // ------------------------------------------------------------- claros (5)
  {
    id: 'light',
    variant: 'light',
    labelKey: 'theme.light',
    swatch: { bg: '#f3f3f3', fg: '#1a1a1a', accent: '#0078d4' },
  },
  {
    id: 'solarized-light',
    variant: 'light',
    labelKey: 'theme.solarized-light',
    swatch: { bg: '#fdf6e3', fg: '#073642', accent: '#268bd2' },
  },
  {
    id: 'sand',
    variant: 'light',
    labelKey: 'theme.sand',
    swatch: { bg: '#f4efe7', fg: '#37322c', accent: '#9a5a1f' },
  },
  {
    id: 'arctic',
    variant: 'light',
    labelKey: 'theme.arctic',
    swatch: { bg: '#eaf1f8', fg: '#10202e', accent: '#0a63c9' },
  },
  {
    id: 'silver',
    variant: 'light',
    labelKey: 'theme.silver',
    swatch: { bg: '#e9e9ec', fg: '#1b1b1f', accent: '#4f5b66' },
  },
  // ------------------------------------------------------------- escuros (4)
  {
    id: 'dark',
    variant: 'dark',
    labelKey: 'theme.dark',
    swatch: { bg: '#202020', fg: '#ffffff', accent: '#4cc2ff' },
  },
  {
    id: 'midnight',
    variant: 'dark',
    labelKey: 'theme.midnight',
    swatch: { bg: '#0c1220', fg: '#e8eef8', accent: '#58a6ff' },
  },
  {
    id: 'solarized-dark',
    variant: 'dark',
    labelKey: 'theme.solarized-dark',
    swatch: { bg: '#002b36', fg: '#e0e6e6', accent: '#2aa198' },
  },
  {
    id: 'oled',
    variant: 'dark',
    labelKey: 'theme.oled',
    swatch: { bg: '#000000', fg: '#f2f2f2', accent: '#4cc2ff' },
  },
  // ------------------------------------------------ alto contraste (2, WCAG)
  {
    id: 'hc-black',
    variant: 'hc',
    labelKey: 'theme.hc-black',
    swatch: { bg: '#000000', fg: '#ffffff', accent: '#ffff00' },
  },
  {
    id: 'hc-white',
    variant: 'hc',
    labelKey: 'theme.hc-white',
    swatch: { bg: '#ffffff', fg: '#000000', accent: '#0000cc' },
  },
];

/** Tema aplicado quando não há preferência válida. */
export const DEFAULT_THEME = 'dark';

const IDS: ReadonlySet<string> = new Set(THEMES.map((theme) => theme.id));

/** `true` se `value` é um id de tema conhecido. */
export function isThemeId(value: unknown): value is string {
  return typeof value === 'string' && IDS.has(value);
}

/** Definição de um tema (ou `undefined`). */
export function themeById(id: string): ThemeDef | undefined {
  return THEMES.find((theme) => theme.id === id);
}

/** Temas de uma variante, na ordem do catálogo. */
export function themesByVariant(variant: ThemeVariant): ThemeDef[] {
  return THEMES.filter((theme) => theme.variant === variant);
}
