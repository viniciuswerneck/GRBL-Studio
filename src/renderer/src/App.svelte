<script lang="ts">
/**
 * App principal — GRBL Studio (Svelte 5 + runes).
 * Providers: ThemeProvider, I18nProvider.
 * Layout: AppShell com NavRail + conteúdo roteado.
 */

import { ThemeProvider } from './lib/providers/ThemeProvider';
import { I18nProvider } from './lib/providers/I18nProvider';
import { ConnectionScreen } from './lib/components/ConnectionScreen';
import { NavRail } from './lib/components/NavRail';
import { AppShell } from './lib/components/AppShell';
import { DesignView } from './lib/components/DesignView';

// Estado de navegação (Svelte 5 runes)
let currentView = $state<
  'connection' | 'jog' | 'file' | 'preview' | 'config' | 'image' | 'design'
>('connection');

function navigate(view: typeof currentView) {
  currentView = view;
}
</script>

<ThemeProvider>
  <I18nProvider>
    <AppShell>
      <NavRail current={currentView} onNavigate={navigate} />
      
      <main class="app-main" role="main">
        {#if currentView === 'connection'}
          <ConnectionScreen />
        {:else if currentView === 'design'}
          <DesignView />
        {:else}
          <div class="view-placeholder">
            <h2>{currentView} — Em desenvolvimento</h2>
            <p>Migração em andamento: Connection ✅ → Jog → File → Preview → Config → Image → Design</p>
          </div>
        {/if}
      </main>
    </AppShell>
  </I18nProvider>
</ThemeProvider>

<style>
  :host {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    font-family: var(--font-ui, system-ui, sans-serif);
    background: var(--bg);
    color: var(--text);
  }
  
  .app-main {
    flex: 1;
    padding: var(--sp-6);
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }
  
  .view-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;
    color: var(--text-sub);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: var(--sp-8);
  }
  
  .view-placeholder h2 {
    margin-top: 0;
    color: var(--accent);
  }
  
  .view-placeholder p {
    margin: var(--sp-4) 0 0;
    font-size: var(--fs-14);
  }
</style>