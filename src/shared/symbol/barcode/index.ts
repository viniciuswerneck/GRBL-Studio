/**
 * Fachada dos códigos de barras **1D** (RF-SYM-2) — módulo puro, sem DOM.
 *
 * `encodeBarcode(texto, opções)` escolhe a simbologia e devolve uma saída
 * **comum**: `bars` (lista de barras em unidades de módulo, `x` início e `w`
 * largura), a largura total em módulos, o **HRI** (texto legível) e os dados
 * efetivos (com dígito/caractere de verificação). Os parâmetros da norma
 * (quiet zone, X-dimension mínimo, altura mínima das barras) ficam em
 * {@link BARCODE_SPECS}, para a UI e os avisos.
 */

import { type Code128Options, encodeCode128 } from './code128';
import { type Code39Ratio, encodeCode39 } from './code39';
import { encodeEan } from './ean';
import { BarcodeError } from './error';

export type BarcodeSymbology = 'code128' | 'ean13' | 'ean8' | 'upca' | 'code39';

export interface BarcodeSpec {
  /** Quiet zone mínima de cada lado, em módulos (ISO/IEC 15417/15420/16388). */
  quietZoneMinModules: number;
  /** X-dimension mínimo da norma, em mm. */
  xDimMinMm: number;
  /** Altura mínima recomendada das barras, em mm. */
  barHeightMinMm: number;
  /** Altura padrão das barras na UI, em mm. */
  defaultBarHeightMm: number;
  /** X-dimension padrão na UI, em mm. */
  defaultXDimMm: number;
  /** Aceita apenas dígitos. */
  digitsOnly: boolean;
  /** Exemplo de conteúdo (dica na UI). */
  example: string;
}

export const BARCODE_SPECS: Record<BarcodeSymbology, BarcodeSpec> = {
  code128: {
    quietZoneMinModules: 10,
    xDimMinMm: 0.19,
    barHeightMinMm: 5,
    defaultBarHeightMm: 10,
    defaultXDimMm: 0.5,
    digitsOnly: false,
    example: 'GRBL-STUDIO-001',
  },
  ean13: {
    quietZoneMinModules: 11,
    xDimMinMm: 0.264,
    barHeightMinMm: 6.35,
    defaultBarHeightMm: 12,
    defaultXDimMm: 0.33,
    digitsOnly: true,
    example: '590123412345',
  },
  ean8: {
    quietZoneMinModules: 7,
    xDimMinMm: 0.264,
    barHeightMinMm: 6.35,
    defaultBarHeightMm: 12,
    defaultXDimMm: 0.33,
    digitsOnly: true,
    example: '9638507',
  },
  upca: {
    quietZoneMinModules: 9,
    xDimMinMm: 0.264,
    barHeightMinMm: 6.35,
    defaultBarHeightMm: 12,
    defaultXDimMm: 0.33,
    digitsOnly: true,
    example: '03600029145',
  },
  code39: {
    quietZoneMinModules: 10,
    xDimMinMm: 0.19,
    barHeightMinMm: 5,
    defaultBarHeightMm: 10,
    defaultXDimMm: 0.5,
    digitsOnly: false,
    example: 'GRBL-STUDIO',
  },
};

/** Barra do símbolo em unidades de módulo: começa em `x`, com largura `w`. */
export interface BarcodeBar {
  x: number;
  w: number;
}

export interface BarcodeOptions {
  symbology: BarcodeSymbology;
  /** Code 128: conjunto fixo ou `auto`. Padrão `auto`. */
  code128Charset?: Code128Options['charset'];
  /** Code 39: razão largo:estreito. Padrão `3`. */
  code39Ratio?: Code39Ratio;
  /** Code 39: caractere de verificação mod 43. Padrão falso. */
  code39Checksum?: boolean;
}

export interface BarcodeResult {
  symbology: BarcodeSymbology;
  /** Barras em unidades de módulo (X-dimension), ordenadas e sem sobrepor. */
  bars: BarcodeBar[];
  /** Largura do símbolo em módulos (sem a quiet zone). */
  totalModules: number;
  /** Conteúdo efetivo, já com o dígito/caractere de verificação. */
  data: string;
  /** Texto legível (HRI). */
  hri: string;
  /** Dígito verificador (EAN/UPC), quando houver. */
  checkDigit?: number;
  /** Caractere de verificação (Code 39 mod 43), quando houver. */
  checkChar?: string;
}

/** Sequência de módulos (`1` = barra) → barras em unidades de módulo. */
export function modulesToBars(modules: string): BarcodeBar[] {
  const bars: BarcodeBar[] = [];
  let i = 0;
  while (i < modules.length) {
    if (modules[i] === '1') {
      let j = i;
      while (j < modules.length && modules[j] === '1') j++;
      bars.push({ x: i, w: j - i });
      i = j;
    } else {
      i += 1;
    }
  }
  return bars;
}

/** Válido para a UI: `symbology` desconhecida vira erro claro. */
function isSymbology(value: string): value is BarcodeSymbology {
  return value in BARCODE_SPECS;
}

/**
 * Codifica `text` na simbologia pedida. Lança {@link BarcodeError} com o
 * `code` tipado (a UI traduz) — para dígito verificador, com o esperado × o
 * informado.
 */
export function encodeBarcode(
  text: string,
  opts: BarcodeOptions,
): BarcodeResult {
  if (!isSymbology(opts.symbology)) {
    throw new BarcodeError(
      'bad-option',
      `simbologia desconhecida: ${opts.symbology}`,
    );
  }
  const symbology = opts.symbology;

  if (symbology === 'code128') {
    const res = encodeCode128(text, { charset: opts.code128Charset });
    return {
      symbology,
      bars: modulesToBars(res.modules),
      totalModules: res.modules.length,
      data: text,
      hri: text,
    };
  }

  if (symbology === 'code39') {
    const res = encodeCode39(text, {
      ratio: opts.code39Ratio,
      checksum: opts.code39Checksum,
    });
    return {
      symbology,
      bars: modulesToBars(res.modules),
      totalModules: res.modules.length,
      data: res.data,
      hri: res.hri,
      checkChar: res.checkChar,
    };
  }

  const res = encodeEan(text, symbology);
  return {
    symbology,
    bars: modulesToBars(res.modules),
    totalModules: res.modules.length,
    data: res.data,
    hri: res.hri,
    checkDigit: res.checkDigit,
  };
}

export type { Code128Charset, Code128Options, Code128Result } from './code128';
export type { Code39Options, Code39Ratio, Code39Result } from './code39';
export type { EanResult, EanSymbology } from './ean';
export { BarcodeError, type BarcodeErrorCode, checkDigitError } from './error';
