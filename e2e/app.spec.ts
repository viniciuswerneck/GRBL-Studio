import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { deflateSync } from 'node:zlib';
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
