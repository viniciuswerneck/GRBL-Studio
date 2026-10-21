import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { deflateSync } from 'node:zlib';
import {
  _electron as electron,
  expect,
  type Page,
  test,
} from '@playwright/test';

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
async function launchApp(
  options: { onboarding?: boolean; prefs?: Record<string, unknown> } = {},
) {
  const userData = mkdtempSync(path.join(tmpdir(), 'grbl-e2e-'));
  // O tour de boas-vindas (P0.4) só aparece na primeira execução; nos testes
  // ele é dispensado — exceto no teste próprio do tour (`onboarding: true`).
  if (options.onboarding !== true) {
    writeFileSync(
      path.join(userData, 'prefs.json'),
      JSON.stringify({ onboarding: 1, ...(options.prefs ?? {}) }),
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

  test('gera um PDF417 pelo modal 2D (RF-SYM-7)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'qr-code',
        );
      });
      await expect(page.locator('#qrOverlay')).toBeVisible();
      await expect(page.locator('#qrPdfEccField')).toBeHidden();
      await page.selectOption('#qrSymbology', 'pdf417');
      // Campos do QR/Data Matrix somem; os do PDF417 aparecem.
      await expect(page.locator('#qrEccField')).toBeHidden();
      await expect(page.locator('#qrVersionField')).toBeHidden();
      await expect(page.locator('#dmSizeField')).toBeHidden();
      await expect(page.locator('#qrSizeField')).toBeHidden();
      await expect(page.locator('#qrPdfEccField')).toBeVisible();
      await expect(page.locator('#qrPdfColsField')).toBeVisible();
      await expect(page.locator('#qrPdfRowHeightField')).toBeVisible();
      await page.fill('#qrContent', 'GRBL-STUDIO-0001');
      await page.selectOption('#qrPdfEcc', '4');
      await page.click('#qrGenerate');
      await expect(page.locator('#qrStatus')).toContainText('PDF417 gerado');
      await expect(page.locator('#qrStatus')).toContainText('EC nível 4');
      await expect(page.locator('#qrStatus')).not.toContainText('⚠');
      await expect(page.locator('#frameOverlay')).toBeVisible();
    } finally {
      await close();
    }
  });

  test('gera um Aztec pelo modal 2D (RF-SYM-7)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'qr-code',
        );
      });
      await expect(page.locator('#qrOverlay')).toBeVisible();
      await expect(page.locator('#qrAztecEccField')).toBeHidden();
      await page.selectOption('#qrSymbology', 'aztec');
      // Campos do QR/Data Matrix/PDF417 somem; o do Aztec aparece.
      await expect(page.locator('#qrEccField')).toBeHidden();
      await expect(page.locator('#qrVersionField')).toBeHidden();
      await expect(page.locator('#dmSizeField')).toBeHidden();
      await expect(page.locator('#qrSizeField')).toBeVisible();
      await expect(page.locator('#qrPdfEccField')).toBeHidden();
      await expect(page.locator('#qrAztecEccField')).toBeVisible();
      await page.fill('#qrContent', 'GRBL-STUDIO-0001');
      await page.fill('#qrAztecEcc', '40');
      await page.click('#qrGenerate');
      await expect(page.locator('#qrStatus')).toContainText('Aztec gerado');
      await expect(page.locator('#qrStatus')).toContainText('camadas');
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

  test('gera uma grade de QR Codes a partir de uma lista (RF-SYM-9)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'qr-code',
        );
      });
      await expect(page.locator('#qrOverlay')).toBeVisible();
      // Os campos da grade só aparecem com a grade ligada.
      await expect(page.locator('#qrGridColsField')).toBeHidden();
      await expect(page.locator('#qrGridGapField')).toBeHidden();
      await page.check('#qrGrid');
      await expect(page.locator('#qrGridColsField')).toBeVisible();
      await expect(page.locator('#qrGridGapField')).toBeVisible();
      await page.fill('#qrContent', 'GRBL-001\nGRBL-002\nGRBL-003');
      await page.fill('#qrGridCols', '2');
      await page.fill('#qrGridGap', '6');
      await page.click('#qrGenerate');
      // 3 símbolos em 2 colunas → 2 linhas; o status resume a grade.
      await expect(page.locator('#qrStatus')).toContainText('Grade gerada');
      await expect(page.locator('#qrStatus')).toContainText('3 símbolo');
      await expect(page.locator('#qrStatus')).toContainText('2 × 2');
      await expect(page.locator('#frameOverlay')).toBeVisible();
    } finally {
      await close();
    }
  });

  test('gera uma grade de códigos de barras (RF-SYM-9)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'bar-code',
        );
      });
      await expect(page.locator('#barcodeOverlay')).toBeVisible();
      await expect(page.locator('#barGridColsField')).toBeHidden();
      await page.check('#barGrid');
      await expect(page.locator('#barGridColsField')).toBeVisible();
      await page.fill('#barContent', 'L1\nL2\nL3\nL4');
      await page.fill('#barGridCols', '2');
      await page.click('#barGenerate');
      await expect(page.locator('#barStatus')).toContainText('Grade gerada');
      await expect(page.locator('#barStatus')).toContainText('4 símbolo');
      await expect(page.locator('#barStatus')).toContainText('2 × 2');
      await expect(page.locator('#frameOverlay')).toBeVisible();
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

  test('símbolo como objeto: QR no desenho vira G-code (RF-SYM-8)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();

      // A ferramenta abre o painel só depois do clique na prancheta.
      await page.click('#designToolSymbol');
      await expect(page.locator('#designSymbolEditor')).toBeHidden();
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');
      await page.mouse.click(box.x + 180, box.y + 150);
      await expect(page.locator('#designSymbolEditor')).toBeVisible();
      await expect(page.locator('#designSymbolEccField')).toBeVisible();
      await expect(page.locator('#designSymbolSymField')).toBeHidden();

      await page.fill('#designSymbolValue', 'https://grbl.studio');
      await page.fill('#designSymbolSize', '25');
      await page.click('#designSymbolAdd');
      await expect(page.locator('#designSymbolEditor')).toBeHidden();
      await expect(page.locator('#designStatus')).toContainText('Símbolo');
      const rows = page.locator('#designObjectList .design-obj');
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText('Símbolo');

      // Duplo clique no objeto reedita o conteúdo **no lugar** (não duplica).
      // O ponto do símbolo é calculado pela escala real da vista (lida na
      // régua de coordenadas), não por pixels fixos.
      const readWorld = async (sx: number, sy: number) => {
        await page.mouse.move(sx, sy);
        const txt = (await page.locator('#designCursor').textContent()) ?? '';
        const nums = txt.match(/-?\d+(?:\.\d+)?/g) ?? [];
        return { x: Number(nums[0]), y: Number(nums[1]) };
      };
      const w0 = await readWorld(box.x + 180, box.y + 150);
      const w1 = await readWorld(box.x + 280, box.y + 150);
      const scale = 100 / (w1.x - w0.x);
      await page.click('#designToolSelect');
      await page.mouse.dblclick(
        box.x + 180 + 12.5 * scale,
        box.y + 150 + 12.5 * scale,
      );
      await expect(page.locator('#designSymbolEditor')).toBeVisible();
      await expect(page.locator('#designSymbolValue')).toHaveValue(
        'https://grbl.studio',
      );
      await expect(page.locator('#designSymbolAdd')).toContainText('Aplicar');
      await page.fill('#designSymbolValue', 'https://grbl.studio/v2');
      await page.click('#designSymbolAdd');
      await expect(page.locator('#designSymbolEditor')).toBeHidden();
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText('Símbolo 1');

      // A lista de objetos também abre a reedição (duplo clique na linha).
      await rows.first().dblclick();
      await expect(page.locator('#designSymbolEditor')).toBeVisible();
      await expect(page.locator('#designSymbolValue')).toHaveValue(
        'https://grbl.studio/v2',
      );
      await page.click('#designSymbolCancel');
      await expect(page.locator('#designSymbolEditor')).toBeHidden();

      // Código de barras: o painel troca os campos (simbologia/HRI, sem ECC).
      await page.click('#designToolSymbol');
      await page.mouse.click(box.x + 360, box.y + 320);
      await expect(page.locator('#designSymbolEditor')).toBeVisible();
      await page.selectOption('#designSymbolType', 'barcode');
      await expect(page.locator('#designSymbolSymField')).toBeVisible();
      await expect(page.locator('#designSymbolHriField')).toBeVisible();
      await expect(page.locator('#designSymbolEccField')).toBeHidden();
      await expect(page.locator('#designSymbolSizeLabel')).toContainText(
        'Largura',
      );
      await page.fill('#designSymbolValue', '590123412345');
      await page.selectOption('#designSymbolSymbology', 'ean13');
      await page.fill('#designSymbolSize', '50');
      await page.click('#designSymbolAdd');
      await expect(page.locator('#designSymbolEditor')).toBeHidden();
      await expect(rows).toHaveCount(2);

      // Data Matrix (2D quadrado, sem ECC de QR) também entra como objeto.
      await page.click('#designToolSymbol');
      await page.mouse.click(box.x + 520, box.y + 200);
      await expect(page.locator('#designSymbolEditor')).toBeVisible();
      await page.selectOption('#designSymbolType', 'datamatrix');
      await expect(page.locator('#designSymbolEccField')).toBeHidden();
      await expect(page.locator('#designSymbolSymField')).toBeHidden();
      await page.fill('#designSymbolValue', 'GRBL-STUDIO-DM');
      await page.fill('#designSymbolSize', '20');
      await page.click('#designSymbolAdd');
      await expect(page.locator('#designSymbolEditor')).toBeHidden();
      await expect(rows).toHaveCount(3);

      // O bloco entra no mesmo pipeline: gerar → tamanho da arte → posicionar.
      await page.click('#designGenerate');
      await expect(page.locator('#designSizeOverlay')).toBeVisible();
      await page.click('#designSizeConfirm');
      await expect(page.locator('#frameOverlay')).toBeVisible();
    } finally {
      await close();
    }
  });

  test('maximizar o editor de desenho ocupa a janela inteira', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      const modal = page.locator('#designOverlay .design-modal');
      const view = await page.evaluate(() => ({
        w: window.innerWidth,
        h: window.innerHeight,
      }));
      const before = await modal.boundingBox();
      if (!before) throw new Error('modal sem área');

      await page.click('#designMaximize');
      await expect(modal).toHaveClass(/maximized/);
      await expect(page.locator('#designOverlay')).toHaveClass(/design-max/);
      const after = await modal.boundingBox();
      if (!after) throw new Error('modal sem área');
      // Sem padding do overlay: encosta nas quatro bordas (nada cortado).
      expect(Math.round(after.x)).toBe(0);
      expect(Math.round(after.y)).toBe(0);
      expect(Math.round(after.width)).toBe(view.w);
      expect(Math.round(after.height)).toBe(view.h);
      expect(after.width).toBeGreaterThan(before.width);

      // A barra de status (embaixo) continua inteira dentro da janela.
      const status = await page.locator('.design-statusbar').boundingBox();
      if (!status) throw new Error('status sem área');
      expect(status.y + status.height).toBeLessThanOrEqual(view.h + 1);

      await expect(page.locator('#designMaximize')).toHaveAttribute(
        'title',
        'Restaurar',
      );
      await page.click('#designMaximize');
      await expect(modal).not.toHaveClass(/maximized/);
      await expect(page.locator('#designOverlay')).not.toHaveClass(
        /design-max/,
      );
      const back = await modal.boundingBox();
      expect(Math.round(back?.width ?? 0)).toBe(Math.round(before.width));
    } finally {
      await close();
    }
  });

  test('gabarito e texto em arco (Anexo B)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');

      // Retângulo de partida.
      await page.click('#designToolRect');
      await page.mouse.move(box.x + 180, box.y + 180);
      await page.mouse.down();
      await page.mouse.move(box.x + 320, box.y + 280);
      await page.mouse.up();

      // Gabarito em volta da peça.
      await page.click('#designJig');
      await expect(page.locator('#designJigOverlay')).toBeVisible();
      await page.click('#designJigInsert');
      await expect(page.locator('#designJigOverlay')).toHaveClass(/hidden/);
      await expect(page.locator('#designStatus')).toContainText('Gabarito 1');
      await expect(page.locator('#designObjCount')).toHaveText('2');
      await page.click('#designUndo');
      await expect(page.locator('#designObjCount')).toHaveText('1');

      // Texto em arco: raio pequeno demais avisa e não insere.
      await page.click('#designToolText');
      await page.mouse.click(box.x + 420, box.y + 320);
      await page.fill('#designTextValue', 'ARCO');
      await page.fill('#designTextSize', '20');
      await page.fill('#designTextArc', '5');
      await page.click('#designTextAdd');
      await expect(page.locator('#designStatus')).toContainText(
        'Aumente o raio',
      );
      await expect(page.locator('#designObjCount')).toHaveText('1');

      // Com raio suficiente, entra no desenho.
      await page.fill('#designTextArc', '120');
      await page.click('#designTextAdd');
      await expect(page.locator('#designTextEditor')).toBeHidden();
      await expect(page.locator('#designObjCount')).toHaveText('2');
      await expect(
        page.locator('#designObjectList .design-obj').first(),
      ).toContainText('Texto 1');
    } finally {
      await close();
    }
  });

  test('geradores: caixa com encaixe e engrenagem entram como um grupo (Anexo B)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      await page.click('#designGen');
      await expect(page.locator('#designGenOverlay')).toBeVisible();
      // Campos da caixa visíveis; os da engrenagem escondidos.
      await expect(page.locator('#genBoxFields')).toBeVisible();
      await expect(page.locator('#genGearFields')).toBeHidden();
      await expect(page.locator('#genSummary')).toContainText('6 peças');

      await page.click('#designGenInsert');
      await expect(page.locator('#designGenOverlay')).toHaveClass(/hidden/);
      await expect(page.locator('#designObjCount')).toHaveText('1');
      await expect(page.locator('#designStatus')).toContainText('Caixa 1');

      // Engrenagem com furo: um grupo só (contorno + furo).
      await page.click('#designGen');
      await page.click('#genModeGear');
      await expect(page.locator('#genGearFields')).toBeVisible();
      await expect(page.locator('#genBoxFields')).toBeHidden();
      await page.fill('#genTeeth', '24');
      await page.fill('#genBore', '6');
      await expect(page.locator('#genSummary')).toContainText('24 dentes');
      await page.click('#designGenInsert');
      await expect(page.locator('#designObjCount')).toHaveText('2');
      await expect(page.locator('#designStatus')).toContainText('Engrenagem 1');

      // Cada inserção é **um** passo de desfazer (a caixa inteira sai junta).
      await page.click('#designUndo');
      await expect(page.locator('#designObjCount')).toHaveText('1');
    } finally {
      await close();
    }
  });

  test('gravar dos dois lados: lado B espelhado com a mesma origem (Anexo B)', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'grbl-sides-'));
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ dialog }, target) => {
        dialog.showOpenDialog = (async () => ({
          canceled: false,
          filePaths: [target],
        })) as typeof dialog.showOpenDialog;
      }, dir);
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');
      await page.click('#designToolRect');
      await page.mouse.move(box.x + 150, box.y + 160);
      await page.mouse.down();
      await page.mouse.move(box.x + 300, box.y + 270);
      await page.mouse.up();

      await page.click('#designDouble');
      await expect(page.locator('#designDoubleOverlay')).toBeVisible();
      await expect(page.locator('#designDoubleMarks')).toBeChecked();
      await page.click('#designDoubleSave');
      await expect(page.locator('#designDoubleOverlay')).toHaveClass(/hidden/);

      const fileA = path.join(dir, 'peca-lado-a.gcode');
      const fileB = path.join(dir, 'peca-lado-b.gcode');
      await expect
        .poll(() => existsSync(fileA) && existsSync(fileB), {
          timeout: 10_000,
        })
        .toBe(true);

      const segs = (text: string) => {
        const out: Array<{
          a: { x: number; y: number };
          b: { x: number; y: number };
        }> = [];
        let prev: { x: number; y: number } | null = null;
        let armed = false;
        for (const line of text.split('\n')) {
          if (/^M[34]\b/.test(line)) {
            armed = true;
            continue;
          }
          if (line.startsWith('M5')) {
            armed = false;
            prev = null;
            continue;
          }
          const m = /^G([01]) X(-?[\d.]+) Y(-?[\d.]+)/.exec(line);
          if (!m) continue;
          const pt = { x: Number(m[2]), y: Number(m[3]) };
          if (m[1] === '0') {
            prev = pt;
            continue;
          }
          if (armed && prev) out.push({ a: prev, b: pt });
          prev = pt;
        }
        return out;
      };
      const sa = segs(readFileSync(fileA, 'utf8'));
      const sb = segs(readFileSync(fileB, 'utf8'));
      expect(sa.length).toBeGreaterThan(4);
      expect(sb).toHaveLength(sa.length);
      const width = Math.max(...sa.flatMap((x) => [x.a.x, x.b.x]));
      const near = (p: { x: number; y: number }, q: { x: number; y: number }) =>
        Math.abs(p.x - q.x) < 0.02 && Math.abs(p.y - q.y) < 0.02;
      const rest = sb.slice();
      for (const seg of sa) {
        const exp = {
          a: { x: width - seg.a.x, y: seg.a.y },
          b: { x: width - seg.b.x, y: seg.b.y },
        };
        const i = rest.findIndex(
          (r) =>
            (near(r.a, exp.a) && near(r.b, exp.b)) ||
            (near(r.a, exp.b) && near(r.b, exp.a)),
        );
        expect(i).toBeGreaterThanOrEqual(0);
        rest.splice(i, 1);
      }
      expect(rest).toEqual([]);
      // O documento continua intacto: só o retângulo.
      await expect(page.locator('#designObjCount')).toHaveText('1');
    } finally {
      await close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('marcas de registro: insere os fiduciais em volta da arte (Anexo B)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');
      await page.click('#designToolRect');
      await page.mouse.move(box.x + 140, box.y + 140);
      await page.mouse.down();
      await page.mouse.move(box.x + 300, box.y + 260);
      await page.mouse.up();
      await expect(page.locator('#designObjCount')).toHaveText('1');

      await page.click('#designFiducial');
      await expect(page.locator('#designFiducialOverlay')).toBeVisible();
      await page.selectOption('#designFiducialKind', 'corners');
      await page.fill('#designFiducialOffset', '6');
      await page.fill('#designFiducialSize', '10');
      await page.click('#designFiducialConfirm');
      await expect(page.locator('#designFiducialOverlay')).toHaveClass(
        /hidden/,
      );
      // As 4 marcas entram como **um** grupo (uma entidade na lista).
      await expect(page.locator('#designObjCount')).toHaveText('2');
      await expect(page.locator('#designStatus')).toContainText(
        'marcas de registro',
      );

      // As cruzes também entram (8 traços, mesmo grupo).
      await page.click('#designFiducial');
      await page.selectOption('#designFiducialKind', 'crosses');
      await page.click('#designFiducialConfirm');
      await expect(page.locator('#designObjCount')).toHaveText('3');
    } finally {
      await close();
    }
  });

  test('encaixe na chapa: distribui as peças na margem (P3.7)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');

      // Duas peças de tamanhos diferentes, em pontos distintos do desenho.
      await page.click('#designToolRect');
      for (const [x1, y1, x2, y2] of [
        [120, 120, 240, 200],
        [320, 260, 390, 320],
      ]) {
        await page.mouse.move(box.x + x1, box.y + y1);
        await page.mouse.down();
        await page.mouse.move(box.x + x2, box.y + y2);
        await page.mouse.up();
      }
      const rows = page.locator('#designObjectList .design-obj');
      await expect(rows).toHaveCount(2);

      // Encaixe com a chapa padrão de 100 × 100 mm, margem e folga.
      await page.keyboard.press('Control+a');
      await page.click('#designNest');
      await expect(page.locator('#designNestOverlay')).toBeVisible();
      await expect(page.locator('#designNestCount')).toContainText('2 peça');
      await page.fill('#designNestSheetW', '100');
      await page.fill('#designNestSheetH', '100');
      await page.fill('#designNestMargin', '5');
      await page.fill('#designNestGap', '2');
      await page.click('#designNestConfirm');
      await expect(page.locator('#designNestOverlay')).toBeHidden();
      await expect(page.locator('#designStatus')).toContainText('encaixada');
      await expect(page.locator('#designStatus')).toContainText(
        'aproveitamento',
      );

      // Uma peça fica exatamente no canto da margem (a maior, 5 × 5 mm).
      const xs: string[] = [];
      for (let i = 0; i < 2; i++) {
        await rows.nth(i).click();
        xs.push(await page.inputValue('#designPropX'));
      }
      expect(xs).toContain('5.0');

      // Chapa menor que qualquer peça: nada se move e o aviso aparece.
      // (Atalho J abre o encaixe com a seleção atual.)
      await page.keyboard.press('Control+a');
      await page.keyboard.press('j');
      await expect(page.locator('#designNestOverlay')).toBeVisible();
      await page.fill('#designNestSheetW', '6');
      await page.fill('#designNestSheetH', '6');
      await page.fill('#designNestMargin', '0');
      await page.click('#designNestConfirm');
      await expect(page.locator('#designStatus')).toContainText(
        'Nenhuma peça coube',
      );
      await expect(rows).toHaveCount(2);
    } finally {
      await close();
    }
  });

  test('folga de corte (kerf) por camada compensa o contorno', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'grbl-kerf-'));
    const plain = path.join(dir, 'sem-kerf.gcode');
    const kerfed = path.join(dir, 'com-kerf.gcode');
    const { app, page, close } = await launchApp();
    // Faixa percorrida (máx − mín) do G-code salvo: o kerf cresce o contorno.
    const extents = (text: string): { w: number; h: number } => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const line of text.split('\n')) {
        if (!line.startsWith('G1 ')) continue;
        const x = /X(-?\d+\.\d+)/.exec(line);
        const y = /Y(-?\d+\.\d+)/.exec(line);
        if (x) xs.push(Number(x[1]));
        if (y) ys.push(Number(y[1]));
      }
      return {
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      };
    };
    const waitFile = async (file: string): Promise<string> => {
      await expect.poll(() => existsSync(file), { timeout: 10_000 }).toBe(true);
      return readFileSync(file, 'utf8');
    };
    try {
      await app.evaluate(({ dialog }, target) => {
        dialog.showSaveDialog = (async () => ({
          canceled: false,
          filePath: target,
        })) as typeof dialog.showSaveDialog;
      }, plain);
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');
      await page.click('#designToolRect');
      await page.mouse.move(box.x + 140, box.y + 140);
      await page.mouse.down();
      await page.mouse.move(box.x + 300, box.y + 260);
      await page.mouse.up();
      await expect(page.locator('#designObjectList .design-obj')).toHaveCount(
        1,
      );

      // Referência: sem folga de corte.
      await page.click('#designSave');
      const before = extents(await waitFile(plain));
      expect(before.w).toBeGreaterThan(5);

      // Folga de 0,2 mm: o contorno externo cresce 0,1 mm de cada lado.
      await app.evaluate(({ dialog }, target) => {
        dialog.showSaveDialog = (async () => ({
          canceled: false,
          filePath: target,
        })) as typeof dialog.showSaveDialog;
      }, kerfed);
      await page.fill('#designLayerKerf', '0.2');
      await page.locator('#designLayerKerf').dispatchEvent('change');
      await expect(page.locator('#designLayerList')).toContainText('K 0.2');
      await page.click('#designSave');
      const text = await waitFile(kerfed);
      expect(text).toContain('; kerf 0.2 mm');
      // Sem coordenada negativa (a âncora usa a área compensada).
      expect(
        text
          .split('\n')
          .filter((l) => l.startsWith('G1 '))
          .join('\n'),
      ).not.toMatch(/[XY]-/);
      const after = extents(text);
      expect(after.w - before.w).toBeGreaterThan(0.15);
      expect(after.w - before.w).toBeLessThan(0.25);
      expect(after.h - before.h).toBeGreaterThan(0.15);
      expect(after.h - before.h).toBeLessThan(0.25);
    } finally {
      await close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('abas de retenção e sobre-corte por camada (Anexo B)', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'grbl-tabs-'));
    const tabbed = path.join(dir, 'com-abas.gcode');
    const leaded = path.join(dir, 'com-sobrecorte.gcode');
    const { app, page, close } = await launchApp();
    const waitFile = async (file: string): Promise<string> => {
      await expect.poll(() => existsSync(file), { timeout: 10_000 }).toBe(true);
      return readFileSync(file, 'utf8');
    };
    const point = (line: string): { x: number; y: number } => ({
      x: Number(/X(-?\d+\.\d+)/.exec(line)?.[1]),
      y: Number(/Y(-?\d+\.\d+)/.exec(line)?.[1]),
    });
    try {
      await app.evaluate(({ dialog }, target) => {
        dialog.showSaveDialog = (async () => ({
          canceled: false,
          filePath: target,
        })) as typeof dialog.showSaveDialog;
      }, tabbed);
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');
      await page.click('#designToolRect');
      await page.mouse.move(box.x + 140, box.y + 140);
      await page.mouse.down();
      await page.mouse.move(box.x + 320, box.y + 280);
      await page.mouse.up();
      await expect(page.locator('#designObjectList .design-obj')).toHaveCount(
        1,
      );

      // 4 abas de 2 mm: o laser desliga em cada uma (um M3/M4 por trecho).
      await page.click('.design-layer-adv > summary');
      await page.fill('#designLayerTabs', '4');
      await page.locator('#designLayerTabs').dispatchEvent('change');
      await page.fill('#designLayerTabWidth', '2');
      await page.locator('#designLayerTabWidth').dispatchEvent('change');
      await expect(page.locator('#designLayerList')).toContainText('A 4');
      await page.click('#designSave');
      const withTabs = await waitFile(tabbed);
      expect(withTabs).toContain('; abas 4 × 2 mm');
      expect(withTabs.match(/^M[34] S/gm)).toHaveLength(4);

      // Sobre-corte de 0,5 mm: o último G1 fica 0,5 mm depois da origem.
      await app.evaluate(({ dialog }, target) => {
        dialog.showSaveDialog = (async () => ({
          canceled: false,
          filePath: target,
        })) as typeof dialog.showSaveDialog;
      }, leaded);
      await page.fill('#designLayerTabs', '');
      await page.locator('#designLayerTabs').dispatchEvent('change');
      await page.fill('#designLayerLead', '0.5');
      await page.locator('#designLayerLead').dispatchEvent('change');
      await page.click('#designSave');
      const withLead = await waitFile(leaded);
      expect(withLead).toContain('; sobre-corte 0.5 mm');
      const lines = withLead.split('\n');
      const first = lines.find((l) => l.startsWith('G0 '));
      const last = lines.filter((l) => l.startsWith('G1 ')).pop();
      if (!first || !last) throw new Error('G-code sem movimentos');
      const a = point(first);
      const b = point(last);
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(0.5, 3);
    } finally {
      await close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('custo por peça no diálogo de tamanho (Anexo B)', async () => {
    const { app, page, close } = await launchApp({
      prefs: { costRate: 60, costMaterial: 100 },
    });
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');
      await page.click('#designToolRect');
      await page.mouse.move(box.x + 140, box.y + 140);
      await page.mouse.down();
      await page.mouse.move(box.x + 300, box.y + 260);
      await page.mouse.up();
      await page.click('#designGenerate');
      await expect(page.locator('#designSizeOverlay')).toBeVisible();
      // Tarifas vêm das preferências e o custo aparece formatado.
      await expect(page.locator('#designCostRate')).toHaveValue('60');
      await expect(page.locator('#designCostMaterial')).toHaveValue('100');
      await expect(page.locator('#designCostResult')).toContainText('R$');
      await expect(page.locator('#designCostResult')).toContainText('máquina');
      await expect(page.locator('#designCostResult')).toContainText('material');
      // Mudar a tarifa recalcula e persiste.
      await page.fill('#designCostRate', '120');
      await page.locator('#designCostRate').dispatchEvent('change');
      await expect
        .poll(async () => {
          const prefs = await page.evaluate(() => window.grbl.getPrefs());
          return prefs.costRate;
        })
        .toBe(120);
    } finally {
      await close();
    }
  });

  test('tiling: divide a arte maior que a mesa em arquivos com origem local (Anexo B)', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'grbl-tiles-'));
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ dialog }, target) => {
        dialog.showOpenDialog = (async () => ({
          canceled: false,
          filePaths: [target],
        })) as typeof dialog.showOpenDialog;
      }, dir);
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');
      await page.click('#designToolRect');
      await page.mouse.move(box.x + 140, box.y + 140);
      await page.mouse.down();
      await page.mouse.move(box.x + 280, box.y + 240);
      await page.mouse.up();

      // Arte de 300 × 110 mm: maior que a janela de 150 × 100.
      await page.click('#designGenerate');
      await expect(page.locator('#designSizeOverlay')).toBeVisible();
      await page.click('#designSizeLock'); // destrava a proporção
      await page.fill('#designSizeW', '300');
      await page.fill('#designSizeH', '110');
      await page.click('#designSizeConfirm');
      // O fluxo de geração abre o posicionamento; fecha e volta ao desenho.
      await expect(page.locator('#frameOverlay')).toBeVisible();
      await page.click('#frameClose');
      await expect(page.locator('#designOverlay')).toBeVisible();

      await page.click('#designTiles');
      await expect(page.locator('#designTilesOverlay')).toBeVisible();
      await page.fill('#designTileW', '150');
      await page.fill('#designTileH', '100');
      await page.fill('#designTileOverlap', '0');
      await page.locator('#designTileOverlap').dispatchEvent('change');
      await expect(page.locator('#designTilesSummary')).toContainText(
        '2 × 2 = 4 tiles',
      );
      // A prévia do plano é desenhada no canvas do diálogo.
      const painted = await page.evaluate(() => {
        const canvas = document.querySelector('#designTilesCanvas');
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let n = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
        return n;
      });
      expect(painted).toBeGreaterThan(1000);
      await page.click('#designTilesSave');

      const files = [
        'peca-r1c1.gcode',
        'peca-r1c2.gcode',
        'peca-r2c1.gcode',
        'peca-r2c2.gcode',
      ];
      await expect
        .poll(() => files.every((f) => existsSync(path.join(dir, f))), {
          timeout: 10_000,
        })
        .toBe(true);
      for (const [i, file] of files.entries()) {
        const text = readFileSync(path.join(dir, file), 'utf8');
        expect(text).toContain(
          `tile ${i < 2 ? 1 : 2}/2, coluna ${i % 2 === 0 ? 1 : 2}/2`,
        );
        const cuts = text
          .split('\n')
          .filter((l) => l.startsWith('G1 '))
          .map((l) => ({
            x: Number(/X(-?\d+\.\d+)/.exec(l)?.[1]),
            y: Number(/Y(-?\d+\.\d+)/.exec(l)?.[1]),
          }));
        expect(cuts.length).toBeGreaterThan(0);
        for (const p of cuts) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(150);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(100);
        }
      }
      // O diálogo fecha e o console registra o resultado.
      await expect(page.locator('#designTilesOverlay')).toHaveClass(/hidden/);
    } finally {
      await close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('salva e reabre o desenho (.gstudio) (RF-DSN-16)', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'grbl-doc-'));
    const file = path.join(dir, 'peca.gstudio');
    const { app, page, close } = await launchApp();
    try {
      // Diálogos nativos trocados por caminhos fixos (o teste não abre janela).
      await app.evaluate(({ dialog }, target) => {
        dialog.showSaveDialog = (async () => ({
          canceled: false,
          filePath: target,
        })) as typeof dialog.showSaveDialog;
        dialog.showOpenDialog = (async () => ({
          canceled: false,
          filePaths: [target],
        })) as typeof dialog.showOpenDialog;
      }, file);

      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();
      await expect(page.locator('#designDocName')).toHaveText('Sem título');

      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');
      await page.click('#designToolRect');
      await page.mouse.move(box.x + 120, box.y + 120);
      await page.mouse.down();
      await page.mouse.move(box.x + 220, box.y + 190);
      await page.mouse.up();
      const rows = page.locator('#designObjectList .design-obj');
      await expect(rows).toHaveCount(1);

      // Salva: o arquivo é JSON do GRBL Studio com a forma.
      await page.click('#designDocSave');
      await expect(page.locator('#designStatus')).toContainText(
        'Desenho salvo',
      );
      await expect(page.locator('#designDocName')).toHaveText('peca.gstudio');
      await expect(page.locator('#designDocName')).not.toHaveClass(/dirty/);
      const saved = JSON.parse(readFileSync(file, 'utf8')) as {
        kind: string;
        version: number;
        page: { w: number; h: number };
        shapes: unknown[];
        layers: unknown[];
      };
      expect(saved.kind).toBe('grbl-studio/design');
      expect(saved.version).toBe(1);
      expect(saved.page).toEqual({ w: 150, h: 130 });
      expect(saved.shapes).toHaveLength(1);
      expect(saved.layers).toHaveLength(1);

      // Mexer no desenho marca “não salvo”.
      await page.click('#designClear');
      await expect(rows).toHaveCount(0);
      await expect(page.locator('#designDocName')).toHaveClass(/dirty/);

      // Abrir pede confirmação (há mudanças não salvas) e restaura a peça.
      await page.click('#designDocOpen');
      await expect(page.locator('#designDocConfirm')).toBeVisible();
      await page.click('#designDocConfirmOk');
      await expect(page.locator('#designDocConfirm')).toBeHidden();
      await expect(page.locator('#designStatus')).toContainText(
        'Desenho aberto',
      );
      await expect(rows).toHaveCount(1);
      await expect(page.locator('#designDocName')).toHaveText('peca.gstudio');
      await expect(page.locator('#designDocName')).not.toHaveClass(/dirty/);

      // Atalho Ctrl+O também abre (sem alterações, não pergunta nada).
      await page.keyboard.press('Control+o');
      await expect(page.locator('#designDocConfirm')).toBeHidden();
      await expect(page.locator('#designStatus')).toContainText(
        'Desenho aberto',
      );
      await expect(rows).toHaveCount(1);
    } finally {
      await close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('camadas: cria, renomeia, reordena e move objetos (P2.2)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'design',
        );
      });
      await expect(page.locator('#designOverlay')).toBeVisible();

      const rows = page.locator('#designLayerList .design-layer');
      // Sempre existe ao menos uma camada (a padrão herda os globais).
      await expect(rows).toHaveCount(1);
      await expect(page.locator('#designLayerDelete')).toBeDisabled();

      // Parâmetros por camada (campo vazio herda; preenchido sobrescreve).
      await page.fill('#designLayerPower', '80');
      await page.locator('#designLayerPower').blur();
      await expect(rows.first()).toContainText('80%');

      // Nova camada nasce ativa e pode ser renomeada.
      await page.click('#designLayerAdd');
      await expect(rows).toHaveCount(2);
      await expect(rows.nth(1)).toHaveClass(/active/);
      await expect(page.locator('#designLayerDelete')).toBeEnabled();
      await page.fill('#designLayerName', 'Cortar');
      await page.locator('#designLayerName').blur();
      await expect(rows.nth(1)).toContainText('Cortar');

      // Reordenar: a camada ativa sobe para a primeira posição (executa antes).
      await page.click('#designLayerUp');
      await expect(rows.first()).toContainText('Cortar');

      // Desenhar na camada ativa: o objeto nasce nela (marca colorida).
      await page.click('#designToolRect');
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');
      await page.mouse.move(box.x + 120, box.y + 120);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y + 180);
      await page.mouse.up();
      await expect(page.locator('#designObjectList .design-obj')).toHaveCount(
        1,
      );
      const dot = page.locator('#designObjectList .design-obj-layer');
      await expect(dot).toHaveCount(1);
      await expect(dot).toHaveAttribute('title', 'Cortar');

      // A camada padrão é a segunda; selecioná-la e mover a seleção (o objeto
      // desenhado continua selecionado).
      await rows.nth(1).click();
      await page.click('#designLayerAssign');
      await expect(page.locator('#designStatus')).toContainText('Camada 2');
      await expect(
        page.locator('#designObjectList .design-obj-layer'),
      ).toHaveAttribute('title', 'Camada 2');

      // Excluir a camada não apaga objetos: eles voltam ao padrão global.
      await rows.first().click();
      await page.click('#designLayerDelete');
      await expect(rows).toHaveCount(1);
      await expect(page.locator('#designObjectList .design-obj')).toHaveCount(
        1,
      );
    } finally {
      await close();
    }
  });
});

/**
 * Emulador GRBL mínimo via TCP — o app fala `serial-over-TCP` (RF-CON-7), então
 * dá para exercitar o fluxo real (main → IPC → renderer) sem hardware.
 * Responde só o que o painel "Máquina" consome; qualquer outro comando leva
 * `ok`.
 */
function startGrblTcp(
  statusLine = '<Idle|MPos:1.500,2.250,0.000|FS:0,0>',
): Promise<{ port: number; close: () => void }> {
  const settings = [
    '$0=10',
    '$1=25',
    '$3=0',
    '$10=1',
    '$13=0',
    '$20=0',
    '$21=0',
    '$22=1',
    '$30=1000',
    '$31=0',
    '$32=1',
    '$33=5000',
    '$100=80.000',
    '$101=80.000',
    '$102=1600.000',
    '$110=10000.000',
    '$111=10000.000',
    '$112=500.000',
    '$120=200.000',
    '$121=200.000',
    '$122=200.000',
    '$130=400.000',
    '$131=400.000',
    '$132=45.000',
  ];
  const replies: Record<string, string> = {
    $I: '[VER:1.1h.20190825:]\r\n[OPT:V,15,128]\r\nok\r\n',
    $G: '[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]\r\nok\r\n',
    '$#':
      '[G54:0.000,0.000,0.000]\r\n[G55:1.000,2.000,3.000]\r\n' +
      '[G28:0.000,0.000,0.000]\r\n[G30:0.000,0.000,0.000]\r\n' +
      '[G92:0.000,0.000,0.000]\r\n[TLO:0.000]\r\n[PRB:0.000,0.000,0.000:0]\r\nok\r\n',
    $N: '$N0=G21\r\n$N1=G90\r\nok\r\n',
    $$: `${settings.join('\r\n')}\r\nok\r\n`,
  };
  const server = createServer((socket) => {
    let buffer = '';
    socket.write('Grbl 1.1h ["$" for help]\r\n');
    socket.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      // `?` é comando de tempo real: byte único, sem `\n`.
      for (const byte of text) {
        if (byte === '?') {
          socket.write(`${statusLine}\r\n`);
        }
      }
      buffer += text.replace(/\?/g, '');
      let index = buffer.indexOf('\n');
      while (index >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, '').trim();
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf('\n');
        if (!line) continue;
        socket.write(replies[line] ?? 'ok\r\n');
      }
    });
    socket.on('error', () => {});
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port;
      resolve({ port, close: () => server.close() });
    });
  });
}

test.describe('GRBL Studio — tema sem flash (RF-APP-1/DESIGN §8)', () => {
  test('o tema salvo é aplicado antes do primeiro paint', async () => {
    const { page, close } = await launchApp();
    try {
      // O `theme-boot.js` roda **antes** de qualquer script do app. A prova
      // é direta: bloqueando o script do app, o tema continua aplicado — logo
      // quem aplicou foi o boot (e não o app, que é assíncrono e causaria o
      // flash).
      await page.evaluate(() => localStorage.setItem('grbl-theme', 'light'));
      await page.route('**/renderer.js', (route) => route.abort());
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await page.unroute('**/renderer.js');
    } finally {
      await close();
    }
  });
});

test.describe('GRBL Studio — smart connect e import .lbdev (P2.5)', () => {
  test('sugere o perfil que casa com a máquina e pede consentimento', async () => {
    const emulator = await startGrblTcp();
    const { page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    try {
      await page.selectOption('#transportKind', 'tcp');
      await page.fill('#tcpHost', '127.0.0.1');
      await page.fill('#tcpPort', String(emulator.port));
      await page.click('#connectBtn');
      await expect(page.locator('#stateBadge')).toHaveText(/Ocioso|Idle/);

      // A sugestão aparece sozinha (a máquina tem curso 400×400).
      const chip = page.locator('#profileSuggestion');
      await expect(chip).toBeVisible();
      await expect(chip).toContainText('Sugestão');

      // Clicar na sugestão abre o consentimento (antes/depois) — RF-MAQ-9.
      await chip.click();
      await expect(page.locator('#profileOverlay')).toBeVisible();
      await expect(page.locator('#profileList')).toContainText('$130');
      await expect(page.locator('#profileList')).toContainText('→');

      // Cancelar não escreve nada.
      await page.click('#profileCancel');
      await expect(page.locator('#profileOverlay')).toBeHidden();
    } finally {
      await close();
      emulator.close();
    }
  });

  test('importa um perfil .lbdev do LightBurn', async () => {
    const { app, page, close } = await launchApp();
    const dir = mkdtempSync(path.join(tmpdir(), 'grbl-lbdev-'));
    const file = path.join(dir, 'meu-laser.lbdev');
    writeFileSync(
      file,
      JSON.stringify({
        DeviceList: [
          {
            DisplayName: 'Laser do teste',
            Name: 'GRBL',
            Type: 'Serial',
            Width: 508,
            Height: 390,
            HomeOnStartup: true,
            Settings: { S_Scale: 1000, BaudRate: 115200 },
          },
        ],
      }),
      'utf8',
    );
    try {
      await app.evaluate(({ dialog }, pathToFile) => {
        const d = dialog as unknown as Record<string, unknown>;
        d.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [pathToFile],
        });
      }, file);

      await page.click('#machineProfileImport');
      await expect(page.locator('#consoleOutput')).toContainText(
        'Perfil importado',
      );
      await expect(page.locator('#consoleOutput')).toContainText(
        'Laser do teste',
      );
      // O perfil importado entra no seletor e passa a ser o atual.
      await expect(page.locator('#machineProfile')).toHaveValue('imported');
    } finally {
      await close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test.describe('GRBL Studio — painel "Máquina" (P0.7)', () => {
  test('lê $I/$$/$#/$G/$N e gera o diagnóstico copiável', async () => {
    const emulator = await startGrblTcp();
    const { app, page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    try {
      await page.selectOption('#transportKind', 'tcp');
      await page.fill('#tcpHost', '127.0.0.1');
      await page.fill('#tcpPort', String(emulator.port));
      await page.click('#connectBtn');
      await expect(page.locator('#stateBadge')).toHaveText(/Ocioso|Idle/);

      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'machine',
        );
      });

      const grid = page.locator('#machineGrid');
      await expect(page.locator('#machineOverlay')).toBeVisible();
      await expect(grid).toContainText('1.1h');
      await expect(grid).toContainText('400');
      await expect(grid).toContainText('1000');
      await expect(grid).toContainText('G55');
      await expect(page.locator('#machineReport')).toHaveValue(
        /firmware\.version=1\.1h/,
      );
      await expect(page.locator('#machineStatus')).toHaveText('');
    } finally {
      await close();
      emulator.close();
    }
  });
});

test.describe('GRBL Studio — indicador de pinos (RF-MAQ-7)', () => {
  test('desabilitado com explicação quando o firmware não reporta Pn', async () => {
    const emulator = await startGrblTcp();
    const { page, close } = await launchApp({ prefs: { autoConnect: false } });
    try {
      await page.selectOption('#transportKind', 'tcp');
      await page.fill('#tcpHost', '127.0.0.1');
      await page.fill('#tcpPort', String(emulator.port));
      await page.click('#connectBtn');
      await expect(page.locator('#stateBadge')).toHaveText(/Ocioso|Idle/);

      const chip = page.locator('#pinChip');
      await expect(chip).toBeDisabled();
      await expect(chip).toContainText('Pinos');
      await expect(chip).toHaveAttribute('title', /não reporta pinos/);
    } finally {
      await close();
      emulator.close();
    }
  });

  test('mostra os pinos ativos quando o status traz Pn', async () => {
    const emulator = await startGrblTcp('<Idle|MPos:0.000,0.000,0.000|Pn:XY>');
    const { page, close } = await launchApp({ prefs: { autoConnect: false } });
    try {
      await page.selectOption('#transportKind', 'tcp');
      await page.fill('#tcpHost', '127.0.0.1');
      await page.fill('#tcpPort', String(emulator.port));
      await page.click('#connectBtn');

      const chip = page.locator('#pinChip');
      await expect(chip).toBeEnabled();
      await expect(chip).toContainText('Pinos: X Y');
    } finally {
      await close();
      emulator.close();
    }
  });
});

test.describe('GRBL Studio — simulação de job (P2.3/RF-PRV-7)', () => {
  test('play, seek e tempo estimado no preview', async () => {
    const { page, close } = await launchApp();
    try {
      // Programa curto: 20 mm a 600 mm/min → 2 s de simulação.
      await page.evaluate(() => {
        const w = window as unknown as {
          applyJobLines: (name: string, text: string) => void;
        };
        w.applyJobLines(
          'sim.gcode',
          'G21\nG90\nM3 S500\nG1 X10 Y0 F600\nG1 X20 Y0 F600\n',
        );
      });

      const bar = page.locator('#simBar');
      await expect(bar).toHaveClass(/hidden/);

      await page.evaluate(() => document.getElementById('simToggle')?.click());
      await expect(bar).not.toHaveClass(/hidden/);
      await expect(page.locator('#simPlay')).toBeDisabled();
      await expect(page.locator('#simPause')).toBeEnabled();
      await expect(page.locator('#simTime')).toContainText('/ 0:02');

      // Seek até o fim sem quebrar a barra.
      await page.evaluate(() => {
        const seek = document.getElementById(
          'simSeek',
        ) as HTMLInputElement | null;
        if (seek) {
          seek.value = '1000';
          seek.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await expect(page.locator('#simTime')).toContainText('0:02 / 0:02');

      await page.evaluate(() => document.getElementById('simStop')?.click());
      await expect(bar).toHaveClass(/hidden/);
      await expect(page.locator('#simPlay')).toBeEnabled();
    } finally {
      await close();
    }
  });
});

test.describe('GRBL Studio — pré-voo (P0.8)', () => {
  test('bloqueia G1 sem F e deixa gravar após confirmação', async () => {
    const emulator = await startGrblTcp();
    const { app, page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    const dir = mkdtempSync(path.join(tmpdir(), 'grbl-gcode-'));
    const file = path.join(dir, 'bloco.nc');
    // `G1` sem `F` e sem feed anterior → MX-6 (block).
    writeFileSync(file, 'G21\nG90\nM3 S500\nG1 X10 Y10\nG1 X20 Y20\n', 'utf8');
    try {
      await app.evaluate(({ dialog }, pathToFile) => {
        const d = dialog as unknown as Record<string, unknown>;
        d.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [pathToFile],
        });
      }, file);

      await page.selectOption('#transportKind', 'tcp');
      await page.fill('#tcpHost', '127.0.0.1');
      await page.fill('#tcpPort', String(emulator.port));
      await page.click('#connectBtn');
      await expect(page.locator('#stateBadge')).toHaveText(/Ocioso|Idle/);

      // O cartão "Execução" só aparece com G-code carregado; o caminho real
      // para abrir é o menu (Arquivo → Abrir G-code).
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'open-gcode',
        );
      });
      await expect(page.locator('#fileInfo')).toContainText('bloco.nc');

      await page.click('[data-tab="run"]');
      await page.click('#playBtn');
      await expect(page.locator('#preflightOverlay')).toBeVisible();
      await expect(page.locator('#preflightList')).toContainText(
        'Movimento sem velocidade',
      );
      await expect(page.locator('#preflightIntro')).toContainText(
        'impedimento',
      );

      await page.click('#preflightGo');
      await expect(page.locator('#preflightOverlay')).toBeHidden();
    } finally {
      await close();
      emulator.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test.describe('GRBL Studio — importação DXF (P2.4)', () => {
  test('converte DXF ASCII em contornos e carrega o G-code na Execução', async () => {
    const { app, page, close } = await launchApp();
    const dir = mkdtempSync(path.join(tmpdir(), 'grbl-dxf-'));
    const file = path.join(dir, 'peca.dxf');
    // Retângulo 20×10 em mm (LWPOLYLINE fechada), com uma camada CUT.
    const dxf = [
      '0',
      'SECTION',
      '2',
      'HEADER',
      '9',
      '$INSUNITS',
      '70',
      '4',
      '0',
      'ENDSEC',
      '0',
      'SECTION',
      '2',
      'TABLES',
      '0',
      'TABLE',
      '2',
      'LAYER',
      '70',
      '1',
      '0',
      'LAYER',
      '2',
      'CUT',
      '70',
      '0',
      '62',
      '7',
      '0',
      'ENDTAB',
      '0',
      'ENDSEC',
      '0',
      'SECTION',
      '2',
      'ENTITIES',
      '0',
      'LWPOLYLINE',
      '8',
      'CUT',
      '90',
      '4',
      '70',
      '1',
      '10',
      '0',
      '20',
      '0',
      '10',
      '20',
      '20',
      '0',
      '10',
      '20',
      '20',
      '10',
      '10',
      '0',
      '20',
      '10',
      '0',
      'ENDSEC',
      '0',
      'EOF',
      '',
    ].join('\n');
    writeFileSync(file, dxf, 'utf8');
    try {
      await app.evaluate(({ dialog }, pathToFile) => {
        const d = dialog as unknown as Record<string, unknown>;
        d.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [pathToFile],
        });
        d.showSaveDialog = async () => ({ canceled: true });
      }, file);

      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'open-dxf',
        );
      });

      await expect(page.locator('#fileInfo')).toContainText('peca.gcode');
      await expect(page.locator('#consoleOutput')).toContainText(
        'DXF importado',
      );
      await expect(page.locator('#consoleOutput')).toContainText('1 contorno');
      await expect(page.locator('#consoleOutput')).toContainText(
        '20.0 × 10.0 mm',
      );
    } finally {
      await close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test.describe('GRBL Studio — importação PDF (P2.4/RF-DSN-15)', () => {
  test('converte caminhos vetoriais de PDF e carrega o G-code', async () => {
    const { app, page, close } = await launchApp();
    const dir = mkdtempSync(path.join(tmpdir(), 'grbl-pdf-'));
    const file = path.join(dir, 'peca.pdf');
    const content = deflateSync(Buffer.from('10 10 100 50 re S')).toString(
      'latin1',
    );
    const pdf = [
      '%PDF-1.4',
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 200 120] >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj',
      `4 0 obj\n<< /Filter /FlateDecode /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`,
      'trailer\n<< /Root 1 0 R >>',
      '%%EOF',
      '',
    ].join('\n');
    writeFileSync(file, pdf, 'latin1');
    try {
      await app.evaluate(({ dialog }, pathToFile) => {
        const d = dialog as unknown as Record<string, unknown>;
        d.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [pathToFile],
        });
        d.showSaveDialog = async () => ({ canceled: true });
      }, file);

      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'open-pdf',
        );
      });

      await expect(page.locator('#fileInfo')).toContainText('peca.gcode');
      await expect(page.locator('#consoleOutput')).toContainText(
        'PDF importado',
      );
      await expect(page.locator('#consoleOutput')).toContainText(
        '35.3 × 17.6 mm',
      );
    } finally {
      await close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test.describe('GRBL Studio — editor de G-code (P1.10)', () => {
  test('numera, realça, edita com desfazer e seleciona trecho', async () => {
    const { app, page, close } = await launchApp();
    try {
      await page.evaluate(() => {
        const w = window as unknown as {
          applyJobLines: (name: string, text: string) => void;
        };
        w.applyJobLines(
          'editor.gcode',
          'G21\nG90\nM4 S500\nG1 X10 Y0 F600\nM5',
        );
      });

      // O botão da aba Execução só aparece conectado; o menu (Arquivo →
      // Editar G-code…) abre o editor mesmo sem máquina — e é o caminho do
      // teste, que roda desconectado.
      await expect(page.locator('#gcodeEdit')).toBeEnabled();
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'edit-gcode',
        );
      });

      const overlay = page.locator('#gcodeOverlay');
      await expect(overlay).not.toHaveClass(/hidden/);

      const rows = page.locator('#gcodeWindow .gcode-row');
      await expect(rows).toHaveCount(5);
      // Numeração (1-based) e realce por classe de palavra.
      await expect(rows.first().locator('.gcode-gutter')).toHaveText('1');
      await expect(rows.nth(3).locator('.gcode-tok-code')).toHaveText('G1');
      await expect(rows.nth(3).locator('.gcode-tok-axis').first()).toHaveText(
        'X10',
      );
      await expect(rows.nth(2).locator('.gcode-tok-power')).toHaveText('S500');

      // Duplo clique edita a linha; Enter grava e o rótulo avisa "editado".
      await rows.nth(3).dblclick();
      const input = page.locator('.gcode-row .gcode-edit');
      await expect(input).toBeVisible();
      await input.fill('G1 X20 Y0 F600');
      await input.press('Enter');
      await expect(rows.nth(3)).toContainText('X20');
      await expect(page.locator('#fileInfo')).toContainText('editado');

      // Desfazer devolve o texto original.
      await page.locator('#gcodeUndo').click();
      await expect(rows.nth(3)).toContainText('X10');

      // Shift+clique seleciona o intervalo 2–4 (linhas 1-based).
      await rows.nth(1).click();
      await rows.nth(3).click({ modifiers: ['Shift'] });
      await expect(page.locator('#gcodeSelInfo')).toContainText('2–4');
      // Sem conexão não se envia — nem o trecho nem daqui.
      await expect(page.locator('#gcodeSendSel')).toBeDisabled();
      await expect(page.locator('#gcodeSendFrom')).toBeDisabled();

      // O resumo do programa alimenta a barra de status.
      await expect(page.locator('#gcodeStatus')).toContainText('5 linhas');

      // Fechar aplica as edições (preview/rótulo) e esconde o modal.
      await page.locator('#gcodeClose').click();
      await expect(overlay).toHaveClass(/hidden/);
      await expect(page.locator('#fileInfo')).toContainText('5 linhas');
    } finally {
      await close();
    }
  });

  test('valida sem máquina e reconstrói depois de remover tudo', async () => {
    const { app, page, close } = await launchApp();
    try {
      await page.evaluate(() => {
        const w = window as unknown as {
          applyJobLines: (name: string, text: string) => void;
        };
        w.applyJobLines('vazio.gcode', 'G21\nG0 X0');
      });
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'edit-gcode',
        );
      });

      const rows = page.locator('#gcodeWindow .gcode-row');
      await expect(rows).toHaveCount(2);

      // "Validar" roda o pré-voo mesmo desconectado (regras sem fatos `$$`).
      await page.locator('#gcodeValidate').click();
      await expect(page.locator('#gcodeStatus')).toContainText('Pré-voo');

      // Remover a seleção inteira deixa o programa vazio — e "Inserir abaixo"
      // reconstrói sem depender do "Desfazer".
      await rows.nth(0).click();
      await rows.nth(1).click({ modifiers: ['Shift'] });
      await page.locator('#gcodeRemoveLine').click();
      await expect(rows).toHaveCount(0);
      await page.locator('#gcodeInsertLine').click();
      const input = page.locator('.gcode-row .gcode-edit');
      await input.fill('G0 X1 Y1');
      await input.press('Enter');
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText('G0 X1 Y1');
      await expect(page.locator('#gcodeStatus')).toContainText('1 linhas');
    } finally {
      await close();
    }
  });
});

test.describe('GRBL Studio — biblioteca de jobs (P2.9)', () => {
  /** PNG 1×1 válido (miniatura de teste). */
  const PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  test('grava o job concluído e permite duplicar da biblioteca', async () => {
    const emulator = await startGrblTcp();
    const { app, page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    const openLibrary = async () => {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'job-library',
        );
      });
    };
    try {
      await page.selectOption('#transportKind', 'tcp');
      await page.fill('#tcpHost', '127.0.0.1');
      await page.fill('#tcpPort', String(emulator.port));
      await page.click('#connectBtn');
      await expect(page.locator('#stateBadge')).toHaveText(/Ocioso|Idle/);

      await page.evaluate(() => {
        const w = window as unknown as {
          applyJobLines: (name: string, text: string) => void;
        };
        w.applyJobLines(
          'historico.gcode',
          'G21\nG90\nM4 S200\nG1 X5 Y5 F600\nM5',
        );
      });

      await page.click('[data-tab="run"]');
      await page.click('#playBtn');
      await expect(page.locator('#consoleOutput')).toContainText(
        'Job concluído',
        { timeout: 15000 },
      );

      // O fim do job reabre o modal de posicionamento; a biblioteca fica na
      // frente dele (z-index próprio), mas fechamos para o teste não depender
      // disso ao clicar.
      await page.click('#frameClose');

      await openLibrary();
      const overlay = page.locator('#joblibOverlay');
      await expect(overlay).not.toHaveClass(/hidden/);
      const items = page.locator('#joblibList .joblib-item');
      await expect(items).toHaveCount(1);
      await expect(items.first()).toContainText('historico.gcode');
      await expect(items.first()).toContainText(/Arquivo|Imagem/);
      await expect(page.locator('#joblibCount')).toContainText('1 de 50');
      // O preview tinha traçado → miniatura de verdade no card.
      await expect(items.first().locator('img.joblib-thumb')).toHaveCount(1);

      // "Duplicar" carrega a cópia como programa atual e fecha a biblioteca.
      await items.first().getByRole('button', { name: 'Duplicar' }).click();
      await expect(overlay).toHaveClass(/hidden/);
      await expect(page.locator('#fileInfo')).toContainText('historico.gcode');
      await expect(page.locator('#consoleOutput')).toContainText(
        'Cópia carregada',
      );

      // Reexecutar da biblioteca: roda de verdade e **não** duplica a entrada
      // (o main compara o hash do programa). O fim do job reabre o modal de
      // posicionamento — é o sinal de que o job terminou.
      const firstCreatedAt = await page.evaluate(async () => {
        const lib = (
          window as unknown as {
            grbl: {
              jobLibrary: { list: () => Promise<{ createdAt: number }[]> };
            };
          }
        ).grbl.jobLibrary;
        const list = await lib.list();
        return list[0]?.createdAt ?? 0;
      });
      await openLibrary();
      await items.first().getByRole('button', { name: 'Re-executar' }).click();
      await expect(page.locator('#frameOverlay')).not.toHaveClass(/hidden/, {
        timeout: 15000,
      });
      await expect
        .poll(
          async () =>
            page.evaluate(async (prev) => {
              const lib = (
                window as unknown as {
                  grbl: {
                    jobLibrary: {
                      list: () => Promise<{ createdAt: number }[]>;
                    };
                  };
                }
              ).grbl.jobLibrary;
              const list = await lib.list();
              return {
                count: list.length,
                newer: (list[0]?.createdAt ?? 0) > prev,
              };
            }, firstCreatedAt),
          { timeout: 10000 },
        )
        .toEqual({ count: 1, newer: true });
    } finally {
      await close();
      emulator.close();
    }
  });

  test('lista, duplica (offline), remove e limpa com confirmação', async () => {
    const { app, page, close } = await launchApp();
    const openLibrary = async () => {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'job-library',
        );
      });
    };
    try {
      await page.evaluate(async (thumb) => {
        const api = (
          window as unknown as {
            grbl: {
              jobLibrary: { add: (input: unknown) => Promise<unknown> };
            };
          }
        ).grbl.jobLibrary;
        await api.add({
          name: 'um.gcode',
          source: 'design',
          program: ['G0 X1'],
          thumb,
        });
        await api.add({ name: 'dois.gcode', program: ['G0 X2'] });
      }, PNG);

      await openLibrary();

      const items = page.locator('#joblibList .joblib-item');
      await expect(items).toHaveCount(2);
      await expect(items.first()).toContainText('dois.gcode');
      await expect(page.locator('#joblibCount')).toContainText('2 de 50');

      // Sem conexão "Re-executar" fica bloqueado e explica o porquê.
      const run = items.first().getByRole('button', { name: 'Re-executar' });
      await expect(run).toBeDisabled();
      await expect(run).toHaveAttribute(
        'title',
        'Conecte a máquina para reexecutar.',
      );

      // "Duplicar" não precisa de máquina: carrega a cópia e fecha.
      await items.first().getByRole('button', { name: 'Duplicar' }).click();
      await expect(page.locator('#joblibOverlay')).toHaveClass(/hidden/);
      await expect(page.locator('#fileInfo')).toContainText('dois.gcode');

      // Remover uma entrada.
      await openLibrary();
      await expect(items).toHaveCount(2);
      await items.first().getByRole('button', { name: 'Remover' }).click();
      await expect(items).toHaveCount(1);
      await expect(page.locator('#joblibStatus')).toContainText(
        'Job removido da biblioteca',
      );

      // "Limpar tudo" arma no primeiro clique e confirma no segundo.
      await page.click('#joblibClear');
      await expect(page.locator('#joblibStatus')).toContainText(
        'Remover todos os 1 jobs',
      );
      await expect(page.locator('#joblibClear')).toContainText('Confirmar');
      await page.click('#joblibClear');
      await expect(items).toHaveCount(0);
      await expect(page.locator('#joblibList .joblib-empty')).toContainText(
        'Nenhum job ainda',
      );
      await expect(page.locator('#joblibCount')).toContainText('0 de 50');
    } finally {
      await close();
    }
  });
});

test.describe('GRBL Studio — mover pelo preview (P2.14)', () => {
  const PROGRAM =
    'G21\nG90\nM4 S200\nG1 X40 Y0 F600\nG1 X40 Y40\nG1 X0 Y40\nM5';

  async function loadProgram(page: Page): Promise<void> {
    await page.evaluate((text) => {
      const w = window as unknown as {
        applyJobLines: (name: string, text: string) => void;
      };
      w.applyJobLines('quadrado.gcode', text);
    }, PROGRAM);
    await page.click('[data-tab="run"]');
  }

  test('clique no desenho pede confirmação e envia G90 G0', async () => {
    const emulator = await startGrblTcp();
    const { page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    try {
      await page.selectOption('#transportKind', 'tcp');
      await page.fill('#tcpHost', '127.0.0.1');
      await page.fill('#tcpPort', String(emulator.port));
      await page.click('#connectBtn');
      await expect(page.locator('#stateBadge')).toHaveText(/Ocioso|Idle/);

      await loadProgram(page);
      const canvas = page.locator('#previewCanvas');
      const box = await canvas.boundingBox();
      if (!box) throw new Error('preview sem caixa');
      const pop = page.locator('#previewMove');

      // Clique no meio do desenho: abre o popover com o ponto em mm.
      await canvas.click({
        position: { x: box.width / 2, y: box.height / 2 },
      });
      await expect(pop).not.toHaveClass(/hidden/);
      await expect(page.locator('#previewMoveCoords')).toHaveText(
        /^X -?\d+\.\d{3} · Y -?\d+\.\d{3}$/,
      );

      // Confirmar manda um único `G90 G0 X.. Y..` (aparece no console).
      await page.click('#previewMoveGo');
      await expect(pop).toHaveClass(/hidden/);
      await expect(page.locator('#consoleOutput')).toContainText(
        /G90 G0 X-?\d+\.\d{3} Y-?\d+\.\d{3}/,
      );

      // Esc descarta o ponto escolhido — e não é parada de emergência.
      await canvas.click({ position: { x: 60, y: 60 } });
      await expect(pop).not.toHaveClass(/hidden/);
      await page.keyboard.press('Escape');
      await expect(pop).toHaveClass(/hidden/);
      await expect(page.locator('#stateBadge')).toHaveText(/Ocioso|Idle/);

      // Cancelar também fecha sem enviar nada.
      await canvas.click({ position: { x: 80, y: 80 } });
      await expect(pop).not.toHaveClass(/hidden/);
      await page.click('#previewMoveCancel');
      await expect(pop).toHaveClass(/hidden/);
    } finally {
      await close();
      emulator.close();
    }
  });

  test('sem conexão o clique explica por que não pode mover', async () => {
    const { page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    try {
      await loadProgram(page);
      const canvas = page.locator('#previewCanvas');
      const box = await canvas.boundingBox();
      if (!box) throw new Error('preview sem caixa');

      await canvas.click({
        position: { x: box.width / 2, y: box.height / 2 },
      });
      await expect(page.locator('#previewMove')).toHaveClass(/hidden/);
      await expect(page.locator('#consoleOutput')).toContainText(
        'Não dá para mover: conecte a máquina.',
      );
    } finally {
      await close();
    }
  });
});

test.describe('GRBL Studio — lote / dados variáveis (P2.10/RF-SYM-10)', () => {
  test('grava uma peça por linha e espera a troca antes da próxima', async () => {
    const emulator = await startGrblTcp();
    const { app, page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    try {
      await page.selectOption('#transportKind', 'tcp');
      await page.fill('#tcpHost', '127.0.0.1');
      await page.fill('#tcpPort', String(emulator.port));
      await page.click('#connectBtn');
      await expect(page.locator('#stateBadge')).toHaveText(/Ocioso|Idle/);

      // O lote abre pelo menu (Ferramentas → Lote de dados variáveis…).
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'batch',
        );
      });
      await expect(page.locator('#batchOverlay')).toBeVisible();

      await page.fill('#batchCsv', 'nome,cargo\nAna,Dev\nBia,QA');
      await page.fill('#batchTemplate', '{nome}-{i:02}');
      await expect(page.locator('#batchTableInfo')).toContainText('2 peças');
      // A prévia mostra o conteúdo final de cada peça (dados variáveis).
      await expect(page.locator('#batchPreview')).toContainText('Ana-01');
      await expect(page.locator('#batchPreview')).toContainText('Bia-02');
      await expect(page.locator('#batchFields')).toContainText('{nome}');

      await page.click('#batchStart');
      await expect(page.locator('#batchOverlay')).toBeHidden();
      // Peça 1 no forno, com o nome do arquivo do lote.
      await expect(page.locator('#fileInfo')).toContainText('lote-1-de-2');

      // Ao terminar, a fila **para** para a troca da peça (nada de emendar).
      await expect(page.locator('#jobBarBatch')).toContainText(
        'Peça 1 de 2 pronta',
        { timeout: 20_000 },
      );
      await expect(page.locator('#batchNextBtn')).toBeEnabled();

      await page.click('#batchNextBtn');
      await expect(page.locator('#fileInfo')).toContainText('lote-2-de-2');
      // Última peça: o lote fecha e não há mais o que retomar.
      await expect(page.locator('#batchHint')).toContainText('Lote concluído', {
        timeout: 20_000,
      });
      await expect(page.locator('#batchStopBtn')).toHaveClass(/hidden/);
      await expect(page.locator('#batchResumeBtn')).toHaveClass(/hidden/);
      // Peça de lote não entra na biblioteca de jobs (não empurra os jobs reais).
      const jobs = await page.evaluate(() =>
        (
          window as unknown as {
            grbl: { jobLibrary: { list: () => Promise<unknown[]> } };
          }
        ).grbl.jobLibrary.list(),
      );
      expect(jobs).toHaveLength(0);
    } finally {
      await close();
      emulator.close();
    }
  });

  test('lote guardado abre com "Retomar lote" na próxima peça', async () => {
    const { page, close } = await launchApp({
      prefs: {
        autoConnect: false,
        batch: {
          kind: '2d',
          csv: 'nome\nAna\nBia\nCaio',
          template: '{nome}-{i:02}',
          hasHeader: true,
          delimiter: ',',
          next: 2,
          total: 3,
        },
      },
    });
    try {
      // A retomada fica visível na Execução sem abrir o modal (o usuário
      // precisa saber que existe um lote em andamento).
      await page.click('[data-tab="run"]');
      await expect(page.locator('#batchHint')).toBeVisible();
      await expect(page.locator('#batchHint')).toContainText(
        'próxima peça 2 de 3',
      );
      await page.click('#batchResumeBtn');
      await expect(page.locator('#batchOverlay')).toBeVisible();
      await expect(page.locator('#batchCsv')).toHaveValue(/Caio/);
      await expect(page.locator('#batchTemplate')).toHaveValue('{nome}-{i:02}');
      await expect(page.locator('#batchFrom')).toHaveValue('2');
      // A prévia começa na peça 2 (sem repetir a 1).
      await expect(page.locator('#batchPreview')).toContainText('Bia-02');
      await expect(page.locator('#batchPreview')).not.toContainText('Ana-01');
    } finally {
      await close();
    }
  });

  test('com código de barras 1D usa os ajustes do modal de barras', async () => {
    const emulator = await startGrblTcp();
    const { app, page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    try {
      await page.selectOption('#transportKind', 'tcp');
      await page.fill('#tcpHost', '127.0.0.1');
      await page.fill('#tcpPort', String(emulator.port));
      await page.click('#connectBtn');
      await expect(page.locator('#stateBadge')).toHaveText(/Ocioso|Idle/);

      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          'grbl:ev:action',
          'batch',
        );
      });
      await expect(page.locator('#batchOverlay')).toBeVisible();
      await page.selectOption('#batchKind', '1d');
      await page.fill('#batchCsv', 'serie\nA100\nA200');
      await page.fill('#batchTemplate', '{1}');
      await page.click('#batchStart');

      // Cada peça vira um programa do **código de barras** (não do QR).
      await expect(page.locator('#fileInfo')).toContainText(
        'lote-barcode-1-de-2',
      );
      await expect(page.locator('#jobBarBatch')).toContainText(
        'Peça 1 de 2 pronta',
        { timeout: 20_000 },
      );
    } finally {
      await close();
      emulator.close();
    }
  });

  test('o seletor de separador sobrepõe a detecção automática', async () => {
    const { page, close } = await launchApp();
    try {
      await page.evaluate(() => {
        document.getElementById('batchOpenBtn')?.click();
      });
      await expect(page.locator('#batchOverlay')).toBeVisible();
      await page.fill('#batchCsv', 'nome,cargo\nAna,Dev\nBia,QA');
      await page.fill('#batchTemplate', '{2}');
      // Vírgula detectada sozinha: 2 colunas, conteúdo certo.
      await expect(page.locator('#batchTableInfo')).toContainText('2 peças');
      await expect(page.locator('#batchTableInfo')).toContainText('2 colunas');
      await expect(page.locator('#batchPreview')).toContainText('Dev');

      // Forçado como `;`, a mesma planilha vira 1 coluna — e o `{2}` deixa de
      // existir (o modelo é validado de novo contra a tabela).
      await page.selectOption('#batchDelimiter', ';');
      await expect(page.locator('#batchTableInfo')).toContainText('1 coluna');
      await expect(page.locator('#batchStatus')).toContainText('não existe');
      await expect(page.locator('#batchStart')).toBeDisabled();
    } finally {
      await close();
    }
  });

  test('o modelo é validado contra o cabeçalho da planilha', async () => {
    const { page, close } = await launchApp();
    try {
      await page.evaluate(() => {
        document.getElementById('batchOpenBtn')?.click();
      });
      await expect(page.locator('#batchOverlay')).toBeVisible();
      await page.fill('#batchCsv', 'nome\nAna');
      await page.fill('#batchTemplate', '{sobrenome}');
      await expect(page.locator('#batchStatus')).toContainText(
        'não está no cabeçalho',
      );
      await expect(page.locator('#batchStart')).toBeDisabled();
    } finally {
      await close();
    }
  });
});

test.describe('GRBL Studio — modo produção (P2.11/RF-GC-12)', () => {
  const PROGRAM =
    'G21\nG90\nM4 S200\nG1 X40 Y0 F600\nG1 X40 Y40\nG1 X0 Y40\nM5';

  /** Conecta no emulador e carrega o programa que será repetido. */
  async function setupProduction(
    page: Page,
    emulator: { port: number },
  ): Promise<void> {
    await page.selectOption('#transportKind', 'tcp');
    await page.fill('#tcpHost', '127.0.0.1');
    await page.fill('#tcpPort', String(emulator.port));
    await page.click('#connectBtn');
    await expect(page.locator('#stateBadge')).toHaveText(/Ocioso|Idle/);
    await page.evaluate((text) => {
      const w = window as unknown as {
        applyJobLines: (name: string, text: string) => void;
      };
      w.applyJobLines('peca.gcode', text);
    }, PROGRAM);
    await page.click('[data-tab="run"]');
  }

  test('repete o programa N vezes, pausa para a troca e fecha a série', async () => {
    const emulator = await startGrblTcp();
    const { page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    try {
      await setupProduction(page, emulator);

      // O botão mostra o total escolhido (contador já na barra lateral).
      await page.fill('#prodCopies', '3');
      await expect(page.locator('#prodStart')).toContainText('3×');
      await page.click('#prodStart');

      // Cópia 1 no forno: contador na barra de gravação, sempre à mão.
      await expect(page.locator('#jobBarProd')).toContainText('Peça 1 de 3');
      await expect(page.locator('#fileInfo')).toContainText('peca.gcode');

      // Terminou: **para** em vez de reexecutar (troca/conferência manual) e o
      // pré-voo não se repete.
      await expect(page.locator('#jobBarProd')).toContainText(
        'Peça 1 de 3 pronta',
        { timeout: 20_000 },
      );
      await expect(page.locator('#prodNextBtn')).toBeEnabled();
      await expect(page.locator('#prodStatus')).toContainText(
        'Peça 1 de 3 pronta',
      );
      await expect(page.locator('#prodNextBtn')).toHaveText(/Próxima peça/);

      await page.click('#prodNextBtn');
      await expect(page.locator('#jobBarProd')).toContainText('Peça 2 de 3');
      await expect(page.locator('#jobBarProd')).toContainText('pronta', {
        timeout: 20_000,
      });
      await page.click('#prodNextBtn');
      // Última cópia: a série fecha e a barra volta ao normal (o programa é
      // curto, então o estado final pode chegar antes do contador aparecer).
      await expect(page.locator('#prodStatus')).toContainText(
        'Produção concluída: 3 peças',
        { timeout: 20_000 },
      );
      await expect(page.locator('#jobBarProd')).toHaveClass(/hidden/);
      await expect(page.locator('#prodNextBtn')).toHaveClass(/hidden/);
      await expect(page.locator('#prodEndBtn')).toHaveClass(/hidden/);
      // Não é um lote: a barra não mostra o contador do lote.
      await expect(page.locator('#jobBarBatch')).toHaveClass(/hidden/);
      // O programa continua carregado e "Iniciar" volta ao normal.
      await expect(page.locator('#fileInfo')).toContainText('peca.gcode');
      await expect(page.locator('#playBtn')).toBeEnabled();
    } finally {
      await close();
      emulator.close();
    }
  });

  test('trava a troca de programa na série e "Encerrar" devolve a UI', async () => {
    const emulator = await startGrblTcp();
    const { page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    try {
      await setupProduction(page, emulator);
      await page.fill('#prodCopies', '2');
      await page.click('#prodStart');

      // Trava de UI (RF-GC-12): o programa não pode ser trocado no meio da
      // série — nem por arquivo, nem pelo editor, nem pelo lote.
      await expect(page.locator('#fileOpen')).toBeDisabled();
      await expect(page.locator('#gcodeEdit')).toBeDisabled();
      await expect(page.locator('#batchOpenBtn')).toBeDisabled();
      await expect(page.locator('#prodCopies')).toBeDisabled();
      // Pausar e Cancelar continuam acessíveis (RF-GC-8).
      await expect(page.locator('#pauseBtn')).toBeVisible();
      await expect(page.locator('#stopBtn')).toBeVisible();

      await expect(page.locator('#jobBarProd')).toContainText('pronta', {
        timeout: 20_000,
      });
      // "Encerrar" fica na barra de gravação (sempre visível), não só na aba.
      await expect(page.locator('#prodEndBtn')).toBeVisible();
      await page.click('#prodEndBtn');

      await expect(page.locator('#fileOpen')).toBeEnabled();
      await expect(page.locator('#gcodeEdit')).toBeEnabled();
      await expect(page.locator('#batchOpenBtn')).toBeEnabled();
      await expect(page.locator('#prodCopies')).toBeEnabled();
      await expect(page.locator('#jobBarProd')).toHaveClass(/hidden/);
      await expect(page.locator('#prodStatus')).toHaveClass(/hidden/);
      await expect(page.locator('#consoleOutput')).toContainText(
        'Produção encerrada na peça 1 de 2',
      );
    } finally {
      await close();
      emulator.close();
    }
  });

  test('trocar o programa por outro caminho encerra a série', async () => {
    const emulator = await startGrblTcp();
    const { page, close } = await launchApp({
      prefs: { autoConnect: false },
    });
    try {
      await setupProduction(page, emulator);
      await page.fill('#prodCopies', '5');
      await page.click('#prodStart');
      await expect(page.locator('#jobBarProd')).toContainText('pronta', {
        timeout: 20_000,
      });

      // Rede de segurança: qualquer caminho que troque o programa (imagem,
      // desenho, símbolo, biblioteca) encerra a produção em vez de repetir o
      // programa errado.
      await page.evaluate(() => {
        const w = window as unknown as {
          applyJobLines: (name: string, text: string) => void;
        };
        w.applyJobLines('outro.gcode', 'G21\nG90\nM5');
      });
      await expect(page.locator('#consoleOutput')).toContainText(
        'Produção encerrada: o programa foi trocado',
      );
      await expect(page.locator('#jobBarProd')).toHaveClass(/hidden/);
      await expect(page.locator('#prodNextBtn')).toHaveClass(/hidden/);
      await expect(page.locator('#fileInfo')).toContainText('outro.gcode');
      await expect(page.locator('#fileOpen')).toBeEnabled();
    } finally {
      await close();
      emulator.close();
    }
  });
});

test.describe('GRBL Studio — teste de foco (P2.13/RF-IMG-13)', () => {
  /** Abre o modal pelo menu nativo (Ferramentas → Teste de foco…). */
  async function openFocus(app: Awaited<ReturnType<typeof launchApp>>['app']) {
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        'grbl:ev:action',
        'focus-test',
      );
    });
  }

  test('gera a escada de Z e carrega como programa', async () => {
    const { app, page, close } = await launchApp();
    try {
      await openFocus(app);
      await expect(page.locator('#focusOverlay')).toBeVisible();
      // A prévia mostra a faixa de Z relativa ao Z atual (11 passos de 0,1 mm).
      await expect(page.locator('#focusPreview')).toContainText(
        '22 linhas em 11 passos de Z',
      );
      await expect(page.locator('#focusPreview')).toContainText(
        '-0.5 a 0.5 mm',
      );

      await page.click('#focusGenerate');
      await expect(page.locator('#focusStatus')).toContainText('11 passos');
      // Vira o programa atual (arquivo virtual), pronto para o pré-voo/Play.
      await expect(page.locator('#fileInfo')).toContainText('focus-test.gcode');
      // O modal de posicionamento abre para alinhar antes de gravar.
      await expect(page.locator('#frameOverlay')).toBeVisible();
      await page.click('#frameCancel');
      await expect(page.locator('#frameOverlay')).toBeHidden();
    } finally {
      await close();
    }
  });

  test('normaliza os campos e avisa quando as potências são iguais', async () => {
    const { app, page, close } = await launchApp();
    try {
      await openFocus(app);
      await expect(page.locator('#focusOverlay')).toBeVisible();

      await page.fill('#ftSteps', '5');
      await page.fill('#ftZStep', '0.2');
      await expect(page.locator('#focusPreview')).toContainText(
        '10 linhas em 5 passos de Z',
      );
      await expect(page.locator('#focusPreview')).toContainText(
        '-0.4 a 0.4 mm',
      );

      // Potências iguais: a comparação perde o sentido e o app explica.
      await page.fill('#ftPowerLow', '30');
      await page.fill('#ftPowerHigh', '30');
      await expect(page.locator('#focusPreview')).toContainText(
        'As duas potências são iguais',
      );

      // Valores fora da faixa são normalizados antes de gerar.
      await page.fill('#ftSteps', '999');
      await expect(page.locator('#focusPreview')).toContainText(
        '62 linhas em 31 passos de Z',
      );
      await page.click('#focusGenerate');
      await expect(page.locator('#focusStatus')).toContainText('31 passos');
    } finally {
      await close();
    }
  });
});

test.describe('GRBL Studio — presets de material (P2.12/RF-IMG-8)', () => {
  /** Abre o modal de presets pelo menu nativo. */
  async function openPresets(
    app: Awaited<ReturnType<typeof launchApp>>['app'],
  ) {
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        'grbl:ev:action',
        'presets',
      );
    });
  }

  /** PNG 1×1: o cartão de imagem só mostra os ajustes com imagem carregada. */
  const PNG_1X1 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  /** Carrega uma imagem pelo diálogo real, com o `showOpenDialog` trocado. */
  async function loadImage(
    app: Awaited<ReturnType<typeof launchApp>>['app'],
    page: Awaited<ReturnType<typeof launchApp>>['page'],
  ) {
    const file = path.join(
      mkdtempSync(path.join(tmpdir(), 'grbl-img-')),
      'pixel.png',
    );
    writeFileSync(file, Buffer.from(PNG_1X1, 'base64'));
    await app.evaluate(({ dialog }, filePath) => {
      const d = dialog as unknown as Record<string, unknown>;
      d.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [filePath],
      });
    }, file);
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        'grbl:ev:action',
        'open-image',
      );
    });
    await expect(page.locator('#cardImage')).toHaveClass(/has-image/);
  }

  test('salva os ajustes atuais, aplica depois de mudar os campos e exclui', async () => {
    const { app, page, close } = await launchApp();
    try {
      await loadImage(app, page);
      await page.click('button[data-tab="image"]');
      await page.fill('#imgSpeed', '700');
      await page.fill('#imgPasses', '2');
      await page.selectOption('#imgMode', 'M3');
      await page.fill('#imgSmax', '600');

      await openPresets(app);
      await expect(page.locator('#presetOverlay')).toBeVisible();
      // Nome sugerido e a linha "Fonte" refletem os ajustes atuais (60 %).
      await expect(page.locator('#presetName')).toHaveValue('Receita 1');
      await expect(page.locator('#presetSource')).toContainText('60%');

      await page.fill('#presetName', 'MDF 600');
      await page.fill('#presetNotes', 'testado no C1');
      await page.click('#presetCreate');
      const item = page.locator('#presetList .preset-item');
      await expect(item).toHaveCount(1);
      await expect(item).toContainText('MDF 600');
      await expect(item).toContainText('60%');
      await expect(item).toContainText('700 mm/min');
      await expect(item).toContainText('Dose');
      await expect(page.locator('#presetStatus')).toContainText(
        'Preset “MDF 600” salvo',
      );

      // Fecha, mexe nos ajustes e reaplica pela lista.
      await page.click('#presetClose');
      await expect(page.locator('#presetOverlay')).toBeHidden();
      await page.fill('#imgSpeed', '1200');
      await page.fill('#imgSmax', '900');
      await page.fill('#imgPasses', '1');
      await page.selectOption('#imgMode', 'M4');

      await openPresets(app);
      await page
        .locator('#presetList .preset-item')
        .getByRole('button', { name: 'Aplicar' })
        .click();
      await expect(page.locator('#imgSpeed')).toHaveValue('700');
      await expect(page.locator('#imgSmax')).toHaveValue('600');
      await expect(page.locator('#imgPasses')).toHaveValue('2');
      await expect(page.locator('#imgMode')).toHaveValue('M3');
      await expect(page.locator('#presetStatus')).toContainText('aplicado');
      // O hint do perfil passa a mostrar a receita (não os números do manual).
      await expect(page.locator('#profileHint')).toContainText(
        'Preset “MDF 600”',
      );

      await page
        .locator('#presetList .preset-item')
        .getByRole('button', { name: 'Excluir' })
        .click();
      await expect(page.locator('#presetList .preset-item')).toHaveCount(0);
      await expect(page.locator('#presetList')).toContainText('Nenhum preset');
    } finally {
      await close();
    }
  });

  test('exporta e importa o JSON das receitas (compartilhar entre máquinas)', async () => {
    const { app, page, close } = await launchApp();
    const dir = mkdtempSync(path.join(tmpdir(), 'grbl-presets-'));
    const exported = path.join(dir, 'grbl-presets.json');
    try {
      await openPresets(app);
      await expect(page.locator('#presetOverlay')).toBeVisible();
      await page.fill('#presetName', 'Receita exportada');
      await page.click('#presetCreate');
      await expect(page.locator('#presetList .preset-item')).toHaveCount(1);

      // Exportar: o diálogo nativo é trocado por um caminho fixo.
      await app.evaluate(({ dialog }, filePath) => {
        const d = dialog as unknown as Record<string, unknown>;
        d.showSaveDialog = async () => ({ canceled: false, filePath });
      }, exported);
      await page.click('#presetExport');
      await expect(page.locator('#presetStatus')).toContainText('exportados');

      const json = JSON.parse(readFileSync(exported, 'utf8'));
      expect(json.version).toBe(1);
      expect(json.presets).toHaveLength(1);
      expect(json.presets[0].name).toBe('Receita exportada');

      // Excluir e importar de volta (o JSON é a fonte da receita).
      await page
        .locator('#presetList .preset-item')
        .getByRole('button', { name: 'Excluir' })
        .click();
      await expect(page.locator('#presetList .preset-item')).toHaveCount(0);

      await app.evaluate(({ dialog }, filePath) => {
        const d = dialog as unknown as Record<string, unknown>;
        d.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [filePath],
        });
      }, exported);
      await page.click('#presetImport');
      await expect(page.locator('#presetList .preset-item')).toHaveCount(1);
      await expect(page.locator('#presetList .preset-item')).toContainText(
        'Receita exportada',
      );
      await expect(page.locator('#presetStatus')).toContainText('importado');
    } finally {
      await close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('ajusta a receita ao módulo da máquina preservando a dose (RF-IMG-10)', async () => {
    const { app, page, close } = await launchApp();
    try {
      await loadImage(app, page);
      await page.click('button[data-tab="image"]');
      // O "Perfil de material" mora num <details> fechado por padrão.
      await page.click('#cardImage summary:has-text("Perfil de material")');
      // Receita de 5 W a 50 % / 400 mm/min.
      await page.selectOption('#profileModule', '5W');
      await page.selectOption('#profileAction', 'cut');
      await page.fill('#imgSmax', '500');
      await page.fill('#imgSpeed', '400');

      await openPresets(app);
      await page.fill('#presetName', 'Acrílico 5W');
      await page.click('#presetCreate');
      await expect(page.locator('#presetList .preset-item')).toContainText(
        '5W',
      );

      // A máquina é a C1 (3 W): a mesma dose pede 83,3 % (S 833).
      await page
        .locator('#presetList .preset-item')
        .getByRole('button', { name: 'Ajustar à máquina' })
        .click();
      await expect(page.locator('#presetStatus')).toContainText(
        'Dose preservada',
      );
      await expect(page.locator('#presetStatus')).toContainText('83.3%');
      await expect(page.locator('#imgSmax')).toHaveValue('833');
      await expect(page.locator('#imgSpeed')).toHaveValue('400');
      await expect(page.locator('#profileModule')).toHaveValue('3W');
    } finally {
      await close();
    }
  });
});
