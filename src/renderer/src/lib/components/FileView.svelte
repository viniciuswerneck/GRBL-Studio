/**
 * FileView — tela de carregamento e execução de arquivos G-code.
 *
 * Componente de view Svelte 5. Recebe estado via props e expõe callbacks para
 * o caller acionar `window.grbl` (abrir arquivo, iniciar/pausar/parar job).
 */

interface FileInfo {
  name: string;
  lines: number;
  size: number;
  estimatedSec: number;
}

interface FileViewProps {
  connected: boolean;
  jobState: 'idle' | 'running' | 'paused' | 'alarm';
  file: FileInfo | null;
  currentLine: number;
  estimatedSec: number;
  elapsedSec: number;
  onOpenFile: () => void;
  onOpenLibrary: () => void;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onBatch: () => void;
}

export function FileView({
  connected,
  jobState,
  file,
  currentLine,
  estimatedSec,
  elapsedSec,
  onOpenFile,
  onOpenLibrary,
  onPlay,
  onPause,
  onResume,
  onStop,
  onBatch,
}: FileViewProps) {
  const running = jobState === 'running';
  const paused = jobState === 'paused';
  const idle = jobState === 'idle';
  const hasFile = file !== null;

  const canPlay = connected && hasFile && (idle || paused);
  const canPause = running;
  const canStop = running || paused;

  return (
    <section class="file-view">
      <header class="file-view__head">
        <h2 class="file-view__title">Execução</h2>
        <div class="file-view__status">
          <span class={`file-pill ${running ? 'file-pill--run' : paused ? 'file-pill--hold' : idle ? 'file-pill--idle' : 'file-pill--alarm'}`}>
            {running ? 'Executando' : paused ? 'Pausado' : idle ? 'Ocioso' : 'Alarme'}
          </span>
        </div>
      </header>

      <div class="file-view__body">
        <div class="file-view__file">
          <div class="file-card">
            <h3 class="file-card__title">{file?.name ?? 'Nenhum arquivo carregado'}</h3>
            {file && (
              <dl class="file-card__meta">
                <div class="file-card__meta-row">
                  <dt>Linhas</dt>
                  <dd>{file.lines.toLocaleString('pt-BR')}</dd>
                </div>
                <div class="file-card__meta-row">
                  <dt>Tamanho</dt>
                  <dd>{(file.size / 1024).toFixed(1)} KB</dd>
                </div>
                <div class="file-card__meta-row">
                  <dt>Tempo estimado</dt>
                  <dd>{formatSeconds(file.estimatedSec)}</dd>
                </div>
              </dl>
            )}
            <div class="file-card__actions">
              {hasFile ? (
                <>
                  <button class="file-btn" disabled={!connected} onclick={onOpenLibrary}>
                    📚 Biblioteca
                  </button>
                  <button class="file-btn" disabled={!connected} onclick={onBatch}>
                    📋 Lote (CSV)
                  </button>
                </>
              ) : (
                <button class="file-btn-primary" disabled={!connected} onclick={onOpenFile}>
                  📂 Abrir G-code…
                </button>
              )}
            </div>
          </div>
        </div>

        <div class="file-view__controls">
          <div class="file-controls">
            <JobProgress
              currentLine={currentLine}
              totalLines={file?.lines ?? 0}
              estimatedSec={estimatedSec}
              elapsedSec={elapsedSec}
            />
            <div class="file-btn-group">
              <button
                class="file-btn-play"
                disabled={!canPlay}
                onclick={paused ? onResume : onPlay}
              >
                {paused ? '▶ Retomar' : '▶ Iniciar'}
              </button>
              <button
                class="file-btn-pause"
                disabled={!canPause}
                onclick={onPause}
              >
                ⏸ Pausar
              </button>
              <button
                class="file-btn-stop"
                disabled={!canStop}
                onclick={onStop}
              >
                ⏹ Parar
              </button>
            </div>
            <div class="file-hint">
              {idle && hasFile
                ? 'Pré-voo roda automaticamente antes do início.'
                : paused
                ? 'Job pausado. Retome ou pare.'
                : running
                ? 'Job em execução. Sobrecarga acessível na barra flutuante.'
                : 'Abra um arquivo .gcode para começar.'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  function formatSeconds(s: number): string {
    const total = Math.max(0, Math.floor(s));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }
}
