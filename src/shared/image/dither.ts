/**
 * Dithering 1-bit (RF-IMG-5). Entrada/saída: 0..1 (1 = branco).
 */

/** Limiar simples. */
export function threshold(src: Float32Array, t = 0.5): Float32Array {
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i]! >= t ? 1 : 0;
  return out;
}

/**
 * Floyd–Steinberg: propaga o erro de quantização para os vizinhos
 * (7/16 à direita, 3/16 inferior-esquerdo, 5/16 abaixo, 1/16 inferior-direito).
 * Nunca modifica o buffer de entrada.
 */
export function floydSteinberg(
  src: Float32Array,
  width: number,
  height: number,
): Float32Array {
  if (src.length !== width * height) {
    throw new Error('Dimensões incompatíveis com o buffer de imagem.');
  }
  const buf = Float32Array.from(src);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = buf[i]!;
      const nv = old >= 0.5 ? 1 : 0;
      buf[i] = nv;
      const err = old - nv;

      if (x + 1 < width) buf[i + 1] = buf[i + 1]! + (err * 7) / 16;
      if (y + 1 < height) {
        if (x > 0) buf[i + width - 1] = buf[i + width - 1]! + (err * 3) / 16;
        buf[i + width] = buf[i + width]! + (err * 5) / 16;
        if (x + 1 < width)
          buf[i + width + 1] = buf[i + width + 1]! + (err * 1) / 16;
      }
    }
  }
  return buf;
}
