/**
 * JobProgress — barra de progresso e ETA durante um job de gravação.
 *
 * Componente isolado do renderer, escrito em Svelte 5 + TypeScript.
 * Exibe linha atual/total, porcentagem e tempo restante estimado.
 * Não toca em protocolo GRBL; recebe tudo via props.
 */

interface JobProgressProps {
  currentLine: number;
  totalLines: number;
  estimatedSec: number;
  elapsedSec: number;
}

export function JobProgress({
  currentLine,
  totalLines,
  estimatedSec,
  elapsedSec,
}: JobProgressProps) {
  const pct = totalLines > 0 ? (currentLine / totalLines) * 100 : 0;
  const remaining = Math.max(0, estimatedSec - elapsedSec);
  const remainingStr = formatSeconds(remaining);

  const pctRounded = Math.round(pct * 10) / 10;

  return (
    <div class="job-progress">
      <div class="job-progress__label">
        <span class="job-progress__lines">
          {currentLine} / {totalLines}
        </span>
        <span class="job-progress__pct">{pctRounded.toFixed(1)}%</span>
      </div>
      <div class="job-progress__bar">
        <div
          class="job-progress__fill"
          style={`width: ${Math.min(100, Math.max(0, pct))}%`}
        ></div>
      </div>
      <div class="job-progress__eta">
        {remainingStr} restante
      </div>
    </div>
  );

  function formatSeconds(s: number): string {
    const total = Math.max(0, Math.floor(s));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }
}
