/**
 * Console — log de comandos e respostas da máquina GRBL.
 *
 * Componente de view Svelte 5. Recebe linhas via props e expõe callback para
 * enviar comando pelo `window.grbl.writeLine`.
 */

interface ConsoleLine {
  text: string;
  kind: 'sent' | 'response' | 'error' | 'ok' | 'alarm';
}

interface ConsoleProps {
  lines: ConsoleLine[];
  paused: boolean;
  onSend: (command: string) => void;
  onClear: () => void;
  onTogglePause: () => void;
}

export function Console({
  lines,
  paused,
  onSend,
  onClear,
  onTogglePause,
}: ConsoleProps) {
  let inputValue = '';

  return (
    <div class="console-view">
      <div class="console__toolbar">
        <span class="console__label">Console GRBL</span>
        <button
          class="console-btn"
          aria-label={paused ? 'Retomar rolagem' : 'Pausar rolagem'}
          onclick={onTogglePause}
        >
          {paused ? '▶ Resumir' : '⏸ Pausar rolagem'}
        </button>
        <button class="console-btn console-btn--danger" aria-label="Limpar console" onclick={onClear}>
          🗑️ Limpar
        </button>
      </div>

      <div class="console__output">
        {lines.map((line, i) => (
          <div
            key={i}
            class={`console-line console-line--${line.kind}`}
            title={line.text}
          >
            {line.text}
          </div>
        ))}
        {lines.length === 0 && (
          <div class="console-empty">Sem mensagens ainda. Conecte e envie um comando.</div>
        )}
      </div>

      <div class="console__input">
        <input
          class="console-input"
          placeholder="Comando GRBL (ex.: $$, $I, $H, G0 X0 Y0)"
          bind:value={inputValue}
          onkeydown={(e) => {
            const ev = e as KeyboardEvent;
            if (ev.key === 'Enter' && inputValue.trim()) {
              onSend(inputValue.trim());
              inputValue = '';
            }
          }}
        />
        <button
          class="console-btn console-btn--primary"
          onclick={() => {
            if (inputValue.trim()) {
              onSend(inputValue.trim());
              inputValue = '';
            }
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
