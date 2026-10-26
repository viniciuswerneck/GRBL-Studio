/**
 * Badge — indicador de estado Fluent/Win11 (conectado, rodando, pausa, alarme, etc.).
 */

type BadgeVariant = 
  | 'default' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'neutral';

interface BadgeProps {
  children: any;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
}

const variantColors: Record<BadgeVariant, string> = {
  default: 'var(--accent)',
  success: 'var(--success, #6CCB5F)',
  warning: 'var(--warning, #FFB900)',
  danger: 'var(--danger, #FF5C5C)',
  info: 'var(--info, #0078D4)',
  neutral: 'var(--text-sub)',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
}: BadgeProps) {
  const color = variantColors[variant];
  
  const sizeClasses = {
    sm: 'fluent-badge--sm',
    md: 'fluent-badge--md',
    lg: 'fluent-badge--lg',
  }[size];
  
  const classes = [
    'fluent-badge',
    `fluent-badge--${variant}`,
    sizeClasses,
    dot ? 'fluent-badge--dot' : '',
    pulse ? 'fluent-badge--pulse' : '',
  ].join(' ');
  
  return (
    <span class={classes} style={`--badge-color: ${color};`}>
      {dot && <span class="fluent-badge__dot" aria-hidden="true" />}
      <span class="fluent-badge__text">{children}</span>
    </span>
  );
}