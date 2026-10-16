/**
 * Utilitários compartilhados pelos emissores de G-code (raster e vetor).
 *
 * Mantidos num módulo sem dependências para que `gcode.ts` e `vector.ts`
 * compartilhem regras sem criar import circular.
 */

/** Limite de `S` suportado pelo GRBL 1.1 (15 bits). */
export const MAX_S = 32767;

const EPS = 1e-9;

/** Formata um valor com no máximo 3 decimais (precisão do DRO) e sem zeros sobressalentes. */
export const formatCoord = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return r === 0 ? '0' : String(r);
};

/** Retângulo alcançado pelo arquivo gerado. */
export interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** Área de trabalho (offset + tamanho). */
export interface WorkArea {
  offsetX: number;
  offsetY: number;
  widthMm: number;
  heightMm: number;
}

/**
 * Invariante de segurança: nenhuma coordenada gerada pode sair do retângulo
 * de trabalho (AGENTS.md — queima material / trava a máquina fora de área).
 */
export function assertWorkArea(bounds: Bounds, area: WorkArea): void {
  if (
    bounds.xMin < area.offsetX - EPS ||
    bounds.xMax > area.offsetX + area.widthMm + EPS ||
    bounds.yMin < area.offsetY - EPS ||
    bounds.yMax > area.offsetY + area.heightMm + EPS
  ) {
    throw new Error('Posição gerada fora da área de trabalho.');
  }
}
