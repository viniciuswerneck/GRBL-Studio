/**
 * Ajustes de imagem (RF-IMG-2) — funções puras sobre valores 0..1 (1 = branco).
 */

import type { AdjustOptions } from './types';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Converte RGBA em escala de cinza com **composição sobre branco**.
 *
 * Fundos transparentes (PNG de logo) viram branco, e não preto — sem isso um
 * logo transparente gravaria o fundo inteiro.
 */
export function toGrayscale(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Float32Array {
  const count = width * height;
  if (width <= 0 || height <= 0) throw new Error('Dimensão de imagem inválida.');
  if (rgba.length < count * 4) throw new Error('Buffer RGBA menor que width*height*4.');

  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const j = i * 4;
    const luma = (0.2126 * rgba[j]! + 0.7152 * rgba[j + 1]! + 0.0722 * rgba[j + 2]!) / 255;
    const alpha = (rgba[j + 3] ?? 255) / 255;
    out[i] = 1 - alpha * (1 - luma);
  }
  return out;
}

/**
 * Aplica os ajustes na ordem: brilho -> contraste -> white clip -> inverter -> B&W.
 * Retorna um novo buffer; nunca modifica o original.
 */
export function applyAdjust(src: Float32Array, opts: AdjustOptions): Float32Array {
  const out = new Float32Array(src.length);
  const contrastFactor = 1 + opts.contrast; // -1..1 -> 0..2

  for (let i = 0; i < src.length; i++) {
    let v = src[i]!;
    v += opts.brightness;
    v = (v - 0.5) * contrastFactor + 0.5;
    v = clamp01(v);
    if (opts.whiteClip > 0 && v >= opts.whiteClip) v = 1;
    if (opts.invert) v = 1 - v;
    if (opts.blackWhite) v = v >= opts.bwThreshold ? 1 : 0;
    out[i] = clamp01(v);
  }
  return out;
}

/** Valida as opções de ajuste; lança erro com mensagem amigável. */
export function validateAdjust(opts: AdjustOptions): void {
  if (opts.contrast < -1 || opts.contrast > 1) throw new Error('Contraste fora de -1..1.');
  if (opts.brightness < -1 || opts.brightness > 1) throw new Error('Brilho fora de -1..1.');
  if (opts.whiteClip < 0 || opts.whiteClip > 1) throw new Error('White clip fora de 0..1.');
  if (opts.bwThreshold < 0 || opts.bwThreshold > 1) throw new Error('Limiar B&W fora de 0..1.');
}
