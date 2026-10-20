/**
 * Entrada do bundle `public/batch.js` (esbuild, IIFE, global `GRBL_BATCH`).
 *
 * Publica o módulo puro de lote/dados variáveis (RF-SYM-10) para o renderer,
 * que não importa módulos (RNF-11: bundle leve, carregado sob demanda — só
 * quando o usuário abre o lote, como o QR e o código de barras).
 */
export type {
  BatchDelimiter,
  BatchPiece,
  BatchPrefs,
  BatchRenderContext,
  BatchTable,
  BatchTemplate,
  BatchTemplateError,
  BatchTemplateErrorCode,
  BatchToken,
} from './batch';
export {
  BATCH_DEFAULT_TEMPLATE,
  BATCH_DELIMITERS,
  BATCH_MAX_CELL_CHARS,
  BATCH_MAX_COLUMNS,
  BATCH_MAX_FILE_BYTES,
  BATCH_MAX_PREF_CHARS,
  BATCH_MAX_ROWS,
  BATCH_MAX_SERIAL_WIDTH,
  batchColumnByName,
  batchFieldName,
  batchFields,
  batchPieceFileName,
  batchPieceLabel,
  batchPieces,
  batchSerial,
  batchTotal,
  detectDelimiter,
  detectHasHeader,
  parseBatchTable,
  parseBatchTemplate,
  renderBatchContent,
  sanitizeBatchPrefs,
  validateBatchTemplate,
} from './batch';
