/**
 * Bootstrap do processo main do Electron.
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import { registerIpc } from './ipc';

let mainWindow: BrowserWindow | null = null;
let dispose: (() => Promise<void>) | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#202020',
    title: 'GRBL Studio',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

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
    const details = args[1] as { level?: string; message?: string } | number | undefined;
    const level = typeof args[1] === 'number' ? args[1] : details && typeof details === 'object' ? details.level : undefined;
    const message =
      typeof args[2] === 'string' ? args[2] : details && typeof details === 'object' ? details.message : '';
    if (level === 'error' || level === 3) console.error('RENDERER_ERROR:', message);
  });

  win.webContents.once('did-fail-load', (_e, code, desc) => fail(`did-fail-load ${code} ${desc}`));
  win.webContents.once('render-process-gone', (_e, d) => fail(`render-process-gone ${d.reason}`));
  win.webContents.once('did-finish-load', () => {
    console.log('SMOKE_OK');
    setTimeout(() => app.exit(0), 500);
  });
  setTimeout(() => fail('timeout carregando o renderer'), 15000);
}

app.whenReady().then(() => {
  const { client } = registerIpc(() => mainWindow);
  dispose = () => client.disconnect();
  createWindow();

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
