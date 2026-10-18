// Mede o custo do preview de G-code (RF-PRV-1..5 / RNF-11).
// Uso: npm run bench:preview  (requer display: xvfb-run -a npm run bench:preview)
import fs from 'node:fs';
import { _electron } from '@playwright/test';

const GCODE = process.argv[2] || '/tmp/opencode/bench-raster.gcode';

(async () => {
  const app = await _electron.launch({ args: ['.', '--no-sandbox'], cwd: process.cwd(), env: { ...process.env, GRBL_E2E: '1' } });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  const gcode = fs.readFileSync(GCODE, 'utf8');
  const r = await page.evaluate((text) => {
    setGcodePreview(text, 'bench');
    const total = previewProgram.program.totalLines;
    const N = 20;
    const ms = (fn) => { const t0 = performance.now(); fn(); return performance.now() - t0; };
    previewProgram.done = Math.floor(total / N);
    const frio = ms(() => drawGcodePreview());
    const quente = [];
    for (let i = 2; i <= N; i++) {
      previewProgram.done = Math.floor((total * i) / N);
      quente.push(ms(() => drawGcodePreview()));
    }
    const antigo = [];
    for (let i = 1; i <= N; i++) {
      previewProgram.done = Math.floor((total * i) / N);
      previewLayers.key = '';
      antigo.push(ms(() => drawGcodePreview()));
    }
    return {
      moves: previewProgram.program.moves.length,
      frioMs: +frio.toFixed(1),
      quenteMedioMs: +(quente.reduce((a, b) => a + b, 0) / quente.length).toFixed(2),
      quenteMaxMs: +Math.max(...quente).toFixed(1),
      antigoMedioMs: +(antigo.reduce((a, b) => a + b, 0) / antigo.length).toFixed(2),
      antigoMaxMs: +Math.max(...antigo).toFixed(1),
    };
  }, gcode);
  console.log(JSON.stringify(r, null, 2));
  await app.close();
})();