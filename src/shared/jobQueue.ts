/**
 * **Fila de trabalhos** (agenda) — RF-GC-13.
 *
 * Uma lista **persistida** de arquivos G-code que roda em sequência: o operador
 * enfileira as peças, manda começar e só troca o material entre uma e outra. A
 * fila é só o **modelo** (itens, ordem e estado); quem grava e persiste é o
 * main (`JobQueueStore`), quem manda o próximo programa é o renderer.
 *
 * Regras que valem sempre:
 *  - **um item por caminho** (repetir a mesma peça é repetir a fila);
 *  - `running` nunca sobrevive a um reinício (volta a `pending` — a máquina não
 *    estava gravando);
 *  - no máximo `QUEUE_MAX` itens, com caminho e nome saneados (nada de controle
 *    nem texto gigante indo para a UI ou para o disco).
 *
 * Puro e testável: sem DOM, sem disco, sem IPC.
 */

export type QueueStatus = 'pending' | 'running' | 'done' | 'failed';

export const QUEUE_STATUSES: readonly QueueStatus[] = [
  'pending',
  'running',
  'done',
  'failed',
];

/** Teto de itens na fila (uma agenda maior que isso não é uma agenda). */
export const QUEUE_MAX = 50;
export const QUEUE_NAME_MAX = 160;
export const QUEUE_PATH_MAX = 4096;
const ID_RE = /^[a-z0-9][a-z0-9-]{5,63}$/i;

export interface JobQueueItem {
  /** Identificador estável (gerado pelo main). */
  id: string;
  /** Caminho absoluto do arquivo. */
  path: string;
  /** Nome curto para a UI (basename). */
  name: string;
  /** Tamanho em bytes (0 quando desconhecido). */
  sizeBytes: number;
  status: QueueStatus;
  /** Quando entrou na fila (ms desde a época); 0 quando desconhecido. */
  addedAt: number;
}

function cleanText(input: unknown, max: number): string {
  const raw = typeof input === 'string' ? input : '';
  // biome-ignore lint/suspicious/noControlCharactersInRegex: entrada do usuário
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, ' ');
  return clean.trim().slice(0, max);
}

function baseName(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

/** Normaliza um item vindo do disco/IPC; `null` se não dá para usar. */
export function sanitizeQueueItem(input: unknown): JobQueueItem | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const id = cleanText(raw.id, 64);
  if (!ID_RE.test(id)) return null;
  const path = cleanText(raw.path, QUEUE_PATH_MAX);
  if (!path) return null;
  const name = cleanText(raw.name, QUEUE_NAME_MAX) || baseName(path);
  const size = Number(raw.sizeBytes);
  const added = Number(raw.addedAt);
  const status = QUEUE_STATUSES.includes(raw.status as QueueStatus)
    ? (raw.status as QueueStatus)
    : 'pending';
  return {
    id,
    path,
    name,
    sizeBytes: Number.isFinite(size) && size > 0 ? Math.trunc(size) : 0,
    // Nada está gravando quando o app abre: `running` volta a `pending`.
    status: status === 'running' ? 'pending' : status,
    addedAt: Number.isFinite(added) && added > 0 ? Math.trunc(added) : 0,
  };
}

/** Normaliza a fila inteira: descarta inválidos, repetidos (id/caminho) e o excesso. */
export function sanitizeQueue(input: unknown): JobQueueItem[] {
  if (!Array.isArray(input)) return [];
  const out: JobQueueItem[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const entry of input) {
    const item = sanitizeQueueItem(entry);
    if (!item || ids.has(item.id) || paths.has(item.path)) continue;
    ids.add(item.id);
    paths.add(item.path);
    out.push(item);
    if (out.length >= QUEUE_MAX) break;
  }
  return out;
}

/** Enfileira itens novos (um por caminho), respeitando o teto. */
export function queueAdd(
  list: readonly JobQueueItem[],
  entries: readonly JobQueueItem[],
): JobQueueItem[] {
  const out = [...list];
  const paths = new Set(out.map((item) => item.path));
  const ids = new Set(out.map((item) => item.id));
  for (const entry of entries) {
    if (out.length >= QUEUE_MAX) break;
    if (paths.has(entry.path) || ids.has(entry.id)) continue;
    paths.add(entry.path);
    ids.add(entry.id);
    out.push({ ...entry, status: 'pending' });
  }
  return out;
}

export function queueRemove(
  list: readonly JobQueueItem[],
  id: string,
): JobQueueItem[] {
  return list.filter((item) => item.id !== id);
}

/** Move o item `delta` posições (−1 sobe, +1 desce), sem sair da lista. */
export function queueMove(
  list: readonly JobQueueItem[],
  id: string,
  delta: number,
): JobQueueItem[] {
  const from = list.findIndex((item) => item.id === id);
  if (from < 0) return [...list];
  const step = Math.trunc(delta);
  const to = Math.min(list.length - 1, Math.max(0, from + step));
  if (to === from) return [...list];
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

/** Volta tudo para `pending` (começar a fila do zero). */
export function queueReset(list: readonly JobQueueItem[]): JobQueueItem[] {
  return list.map((item) => ({ ...item, status: 'pending' as const }));
}

/**
 * Prepara a fila para rodar: `failed` (e um `running` órfão) voltam a `pending`
 * e os `done` ficam como estão — parar no meio e mandar iniciar **continua** de
 * onde parou, sem regravar as peças prontas. Sem nada pendente (fila inteira
 * concluída), roda tudo de novo.
 */
export function queuePrepareRun(list: readonly JobQueueItem[]): JobQueueItem[] {
  const retried = list.map((item) =>
    item.status === 'failed' || item.status === 'running'
      ? { ...item, status: 'pending' as const }
      : item,
  );
  return retried.some((item) => item.status === 'pending')
    ? retried
    : queueReset(retried);
}

export function queueMark(
  list: readonly JobQueueItem[],
  id: string,
  status: QueueStatus,
): JobQueueItem[] {
  return list.map((item) => (item.id === id ? { ...item, status } : item));
}

/** Índice do primeiro item pendente (−1 quando acabou). */
export function queueNextIndex(list: readonly JobQueueItem[]): number {
  return list.findIndex((item) => item.status === 'pending');
}

export interface QueueProgress {
  total: number;
  pending: number;
  running: number;
  done: number;
  failed: number;
  /** Posição (1-based) do item em execução/do próximo; 0 quando vazia. */
  position: number;
}

/** Contadores para a barra e o rodapé do diálogo. */
export function queueProgress(list: readonly JobQueueItem[]): QueueProgress {
  let pending = 0;
  let running = 0;
  let done = 0;
  let failed = 0;
  for (const item of list) {
    if (item.status === 'pending') pending++;
    else if (item.status === 'running') running++;
    else if (item.status === 'done') done++;
    else failed++;
  }
  const next = list.findIndex(
    (item) => item.status === 'running' || item.status === 'pending',
  );
  return {
    total: list.length,
    pending,
    running,
    done,
    failed,
    position: next < 0 ? 0 : next + 1,
  };
}
