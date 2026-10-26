/**
 * Card — container Fluent/Win11 com elevação, borda, raio 8px.
 */

interface CardProps {
  children: any;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  interactive = false,
  onClick,
  'aria-label': ariaLabel,
  ...rest
}: CardProps) {
  const isHovered = $state(false);
  const isPressed = $state(false);
  
  const variantClasses = {
    default: 'fluent-card--default',
    elevated: 'fluent-card--elevated',
    outlined: 'fluent-card--outlined',
    filled: 'fluent-card--filled',
  }[variant];
  
  const paddingClasses = {
    none: 'fluent-card--p-none',
    sm: 'fluent-card--p-sm',
    md: 'fluent-card--p-md',
    lg: 'fluent-card--p-lg',
  }[padding];
  
  const classes = [
    'fluent-card',
    variantClasses,
    paddingClasses,
    interactive ? 'fluent-card--interactive' : '',
    isHovered ? 'fluent-card--hover' : '',
    isPressed ? 'fluent-card--pressed' : '',
  ].join(' ');
  
  function handleMouseEnter() { if (interactive) isHovered = true; }
  function handleMouseLeave() { isHovered = false; isPressed = false; }
  function handleMouseDown() { if (interactive) isPressed = true; }
  function handleMouseUp() { isPressed = false; }
  
  const Tag = interactive && onClick ? 'button' : 'div';
  
  return (
    <Tag
      class={classes}
      role={interactive && onClick ? 'button' : undefined}
      aria-label={ariaLabel}
      aria-pressed={interactive && onClick ? undefined : undefined}
      onmouseenter={handleMouseEnter}
      onmouseleave={handleMouseLeave}
      onmousedown={handleMouseDown}
      onmouseup={handleMouseUp}
      onclick={interactive && onClick ? onClick : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}