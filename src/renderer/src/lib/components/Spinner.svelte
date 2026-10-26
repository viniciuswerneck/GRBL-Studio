/**
 * Spinner — indicador de carregamento Fluent/Win11.
 */

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string; // para screen readers
}

export function Spinner({ size = 'md', label = 'Carregando' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'fluent-spinner--sm',
    md: 'fluent-spinner--md',
    lg: 'fluent-spinner--lg',
  }[size];
  
  return (
    <span class={`fluent-spinner ${sizeClasses}`} role="status" aria-live="polite" aria-label={label}>
      <svg class="fluent-spinner__svg" viewBox="0 0 24 24" aria-hidden="true">
        <circle
          class="fluent-spinner__circle"
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-dasharray="31.4 31.4"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      <span class="fluent-spinner__label" aria-hidden="true">{label}</span>
    </span>
  );
}