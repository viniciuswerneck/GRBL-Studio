/**
 * Teste de smoke para os componentes Svelte 5 do renderer.
 *
 * Verifica que os arquivos de componente existem no disco, confirmando que a
 * migração incremental do renderer (vanilla JS → Svelte 5) está avançando.
 * Não renderiza no DOM (ambiente Node) — valida apenas a presença dos arquivos.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const COMPONENTS_DIR = join(process.cwd(), 'src/renderer/src/lib/components');

const components = [
  'AboutModal.svelte',
  'ConnectionBadge.svelte',
  'JobProgress.svelte',
  'JogControls.svelte',
  'PortList.svelte',
  'JogView.svelte',
  'FileView.svelte',
  'PreviewView.svelte',
  'ConfigView.svelte',
  'ImageView.svelte',
  'StatusBar.svelte',
  'MachineStatus.svelte',
  'Console.svelte',
];

describe('Svelte components (renderer migration)', () => {
  it.each(components)('existe %s', (name) => {
    const path = join(COMPONENTS_DIR, name);
    expect(() => readFileSync(path, 'utf8')).not.toThrow();
  });

  it('App.svelte importa as 5 views migradas', () => {
    const app = readFileSync(
      join(process.cwd(), 'src/renderer/src/App.svelte'),
      'utf8',
    );
    const views = [
      'JogView',
      'FileView',
      'PreviewView',
      'ConfigView',
      'ImageView',
    ];
    for (const base of views) {
      expect(app).toContain(`./lib/components/${base}`);
    }
  });

  it('global.d.ts declara window.grbl e *.svelte module', () => {
    const globals = readFileSync(
      join(process.cwd(), 'src/renderer/src/global.d.ts'),
      'utf8',
    );
    expect(globals).toContain('window.grbl');
    expect(globals).toContain("'*.svelte'");
  });
});
