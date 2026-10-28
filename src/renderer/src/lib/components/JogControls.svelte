/**
 * JogControls — controles de movimento manual (X/Y/Z) da máquina GRBL.
 *
 * Componente isolado do renderer, Svelte 5 + TypeScript. Não envia comandos
 * GRBL diretamente; expõe callbacks para o caller (renderer.js ou main) acionar
 * via `window.grbl.jog(...)`, `window.grbl.home()`, etc.
 */

interface JogControlsProps {
  connected: boolean;
  homing: boolean;
  alarm: boolean;
  onJog: (axis: 'X' | 'Y' | 'Z', dir: -1 | 1, step: number) => void;
  onHome: () => void;
  onSetOrigin: () => void;
  onGotoZero: () => void;
  onUnlock: () => void;
  onReset: () => void;
  step?: number;
  feed?: number;
}

export function JogControls({
  connected,
  homing,
  alarm,
  onJog,
  onHome,
  onSetOrigin,
  onGotoZero,
  onUnlock,
  onReset,
  step = 1,
  feed = 1000,
}: JogControlsProps) {
  const disabled = !connected || alarm;
  const jogDisabled = disabled || homing;

  const axes = [
    { name: 'X', dirs: [-1, 1] },
    { name: 'Y', dirs: [-1, 1] },
    { name: 'Z', dirs: [-1, 1] },
  ];

  return (
    <div class="jog-controls" aria-label="Movimento manual (JOG)">
      <div class="jog-controls__grid">
        <span aria-hidden="true"></span>
        <button
          class="jog-btn"
          disabled={jogDisabled}
          aria-label="Y +"
          onclick={() => onJog('Y', 1, step)}
        >
          ↑
        </button>
        <span aria-hidden="true"></span>
        <button
          class="jog-btn jog-btn--secondary"
          disabled={disabled}
          aria-label="Home"
          onclick={onHome}
        >
          Home
        </button>
        <button
          class="jog-btn"
          disabled={jogDisabled}
          aria-label="X −"
          onclick={() => onJog('X', -1, step)}
        >
          ←
        </button>
        <button
          class="jog-btn jog-btn--primary"
          disabled={disabled}
          aria-label="Definir origem"
          onclick={onSetOrigin}
        >
          Origem
        </button>
        <button
          class="jog-btn"
          disabled={jogDisabled}
          aria-label="X +"
          onclick={() => onJog('X', 1, step)}
        >
          →
        </button>
        <span aria-hidden="true"></span>
        <button
          class="jog-btn"
          disabled={jogDisabled}
          aria-label="Y −"
          onclick={() => onJog('Y', -1, step)}
        >
          ↓
        </button>
        <span aria-hidden="true"></span>
      </div>

      <div class="jog-controls__z">
        <button
          class="jog-btn"
          disabled={jogDisabled}
          aria-label="Z −"
          onclick={() => onJog('Z', -1, step)}
        >
          Z −
        </button>
        <button
          class="jog-btn"
          disabled={jogDisabled}
          aria-label="Z +"
          onclick={() => onJog('Z', 1, step)}
        >
          Z +
        </button>
      </div>

      <div class="jog-controls__actions">
        <select
          class="jog-select"
          disabled={disabled}
          aria-label="Passo (mm)"
          bind:value={step}
        >
          <option value={0.01}>0,01 mm</option>
          <option value={0.1}>0,1 mm</option>
          <option value={1}>1 mm</option>
          <option value={5}>5 mm</option>
          <option value={10}>10 mm</option>
          <option value={50}>50 mm</option>
        </select>
        <select
          class="jog-select"
          disabled={disabled}
          aria-label="Avanço (mm/min)"
          bind:value={feed}
        >
          <option value={500}>500 mm/min</option>
          <option value={1000}>1000 mm/min</option>
          <option value={3000}>3000 mm/min</option>
        </select>
      </div>

      <div class="jog-controls__safety">
        <button
          class="jog-btn jog-btn--danger"
          disabled={disabled}
          aria-label="Unlock ($X)"
          onclick={onUnlock}
        >
          Unlock
        </button>
        <button
          class="jog-btn jog-btn--danger"
          disabled={disabled}
          aria-label="Reset"
          onclick={onReset}
        >
          Reset
        </button>
        <button
          class="jog-btn jog-btn--primary"
          disabled={disabled}
          aria-label="Ir para zero"
          onclick={onGotoZero}
        >
          Ir p/ zero
        </button>
      </div>
    </div>
  );
}
