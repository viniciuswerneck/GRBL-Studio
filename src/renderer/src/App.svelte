<script lang="ts">
/**
 * App principal — GRBL Studio (Svelte 5 + runes).
 * Providers: ThemeProvider, I18nProvider.
 * Layout: AppShell com NavRail + conteúdo roteado.
 *
 * Views já migradas: connection, jog, file, preview, config, image, design.
 * Cada view recebe estado via props e expõe callbacks que acionam window.grbl.
 */

import { ThemeProvider } from './lib/providers/ThemeProvider';
import { I18nProvider } from './lib/providers/I18nProvider';
import { ConnectionScreen } from './lib/components/ConnectionScreen';
import { NavRail } from './lib/components/NavRail';
import { AppShell } from './lib/components/AppShell';
import { JogView } from './lib/components/JogView';
import { FileView } from './lib/components/FileView';
import { PreviewView } from './lib/components/PreviewView';
import { ConfigView } from './lib/components/ConfigView';
import { ImageView } from './lib/components/ImageView';
import { DesignView } from './lib/components/DesignView';

// Estado de navegação (Svelte 5 runes)
let currentView = $state<
  'connection' | 'jog' | 'file' | 'preview' | 'config' | 'image' | 'design'
>('connection');

function navigate(view: typeof currentView) {
  currentView = view;
}

// --- Estado mínimo da máquina (espelho do main via window.grbl) ---
let connected = $state(false);
let homing = $state(false);
let alarm = $state(false);
let machineHoming = $state(false);

// Estado do job / arquivo
let jobState = $state<'idle' | 'running' | 'paused' | 'alarm'>('idle');
let fileName = $state<string | null>(null);
let fileLines = $state(0);
let fileSize = $state(0);
let estimatedSec = $state(0);
let currentLine = $state(0);
let elapsedSec = $state(0);

// Estado da imagem
let imageLoaded = $state(false);
let gcodeGenerated = $state(false);

// Fonte do job
let jobSource = $state<'file' | 'image' | 'design'>('file');

// Status da máquina (posição, etc.)
let machineStatus = $state<{
  mpos?: [number, number, number];
  wpos?: [number, number, number];
} | null>(null);

// --- Callbacks que acionam o main via preload (window.grbl) ---
function onJog(axis: 'X' | 'Y' | 'Z', dir: -1 | 1, step: number) {
  void window.grbl?.jog({ axis, dir, step, feed: 1000 });
}

function onHome() {
  void window.grbl?.home();
}

function onSetOrigin() {
  void window.grbl?.setOrigin(0, 0, 0);
}

function onGotoZero() {
  void window.grbl?.gotoZero();
}

function onUnlock() {
  void window.grbl?.unlock();
}

function onReset() {
  void window.grbl?.reset();
}

function onStopJob() {
  void window.grbl?.stopJob();
}

function onPlay() {
  void window.grbl?.startJob([]);
}

function onPause() {
  void window.grbl?.pauseJob();
}

function onResume() {
  void window.grbl?.resumeJob();
}

function onOpenFile() {
  void window.grbl?.openGcode();
}

function onOpenLibrary() {
  // Biblioteca de jobs — aciona main
  void window.grbl?.jobLibrary.list();
}

function onBatch() {
  void window.grbl?.openCsv();
}

function onFrameOutline() {
  // Posicionar: contorno com laser fraco
  void window.grbl?.writeLine('$J=G91 X0 Y0 F1000');
}

function onFrameCenter() {
  // Marcar centro — stub, será conectado ao preview
}

function onSetOriginPreview() {
  void window.grbl?.setOrigin(0, 0, 0);
}

function onSimToggle() {
  // Simulação de job — stub de UI
}

function onZoomIn() {
  /* stub */
}
function onZoomOut() {
  /* stub */
}
function onZoomFit() {
  /* stub */
}
function onZoom100() {
  /* stub */
}

function onApplySetting(id: string, value: string | number) {
  void window.grbl?.applySetting({ id, value });
}

function onRefreshSettings() {
  void window.grbl?.readSettings();
}

function onOpenImage() {
  void window.grbl?.openImage();
}

function onGenerate() {
  // Geração de G-code da imagem — lógica no shared, acionada pelo main
}

function onSave() {
  void window.grbl?.saveGcode('', 'job.gcode');
}

function onMaterialPreset() {
  // Apresenta perfis de material — stub
}
</script>

<ThemeProvider>
  <I18nProvider>
    <AppShell>
      <NavRail current={currentView} onNavigate={navigate} />

      <main class="app-main" role="main">
        {#if currentView === 'connection'}
          <ConnectionScreen />
        {:else if currentView === 'jog'}
          <JogView
            connected={connected}
            homing={homing}
            alarm={alarm}
            machineHoming={machineHoming}
            onJog={onJog}
            onHome={onHome}
            onSetOrigin={onSetOrigin}
            onGotoZero={onGotoZero}
            onUnlock={onUnlock}
            onReset={onReset}
            onStopJob={onStopJob}
            status={machineStatus}
          />
        {:else if currentView === 'file'}
          <FileView
            connected={connected}
            jobState={jobState}
            file={fileName ? { name: fileName, lines: fileLines, size: fileSize, estimatedSec } : null}
            currentLine={currentLine}
            estimatedSec={estimatedSec}
            elapsedSec={elapsedSec}
            onOpenFile={onOpenFile}
            onOpenLibrary={onOpenLibrary}
            onPlay={onPlay}
            onPause={onPause}
            onResume={onResume}
            onStop={onStopJob}
            onBatch={onBatch}
          />
        {:else if currentView === 'preview'}
          <PreviewView
            jobSource={jobSource}
            hasGcode={gcodeGenerated}
            connected={connected}
            inWorkArea={true}
            onRender={() => {}}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onZoomFit={onZoomFit}
            onZoom100={onZoom100}
            onFrameOutline={onFrameOutline}
            onFrameCenter={onFrameCenter}
            onSetOrigin={onSetOriginPreview}
            onPlay={onPlay}
            simPlaying={false}
            onSimToggle={onSimToggle}
          />
        {:else if currentView === 'config'}
          <ConfigView
            settings={[]}
            connected={connected}
            onApplySetting={onApplySetting}
            onRefresh={onRefreshSettings}
          />
        {:else if currentView === 'image'}
          <ImageView
            connected={connected}
            imageLoaded={imageLoaded}
            gcodeGenerated={gcodeGenerated}
            fileName={fileName}
            onOpenImage={onOpenImage}
            onGenerate={onGenerate}
            onSave={onSave}
            onMaterialPreset={onMaterialPreset}
          />
        {:else if currentView === 'design'}
          <DesignView />
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
</style>
