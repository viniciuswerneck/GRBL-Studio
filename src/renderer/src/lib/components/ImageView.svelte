/**
 * ImageView — tela de importação de imagem → G-code.
 *
 * Componente de view Svelte 5. Recebe estado de imagem e parâmetros via props
 * e expõe callbacks para abrir imagem, gerar G-code e salvar.
 */

interface ImageViewProps {
  connected: boolean;
  imageLoaded: boolean;
  gcodeGenerated: boolean;
  fileName: string | null;
  onOpenImage: () => void;
  onGenerate: () => void;
  onSave: () => void;
  onMaterialPreset: () => void;
}

export function ImageView({
  connected,
  imageLoaded,
  gcodeGenerated,
  fileName,
  onOpenImage,
  onGenerate,
  onSave,
  onMaterialPreset,
}: ImageViewProps) {
  const canGenerate = imageLoaded;
  const canSave = gcodeGenerated;

  return (
    <section class="image-view">
      <header class="image-view__head">
        <h2 class="image-view__title">Imagem → G-code</h2>
      </header>

      <div class="image-view__body">
        <div class="image-view__file">
          <div class="image-card">
            <div class="image-card__status">
              {imageLoaded ? (
                <span class="image-pill image-pill--ok">✅ Imagem carregada</span>
              ) : (
                <span class="image-pill image-pill--empty">Nenhuma imagem</span>
              )}
            </div>
            <p class="image-card__name">{fileName ?? 'Nenhum arquivo selecionado'}</p>
            <div class="image-card__actions">
              <button
                class="image-btn-primary"
                disabled={!connected}
                onclick={onOpenImage}
              >
                🖼️ Escolher imagem…
              </button>
              <button
                class="image-btn"
                disabled={!connected}
                onclick={onMaterialPreset}
              >
                📦 Perfis de material
              </button>
            </div>
          </div>
        </div>

        <div class="image-view__convert">
          <div class="image-convert-card">
            <h3 class="image-convert-card__title">Conversão e gravação</h3>
            <div class="image-hints">
              <p class="image-hint">
                Algoritmos: line-to-line (fotos), dithering (logos/texto),
                centerline (linha única) ou vetorização (contorno/corte).
              </p>
              <p class="image-hint">
                Ajuste brilho, contraste, limiar B&W, velocidade e S-min/S-max
                antes de gerar.
              </p>
            </div>
            <div class="image-convert-actions">
              <button
                class="image-btn-primary"
                disabled={!canGenerate || !connected}
                onclick={onGenerate}
              >
                ⚙️ Gerar G-code
              </button>
              <button
                class="image-btn"
                disabled={!canSave || !connected}
                onclick={onSave}
              >
                💾 Salvar .gcode
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="image-view__hint">
        O preview atualiza automaticamente ao gerar. Use "Posicionar" para
        conferir o contorno com laser fraco antes de gravar.
      </div>
    </section>
  );
}
