/**
 * Select — dropdown Fluent/Win11 acessível.
 */

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Record<string, any> {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  error?: string;
  placeholder?: string;
}

export function Select({
  label,
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  error,
  placeholder,
  ...rest
}: SelectProps) {
  const isOpen = $state(false);
  const isFocused = $state(false);
  
  function handleChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    if (!disabled) onChange(target.value);
  }
  
  function handleBlur() { isFocused = false; }
  function handleFocus() { isFocused = true; }
  
  const selectId = `select-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = error ? `${selectId}-error` : undefined;
  const labelId = label ? `${selectId}-label` : undefined;
  
  return (
    <div class="fluent-select-wrapper">
      {label && (
        <label id={labelId} class="fluent-select__label">{label}</label>
      )}
      <div class="fluent-select__trigger-wrapper">
        <select
          id={selectId}
          class="fluent-select"
          value={value}
          onchange={handleChange}
          onblur={handleBlur}
          onfocus={handleFocus}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel}
          aria-invalid={!!error}
          aria-describedby={[ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled selected hidden>{placeholder}</option>
          )}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span class="fluent-select__icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="16" height="16">
            <path d="M7 9l3 3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>
      {error && (
        <span id={errorId} class="fluent-select__error" role="alert">{error}</span>
      )}
    </div>
  );
}