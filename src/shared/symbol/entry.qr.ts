/**
 * Entrada do bundle `public/qr.js` (esbuild, IIFE, global `GRBL_QR`).
 *
 * É só a fachada: agrupa o encoder (`qr.ts`), a geometria de varredura
 * (`mask.ts`) e o G-code (`gcode.ts`) para o renderer, que não importa módulos
 * (RNF-11: um bundle leve, sem framework). Tudo aqui é puro — nenhuma
 * dependência de DOM.
 */
export type {
  QrGcodeParams,
  QrGcodeResult,
  SymbolGcodeResult,
  SymbolWarningCode,
} from './gcode';
export {
  DEFAULT_SPOT_MM,
  QR_QUIET_ZONE_MODULES,
  applyOverscan,
  qrToGcode,
  symbolToGcode,
  symbolWarnings,
} from './gcode';
export type { QrEcc, QrMode, QrOptions, QrResult } from './qr';
export { QrError, encodeQr, qrMaxBytes, qrVersionFor } from './qr';
