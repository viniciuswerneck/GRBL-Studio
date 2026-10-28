/**
 * MachineStatus — painel de informações da máquina (firmware, curso, limites, laser).
 *
 * Componente de view Svelte 5. Recebe o snapshot da máquina via props.
 */

interface MachineFact {
  label: string;
  value: string | number;
  unit?: string;
  unknown?: boolean;
}

interface MachineStatusProps {
  snapshot: MachineFact[] | null;
  connected: boolean;
}

export function MachineStatus({ snapshot, connected }: MachineStatusProps) {
  if (!connected) {
    return (
      <div class="machine-status">
        <div class="machine-status__empty">Conecte à máquina para ver os dados.</div>
      </div>
    );
  }

  const facts: MachineFact[] = snapshot ?? [];

  return (
    <div class="machine-status">
      <h3 class="machine-status__title">Máquina</h3>
      <dl class="machine-status__list">
        {facts.map((f) => (
          <div key={f.label} class="machine-fact">
            <dt class="machine-fact__label">{f.label}</dt>
            <dd class={`machine-fact__value ${f.unknown ? 'machine-fact__value--unknown' : ''}`}>
              {f.unknown ? '—' : f.value}{f.unit ? ` <span class="machine-fact__unit">${f.unit}</span>` : ''}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
