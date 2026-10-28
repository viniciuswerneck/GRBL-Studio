/**
 * PreviewView — tela de preview 2D da trajetória do G-code.
 *
 * Componente de view Svelte 5. Renderiza o caminho no <canvas> e expõe
 * callbacks para zoom/pan e posicionamento (contorno / marcar centro).
 * A pintura real do canvas fica delegada ao caller via `onRender`.
 */

interface PreviewViewProps {
  jobSource: 'file' | 'image' | 'design';
  hasGcode: boolean;
  connected: boolean;
  inWorkArea: boolean;
  onRender: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoom100: () => void;
  onFrameOutline: () => void;
  onFrameCenter: () => void;
  onSetOrigin: () => void;
  onPlay: () => void;
  simPlaying: boolean;
  onSimToggle: () => void;
}

export function PreviewView({
  jobSource,
  hasGcode,
  connected,
  inWorkArea,
  onRender,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoom100,
  onFrameOutline,
  onFrameCenter,
  onSetOrigin,
  onPlay,
  simPlaying,
  onSimToggle,
}: PreviewViewProps) {
  return (
    <section class="preview-view">
      <header class="preview-view__head">
        <h2 class="preview-view__title">Preview 2D</h2>
        <div class="preview-view__source-chip">
          {jobSource === 'image' ? 'Imagem → G-code' : jobSource === 'design' ? 'Desenho' : 'Arquivo'}
        </div>
      </header>

      <div class="preview-view__body">
        <div class="preview-view__canvas-wrap">
          {hasGcode ? (
            <canvas
              class="preview-canvas"
              width={900}
              height={600}
              aria-label="Trajetória do G-code"
            />
          ) : (
            <div class="preview-empty">
              <p class="preview-empty__hint">{'Carregue um arquivo, imagem ou desenho para ver a trajetória'}</p>
            </div>
          )}
          {!inWorkArea && hasGcode && (
            <div class="preview-warning">
              ⚠️ O job excede a área de trabalho da máquina.
            </div>
          )}
        </div>

        <aside class="preview-view__sidebar">
          <div class="preview-controls">
            <div class="preview-zoom">
              <button class="preview-btn" disabled={!hasGcode} onclick={onZoomOut}>
                −
              </button>
              <button class="preview-btn preview-btn--value" onclick={onZoom100}>
                100%
              </button>
              <button class="preview-btn" disabled={!hasGcode} onclick={onZoomIn}>
                +
              </button>
              <button class="preview-btn" disabled={!hasGcode} onclick={onZoomFit}>
                Ajustar
              </button>
            </div>

            <div class="preview-actions">
              <button
                class="preview-btn preview-btn--outline"
                disabled={!connected || !hasGcode}
                onclick={onFrameOutline}
              >
                🖌️ Contorno
              </button>
              <button
                class="preview-btn preview-btn--outline"
                disabled={!connected || !hasGcode}
                onclick={onFrameCenter}
              >
                🎯 Centro
              </button>
              <button
                class="preview-btn preview-btn--primary"
                disabled={!connected || !hasGcode}
                onclick={onSetOrigin}
              >
                📍 Definir origem
              </button>
            </div>

            <div class="preview-sim">
              <button
                class={`preview-btn ${simPlaying ? 'preview-btn--active' : ''}`}
                disabled={!hasGcode}
                onclick={onSimToggle}
              >
                {simPlaying ? '⏸ Simulação' : '▶ Simular'}
              </button>
            </div>
          </div>

          <div class="preview-hint">
            <p class="preview-hint__text">
              Roda: zoom · arrastar: mover · clique: mover a cabeça · duplo clique: ajustar
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
