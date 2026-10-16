/**
 * Tipos do pipeline de preparação de arquivo (imagem -> G-code).
 *
 * Convenção de valores: `0` = preto (queima) / `1` = branco (não queima).
 * A conversão para potência de laser (`S`) acontece só na emissão do G-code.
 */

/** Ajustes de imagem (RF-IMG-2). Todos em faixa -1..1 ou 0..1. */
export interface AdjustOptions {
  /** Brilho aditivo, -1..1 (0 = neutro). */
  brightness: number;
  /** Contraste, -1..1 (0 = neutro; -1 achata, 1 estica). */
  contrast: number;
  /** *White clip*: valores >= este limiar viram branco puro. 0 = desativado. */
  whiteClip: number;
  /** Inverte (preto <-> branco). */
  invert: boolean;
  /** Preto e branco (limiar) — usado no modo line-to-line. */
  blackWhite: boolean;
  /** Limiar do B&W, 0..1. */
  bwThreshold: number;
}

/** Algoritmo de conversão (RF-IMG-4 / RF-IMG-5 / RF-IMG-6). */
export type Algorithm = 'line' | 'dither' | 'vector';

/** Direção da varredura (RF-IMG-4). */
export type ScanDirection = 'h' | 'v';

/** Modo de laser (RF-IMG-7). */
export type LaserMode = 'M3' | 'M4';

/** Geometria do arquivo (RF-IMG-3 / RF-IMG-4 / RF-IMG-9). */
export interface GeometryOptions {
  /** Largura gravada em mm. */
  widthMm: number;
  /** Altura gravada em mm. */
  heightMm: number;
  /** Offset X no sistema de trabalho (mm). */
  offsetX: number;
  /** Offset Y no sistema de trabalho (mm). */
  offsetY: number;
  /** Resolução em linhas por mm (passo = 1/linesPerMm). */
  linesPerMm: number;
  /** Direção da varredura. */
  direction: ScanDirection;
  /** Diâmetro do ponto do laser em mm (compensação RF-IMG-9). 0 = sem compensação. */
  dotSizeMm: number;
}

/** Parâmetros de gravação (RF-IMG-7). */
export interface EngraveOptions {
  /** Velocidade de gravação (mm/min). */
  speedMmMin: number;
  /**
   * Velocidade estimada dos deslocamentos (mm/min). Usada **apenas** para estimar
   * o tempo; o G-code usa `G0`, cuja velocidade é definida por `$25`.
   */
  travelSpeedMmMin: number;
  /** Potência mínima (S) — abaixo dela o ponto não marca. */
  sMin: number;
  /** Potência máxima (S). */
  sMax: number;
  /** Modo M3 (constante) ou M4 (dinâmico). */
  mode: LaserMode;
}

export interface ImageToGcodeOptions {
  adjust: AdjustOptions;
  geometry: GeometryOptions;
  engrave: EngraveOptions;
  algorithm: Algorithm;
  /**
   * Gaps (trechos sem queima) maiores que isto usam `G0` em vez de `G1 S0`.
   * Padrão 1 mm. Só afeta tempo/tamanho, não o resultado.
   */
  gapThresholdMm?: number;
  /**
   * Suavização do contorno em modo `vector` (RF-IMG-6): Ramer–Douglas–Peucker
   * com tolerância em pixels da imagem. Padrão 0.5. Ignorado nos demais modos.
   */
  simplifyPx?: number;
}

export interface GcodeStats {
  /** Linhas de varredura geradas. */
  rows: number;
  /** Amostras por linha. */
  cols: number;
  /** Segmentos `G1` emitidos. */
  segments: number;
  /** Tamanho do arquivo em bytes. */
  bytes: number;
  /** Resolução efetiva pedida (linhas/mm). */
  linesPerMm: number;
  /** Comprimento total queimado (mm). */
  burnedMm: number;
  /** Comprimento total deslocado (mm). */
  travelMm: number;
  /** Tempo estimado (segundos). */
  estimatedSec: number;
  /** Área efetivamente alcançada (mm). */
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  /** Contornos gerados (só no modo `vector`). */
  contours?: number;
}

export interface GcodeResult {
  gcode: string;
  stats: GcodeStats;
  /** Matriz de potência (0..1, 1 = branco) usada no preview, `rows * cols`. */
  grid: Float32Array;
  /**
   * Só no modo `vector`: caminhos dos contornos para o preview desenhar as
   * linhas de corte de verdade. Formato "comprimento-prefixado":
   * `[n, x0, y0, x1, y1, ..., n, ...]`, com x/y normalizados 0..1 da área.
   */
  contourPaths?: Float32Array;
}
