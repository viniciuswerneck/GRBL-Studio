/**
 * Entrada do bundle do renderer: `esbuild entry.ts → public/i18n.js`
 * (variável global `GRBL_I18N`, mesmo padrão de materials/preview/macros).
 *
 * O renderer usa `window.GRBL_I18N.t/setLocale/applyDom/THEMES`; o `main`
 * importa `src/shared/i18n/index.ts` direto (sem DOM).
 */
import { THEMES, themesByVariant, type ThemeVariant } from '../themes';
import { applyDom } from './dom';
import {
  DEFAULT_LANG,
  LANGS,
  detectLocale,
  getLocale,
  hasKey,
  isLang,
  onLocaleChange,
  setLocale,
  slugify,
  t,
} from './index';

export {
  applyDom,
  detectLocale,
  DEFAULT_LANG,
  getLocale,
  hasKey,
  isLang,
  LANGS,
  onLocaleChange,
  setLocale,
  slugify,
  THEMES,
  themesByVariant,
  t,
};
export type { Lang, MessageKey } from './index';
export type { ThemeVariant };
