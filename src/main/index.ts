/**
 * Bootstrap do processo main do Electron.
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import { detectLocale, getLocale, setLocale } from '../shared/i18n';
import { DEFAULT_THEME, isThemeId } from '../shared/themes';
import { registerIpc } from './ipc';
import { initMenu, rebuildMenu } from './menu';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let splashTimer: ReturnType<typeof setTimeout> | null = null;
let dispose: (() => Promise<void>) | null = null;
let splashShown = false;

/**
 * Arte de splash (public/splash.png, 984×437) exibida a 75 % em 738×328.
 * A janela tem **a proporção da imagem** (`scripts/gen-assets.py`).
 */
const SPLASH = { width: 738, height: 328 };
/** Só mostra o splash se a janela principal ainda não estiver pronta. */
const SPLASH_DELAY_MS = 400;
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
    if (splashTimer) clearTimeout(splashTimer);
    splashTimer = null;
    closeSplash();
    mainWindow?.show();
  });
  mainWindow.on('closed', () => {
    if (splashTimer) clearTimeout(splashTimer);
    splashTimer = null;
    mainWindow = null;
  });

  // Defesa em profundidade: o app nunca navega nem abre janelas pelo renderer
  // (links externos só via `app:open-external`, com whitelist no main).
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

  // O load começa antes de qualquer janela auxiliar: criar o splash custa
  // ~85 ms neste hardware (uma `BrowserWindow` a mais, com renderer próprio) e
  // atrasava o início do load. O splash entra só se a janela demorar de fato a
  // ficar pronta (RNF-11) — em máquina rápida ele nem chega a aparecer.
  void mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

  if (process.env.GRBL_SMOKE_TEST !== '1' && process.env.GRBL_E2E !== '1') {
    splashTimer = setTimeout(() => {
      splashTimer = null;
      if (mainWindow && !mainWindow.isVisible()) createSplash();
    }, SPLASH_DELAY_MS);
  }

  installSmokeTest(mainWindow);
  installBench(mainWindow);
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

/**
 * Modo benchmark (RNF-11/RNF-12): `GRBL_BENCH=1`.
 *
 * O `scripts/bench.mjs` liga esta flag para saber quando a janela está
 * realmente pronta e para medir a latência de ida e volta main → renderer →
 * IPC sem instrumentar a UI. Fora do modo benchmark nada é registrado, nenhum
 * timer extra roda e o comportamento do app não muda.
 */
function installBench(win: BrowserWindow): void {
  if (process.env.GRBL_BENCH !== '1') return;

  const emit = (event: string, payload: Record<string, unknown>): void => {
    console.log(`BENCH_${event} ${JSON.stringify(payload)}`);
  };

  // O script encerra a amostragem com SIGTERM; sai de forma limpa (dispose).
  process.once('SIGTERM', () => app.quit());

  const installedAt = Math.round(process.uptime() * 1000);
  let loadedAt = installedAt;
  let shownAt = installedAt;
  const loaded = new Promise<void>((resolve) => {
    win.webContents.once('did-finish-load', () => {
      loadedAt = Math.round(process.uptime() * 1000);
      resolve();
    });
  });
  const shown = new Promise<void>((resolve) => {
    if (win.isVisible()) {
      shownAt = Math.round(process.uptime() * 1000);
      resolve();
    } else {
      win.once('ready-to-show', () => {
        shownAt = Math.round(process.uptime() * 1000);
        resolve();
      });
    }
  });

  void (async () => {
    try {
      await Promise.all([loaded, shown]);
      // Espera dois frames: did-finish-load não garante o primeiro paint.
      await win.webContents.executeJavaScript(
        'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))',
        true,
      );
      const paintAt = Math.round(process.uptime() * 1000);
      emit('READY', {
        pid: process.pid,
        uptimeMs: paintAt,
        timings: {
          hookInstalledMs: installedAt,
          didFinishLoadMs: loadedAt,
          readyToShowMs: shownAt,
          firstPaintMs: paintAt,
        },
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
        appVersion: app.getVersion(),
        userData: app.getPath('userData'),
      });

      // Latência de interação: round trip main → renderer → handler IPC leve.
      // O app fica 250 ms ocioso antes para o primeiro paint terminar.
      await new Promise((resolve) => setTimeout(resolve, 250));
      for (let i = 0; i < 5; i += 1) {
        await win.webContents.executeJavaScript(
          'window.grbl.getAppInfo()',
          true,
        );
      }

      const samples: number[] = [];
      for (let i = 0; i < 50; i += 1) {
        const started = performance.now();
        await win.webContents.executeJavaScript(
          'window.grbl.getAppInfo()',
          true,
        );
        samples.push(performance.now() - started);
      }
      samples.sort((a, b) => a - b);
      const at = (p: number): number => {
        const index = Math.min(
          samples.length - 1,
          Math.max(0, Math.ceil(p * samples.length) - 1),
        );
        return samples[index] ?? 0;
      };
      const mean =
        samples.reduce((sum, value) => sum + value, 0) / samples.length;
      emit('LATENCY', {
        samples: samples.length,
        minMs: Number((samples[0] ?? 0).toFixed(2)),
        p50Ms: Number(at(0.5).toFixed(2)),
        p95Ms: Number(at(0.95).toFixed(2)),
        maxMs: Number((samples[samples.length - 1] ?? 0).toFixed(2)),
        meanMs: Number(mean.toFixed(2)),
      });
    } catch (err) {
      emit('ERROR', { message: String(err) });
    }
  })();
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
    process.env.GRBL_BENCH !== '1' &&
    !process.env.VITE_DEV_SERVER_URL
  ) {
    // `electron-updater` custa ~110 ms de require com cache quente (árvore do
    // builder-util): carrega só aqui, depois da janela criada, fora do caminho
    // do 1º frame.
    void import('electron-updater')
      .then(({ autoUpdater }) => {
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        return autoUpdater.checkForUpdatesAndNotify();
      })
      .catch(() => {
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
