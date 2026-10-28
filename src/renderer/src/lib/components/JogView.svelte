/**
 * JogView — tela de movimento manual (JOG) da máquina GRBL.
 *
 * Componente de view montado no App.svelte (Svelte 5). Delegada a comandos
 * para o caller via `window.grbl` (preload). Não toca protocolo GRBL aqui.
 */

interface JogViewProps {
  connected: boolean;
  homing: boolean;
  alarm: boolean;
  machineHoming: boolean;
  onJog: (axis: 'X' | 'Y' | 'Z', dir: -1 | 1, step: number) => void;
  onHome: () => void;
  onSetOrigin: () => void;
  onGotoZero: () => void;
  onUnlock: () => void;
  onReset: () => void;
  onStopJob: () => void;
  step?: number;
  feed?: number;
  /** Último status da máquina (para exibir posição real, se disponível). */
  status?: { mpos?: [number, number, number]; wpos?: [number, number, number] } | null;
}

export function JogView({
  connected,
  homing,
  alarm,
  machineHoming,
  onJog,
  onHome,
  onSetOrigin,
  onGotoZero,
  onUnlock,
  onReset,
  onStopJob,
  step = 1,
  feed = 1000,
  status = null,
}: JogViewProps) {
  const disabled = !connected || alarm;
  const jogDisabled = disabled || homing;

  const mpos = status?.mpos ?? null;
  const wpos = status?.wpos ?? null;

  return (
    <section class="jog-view">
      <header class="jog-view__head">
        <h2 class="jog-view__title">Movimento (JOG)</h2>
        <div class="jog-view__status">
          <span class={`jog-pill ${alarm ? 'jog-pill--alarm' : connected ? 'jog-pill--ok' : 'jog-pill--off'}`}>
            {alarm ? 'Alarme' : connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </header>

      <div class="jog-view__body">
        <div class="jog-view__pad">
          <JogControls
            connected={connected}
            homing={homing}
            alarm={alarm}
            onJog={onJog}
            onHome={onHome}
            onSetOrigin={onSetOrigin}
            onGotoZero={onGotoZero}
            onUnlock={onUnlock}
            onReset={onReset}
            step={step}
            feed={feed}
          />
        </div>

        <aside class="jog-view__sidebar">
          <div class="jog-card">
            <h3 class="jog-card__title">Posição</h3>
            <div class="jog-card__axis">
              <span class="jog-card__label">X</span>
              <span class="jog-card__value">{mpos?.[0]?.toFixed(3) ?? '—'}</span>
              <span class="jog-card__unit">mm</span>
            </div>
            <div class="jog-card__axis">
              <span class="jog-card__label">Y</span>
              <span class="jog-card__value">{mpos?.[1]?.toFixed(3) ?? '—'}</span>
              <span class="jog-card__unit">mm</span>
            </div>
            <div class="jog-card__axis">
              <span class="jog-card__label">Z</span>
              <span class="jog-card__value">{mpos?.[2]?.toFixed(3) ?? '—'}</span>
              <span class="jog-card__unit">mm</span>
            </div>
            {wpos && (
              <div class="jog-card__divider" />
            )}
            <div class="jog-card__hint">
              {machineHoming ? 'Homing disponível' : 'Sem fim de curso — use "Definir origem"'}
            </div>
          </div>

          <div class="jog-actions">
            <button
              class="jog-btn-primary"
              disabled={disabled}
              onclick={onHome}
            >
              🏠 Home ($H)
            </button>
            <button
              class="jog-btn-danger"
              disabled={disabled}
              onclick={onUnlock}
            >
              🔓 Unlock ($X)
            </button>
            <button
              class="jog-btn-danger"
              disabled={disabled}
              onclick={onReset}
            >
              🔄 Reset
            </button>
            <button
              class="jog-btn-primary"
              disabled={disabled}
              onclick={onSetOrigin}
            >
              📍 Definir origem
            </button>
            <button
              class="jog-btn-primary"
              disabled={disabled}
              onclick={onGotoZero}
            >
              ➡️ Ir p/ zero
            </button>
            <button
              class="jog-btn-stop"
              disabled={!connected}
              onclick={onStopJob}
            >
              ⏹ Parar job
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
