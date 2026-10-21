/**
 * **Tira de teste de código** — RF-DSN-28.
 *
 * O mesmo símbolo (QR/Data Matrix/PDF417/Aztec/código de barras) repetido em
 * **vários tamanhos** numa tira, com o tamanho anotado embaixo: grava-se uma
 * vez, lê-se com o scanner da máquina e descobre-se o **menor tamanho legível**
 * para aquele material/contraste. Daí em diante é só usar esse tamanho.
 *
 * Aqui fica só o **layout** (lista de tamanhos, espaçamento e posições) — a
 * geometria de cada célula vem do bundle do símbolo e a legenda da fonte de
 * traço único. Puro e testável: sem DOM, sem IPC.
 */

/** Faixa de tamanho de cada célula (mm) — abaixo de 5 mm vira ruído. */
export const STRIP_MIN_MM = 5;
export const STRIP_MAX_MM = 200;
/** Máximo de células (uma tira maior que isso não cabe na mesa). */
export const STRIP_MAX_ITEMS = 10;
export const STRIP_GAP_MIN_MM = 1;
export const STRIP_GAP_MAX_MM = 50;
export const STRIP_DEFAULT_GAP_MM = 5;
/** Tamanhos sugeridos quando o campo está vazio. */
export const STRIP_DEFAULT_SIZES: readonly number[] = [10, 15, 20, 25, 30];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function sanitizeStripSize(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(clamp(n, STRIP_MIN_MM, STRIP_MAX_MM) * 10) / 10;
}

/**
 * Lista de tamanhos a partir de `"10, 15, 20"` (ou array): separa por vírgula
 * ou ponto e vírgula, remove repetidos, ordena e limita a `STRIP_MAX_ITEMS`.
 */
export function parseStripSizes(input: unknown): number[] {
  let raw: unknown[];
  if (Array.isArray(input)) raw = input;
  else if (typeof input === 'string') raw = input.split(/[,;]+/);
  else return [];
  const seen = new Set<number>();
  for (const entry of raw) {
    const size = sanitizeStripSize(
      typeof entry === 'string' ? Number(entry.trim()) : entry,
    );
    if (size === null) continue;
    seen.add(size);
  }
  return [...seen].sort((a, b) => a - b).slice(0, STRIP_MAX_ITEMS);
}

export function sanitizeStripGap(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return STRIP_DEFAULT_GAP_MM;
  return Math.round(clamp(n, STRIP_GAP_MIN_MM, STRIP_GAP_MAX_MM) * 10) / 10;
}

export interface StripItemSize {
  widthMm: number;
  heightMm: number;
}

export interface StripSlot {
  /** Canto superior esquerdo da célula, relativo à tira. */
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
}

export interface StripPlacement {
  slots: StripSlot[];
  widthMm: number;
  heightMm: number;
}

/**
 * Enfileira as células da esquerda para a direita com `gapMm` entre elas,
 * **alinhadas pelo topo** (as legendas ficam na mesma linha de base embaixo).
 * Células sem tamanho válido são ignoradas.
 */
export function placeStrip(
  items: ReadonlyArray<StripItemSize>,
  gapMm: number,
): StripPlacement {
  const gap = sanitizeStripGap(gapMm);
  const slots: StripSlot[] = [];
  let x = 0;
  let height = 0;
  for (const item of items) {
    const w = Number(item?.widthMm);
    const h = Number(item?.heightMm);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0)
      continue;
    slots.push({ x, y: 0, widthMm: w, heightMm: h });
    x += w + gap;
    if (h > height) height = h;
  }
  const width = slots.length ? x - gap : 0;
  return { slots, widthMm: width, heightMm: height };
}

/** Especificação da tira guardada no bloco do símbolo (permite reeditar). */
export interface StripSpec {
  sizes: number[];
  gapMm: number;
}

/** Normaliza a tira vinda da UI/metadados; `null` se não há 2 tamanhos. */
export function sanitizeStripSpec(input: unknown): StripSpec | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const sizes = parseStripSizes(raw.sizes);
  if (sizes.length < 2) return null;
  return { sizes, gapMm: sanitizeStripGap(raw.gapMm) };
}
