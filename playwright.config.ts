import { defineConfig } from '@playwright/test';

/**
 * E2E do app Electron (Fase 8). Roda o binário do Electron do projeto (não
 * baixa navegadores) e dirige o renderer real via Playwright.
 *
 * Requer um display: use `xvfb-run -a npm run test:e2e` em ambientes headless.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
});
