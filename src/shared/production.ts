/**
 * Modo produção (RF-GC-12) — repetir o **mesmo** programa N vezes.
 *
 * Máquina de estados **pura**: o renderer só desenha o que este módulo decide
 * (contador, próxima cópia, retry, fim da série). O envio continua na fila
 * normal do GRBL (`GrblClient`): aqui não há protocolo, nem DOM, nem máquina.
 *
 * Ciclo:
 *
 * ```
 * idle ──start──► running ──copyFinished──► waiting ──nextCopy──► running …
 *                   │                          │
 *                   └──failed──► waiting ──────┘   (repete a mesma cópia)
 *                                              └──(última)──► done
 * ```
 *
 * A pausa entre cópias é de propósito: a peça na mesa precisa ser trocada (e o
 * laser conferido) antes da próxima — nada de emendar uma peça na outra. O
 * reenvio é sempre do programa atual, sem repetir o pré-voo.
 */

/** Cópias por série. Acima disso a UI trava em 999 (o campo também limita). */
export const PRODUCTION_MAX_COPIES = 999;

/** Fase do ciclo de produção. */
export type ProductionPhase = 'idle' | 'running' | 'waiting' | 'done';

export interface ProductionState {
  /** Cópias pedidas (1…999). */
  readonly total: number;
  /** Cópia atual/última (1-based; 0 quando nada começou). */
  readonly copy: number;
  /** Cópias concluídas (não conta a cópia interrompida). */
  readonly done: number;
  readonly phase: ProductionPhase;
  /** A cópia atual foi interrompida: "próxima" repete a mesma. */
  readonly failed: boolean;
}

/** Estado de repouso (nenhuma série em andamento). */
export const IDLE_PRODUCTION: ProductionState = {
  total: 1,
  copy: 0,
  done: 0,
  phase: 'idle',
  failed: false,
};

/**
 * Total de cópias válido: inteiro entre 1 e {@link PRODUCTION_MAX_COPIES}.
 * Qualquer valor inválido (vazio, `NaN`, negativo, fracionário) vira 1.
 */
export function clampProductionCopies(value: unknown): number {
  const raw = typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(raw)) return 1;
  return Math.min(PRODUCTION_MAX_COPIES, Math.max(1, Math.trunc(raw)));
}

/** Começa a série na cópia 1. */
export function productionStart(total: unknown): ProductionState {
  return {
    total: clampProductionCopies(total),
    copy: 1,
    done: 0,
    phase: 'running',
    failed: false,
  };
}

/** Uma cópia terminou: espera a troca da peça (ou fecha a série). */
export function productionCopyFinished(
  state: ProductionState,
): ProductionState {
  if (state.phase !== 'running') return state;
  const done = Math.max(state.done, Math.min(state.copy, state.total));
  if (done >= state.total) {
    return { ...state, done, phase: 'done', failed: false };
  }
  return { ...state, done, phase: 'waiting', failed: false };
}

/** A cópia atual foi interrompida (erro, alarme ou cancelamento do usuário). */
export function productionFailed(state: ProductionState): ProductionState {
  if (state.phase !== 'running') return state;
  return { ...state, phase: 'waiting', failed: true };
}

/**
 * "Próxima peça": avança para a cópia seguinte — ou **repete** a interrompida
 * (o contador não anda, porque ela não foi concluída).
 */
export function productionNextCopy(state: ProductionState): ProductionState {
  if (state.phase !== 'waiting') return state;
  if (state.failed) {
    return { ...state, phase: 'running', failed: false };
  }
  if (state.copy >= state.total) return state;
  return { ...state, copy: state.copy + 1, phase: 'running', failed: false };
}

/** Encerra a série mantendo o total escolhido (a próxima recomeça na 1). */
export function productionStop(state: ProductionState): ProductionState {
  return { total: state.total, copy: 0, done: 0, phase: 'idle', failed: false };
}

/** Progresso da série (para o contador da barra). */
export function productionProgress(state: ProductionState): {
  /** Cópias concluídas. */
  done: number;
  /** Cópias que ainda faltam. */
  left: number;
  /** A cópia atual é a última da série? */
  isLast: boolean;
} {
  const done = Math.max(0, Math.min(state.done, state.total));
  return {
    done,
    left: Math.max(0, state.total - done),
    isLast: state.copy > 0 && state.copy === state.total,
  };
}
