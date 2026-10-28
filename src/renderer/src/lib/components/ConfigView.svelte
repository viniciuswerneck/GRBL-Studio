/**
 * ConfigView — tela de configuração do GRBL ($$) e preferências.
 *
 * Componente de view Svelte 5. Lista os settings com ajuda contextual e
 * expõe callbacks para editar e aplicar via `window.grbl`.
 */

interface SettingRow {
  id: string;
  label: string;
  value: string | number;
  help: string;
  unit?: string;
  min?: number;
  max?: number;
}

interface ConfigViewProps {
  settings: SettingRow[];
  connected: boolean;
  onApplySetting: (id: string, value: string | number) => void;
  onRefresh: () => void;
}

export function ConfigView({
  settings,
  connected,
  onApplySetting,
  onRefresh,
}: ConfigViewProps) {
  return (
    <section class="config-view">
      <header class="config-view__head">
        <h2 class="config-view__title">Configuração da máquina ($$)</h2>
        <button
          class="config-btn-refresh"
          disabled={!connected}
          aria-label="Atualizar settings"
          onclick={onRefresh}
        >
          🔄 Atualizar
        </button>
      </header>

      <div class="config-view__body">
        {settings.length === 0 ? (
          <div class="config-empty">
            <p>Conecte à máquina para carregar os settings $$.</p>
          </div>
        ) : (
          <table class="config-table">
            <thead>
              <tr>
                <th>Setting</th>
                <th>Valor</th>
                <th>Descrição</th>
                <th class="config-table__actions">Ação</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.id} class="config-row">
                  <td class="config-cell__id">{s.id}</td>
                  <td class="config-cell__label">{s.label}</td>
                  <td class="config-cell__value">
                    <input
                      class="config-input"
                      disabled={!connected}
                      value={String(s.value)}
                      oninput={(e) => {
                        const input = e.target as HTMLInputElement;
                        onApplySetting(s.id, input.value);
                      }}
                    />
                    {s.unit && <span class="config-unit">{s.unit}</span>}
                  </td>
                  <td class="config-cell__help">{s.help}</td>
                  <td class="config-cell__actions">
                    <button
                      class="config-btn-apply"
                      disabled={!connected}
                      aria-label={`Aplicar ${s.id}`}
                      onclick={() => onApplySetting(s.id, s.value)}
                    >
                      Aplicar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div class="config-view__hint">
        Edite um valor e clique em "Aplicar" para enviar `$n=valor` à máquina.
        Alterações valem imediatamente; reinicie para persistir no perfil.
      </div>
    </section>
  );
}
