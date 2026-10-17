/**
 * Menu nativo do Electron (RF-APP-7) — Arquivo / Exibir / Ajuda.
 *
 * - `Ajuda → Sobre` envia `evAbout` para o renderer, que abre o modal
 *   estilizado (a versão/autor/licença vêm de `app:info`, nunca hardcoded).
 * - `Exibir → Tema` (11 temas, RF-APP-1) e `Exibir → Idioma` (pt-BR/en/es,
 *   RF-APP-2) também são só eventos: a aplicação fica no renderer, que
 *   persiste em `prefs` e dispara `onPrefsChanged` para reconstruir isto.
 * - Os rótulos usam `t()` do i18n compartilhado: o bootstrap chama
 *   `setLocale()` antes do primeiro `rebuildMenu()`.
 */

import { app, type BrowserWindow, Menu, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { APP_URL } from '../shared/appInfo';
import { CHANNELS, MENU_ACTIONS } from '../shared/channels';
import { LANGS, t } from '../shared/i18n';
import { THEMES } from '../shared/themes';
import type { Lang } from '../shared/types';

/** Estado atual usado na reconstrução (tema/idioma escolhidos). */
export interface MenuState {
  theme: string;
  lang: Lang;
}

let state: MenuState = { theme: 'dark', lang: 'pt-BR' };
let windowOf: () => BrowserWindow | null = () => null;

/** Inicializa o estado atual e a janela alvo dos eventos do menu. */
export function initMenu(
  initial: MenuState,
  getWindow: () => BrowserWindow | null,
): void {
  state = { ...initial };
  windowOf = getWindow;
}

function send(channel: string, payload?: unknown): void {
  const win = windowOf();
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

/** Rebuild dos rótulos/estados no idioma e tema atuais. */
export function rebuildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: t('menu.file'),
      submenu: [
        {
          label: t('menu.openGcode'),
          click: () => send(CHANNELS.evAction, MENU_ACTIONS.openGcode),
        },
        { type: 'separator' },
        { label: t('menu.quit'), click: () => app.quit() },
      ],
    },
    {
      label: t('menu.view'),
      submenu: [
        {
          label: t('menu.theme'),
          submenu: THEMES.map((theme) => ({
            label: t(theme.labelKey),
            type: 'radio' as const,
            checked: theme.id === state.theme,
            click: () => send(CHANNELS.evTheme, theme.id),
          })),
        },
        {
          label: t('menu.language'),
          submenu: LANGS.map((lang) => ({
            label: t(`lang.${lang}`),
            type: 'radio' as const,
            checked: lang === state.lang,
            click: () => send(CHANNELS.evLang, lang),
          })),
        },
        { type: 'separator' },
        {
          label: t('menu.appearance'),
          click: () => send(CHANNELS.evAction, MENU_ACTIONS.appearance),
        },
      ],
    },
    {
      label: t('menu.help'),
      submenu: [
        {
          label: t('menu.site'),
          click: () => void shell.openExternal(APP_URL),
        },
        {
          label: t('menu.logs'),
          click: () => send(CHANNELS.evAction, MENU_ACTIONS.openLogs),
        },
        { type: 'separator' },
        {
          label: t('menu.about'),
          click: () => send(CHANNELS.evAbout),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
