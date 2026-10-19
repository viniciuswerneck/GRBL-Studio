/**
 * Entrada do bundle `public/qrcode.js` (esbuild, IIFE, global `GRBL_QR`).
 *
 * É só a fachada: agrupa os encoders **2D** (`qr.ts` e `datamatrix.ts`), a
 * geometria de varredura (`mask.ts`) e o G-code (`gcode.ts`) para o renderer,
 * que não importa módulos (RNF-11: um bundle leve, sem framework). Tudo aqui é
 * puro — nenhuma dependência de DOM.
 */
export type {
  DataMatrixGcodeParams,
  DataMatrixGcodeResult,
  MatrixGcodeParams,
  QrGcodeParams,
  QrGcodeResult,
  SymbolGcodeResult,
  SymbolGridCell,
  SymbolGridParams,
  SymbolGridResult,
  SymbolWarningCode,
} from './gcode';
export {
  DEFAULT_SPOT_MM,
  MAX_MODULE_MM,
  MIN_MODULE_MM,
  QR_QUIET_ZONE_MODULES,
  applyOverscan,
  dataMatrixGridToGcode,
  dataMatrixToCell,
  dataMatrixToGcode,
  qrGridToGcode,
  qrModuleSizes,
  qrToCell,
  qrToGcode,
  symbolGridToGcode,
  symbolToGcode,
  symbolWarnings,
} from './gcode';
export type {
  DataMatrixOptions,
  DataMatrixResult,
  DataMatrixSymbolSize,
} from './datamatrix';
export {
  DATA_MATRIX_QUIET_ZONE,
  DATA_MATRIX_SIZES,
  DataMatrixError,
  encodeDataMatrix,
} from './datamatrix';
export type { QrEcc, QrMode, QrOptions, QrResult } from './qr';
export { QrError, encodeQr, qrMaxBytes, qrVersionFor } from './qr';
