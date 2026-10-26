import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const ROOT = resolve(__dirname, '..');
const SHARED = resolve(ROOT, 'src/shared');

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        runes: true,
      },
      emitCss: false,
    }),
  ],
  resolve: {
    alias: {
      '@shared': SHARED,
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      external: ['electron'],
    },
    commonjsOptions: {
      include: [/src\/shared/, /node_modules/],
    },
  },
  optimizeDeps: {
    include: ['@shared/i18n', '@shared/themes'],
  },
});
