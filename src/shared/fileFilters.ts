/**
 * Filtros e validação de arquivos para os diálogos nativos (main) e para a UI.
 * Funções puras e testáveis — nada de fs/Electron aqui (ver AGENTS.md).
 *
 * Os diálogos do sistema são a única origem de caminhos: o renderer nunca
 * envia um caminho para o main.
 */

/** Extensões de imagem que o Chromium/Electron realmente decodifica. */
export const IMAGE_EXTENSIONS: string[] = [
  'png',
  'PNG',
  'jpg',
  'JPG',
  'jpeg',
  'JPEG',
  'jpe',
  'JPE',
  'jfif',
  'JFIF',
  'bmp',
  'BMP',
  'gif',
  'GIF',
  'webp',
  'WEBP',
  'avif',
  'AVIF',
];

/** Extensões de G-code aceitas na "Execução". */
export const GCODE_EXTENSIONS: string[] = [
  'gcode',
  'GCODE',
  'nc',
  'NC',
  'ngc',
  'NGC',
  'tap',
  'TAP',
  'gc',
  'GC',
  'txt',
  'TXT',
];

export interface FileDialogFilter {
  name: string;
  extensions: string[];
}

/**
 * Filtros do diálogo de imagem. A GTK casa padrões de forma sensível a
 * maiúsculas, por isso cada extensão aparece em minúsculas e maiúsculas.
 * O filtro "Todos os arquivos" fica sempre por último.
 */
export const IMAGE_DIALOG_FILTERS: FileDialogFilter[] = [
  {
    name: 'Imagens (PNG, JPG, BMP, GIF, WebP, AVIF)',
    extensions: IMAGE_EXTENSIONS,
  },
  { name: 'Todos os arquivos', extensions: ['*'] },
];

export const GCODE_DIALOG_FILTERS: FileDialogFilter[] = [
  {
    name: 'G-code (gcode, nc, ngc, tap, gc, txt)',
    extensions: GCODE_EXTENSIONS,
  },
  { name: 'Todos os arquivos', extensions: ['*'] },
];

export const SVG_DIALOG_FILTERS: FileDialogFilter[] = [
  { name: 'SVG (svg)', extensions: ['svg'] },
  { name: 'Todos os arquivos', extensions: ['*'] },
];

/** DXF ASCII (CAD). A GTK casa maiúsculas/minúsculas, então vão as duas. */
export const DXF_DIALOG_FILTERS: FileDialogFilter[] = [
  { name: 'DXF (dxf)', extensions: ['dxf', 'DXF'] },
  { name: 'Todos os arquivos', extensions: ['*'] },
];

/** PDF (importação vetorial). */
export const PDF_DIALOG_FILTERS: FileDialogFilter[] = [
  { name: 'PDF (pdf)', extensions: ['pdf', 'PDF'] },
  { name: 'Todos os arquivos', extensions: ['*'] },
];

/** Planilha de dados variáveis do lote (RF-SYM-10). */
export const CSV_DIALOG_FILTERS: FileDialogFilter[] = [
  {
    name: 'Planilha (csv, tsv, txt)',
    extensions: ['csv', 'CSV', 'tsv', 'TSV', 'txt', 'TXT'],
  },
  { name: 'Todos os arquivos', extensions: ['*'] },
];

/** Perfil de máquina do LightBurn (P2.5). */
export const LBDEV_DIALOG_FILTERS: FileDialogFilter[] = [
  { name: 'LightBurn (lbdev)', extensions: ['lbdev', 'LBDEV'] },
  { name: 'Todos os arquivos', extensions: ['*'] },
];

const IMAGE_SET = new Set(IMAGE_EXTENSIONS.map((e) => e.toLowerCase()));
const GCODE_SET = new Set(GCODE_EXTENSIONS.map((e) => e.toLowerCase()));

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  jfif: 'image/jpeg',
  bmp: 'image/bmp',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
};

/** Extensão em minúsculas, sem o ponto (`"logo.PNG"` -> `"png"`). */
export function extensionOf(fileName: string): string {
  const match = /\.([A-Za-z0-9]+)\s*$/.exec(fileName ?? '');
  return match ? match[1].toLowerCase() : '';
}

export function isSupportedImageName(fileName: string): boolean {
  return IMAGE_SET.has(extensionOf(fileName));
}

export function isSupportedGcodeName(fileName: string): boolean {
  return GCODE_SET.has(extensionOf(fileName));
}

/** MIME da imagem; `application/octet-stream` quando desconhecido. */
export function imageMimeType(fileName: string): string {
  return MIME[extensionOf(fileName)] ?? 'application/octet-stream';
}

/** Lista legível das extensões suportadas (mensagens de erro da UI). */
export function supportedImageList(): string {
  const unique = [...new Set(IMAGE_EXTENSIONS.map((e) => e.toLowerCase()))];
  return unique.map((e) => e.toUpperCase()).join(', ');
}
