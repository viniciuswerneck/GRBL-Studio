/**
 * Button — componente Fluent/Win11 com 4 estados (normal, hover, pressed, disabled).
 * Usa tokens CSS (--accent, --bg, --text, --r-sm, --dur-fast, --ease).
 */

interface ButtonProps extends Record<string, any> {
  children: any;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: (e: MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  'aria-pressed'?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  'aria-label': ariaLabel,
  'aria-pressed': ariaPressed,
  ...rest
}: ButtonProps) {
  const isPressed = $state(false);
  const isHovered = $state(false);
  
  const baseClasses = 'fluent-button';
  const variantClass = `fluent-button--${variant}`;
  const sizeClass = `fluent-button--${size}`;
  const widthClass = fullWidth ? 'fluent-button--full' : '';
  const stateClass = [
    disabled ? 'fluent-button--disabled' : '',
    loading ? 'fluent-button--loading' : '',
    isPressed ? 'fluent-button--pressed' : '',
    isHovered ? 'fluent-button--hover' : '',
  ].filter(Boolean).join(' ');
  
  const classes = [baseClasses, variantClass, sizeClass, widthClass, stateClass].join(' ');
  
  function handleMouseDown(e: MouseEvent) {
    if (!disabled && !loading) isPressed = true;
  }
  
  function handleMouseUp() {
    isPressed = false;
  }
  
  function handleMouseLeave() {
    isPressed = false;
    isHovered = false;
  }
  
  function handleMouseEnter() {
    if (!disabled && !loading) isHovered = true;
  }
  
  function handleClick(e: MouseEvent) {
    if (!disabled && !loading && onClick) onClick(e);
  }
  
  const buttonStyle = `
    --btn-bg: var(--bg-card);
    --btn-text: var(--text);
    --btn-border: var(--border);
    --btn-shadow: var(--shadow-1);
    --btn-radius: var(--r-sm);
    --btn-padding-x: var(--sp-3);
    --btn-padding-y: var(--sp-2);
    --btn-font: var(--font-ui);
    --btn-fs: var(--fs-14);
    --btn-gap: var(--sp-2);
  `;
  
  return (
    <button
      type={type}
      class={classes}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      onmousedown={handleMouseDown}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseLeave}
      onmouseenter={handleMouseEnter}
      onclick={handleClick}
      style={buttonStyle}
      {...rest}
    >
      {loading && (
        <span class="fluent-button__spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
        </span>
      )}
      <span class="fluent-button__content">{children}</span>
    </button>
  );
}