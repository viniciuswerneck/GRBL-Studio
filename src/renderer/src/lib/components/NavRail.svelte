/**
 * NavRail — navegação lateral estilo Fluent/Win11.
 */

interface NavItem {
  id: string;
  label: string;
  icon: string; // SVG path ou componente
  badge?: string | number;
}

interface NavRailProps {
  current: string;
  onNavigate: (view: string) => void;
  compact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'connection', label: 'Conexão', icon: 'M10 4v12m-3-3h6M4 10h16', badge: undefined },
  { id: 'jog', label: 'Jog', icon: 'M12 4v12m-8 0l8-4 8 4', badge: undefined },
  { id: 'file', label: 'Arquivo', icon: 'M8 4v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H10a2 2 0 00-2 2z', badge: undefined },
  { id: 'preview', label: 'Preview', icon: 'M4 4v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H6a2 2 0 00-2 2z', badge: undefined },
  { id: 'config', label: 'Config', icon: 'M12 6v12m-6-6h12m-6-6v12', badge: undefined },
  { id: 'image', label: 'Imagem', icon: 'M4 4v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H6a2 2 0 00-2 2z', badge: undefined },
  { id: 'design', label: 'Desenhar', icon: 'M8 4v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H10a2 2 0 00-2 2z', badge: undefined },
];

export function NavRail({ current, onNavigate, compact = false }: NavRailProps) {
  const isHovered = $state(false);
  
  function handleItemClick(id: string) {
    onNavigate(id);
  }
  
  return (
    <nav class={`fluent-navrail ${compact ? 'fluent-navrail--compact' : ''}`} role="navigation" aria-label="Navegação principal">
      <div class="fluent-navrail__header">
        {!compact && (
          <div class="fluent-navrail__brand">
            <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
              <rect x="2" y="2" width="28" height="28" rx="6" fill="var(--accent)"/>
              <path d="M8 16h16M16 8v16" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <span class="fluent-navrail__title">GRBL Studio</span>
          </div>
        )}
      </div>
      
      <ul class="fluent-navrail__list" role="listbox">
        {#each NAV_ITEMS as item}
          <li 
            class={`fluent-navrail__item ${item.id === current ? 'fluent-navrail__item--active' : ''}`}
            role="option"
            aria-selected={item.id === current}
            onclick={() => handleItemClick(item.id)}
            onmouseenter={() => { /* hover effect */ }}
          >
            <span class="fluent-navrail__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d={item.icon} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            {!compact && (
              <>
                <span class="fluent-navrail__label">{item.label}</span>
                {item.badge && (
                  <span class="fluent-navrail__badge" aria-label={`${item.badge} itens`}>
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </li>
        {/each}
      </ul>
      
      {!compact && (
        <div class="fluent-navrail__footer">
          <div class="fluent-navrail__version">v0.22.0</div>
        </div>
      )}
    </nav>
  );
}