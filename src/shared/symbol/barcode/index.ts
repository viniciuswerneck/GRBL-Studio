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

import { encodeCodabar } from './codabar';
import { type Code128Options, encodeCode128 } from './code128';
import { encodeCode93 } from './code93';
import { type Code39Ratio, encodeCode39 } from './code39';
import { encodeEan } from './ean';
import { BarcodeError } from './error';
import { encodeItf14 } from './itf';

/**
 * Simbologias 1D suportadas — as da v0.6 mais **ITF-14**, **Codabar**,
 * **Code 93** e **GS1-128**. É o tipo consumido pelo G-code, pela fachada do
 * bundle e pela UI (o `select` do modal de código de barras).
 */
export type BarcodeSymbology =
  | 'code128'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'code39'
  | 'itf14'
  | 'codabar'
  | 'code93'
  | 'gs1-128';

/**
 * Simbologias que não existiam na v0.6. Mantido para quem precisa do recorte
 * (ex.: realce na UI, testes de compatibilidade).
 */
export type BarcodeSymbologyExtra = Exclude<
  BarcodeSymbology,
  'code128' | 'ean13' | 'ean8' | 'upca' | 'code39'
>;

/** Qualquer simbologia aceita por {@link encodeBarcode}. */
export type BarcodeSymbologyAll = BarcodeSymbology;

export interface BarcodeSpec {
  /** Nome canônico da simbologia (não é texto de UI traduzível). */
  label: string;
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

export const BARCODE_SPECS: Record<BarcodeSymbologyAll, BarcodeSpec> = {
  code128: {
    label: 'Code 128',
    quietZoneMinModules: 10,
    xDimMinMm: 0.19,
    barHeightMinMm: 5,
    defaultBarHeightMm: 10,
    defaultXDimMm: 0.5,
    digitsOnly: false,
    example: 'GRBL-STUDIO-001',
  },
  ean13: {
    label: 'EAN-13',
    quietZoneMinModules: 11,
    xDimMinMm: 0.264,
    barHeightMinMm: 6.35,
    defaultBarHeightMm: 12,
    defaultXDimMm: 0.33,
    digitsOnly: true,
    example: '590123412345',
  },
  ean8: {
    label: 'EAN-8',
    quietZoneMinModules: 7,
    xDimMinMm: 0.264,
    barHeightMinMm: 6.35,
    defaultBarHeightMm: 12,
    defaultXDimMm: 0.33,
    digitsOnly: true,
    example: '9638507',
  },
  upca: {
    label: 'UPC-A',
    quietZoneMinModules: 9,
    xDimMinMm: 0.264,
    barHeightMinMm: 6.35,
    defaultBarHeightMm: 12,
    defaultXDimMm: 0.33,
    digitsOnly: true,
    example: '03600029145',
  },
  code39: {
    label: 'Code 39',
    quietZoneMinModules: 10,
    xDimMinMm: 0.19,
    barHeightMinMm: 5,
    defaultBarHeightMm: 10,
    defaultXDimMm: 0.5,
    digitsOnly: false,
    example: 'GRBL-STUDIO',
  },
  itf14: {
    label: 'ITF-14',
    quietZoneMinModules: 10,
    xDimMinMm: 0.5,
    barHeightMinMm: 12,
    defaultBarHeightMm: 15,
    defaultXDimMm: 0.5,
    digitsOnly: true,
    example: '0950110153000',
  },
  codabar: {
    label: 'Codabar',
    quietZoneMinModules: 10,
    xDimMinMm: 0.19,
    barHeightMinMm: 6.35,
    defaultBarHeightMm: 10,
    defaultXDimMm: 0.5,
    digitsOnly: false,
    example: 'A40156B',
  },
  code93: {
    label: 'Code 93',
    quietZoneMinModules: 10,
    xDimMinMm: 0.19,
    barHeightMinMm: 5,
    defaultBarHeightMm: 10,
    defaultXDimMm: 0.5,
    digitsOnly: false,
    example: 'GRBL-93',
  },
  // Exemplo: 16 dígitos de dados + `^` (FNC1) + campo alfanumérico. O encoder
  // **não valida AIs** (Application Identifiers): só codifica os bytes; o
  // dicionário GS1 fica com quem chama.
  'gs1-128': {
    label: 'GS1-128',
    quietZoneMinModules: 10,
    xDimMinMm: 0.25,
    barHeightMinMm: 6.35,
    defaultBarHeightMm: 10,
    defaultXDimMm: 0.5,
    digitsOnly: false,
    example: '0109501101530003^10ABC123',
  },
};

/** Barra do símbolo em unidades de módulo: começa em `x`, com largura `w`. */
export interface BarcodeBar {
  x: number;
  w: number;
}

export interface BarcodeOptions {
  symbology: BarcodeSymbologyAll;
  /** Code 128: conjunto fixo ou `auto`. Padrão `auto`. */
  code128Charset?: Code128Options['charset'];
  /**
   * Code 128: modo **GS1-128** (FNC1 após o start e `^` como FNC1). Padrão
   * falso. Com `symbology: 'gs1-128'` é sempre ligado. **Não** valida AIs.
   */
  gs1?: boolean;
  /** Code 39: razão largo:estreito. Padrão `3`. */
  code39Ratio?: Code39Ratio;
  /** Code 39: caractere de verificação mod 43. Padrão falso. */
  code39Checksum?: boolean;
}

export interface BarcodeResult {
  symbology: BarcodeSymbologyAll;
  /** Barras em unidades de módulo (X-dimension), ordenadas e sem sobrepor. */
  bars: BarcodeBar[];
  /** Largura do símbolo em módulos (sem a quiet zone). */
  totalModules: number;
  /**
   * Conteúdo efetivo, já com o dígito/caractere de verificação. No Code 93 os
   * verificadores C/K são símbolos internos: `data` e `hri` mostram o texto do
   * usuário. No GS1-128, `^` marca os FNC1.
   */
  data: string;
  /** Texto legível (HRI). No Codabar não inclui os guards. */
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
function isSymbology(value: string): value is BarcodeSymbologyAll {
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

  if (symbology === 'code128' || symbology === 'gs1-128') {
    const res = encodeCode128(text, {
      charset: opts.code128Charset,
      gs1: symbology === 'gs1-128' || opts.gs1 === true,
    });
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

  if (symbology === 'itf14') {
    const res = encodeItf14(text);
    return {
      symbology,
      bars: modulesToBars(res.modules),
      totalModules: res.modules.length,
      data: res.data,
      hri: res.hri,
      checkDigit: res.checkDigit,
    };
  }

  if (symbology === 'codabar') {
    const res = encodeCodabar(text);
    return {
      symbology,
      bars: modulesToBars(res.modules),
      totalModules: res.modules.length,
      data: res.data,
      hri: res.hri,
    };
  }

  if (symbology === 'code93') {
    const res = encodeCode93(text);
    return {
      symbology,
      bars: modulesToBars(res.modules),
      totalModules: res.modules.length,
      data: res.data,
      hri: res.hri,
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

export type { CodabarGuard, CodabarResult } from './codabar';
export { encodeCodabar } from './codabar';
export type { Code128Charset, Code128Options, Code128Result } from './code128';
export { CODE128_FNC1, encodeCode128 } from './code128';
export type { Code93Result } from './code93';
export { CODE93_ALPHABET, code93Checks, encodeCode93 } from './code93';
export type { Code39Options, Code39Ratio, Code39Result } from './code39';
export type { EanResult, EanSymbology } from './ean';
export { eanCheckDigit } from './ean';
export { BarcodeError, type BarcodeErrorCode, checkDigitError } from './error';
export type { Itf14Result } from './itf';
export { encodeItf14, itf14CheckDigit } from './itf';
