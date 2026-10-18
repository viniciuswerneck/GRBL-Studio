/**
 * Entrada do bundle `public/barcode.js` (esbuild, IIFE, global `GRBL_BARCODE`).
 *
 * É só a fachada: agrupa os encoders 1D (`barcode/`), a geometria de varredura
 * (`mask.ts`) e o G-code (`gcode.ts`) para o renderer, que não importa módulos
 * (RNF-11: um bundle leve, sem framework). Tudo aqui é puro — nenhuma
 * dependência de DOM.
 */
export type {
  BarcodeGcodeParams,
  BarcodeGcodeResult,
  SymbolGcodeResult,
  SymbolWarningCode,
} from './gcode';
export {
  DEFAULT_SPOT_MM,
  applyOverscan,
  barcodeToGcode,
  symbolToGcode,
  symbolWarnings,
} from './gcode';
export type {
  BarcodeOptions,
  BarcodeResult,
  BarcodeSpec,
  BarcodeSymbology,
} from './barcode';
export {
  BARCODE_SPECS,
  BarcodeError,
  encodeBarcode,
  modulesToBars,
} from './barcode';
