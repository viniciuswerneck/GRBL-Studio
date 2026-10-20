/**
 * **Símbolo como objeto** do editor “Desenhar” (RF-SYM-8 / P3-S3).
 *
 * Até aqui o QR/código de barras saía por *Ferramentas → símbolo*, gerando um
 * programa avulso. Aqui o símbolo entra na prancheta como **um bloco de
 * formas** (cada trecho de varredura é uma linha aberta, todas no mesmo
 * `group`), então move, escala, gira, espelha e recebe camada/potência como
 * qualquer outro objeto — e cai no mesmo G-code do desenho.
 *
 * A geometria vem pronta do bundle de símbolos (`qrToCell`, `dataMatrixToCell`,
 * `pdf417ToCell`, `aztecToCell`, `barcodeToCell`): este módulo só **traduz o
 * sistema de coordenadas** (rodapé em `0,0`, Y para cima → o editor usa Y para
 * baixo), descarta trechos degenerados e normaliza a especificação guardada no
 * objeto (`Shape.symbol`), que permite reeditar o conteúdo depois.
 *
 * Puro e testável: sem DOM, sem bundles, sem IPC.
 */

import type { SymbolExtent, SymbolSegment } from './symbol/mask';

/** Tipos de símbolo aceitos como objeto. */
export type DesignSymbolType =
  | 'qr'
  | 'datamatrix'
  | 'pdf417'
  | 'aztec'
  | 'barcode';

/** Especificação guardada em cada forma do bloco (metadados do objeto). */
export interface DesignSymbolSpec {
  type: DesignSymbolType;
  /** Simbologia 1D (só para `type: 'barcode'`). */
  symbology?: string;
  /** Conteúdo (texto/URL/número) — já sem espaços nas pontas. */
  text: string;
  /** Lado (2D) ou largura (1D) final em mm, quiet zone incluída. */
  sizeMm: number;
  /** Correção de erro do QR (L/M/Q/H). */
  ecc?: string;
  /** Linhas de varredura por mm (densidade do preenchimento). */
  linesPerMm?: number;
  /** Código de barras: desenha o texto legível (HRI). */
  hri?: boolean;
}

/** Faixa de tamanho aceita (mm) — abaixo disso o símbolo vira ruído. */
export const SYMBOL_MIN_MM = 5;
export const SYMBOL_MAX_MM = 400;
/** Densidade padrão (mesma do gerador avulso: 10 linhas/mm = 0,1 mm). */
export const SYMBOL_DEFAULT_LINES = 10;
export const SYMBOL_MIN_LINES = 2;
export const SYMBOL_MAX_LINES = 30;
/** Teto de caracteres do conteúdo (o QR cabe ~2 900 bytes; folga segura). */
export const SYMBOL_TEXT_MAX = 2000;

/** Célula de grade devolvida pelos bundles de símbolo (subconjunto usado). */
export interface DesignSymbolCell {
  segments: ReadonlyArray<SymbolSegment>;
  extent: SymbolExtent;
}

/** Uma linha aberta do editor (início → fim do trecho de varredura). */
export interface DesignSymbolShape {
  points: Array<{ x: number; y: number }>;
  closed: false;
}

export interface DesignSymbolShapes {
  shapes: DesignSymbolShape[];
  /** Caixa do símbolo (quiet zone incluída), em mm. */
  widthMm: number;
  heightMm: number;
}

const TYPES: readonly DesignSymbolType[] = [
  'qr',
  'datamatrix',
  'pdf417',
  'aztec',
  'barcode',
];

const ECCS = ['L', 'M', 'Q', 'H'] as const;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Normaliza a especificação vinda da UI/metadados. `null` quando não dá para
 * gerar nada (tipo desconhecido ou conteúdo vazio) — nunca lança.
 */
export function sanitizeDesignSymbol(input: unknown): DesignSymbolSpec | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (!TYPES.includes(raw.type as DesignSymbolType)) return null;
  const text =
    typeof raw.text === 'string'
      ? raw.text.trim().slice(0, SYMBOL_TEXT_MAX)
      : '';
  if (!text) return null;

  const spec: DesignSymbolSpec = {
    type: raw.type as DesignSymbolType,
    text,
    sizeMm:
      Math.round(clamp(Number(raw.sizeMm), SYMBOL_MIN_MM, SYMBOL_MAX_MM) * 10) /
      10,
    linesPerMm: Math.round(
      clamp(
        typeof raw.linesPerMm === 'number'
          ? raw.linesPerMm
          : SYMBOL_DEFAULT_LINES,
        SYMBOL_MIN_LINES,
        SYMBOL_MAX_LINES,
      ),
    ),
  };
  if (
    typeof raw.symbology === 'string' &&
    /^[a-z0-9][a-z0-9-]{0,19}$/.test(raw.symbology)
  ) {
    spec.symbology = raw.symbology;
  }
  if (
    typeof raw.ecc === 'string' &&
    ECCS.includes(raw.ecc as (typeof ECCS)[number])
  ) {
    spec.ecc = raw.ecc;
  }
  if (typeof raw.hri === 'boolean') spec.hri = raw.hri;
  return spec;
}

/**
 * Célula do símbolo → formas do editor, com o canto **superior esquerdo** em
 * `origin` (o editor usa Y para baixo; a célula usa Y para cima).
 *
 * Trechos não finitos ou de comprimento zero são descartados: um `NaN` no
 * caminho faria o GRBL responder `error:` no meio do job.
 */
export function symbolCellToDesignShapes(
  cell: DesignSymbolCell | null | undefined,
  origin: { x: number; y: number } = { x: 0, y: 0 },
): DesignSymbolShapes {
  const widthMm = Number(cell?.extent?.widthMm);
  const heightMm = Number(cell?.extent?.heightMm);
  const width = Number.isFinite(widthMm) && widthMm > 0 ? widthMm : 0;
  const height = Number.isFinite(heightMm) && heightMm > 0 ? heightMm : 0;
  const ox = Number.isFinite(origin.x) ? origin.x : 0;
  const oy = Number.isFinite(origin.y) ? origin.y : 0;

  const shapes: DesignSymbolShape[] = [];
  for (const seg of cell?.segments ?? []) {
    const x0 = Number(seg.x0);
    const y0 = Number(seg.y0);
    const x1 = Number(seg.x1);
    const y1 = Number(seg.y1);
    if (![x0, y0, x1, y1].every(Number.isFinite)) continue;
    if (Math.hypot(x1 - x0, y1 - y0) < 1e-6) continue;
    shapes.push({
      closed: false,
      points: [
        { x: ox + x0, y: oy + (height - y0) },
        { x: ox + x1, y: oy + (height - y1) },
      ],
    });
  }
  return { shapes, widthMm: width, heightMm: height };
}
