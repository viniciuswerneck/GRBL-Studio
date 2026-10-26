#!/usr/bin/env node
/**
 * Gera os prints do manual do usuário.
 *
 * Sobe o app Electron real (Playwright), conecta num emulador GRBL via TCP,
 * abre cada aba/diálogo e salva PNGs em `docs/manual/img/`.
 *
 * Uso (headless):
 *   xvfb-run -a -s "-screen 0 1600x1000x24" node scripts/manual-capture.mjs
 *
 * Requer `npm run build` antes (usa o `dist/`).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(HERE, '..');
const OUT = path.join(APP_ROOT, 'docs', 'manual', 'img');
mkdirSync(OUT, { recursive: true });

/** Emulador GRBL mínimo via TCP (mesmo do E2E). */
function startGrblTcp(statusLine = '<Idle|MPos:1.500,2.250,0.000|FS:0,0>') {
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
  const replies = {
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
      for (const byte of text) if (byte === '?') socket.write(`${statusLine}\r\n`);
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
      const port = server.address().port;
      resolve({ port, close: () => server.close() });
    });
  });
}

const SAMPLE = `G21
G90
M4 S200
G0 X0 Y0
G1 X40 Y0 F600
G1 X40 Y40
G1 X0 Y40
G1 X0 Y0
M5
`;

const BAD_GCODE = `G21
G90
G1 X10 Y10
`;

const log = (...a) => console.log(...a);

async function main() {
  const userData = mkdtempSync(path.join(tmpdir(), 'grbl-manual-'));
  const work = mkdtempSync(path.join(tmpdir(), 'grbl-manual-files-'));
  const sample = path.join(work, 'placa-40x40.gcode');
  const bad = path.join(work, 'sem-avanco.gcode');
  writeFileSync(sample, SAMPLE, 'utf8');
  writeFileSync(bad, BAD_GCODE, 'utf8');
  writeFileSync(
    path.join(userData, 'prefs.json'),
    JSON.stringify({
      onboarding: 1,
      theme: 'dark',
      lang: 'pt-BR',
      mode: 'advanced',
      autoConnect: false,
    }),
    'utf8',
  );

  const emulator = await startGrblTcp();
  const app = await electron.launch({
    args: [APP_ROOT, `--user-data-dir=${userData}`, '--no-sandbox'],
    env: { ...process.env, GRBL_E2E: '1' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setContentSize(1440, 900);
  });
  await page.waitForTimeout(800);

  const shot = async (name, selector) => {
    await page.waitForTimeout(300);
    const target = selector ? page.locator(selector) : page;
    await target.screenshot({
      path: path.join(OUT, `${name}.png`),
      animations: 'disabled',
    });
    log(`[ok] ${name}`);
  };
  const action = (a) =>
    app.evaluate(({ BrowserWindow }, act) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('grbl:ev:action', act);
    }, a);
  const stubDialog = (target) =>
    app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, target);
  const closeOverlay = (id) =>
    page.evaluate((overlay) => {
      document.getElementById(overlay)?.classList.add('hidden');
    }, id);
  const showOverlay = (id) =>
    page.evaluate((overlay) => {
      document.getElementById(overlay)?.classList.remove('hidden');
    }, id);
  /** Afasta o preview do G-code para o desenho inteiro caber na tela. */
  const zoomPreviewOut = async (steps = 3) => {
    const box = await page.locator('#previewCanvas').boundingBox();
    if (!box) return;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < steps; i += 1) await page.mouse.wheel(0, 100);
    await page.waitForTimeout(250);
  };
  const click = async (sel) => {
    const el = page.locator(sel);
    if ((await el.count()) === 0) throw new Error(`sem ${sel}`);
    await el.first().click();
  };
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (err) {
      log(`[skip] ${name}: ${err.message.split('\n')[0]}`);
    }
  };

  try {
    // ---------------------------------------------------------------- conexão
    await page.selectOption('#transportKind', 'tcp');
    await page.fill('#tcpHost', '127.0.0.1');
    await page.fill('#tcpPort', String(emulator.port));
    await click('#connectBtn');
    await page.waitForFunction(
      () =>
        (document.getElementById('connectBtn')?.textContent || '').includes(
          'Desconectar',
        ),
      { timeout: 15_000 },
    );
    await page.waitForTimeout(600);

    // Carrega um G-code de exemplo para o preview/DRO ficarem realistas.
    await stubDialog(sample);
    await action('open-gcode');
    await page.waitForFunction(
      () =>
        (document.getElementById('fileInfo')?.textContent || '').includes(
          'placa',
        ),
      { timeout: 15_000 },
    );
    await page.waitForTimeout(800);
    await zoomPreviewOut();

    // Após conectar o app abre a aba Imagem; voltamos para a aba Máquina.
    await page.click('[data-tab="machine"]');
    await page.waitForTimeout(400);

    await shot('01-tela-principal');
    await shot('02-conexao', '#cardConnection');
    await page.evaluate(() => {
      const appEl = document.querySelector('.app');
      if (appEl) appEl.style.gridTemplateColumns = '460px 1fr';
      const card = document.getElementById('cardOverrides');
      if (card) card.open = true;
    });
    await page.waitForTimeout(250);
    await shot('09-overrides', '#cardOverrides');
    await page.evaluate(() => {
      const card = document.getElementById('cardOverrides');
      if (card) card.open = false;
      const appEl = document.querySelector('.app');
      if (appEl) appEl.style.gridTemplateColumns = '';
    });

    // ---------------------------------------------------------------- tour
    await step('03-tour', async () => {
      await action('tour');
      await page.waitForSelector('#tourOverlay:not(.hidden)');
      await shot('03-tour');
      await closeOverlay('tourOverlay');
    });

    // ---------------------------------------------------------------- imagem
    await step('04-imagem', async () => {
      await page.click('[data-tab="image"]');
      await stubDialog(path.join(APP_ROOT, 'build', 'icon.png'));
      await click('#imageOpen');
      await page.waitForFunction(
        () =>
          !(document.getElementById('imageInfo')?.textContent || '').includes(
            'Nenhuma',
          ),
        { timeout: 15_000 },
      );
      await click('#imgGenerate');
      await page.waitForTimeout(1200);
      await shot('04-imagem');
    });

    // ---------------------------------------------------------------- execução
    await step('05-execucao', async () => {
      await page.click('[data-tab="run"]');
      await stubDialog(sample);
      await action('open-gcode');
      await page.waitForFunction(
        () =>
          (document.getElementById('fileInfo')?.textContent || '').includes(
            'placa',
          ),
        { timeout: 15_000 },
      );
      await page.waitForTimeout(600);
      await zoomPreviewOut();
      await shot('05-execucao');
    });

    await step('06-posicionar', async () => {
      await showOverlay('frameOverlay');
      await shot('06-posicionar');
      await closeOverlay('frameOverlay');
    });

    await step('07-gravar', async () => {
      await page.click('[data-tab="run"]');
      await shot('07-gravar', '#cardExecution');
    });

    // ---------------------------------------------------------------- console
    await step('08-console-dro', async () => {
      await page.click('[data-tab="machine"]');
      await page.waitForTimeout(500);
      await shot('08-console-dro');
    });

    // ---------------------------------------------------------------- macros
    await step('10-macros', async () => {
      await page.click('[data-tab="macros"]');
      await page.evaluate(() => {
        const card = document.getElementById('cardMacros');
        if (card) card.open = true;
      });
      await page.waitForTimeout(400);
      await shot('10-macros');
    });

    // ---------------------------------------------------------------- máquina
    await step('11-maquina', async () => {
      await action('machine');
      await page.waitForSelector('#machineOverlay:not(.hidden)');
      await page.waitForTimeout(1200);
      await shot('11-maquina');
      await closeOverlay('machineOverlay');
    });

    await step('12-configuracoes', async () => {
      await page.click('[data-tab="machine"]');
      await click('#settingsBtn');
      await page.waitForSelector('#settingsOverlay:not(.hidden)');
      await page.waitForTimeout(1200);
      await shot('12-configuracoes');
      await closeOverlay('settingsOverlay');
    });

    // ---------------------------------------------------------------- editor
    await step('13-editor-gcode', async () => {
      await page.click('[data-tab="run"]');
      await action('edit-gcode');
      await page.waitForSelector('#gcodeOverlay:not(.hidden)');
      await page.waitForTimeout(600);
      await shot('13-editor-gcode');
      await closeOverlay('gcodeOverlay');
    });

    // ---------------------------------------------------------------- pré-voo
    await step('14-pre-voo', async () => {
      await stubDialog(bad);
      await action('open-gcode');
      await page.waitForFunction(
        () =>
          (document.getElementById('fileInfo')?.textContent || '').includes(
            'sem-avanco',
          ),
        { timeout: 15_000 },
      );
      await page.waitForTimeout(500);
      await click('#playBtn');
      await page.waitForSelector('#preflightOverlay:not(.hidden)');
      await shot('14-pre-voo');
      await closeOverlay('preflightOverlay');
    });

    // ---------------------------------------------------------------- fila
    await step('15-fila', async () => {
      await click('#queueOpen');
      await page.waitForSelector('#queueOverlay:not(.hidden)');
      await stubDialog(sample);
      await click('#queueAdd');
      await page.waitForFunction(
        () => document.querySelectorAll('#queueList .queue-item').length > 0,
        { timeout: 10_000 },
      );
      await page.waitForTimeout(400);
      await shot('15-fila');
      await closeOverlay('queueOverlay');
    });

    await step('16-biblioteca-jobs', async () => {
      // Executa o programa no emulador para a biblioteca ter um job real.
      await page.click('[data-tab="run"]');
      await stubDialog(sample);
      await action('open-gcode');
      await page.waitForFunction(
        () =>
          (document.getElementById('fileInfo')?.textContent || '').includes(
            'placa',
          ),
        { timeout: 15_000 },
      );
      await click('#playBtn');
      await page.waitForFunction(
        () =>
          (document.getElementById('consoleOutput')?.textContent || '').includes(
            'Job concluído',
          ),
        { timeout: 30_000 },
      );
      await page.waitForTimeout(600);
      await closeOverlay('frameOverlay');
      await action('job-library');
      await page.waitForSelector('#joblibOverlay:not(.hidden)');
      await page.waitForTimeout(500);
      await shot('16-biblioteca-jobs');
      await closeOverlay('joblibOverlay');
    });

    // ---------------------------------------------------------------- presets
    await step('17-presets', async () => {
      await action('presets');
      await page.waitForSelector('#presetOverlay:not(.hidden)');
      await page.fill('#presetName', 'MDF 3 mm — gravação');
      await page.fill(
        '#presetNotes',
        '100% / 1000 mm/min, 1 passada. Testado no MDF 3 mm.',
      );
      await click('#presetCreate');
      await page.waitForFunction(
        () => document.querySelectorAll('#presetList .preset-item').length > 0,
        { timeout: 10_000 },
      );
      await page.waitForTimeout(400);
      await shot('17-presets');
      await closeOverlay('presetOverlay');
    });

    await step('18-materiais', async () => {
      await page.click('[data-tab="image"]');
      await click('#matCatalog');
      await page.waitForSelector('#matOverlay:not(.hidden)');
      await page.waitForTimeout(500);
      await shot('18-materiais');
      await closeOverlay('matOverlay');
    });

    await step('19-teste-material', async () => {
      await action('material-test');
      await page.waitForSelector('#matTestOverlay:not(.hidden)');
      await shot('19-teste-material');
      await closeOverlay('matTestOverlay');
    });

    await step('20-teste-foco', async () => {
      await action('focus-test');
      await page.waitForSelector('#focusOverlay:not(.hidden)');
      await shot('20-teste-foco');
      await closeOverlay('focusOverlay');
    });

    await step('21-lote', async () => {
      await action('batch');
      await page.waitForSelector('#batchOverlay:not(.hidden)');
      await page.fill(
        '#batchCsv',
        'nome,cargo\nAna,Dev\nBruno,Ops\nCarla,Design',
      );
      await page.waitForTimeout(800);
      await shot('21-lote');
      await closeOverlay('batchOverlay');
    });

    await step('22-producao', async () => {
      await page.click('[data-tab="run"]');
      await page.evaluate(() => {
        const g = document.getElementById('productionGroup');
        if (g) g.open = true;
      });
      await page.waitForTimeout(300);
      await shot('22-producao');
    });

    // ---------------------------------------------------------------- desenhar
    await step('23-desenhar', async () => {
      await action('design');
      await page.waitForSelector('#designOverlay:not(.hidden)');
      const box = await page.locator('#designCanvas').boundingBox();
      if (!box) throw new Error('canvas sem área');
      await page.click('#designToolRect');
      await page.mouse.move(box.x + 150, box.y + 150);
      await page.mouse.down();
      await page.mouse.move(box.x + 330, box.y + 270);
      await page.mouse.up();
      await page.click('#designToolCircle');
      await page.mouse.move(box.x + 380, box.y + 190);
      await page.mouse.down();
      await page.mouse.move(box.x + 500, box.y + 300);
      await page.mouse.up();
      await shot('23-desenhar');
    });

    const designDialog = async (name, btn, overlay) => {
      await step(name, async () => {
        await click(btn);
        await page.waitForTimeout(500);
        await shot(name);
        await closeOverlay(overlay);
      });
    };

    await designDialog('24-biblioteca-simbolos', '#designLib', 'designLibOverlay');
    await designDialog('25-gabarito', '#designJig', 'designJigOverlay');
    await designDialog('26-geradores', '#designGen', 'designGenOverlay');
    await designDialog('27-dois-lados', '#designDouble', 'designDoubleOverlay');
    await designDialog(
      '28-marcas-registro',
      '#designFiducial',
      'designFiducialOverlay',
    );
    await designDialog('29-tiles', '#designTiles', 'designTilesOverlay');
    await designDialog('30-matriz-copias', '#designArray', 'designArrayOverlay');
    await designDialog('31-encaixe', '#designNest', 'designNestOverlay');

    await step('32-contorno-paralelo', async () => {
      await click('#designBoolMenu');
      await page.waitForTimeout(250);
      await click('#designBoolOffset');
      await page.waitForSelector('#designOffsetOverlay:not(.hidden)');
      await shot('32-contorno-paralelo');
      await closeOverlay('designOffsetOverlay');
    });

    await step('33-tamanho-arte', async () => {
      await click('#designGenerate');
      await page.waitForSelector('#designSizeOverlay:not(.hidden)');
      await shot('33-tamanho-arte');
      await closeOverlay('designSizeOverlay');
    });

    await closeOverlay('designOverlay');

    // ---------------------------------------------------------------- símbolos
    await step('34-qr', async () => {
      await action('qr-code');
      await page.waitForSelector('#qrOverlay:not(.hidden)');
      await page.fill(
        '#qrContent',
        'https://github.com/viniciuswerneck/GRBL-Studio',
      );
      await click('#qrGenerate');
      await page.waitForSelector('#frameOverlay:not(.hidden)');
      await closeOverlay('frameOverlay');
      await page.waitForTimeout(500);
      await shot('34-qr', '#qrOverlay .modal');
      await closeOverlay('qrOverlay');
    });

    await step('35-codigo-barras', async () => {
      await action('bar-code');
      await page.waitForSelector('#barcodeOverlay:not(.hidden)');
      await page.fill('#barContent', 'GRBL-001');
      await click('#barGenerate');
      await page.waitForSelector('#frameOverlay:not(.hidden)');
      await closeOverlay('frameOverlay');
      await page.waitForTimeout(500);
      await shot('35-codigo-barras', '#barcodeOverlay .modal');
      await closeOverlay('barcodeOverlay');
    });

    // ---------------------------------------------------------------- extras
    await step('36-aparencia', async () => {
      await action('appearance');
      await page.waitForSelector('#appearanceOverlay:not(.hidden)');
      await shot('36-aparencia');
      await closeOverlay('appearanceOverlay');
    });

    await step('37-sobre', async () => {
      await app.evaluate(({ BrowserWindow }) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send('grbl:ev:about');
      });
      await page.waitForSelector('#aboutOverlay:not(.hidden)');
      await shot('37-sobre');
      await closeOverlay('aboutOverlay');
    });

    log('Captura concluída.');
  } finally {
    await app.close();
    emulator.close();
    rmSync(userData, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
