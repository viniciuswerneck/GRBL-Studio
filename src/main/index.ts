/**
 * Bootstrap do processo main do Electron.
 */

import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'node:path';
import { detectLocale, getLocale, setLocale } from '../shared/i18n';
import { DEFAULT_THEME, isThemeId } from '../shared/themes';
import { registerIpc } from './ipc';
import { initMenu, rebuildMenu } from './menu';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let dispose: (() => Promise<void>) | null = null;
let splashShown = false;

/** Arte de splash (public/splash.png, 984×535) exibida a 75 % em 738×401. */
const SPLASH = { width: 738, height: 401 };
/** Ícone do app/janela (electron-builder também lê `build/icon.png`). */
const APP_ICON = path.join(__dirname, '../../build/icon.png');

/**
 * Splash de abertura: janela frameless com a arte, fechada assim que a janela
 * principal está pronta. Fica de fora de smoke test e E2E (`firstWindow`).
 */
function createSplash(): void {
  if (process.env.GRBL_SMOKE_TEST === '1' || process.env.GRBL_E2E === '1')
    return;
  if (splashShown) return;
  splashShown = true;

  splashWindow = new BrowserWindow({
    width: SPLASH.width,
    height: SPLASH.height,
    useContentSize: true,
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    center: true,
    show: true,
    backgroundColor: '#0d3f75',
    icon: APP_ICON,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  splashWindow.setMenuBarVisibility(false);
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
  void splashWindow
    .loadFile(path.join(__dirname, '../../public/splash.html'))
    .catch(() => {
      /* Sem splash: a janela principal abre do mesmo jeito. */
    });

  // Nunca deixa o splash preso se o renderer principal falhar.
  setTimeout(() => closeSplash(), 10_000);
}

function closeSplash(): void {
  if (!splashWindow) return;
  const win = splashWindow;
  splashWindow = null;
  if (!win.isDestroyed()) win.destroy();
}

/** Lê prefs e monta o menu no idioma/tema certos (RF-APP-1/2/7). */
function syncMenu(theme: string, lang = getLocale()): void {
  initMenu(
    { theme: isThemeId(theme) ? theme : DEFAULT_THEME, lang },
    () => mainWindow,
  );
  rebuildMenu();
}

function createWindow(): void {
  createSplash();
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#202020',
    title: 'GRBL Studio',
    icon: APP_ICON,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    closeSplash();
    mainWindow?.show();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Defesa em profundidade: o app nunca navega nem abre janelas pelo renderer
  // (links externos só via `app:open-external`, com whitelist no main).
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

  void mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

  installSmokeTest(mainWindow);
}

/**
 * Modo smoke test (CI/headless): `GRBL_SMOKE_TEST=1`.
 * Sai com código 0 se o renderer carregar sem erros; 1 caso contrário.
 */
function installSmokeTest(win: BrowserWindow): void {
  if (process.env.GRBL_SMOKE_TEST !== '1') return;

  let failed = false;
  const fail = (reason: string): void => {
    if (failed) return;
    failed = true;
    console.error('SMOKE_FAIL:', reason);
    app.exit(1);
  };

  win.webContents.on('console-message', (...args: unknown[]) => {
    const details = args[1] as
      | { level?: string; message?: string }
      | number
      | undefined;
    const level =
      typeof args[1] === 'number'
        ? args[1]
        : details && typeof details === 'object'
          ? details.level
          : undefined;
    const message =
      typeof args[2] === 'string'
        ? args[2]
        : details && typeof details === 'object'
          ? details.message
          : '';
    if (level === 'error' || level === 3)
      console.error('RENDERER_ERROR:', message);
  });

  win.webContents.once('did-fail-load', (_e, code, desc) =>
    fail(`did-fail-load ${code} ${desc}`),
  );
  win.webContents.once('render-process-gone', (_e, d) =>
    fail(`render-process-gone ${d.reason}`),
  );
  win.webContents.once('did-finish-load', () => {
    const done = (): void => {
      console.log('SMOKE_OK');
      setTimeout(() => app.exit(0), 500);
    };

    // SMOKE_EVAL: expressão JS avaliada no renderer (probes de verificação).
    const expr = process.env.SMOKE_EVAL;
    if (!expr) {
      done();
      return;
    }
    win.webContents
      .executeJavaScript(expr, true)
      .then((result) => {
        console.log('SMOKE_EVAL_RESULT:', JSON.stringify(result));
        done();
      })
      .catch((err: unknown) => fail(`SMOKE_EVAL: ${String(err)}`));
  });
  setTimeout(() => fail('timeout carregando o renderer'), 15000);
}

app.whenReady().then(async () => {
  const { client, prefs, log } = registerIpc(() => mainWindow, {
    // Prefs mudaram (tema/idioma escolhidos na UI): reflete no menu.
    onPrefsChanged: (stored) => syncMenu(stored.theme ?? DEFAULT_THEME),
  });

  // Idioma padrão = preferência persistida ou o do sistema (RF-APP-2).
  const stored = await prefs.read();
  setLocale(stored.lang ?? detectLocale(app.getLocale()));
  syncMenu(stored.theme ?? DEFAULT_THEME);

  dispose = async () => {
    client.disconnect();
    await log.close();
  };
  createWindow();

  // Auto-update silencioso: só em produção (não em dev/smoke/E2E). Verifica no
  // GitHub Releases; baixa em segundo plano e avisa ao usuário para reiniciar.
  if (
    process.env.GRBL_SMOKE_TEST !== '1' &&
    process.env.GRBL_E2E !== '1' &&
    !process.env.VITE_DEV_SERVER_URL
  ) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      /* sem rede / sem release: silencioso */
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async (event) => {
  if (!dispose) return;
  event.preventDefault();
  const run = dispose;
  dispose = null;
  try {
    await run();
  } finally {
    app.quit();
  }
});
