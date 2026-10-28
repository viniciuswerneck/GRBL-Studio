/**
 * PortList — lista de portas seriais disponíveis para conexão GRBL.
 *
 * Componente isolado do renderer, Svelte 5 + TypeScript. Recebe as portas via
 * props e expõe `onSelect` para o caller abrir a conexão via `window.grbl.connect`.
 */

interface PortInfo {
  path: string;
  manufacturer?: string | null;
  serialNumber?: string | null;
  pnpId?: string | null;
  locationId?: string | null;
  vendorId?: string | null;
  productId?: string | null;
}

interface PortListProps {
  ports: PortInfo[];
  selectedPath: string | null;
  refreshing: boolean;
  onSelect: (path: string) => void;
  onRefresh: () => void;
}

export function PortList({
  ports,
  selectedPath,
  refreshing,
  onSelect,
  onRefresh,
}: PortListProps) {
  const hasPorts = ports.length > 0;

  return (
    <div class="port-list" aria-label="Portas seriais disponíveis">
      <div class="port-list__header">
        <label class="port-list__label">Porta</label>
        <button
          class="port-list__refresh"
          disabled={refreshing}
          aria-label="Atualizar lista de portas"
          onclick={onRefresh}
        >
          {refreshing ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {refreshing && (
        <p class="port-list__hint">Buscando portas seriais…</p>
      )}

      {!hasPorts && !refreshing && (
        <p class="port-list__empty">Nenhuma porta serial detectada.</p>
      )}

      {hasPorts && (
        <ul class="port-list__list" role="list">
          {ports.map((port) => {
            const active = port.path === selectedPath;
            return (
              <li key={port.path} role="listitem">
                <button
                  class={`port-item ${active ? 'port-item--active' : ''}`}
                  aria-pressed={active}
                  onclick={() => onSelect(port.path)}
                >
                  <span class="port-item__path">{port.path}</span>
                  {port.manufacturer && (
                    <span class="port-item__meta">{port.manufacturer}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
