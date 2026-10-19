import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
async function launchApp(options: { onboarding?: boolean } = {}) {
  const userData = mkdtempSync(path.join(tmpdir(), 'grbl-e2e-'));
  // O tour de boas-vindas (P0.4) só aparece na primeira execução; nos testes
  // ele é dispensado — exceto no teste próprio do tour (`onboarding: true`).
  if (options.onboarding !== true) {
    writeFileSync(
      path.join(userData, 'prefs.json'),
      JSON.stringify({ onboarding: 1 }),
      'utf8',
    );
  }
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

  test('primeira execução mostra o tour de 5 passos (P0.4)', async () => {
    const { app, page, close } = await launchApp({ onboarding: true });
    try {
      await expect(page.locator('#tourOverlay')).toBeVisible();
      await expect(page.locator('#tourStepLabel')).toContainText(
        'Passo 1 de 5',
      );
      await expect(page.locator('.tour-slide[data-step="1"]')).toBeVisible();
      for (let i = 0; i < 4; i++) await page.click('#tourNext');
      await expect(page.locator('#tourStepLabel')).toContainText(
        'Passo 5 de 5',
      );
      await expect(page.locator('#tourNext')).toHaveText('Concluir');
      await page.click('#tourNext');
      await expect(page.locator('#tourOverlay')).toBeHidden();
      // Dá para reabrir pelo menu Ajuda → Tour de boas-vindas.
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'tour',
        );
      });
      await expect(page.locator('#tourOverlay')).toBeVisible();
      await page.click('#tourSkip');
      await expect(page.locator('#tourOverlay')).toBeHidden();
    } finally {
      await close();
    }
  });

  test('o tour não volta depois de concluído (onboarding nas prefs)', async () => {
    const userData = mkdtempSync(path.join(tmpdir(), 'grbl-e2e-tour-'));
    const launch = () =>
      electron.launch({
        args: [APP_ROOT, `--user-data-dir=${userData}`, '--no-sandbox'],
        env: { ...process.env, GRBL_E2E: '1' },
      });
    try {
      let app = await launch();
      let page = await app.firstWindow();
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#tourOverlay')).toBeVisible();
      await page.click('#tourSkip');
      await expect(page.locator('#tourOverlay')).toBeHidden();
      await app.close();

      app = await launch();
      page = await app.firstWindow();
      await page.waitForLoadState('domcontentloaded');
      // A janela está pronta e o tour não voltou.
      await expect(page.locator('.brand h1')).toHaveText('GRBL Studio');
      await expect(page.locator('#tourOverlay')).toBeHidden();
      await app.close();
    } finally {
      rmSync(userData, { recursive: true, force: true });
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

  test('gera um ITF-14 (13 dígitos) e mostra o verificador no status', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'bar-code',
        );
      });
      await expect(page.locator('#barcodeOverlay')).toBeVisible();
      await page.selectOption('#barSymbology', 'itf14');
      await expect(page.locator('#barSymHint')).toBeVisible();
      // ITF-14: quiet zone de 10 módulos e X-dimension mínimo de 0,5 mm.
      await expect(page.locator('#barQuiet')).toHaveValue('10');
      await page.fill('#barContent', '0950110153000');
      await page.click('#barGenerate');
      await expect(page.locator('#barStatus')).toContainText('ITF-14 gerado');
      await expect(page.locator('#barStatus')).toContainText('135 módulos');
      await expect(page.locator('#barStatus')).not.toContainText('⚠');
      await expect(page.locator('#frameOverlay')).toBeVisible();
    } finally {
      await close();
    }
  });

  test('gera um Data Matrix pelo modal 2D (Ferramentas → Código 2D…)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'qr-code',
        );
      });
      await expect(page.locator('#qrOverlay')).toBeVisible();
      await expect(page.locator('#qrEccField')).toBeVisible();
      await expect(page.locator('#dmSizeField')).toBeHidden();
      await page.selectOption('#qrSymbology', 'datamatrix');
      // Campos exclusivos do QR somem; o tamanho do Data Matrix aparece.
      await expect(page.locator('#qrEccField')).toBeHidden();
      await expect(page.locator('#qrVersionField')).toBeHidden();
      await expect(page.locator('#dmSizeField')).toBeVisible();
      await page.fill('#qrContent', 'GRBL Studio - Data Matrix');
      await page.fill('#qrWidth', '20');
      await page.click('#qrGenerate');
      await expect(page.locator('#qrStatus')).toContainText(
        'Data Matrix gerado',
      );
      await expect(page.locator('#qrStatus')).not.toContainText('⚠');
      await expect(page.locator('#frameOverlay')).toBeVisible();
    } finally {
      await close();
    }
  });

  test('restaura os últimos ajustes dos símbolos ao reabrir o app', async () => {
    // `Prefs.symbols` (RF-CFG-5): mesmo userData, duas execuções.
    const userData = mkdtempSync(path.join(tmpdir(), 'grbl-e2e-prefs-'));
    // Sem tour: este teste olha só `Prefs.symbols`.
    writeFileSync(
      path.join(userData, 'prefs.json'),
      JSON.stringify({ onboarding: 1 }),
      'utf8',
    );
    const launch = () =>
      electron.launch({
        args: [APP_ROOT, `--user-data-dir=${userData}`, '--no-sandbox'],
        env: { ...process.env, GRBL_E2E: '1' },
      });
    try {
      let app = await launch();
      let page = await app.firstWindow();
      await page.waitForLoadState('domcontentloaded');
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'qr-code',
        );
      });
      await expect(page.locator('#qrOverlay')).toBeVisible();
      await page.selectOption('#qrSymbology', 'datamatrix');
      await page.fill('#qrContent', 'persistir');
      await page.fill('#qrWidth', '25');
      await page.click('#qrGenerate');
      await expect(page.locator('#qrStatus')).toContainText(
        'Data Matrix gerado',
      );
      await app.close();

      app = await launch();
      page = await app.firstWindow();
      await page.waitForLoadState('domcontentloaded');
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'qr-code',
        );
      });
      await expect(page.locator('#qrOverlay')).toBeVisible();
      // Símbolo, tamanho em mm e o campo de tamanho do DM voltam como estavam.
      await expect(page.locator('#qrSymbology')).toHaveValue('datamatrix');
      await expect(page.locator('#qrWidth')).toHaveValue('25');
      await expect(page.locator('#dmSizeField')).toBeVisible();
      await app.close();
    } finally {
      rmSync(userData, { recursive: true, force: true });
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
      // Code 39 é unissex: mudar o dado em silêncio não é opção — o status
      // avisa que o conteúdo virou maiúsculas.
      await expect(page.locator('#barStatus')).toContainText('Code 39 gerado');
      await expect(page.locator('#barStatus')).toContainText('⚠');
      await expect(page.locator('#barStatus')).toContainText('maiúsculas');
      // Já em maiúsculas, nada mudou: sem aviso.
      await page.click('#frameClose'); // o gerar abre o posicionamento
      await expect(page.locator('#barcodeOverlay')).toBeVisible();
      await page.fill('#barContent', 'GRBL-STUDIO');
      await page.click('#barGenerate');
      await expect(page.locator('#barStatus')).not.toContainText('⚠');
    } finally {
      await close();
    }
  });

  test('o editor vetorial carrega sob demanda (RNF-11)', async () => {
    const { app, page, close } = await launchApp();
    try {
      // Fora do caminho do primeiro paint: o bundle do editor não está no DOM
      // nem executado antes de abrir Ferramentas → Desenho.
      expect(
        await page.evaluate(
          () =>
            typeof (window as unknown as Record<string, unknown>)
              .GRBL_DESIGN_EDITOR,
        ),
      ).toBe('undefined');
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            typeof (window as unknown as Record<string, unknown>)
              .GRBL_DESIGN_EDITOR,
        ),
      ).toBe('object');
      await expect(page.locator('#designCanvas')).toBeVisible();
    } finally {
      await close();
    }
  });
});
