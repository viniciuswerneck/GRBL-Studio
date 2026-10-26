import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname);
const MAIN = resolve(ROOT, 'src/main');
const PRELOAD = resolve(ROOT, 'src/preload');
const RENDERER = resolve(ROOT, 'src/renderer');
const DIST = resolve(ROOT, 'dist');
const OUT = resolve(ROOT, 'out');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    ssr: {
      external: ['serialport', 'electron-updater'],
    },
    build: {
      outDir: resolve(DIST, 'main'),
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        input: resolve(MAIN, 'index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: resolve(DIST, 'preload'),
      emptyOutDir: false,
      sourcemap: true,
      rollupOptions: {
        input: resolve(PRELOAD, 'index.ts'),
      },
    },
  },
  // Renderer Svelte 5 é scaffold (o app carrega public/index.html).
  // Compila em out/ para validar, mas não entra no pacote.
  renderer: {
    entry: resolve(RENDERER, 'index.html'),
    outDir: resolve(OUT, 'renderer'),
    vite: {
      configFile: resolve(RENDERER, 'vite.config.ts'),
    },
  },
});
