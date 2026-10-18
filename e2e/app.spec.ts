import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

/** API global exposta pelo bundle `public/i18n.js` (GRBL_I18N). */
interface I18nApi {
  t: (key: string) => string;
  setLocale: (lang: string) => boolean;
}

const APP_ROOT = path.join(__dirname, '..');

/**
 * Sobe o app Electron real e devolve a janela principal. Usa um `userData`
 * temporário para não tocar nas preferências do ambiente.
 */
async function launchApp() {
  const userData = mkdtempSync(path.join(tmpdir(), 'grbl-e2e-'));
  const app = await electron.launch({
    args: [APP_ROOT, `--user-data-dir=${userData}`, '--no-sandbox'],
    // Sem splash: `firstWindow()` precisa ser a janela principal.
    env: { ...process.env, GRBL_E2E: '1' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  const close = async (): Promise<void> => {
    await app.close();
    rmSync(userData, { recursive: true, force: true });
  };
  return { app, page, close };
}

test.describe('GRBL Studio — fluxo da UI', () => {
  test('abre a janela e mostra os controles essenciais do console', async () => {
    const { page, close } = await launchApp();
    try {
      await expect(page.locator('.brand h1')).toHaveText('GRBL Studio');
      await expect(page.locator('#consoleSave')).toBeVisible();
      await expect(page.locator('#consolePause')).toBeVisible();
      await expect(page.locator('#consoleClear')).toBeVisible();
      // O botão de conexão começa em "Conectar" (desconectado por padrão).
      await expect(page.locator('#connectBtn')).toBeEnabled();
    } finally {
      await close();
    }
  });

  test('abre Aparência e idioma pelo menu (Exibir → Aparência e idioma…)', async () => {
    const { app, page, close } = await launchApp();
    try {
      // O botão "◐" saiu da barra: o modal agora é aberto pelo menu nativo,
      // que envia `evAction('appearance')` para o renderer.
      await expect(page.locator('#themeBtn')).toHaveCount(0);
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'appearance',
        );
      });
      const overlay = page.locator('#appearanceOverlay');
      await expect(overlay).toBeVisible();
      // Há 11 temas e 3 idiomas no catálogo.
      await expect(page.locator('#themeGroups button')).toHaveCount(11);
      await expect(page.locator('#langRow button')).toHaveCount(3);
    } finally {
      await close();
    }
  });

  test('i18n traduz em tempo de execução (pt-BR → en)', async () => {
    const { page, close } = await launchApp();
    try {
      const initial = await page.evaluate(() =>
        (window as unknown as { GRBL_I18N: I18nApi }).GRBL_I18N.t(
          'console.clear',
        ),
      );
      expect(initial).toBe('Limpar');

      const applied = await page.evaluate(() => {
        const i18n = (window as unknown as { GRBL_I18N: I18nApi }).GRBL_I18N;
        const ok = i18n.setLocale('en');
        return { ok, value: i18n.t('console.clear') };
      });
      expect(applied.ok).toBe(true);
      expect(applied.value).toBe('Clear');
    } finally {
      await close();
    }
  });

  test('pausar rolagem alterna o rótulo do botão do console', async () => {
    const { page, close } = await launchApp();
    try {
      const button = page.locator('#consolePause');
      await button.click();
      await expect(button).toHaveClass(/active/);
      await button.click();
      await expect(button).not.toHaveClass(/active/);
    } finally {
      await close();
    }
  });

  test('gera um QR Code (Ferramentas → QR Code…) e abre o posicionamento', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'qr-code',
        );
      });
      await expect(page.locator('#qrOverlay')).toBeVisible();
      await page.fill('#qrContent', 'https://lab.werneck.dev.br');
      await page.click('#qrGenerate');
      // O status resume o símbolo gerado (versão, módulos e dimensões).
      await expect(page.locator('#qrStatus')).toContainText('QR gerado');
      await expect(page.locator('#qrStatus')).not.toContainText('⚠');
      // O job virtual virou o programa atual e o posicionamento abriu.
      await expect(page.locator('#frameOverlay')).toBeVisible();
    } finally {
      await close();
    }
  });

  test('gera um EAN-13 (Ferramentas → Código de barras…) e abre o posicionamento', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'bar-code',
        );
      });
      await expect(page.locator('#barcodeOverlay')).toBeVisible();
      await page.selectOption('#barSymbology', 'ean13');
      // Trocar de simbologia aplica os padrões da norma (quiet zone 11, etc.).
      await expect(page.locator('#barQuiet')).toHaveValue('11');
      await page.fill('#barContent', '590123412345');
      await page.click('#barGenerate');
      // O status traz a simbologia, os módulos e o dígito verificador.
      await expect(page.locator('#barStatus')).toContainText('EAN-13 gerado');
      await expect(page.locator('#barStatus')).toContainText('95 módulos');
      await expect(page.locator('#barStatus')).not.toContainText('⚠');
      await expect(page.locator('#frameOverlay')).toBeVisible();
    } finally {
      await close();
    }
  });

  test('razão e verificação mod 43 só aparecem no Code 39', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'bar-code',
        );
      });
      await expect(page.locator('#barcodeOverlay')).toBeVisible();
      await expect(page.locator('#barRatioField')).toBeHidden();
      await page.selectOption('#barSymbology', 'code39');
      await expect(page.locator('#barRatioField')).toBeVisible();
      await expect(page.locator('#barChecksumField')).toBeVisible();
      await page.fill('#barContent', 'grbl-studio');
      await page.click('#barGenerate');
      // Code 39 é unissex: o HRI sai em maiúsculas.
      await expect(page.locator('#barStatus')).toContainText('Code 39 gerado');
      await expect(page.locator('#barStatus')).not.toContainText('⚠');
    } finally {
      await close();
    }
  });
});
