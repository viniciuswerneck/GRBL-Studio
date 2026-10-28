/**
 * ConnectionBadge — indicador de estado de conexão com a máquina GRBL.
 *
 * Componente isolado do renderer, escrito em Svelte 5 + TypeScript.
 * Recebe o estado via props e não toca em protocolo GRBL (isso vive no main).
 * Montável incrementalmente no DOM existente do renderer.js vanilla.
 */

interface ConnectionBadgeProps {
  /** 'disconnected' | 'connecting' | 'connected' | 'alarm' | 'error' */
  state: string;
  label?: string;
}

export function ConnectionBadge({ state, label }: ConnectionBadgeProps) {
  const labels: Record<string, string> = {
    disconnected: 'Desconectado',
    connecting: 'Conectando…',
    connected: 'Conectado',
    alarm: 'Alarme',
    error: 'Erro',
  };

  const variants: Record<string, string> = {
    disconnected: 'badge--off',
    connecting: 'badge--pending',
    connected: 'badge--ok',
    alarm: 'badge--alarm',
    error: 'badge--error',
  };

  const text = label ?? labels[state] ?? state;
  const variant = variants[state] ?? 'badge--off';

  return (
    <span class={`connection-badge ${variant}`} aria-label={text}>
      <span class="connection-badge__dot" aria-hidden="true"></span>
      <span class="connection-badge__text">{text}</span>
    </span>
  );
}
