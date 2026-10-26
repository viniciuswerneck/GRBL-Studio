/**
 * ConnectionScreen — tela de conexão (porta, baud, perfil máquina, conectar).
 * Migração da vanilla JS para Svelte 5.
 */

import { connectionStore } from '../../stores/connection';
import { useI18n } from '../../providers/I18nProvider';
import { Button } from '../Button';
import { Select } from '../Select';
import { Badge } from '../Badge';
import { Spinner } from '../Spinner';
import { Card } from '../Card';
import { onMount } from 'svelte';

const { t } = useI18n();

export function ConnectionScreen() {
  // Estado local derivado do store
  let localSelectedPort = $derived(connectionStore.selectedPort);
  let localSelectedBaud = $derived(connectionStore.selectedBaud);
  let localSelectedProfile = $derived(connectionStore.selectedProfile);
  
  // Carrega portas e perfis no mount
  onMount(async () => {
    await connectionStore.loadPorts();
    await connectionStore.loadMachineProfiles();
  });
  
  // Handlers
  async function handleConnect() {
    await connectionStore.connect();
  }
  
  async function handleDisconnect() {
    await connectionStore.disconnect();
  }
  
  function handlePortChange(value: string) {
    connectionStore.selectedPort = value;
  }
  
  function handleBaudChange(value: string) {
    connectionStore.selectedBaud = Number(value);
  }
  
  function handleProfileChange(value: string) {
    const profile = connectionStore.machineProfiles.find(p => p.id === value);
    if (profile) connectionStore.selectedProfile = profile;
  }
  
  const connState = $derived(connectionStore.connectionState);
  const isConnected = $derived(connectionStore.isConnected);
  const isConnecting = $derived(connState === 'connecting');
  const connectError = $derived(connectionStore.connectError);
  
  // Badge variant baseado no estado
  function getConnectionBadge() {
    switch (connState) {
      case 'connected': return { label: t('connection.connected'), variant: 'success' as const, pulse: true };
      case 'connecting': return { label: t('connection.connecting'), variant: 'info' as const, pulse: true };
      case 'error': return { label: t('connection.error'), variant: 'danger' as const };
      default: return { label: t('connection.disconnected'), variant: 'neutral' as const };
    }
  }
  
  const badgeProps = getConnectionBadge();
  
  return (
    <section class="connection-screen" aria-labelledby="connection-heading">
      <Card variant="elevated" padding="lg">
        <header class="connection-header">
          <h2 id="connection-heading" class="connection-title">{t('connection.title')}</h2>
          <Badge 
            variant={badgeProps.variant} 
            pulse={badgeProps.pulse}
            size="md"
            dot
          >
            {badgeProps.label}
          </Badge>
        </header>
        
        {connectError && (
          <div class="connection-error" role="alert">
            {connectError}
          </div>
        )}
        
        <div class="connection-form">
          <div class="form-row">
            <Select
              label={t('connection.portLabel')}
              options={connectionStore.ports.map(p => ({ value: p.path, label: p.label }))}
              value={localSelectedPort}
              onChange={handlePortChange}
              disabled={isConnected || isConnecting}
              placeholder={t('connection.selectPort')}
              error={!connectionStore.ports.length ? t('connection.noPorts') : undefined}
            />
            <Button
              variant="secondary"
              size="sm"
              onclick={() => connectionStore.loadPorts()}
              disabled={isConnecting}
              aria-label={t('connection.refreshPorts')}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 110 12 6 6 0 010-12z" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10 6v4l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </Button>
          </div>
          
          <Select
            label={t('connection.baudLabel')}
            options={connectionStore.bauds.map(b => ({ value: String(b.value), label: b.label }))}
            value={String(localSelectedBaud)}
            onChange={handleBaudChange}
            disabled={isConnected || isConnecting}
          />
          
          <Select
            label={t('connection.machineProfileLabel')}
            options={connectionStore.machineProfiles.map(p => ({ value: p.id, label: p.name }))}
            value={localSelectedProfile?.id || ''}
            onChange={handleProfileChange}
            disabled={isConnected || isConnecting}
            placeholder={t('connection.selectProfile')}
          />
          
          <div class="connection-actions">
            {isConnected ? (
              <Button
                variant="danger"
                fullWidth
                onclick={handleDisconnect}
                disabled={isConnecting}
              >
                {t('connection.disconnect')}
              </Button>
            ) : (
              <Button
                variant="primary"
                fullWidth
                loading={isConnecting}
                onclick={handleConnect}
                disabled={!localSelectedPort || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Spinner size="sm" label={t('connection.connecting')} />
                    {t('connection.connecting')}
                  </>
                ) : (
                  t('connection.connect')
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      {isConnected && (
        <Card variant="outlined" padding="md" class="connection-status">
          <h3 class="connection-status__title">{t('connection.statusTitle')}</h3>
          <div class="connection-status__grid">
            <div class="status-item">
              <span class="status-label">{t('connection.firmware')}</span>
              <span class="status-value">{connectionStore.grblStatus?.raw || '—'}</span>
            </div>
            <div class="status-item">
              <span class="status-label">{t('connection.state')}</span>
              <Badge variant={getStateVariant(connectionStore.grblStatus?.state)} size="sm" dot>
                {connectionStore.grblStatus?.state || '—'}
              </Badge>
            </div>
            <div class="status-item">
              <span class="status-label">{t('connection.mpos')}</span>
              <span class="status-value font-mono">
                X: {connectionStore.grblStatus?.mpos?.x?.toFixed(3) ?? '—'} 
                Y: {connectionStore.grblStatus?.mpos?.y?.toFixed(3) ?? '—'} 
                Z: {connectionStore.grblStatus?.mpos?.z?.toFixed(3) ?? '—'}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">{t('connection.wpos')}</span>
              <span class="status-value font-mono">
                X: {connectionStore.grblStatus?.wpos?.x?.toFixed(3) ?? '—'} 
                Y: {connectionStore.grblStatus?.wpos?.y?.toFixed(3) ?? '—'} 
                Z: {connectionStore.grblStatus?.wpos?.z?.toFixed(3) ?? '—'}
              </span>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}

function getStateVariant(state?: string): BadgeProps['variant'] {
  switch (state) {
    case 'Idle': return 'success';
    case 'Run': return 'info';
    case 'Hold': return 'warning';
    case 'Alarm': return 'danger';
    case 'Door': return 'warning';
    case 'Home': return 'info';
    case 'Jog': return 'info';
    case 'Check': return 'warning';
    case 'Sleep': return 'neutral';
    default: return 'neutral';
  }
}