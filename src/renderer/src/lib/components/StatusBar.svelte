/**
 * StatusBar — barra de status inferior (DRO, feed, S, progresso, estado).
 *
 * Componente de view Svelte 5. Espelha o estado do main via props.
 */

interface StatusBarProps {
  connected: boolean;
  jobState: 'idle' | 'running' | 'paused' | 'alarm';
  position: { x: number; y: number; z: number } | null;
  feed: number | null;
  spindle: number | null;
  progress: { current: number; total: number } | null;
  etaSec: number | null;
  overrideFeed: number | null;
  overrideSpindle: number | null;
}

export function StatusBar({
  connected,
  jobState,
  position,
  feed,
  spindle,
  progress,
  etaSec,
  overrideFeed,
  overrideSpindle,
}: StatusBarProps) {
  const pct = progress?.total
    ? (progress.current / progress.total) * 100
    : 0;

  return (
    <div class="status-bar">
      <div class="status-bar__state">
        <span class={`status-pill ${jobState}`}>{labelJobState(jobState)}</span>
        <span class={`status-pill ${connected ? 'status-pill--ok' : 'status-pill--off'}`}>
          {connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      <div class="status-bar__dro">
        {position && (
          <>
            <div class="dro-axis">
              <span class="dro-label">X</span>
              <span class="dro-value">{position.x.toFixed(3)}</span>
              <span class="dro-unit">mm</span>
            </div>
            <div class="dro-axis">
              <span class="dro-label">Y</span>
              <span class="dro-value">{position.y.toFixed(3)}</span>
              <span class="dro-unit">mm</span>
            </div>
            <div class="dro-axis">
              <span class="dro-label">Z</span>
              <span class="dro-value">{position.z.toFixed(3)}</span>
              <span class="dro-unit">mm</span>
            </div>
          </>
        )}
      </div>

      <div class="status-bar__meta">
        {feed !== null && (
          <span class="status-meta">
            <span class="status-meta__label">Feed</span>
            <span class="status-meta__value">{Math.round(feed)} mm/min</span>
          </span>
        )}
        {spindle !== null && (
          <span class="status-meta">
            <span class="status-meta__label">S</span>
            <span class="status-meta__value">{Math.round(spindle)}</span>
          </span>
        )}
      </div>

      {progress && (
        <div class="status-bar__progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              style={`width: ${Math.min(100, Math.max(0, pct))}%`}
            ></div>
          </div>
          <span class="progress-text">
            {progress.current} / {progress.total}
            {etaSec !== null && ` · ${formatSeconds(etaSec)} restante`}
          </span>
        </div>
      )}

      <div class="status-bar__overrides">
        {overrideFeed !== null && (
          <span class="override-chip">Feed {overrideFeed}%</span>
        )}
        {overrideSpindle !== null && (
          <span class="override-chip">S {overrideSpindle}%</span>
        )}
      </div>
    </div>
  );

  function labelJobState(s: string): string {
    const map: Record<string, string> = {
      idle: 'Ocioso',
      running: 'Executando',
      paused: 'Pausado',
      alarm: 'Alarme',
    };
    return map[s] ?? s;
  }

  function formatSeconds(s: number): string {
    const total = Math.max(0, Math.floor(s));
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}m ${sec}s`;
  }
}
