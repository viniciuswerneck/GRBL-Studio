/**
 * Web Worker de preparação de arquivo: roda o pipeline imagem -> G-code
 * (src/shared/image/*) fora da thread principal para não travar a UI (ADR-7).
 *
 * Empacotado pelo esbuild para `public/gcode.worker.js` (`npm run build:worker`).
 */

import { imageToGcode } from '../shared/image/gcode';
import type { GcodeStats, ImageToGcodeOptions } from '../shared/image/types';

/** Pedido enviado pelo renderer. `rgba` é transferido (zero-copy). */
export interface ConvertRequest {
  id: number;
  width: number;
  height: number;
  rgba: ArrayBuffer;
  options: ImageToGcodeOptions;
}

/** Resposta do worker, sempre correlacionada por `id`. */
export type ConvertResponse =
  | {
      id: number;
      ok: true;
      gcode: string;
      stats: GcodeStats;
      grid: Float32Array;
      /** Só no modo `vector` (RF-IMG-6): caminhos do contorno para o preview. */
      contourPaths?: Float32Array;
    }
  | { id: number; ok: false; error: string };

/**
 * Superfície mínima de `DedicatedWorkerGlobalScope`.
 * (O tsconfig usa `lib: DOM`, onde `self` é `Window` — daí o cast estrutural.)
 */
interface WorkerScope {
  onmessage: ((ev: MessageEvent<ConvertRequest>) => void) | null;
  postMessage(message: ConvertResponse, transfer?: Transferable[]): void;
}

const ctx = self as unknown as WorkerScope;

ctx.onmessage = (ev: MessageEvent<ConvertRequest>): void => {
  const { id, width, height, rgba, options } = ev.data;
  try {
    const result = imageToGcode(
      new Uint8ClampedArray(rgba),
      width,
      height,
      options,
    );
    const transfer = [result.grid.buffer as unknown as Transferable];
    if (result.contourPaths) {
      transfer.push(result.contourPaths.buffer as unknown as Transferable);
    }
    ctx.postMessage(
      {
        id,
        ok: true,
        gcode: result.gcode,
        stats: result.stats,
        grid: result.grid,
        contourPaths: result.contourPaths,
      },
      transfer,
    );
  } catch (err) {
    ctx.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
