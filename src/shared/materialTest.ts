/**
 * Gerador de **grade de teste de material** (material test grid).
 *
 * Produz um G-code que grava uma grade de quadrados, cada um com uma
 * combinação distinta de **velocidade (F)** e **potência (S)**. É a forma
 * mais rápida de descobrir os parâmetros ideais para um material/laser
 * (papel, MDF, acrílico, couro…) sem desperdiçar material.
 *
 * Inspirado no "Material Test" do LightBurn, mas gratuito e integrado ao
 * GRBL Studio. O resultado é um G-code padrão que pode ser enviado direto
 * pela UI (preview + Play) ou salvo em arquivo.
 *
 * Cada célula é gravada com linhas horizontais (zig-zague) a 10 linhas/mm.
 * A identificação da combinação (velocidade, potência) de cada célula fica
 * na **legenda** impressa no cabeçalho do arquivo e mostrada no diálogo —
 * sem gravar texto na peça (mantém o G-code curto e previsível).
 */

/** Opções da grade. */
export interface MaterialTestOptions {
  /** Número de colunas (passos de velocidade). */
  cols: number;
  /** Número de linhas (passos de potência). */
  rows: number;
  /** Velocidade mínima (mm/min). */
  speedMin: number;
  /** Velocidade máxima (mm/min). */
  speedMax: number;
  /** Potência mínima (0..100 % do S-max). */
  powerMin: number;
  /** Potência máxima (0..100 % do S-max). */
  powerMax: number;
  /** Lado do quadrado (mm). */
  cellSize: number;
  /** Espaço entre células (mm). */
  spacing: number;
  /** Passadas por célula. */
  passes: number;
  /** Modo do laser. */
  mode: 'M3' | 'M4';
  /** S máximo da máquina (ex.: 1000). */
  sMax: number;
  /** Feed de deslocamento (G0) em mm/min. */
  travelFeed: number;
}

export interface MaterialTestLegendEntry {
  index: number;
  col: number;
  row: number;
  speed: number;
  powerPercent: number;
  powerS: number;
}

export interface MaterialTestResult {
  gcode: string;
  width: number;
  height: number;
  legend: MaterialTestLegendEntry[];
}

const LINES_PER_MM = 10;
const PITCH = 1 / LINES_PER_MM;

/** Formata coordenada com 3 decimais (mesmo padrão do gerador de imagem). */
function fmt(v: number): string {
  return v.toFixed(3);
}

/** Interpola linearmente entre a e b em `steps` passos (incluindo extremos). */
function linspace(a: number, b: number, steps: number): number[] {
  if (steps <= 1) return [a];
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    out.push(a + (b - a) * (i / (steps - 1)));
  }
  return out;
}

/** Gera o G-code do teste de material. Puro e testável. */
export function generateMaterialTest(
  opts: MaterialTestOptions,
): MaterialTestResult {
  const cols = Math.max(1, Math.round(opts.cols));
  const rows = Math.max(1, Math.round(opts.rows));
  const passes = Math.max(1, Math.round(opts.passes));
  const cellSize = Math.max(1, opts.cellSize);
  const spacing = Math.max(0, opts.spacing);
  const sMax = Math.max(1, opts.sMax);

  const speeds = linspace(opts.speedMin, opts.speedMax, cols);
  const powers = linspace(opts.powerMin, opts.powerMax, rows);

  const pitch = cellSize + spacing;
  const width = cols * cellSize + (cols - 1) * spacing;
  const height = rows * cellSize + (rows - 1) * spacing;

  const lines: string[] = [];
  lines.push('; GRBL Studio — grade de teste de material');
  lines.push(`; grade ${cols} x ${rows} (colunas=velocidade, linhas=potencia)`);
  lines.push(`; velocidade: ${opts.speedMin}..${opts.speedMax} mm/min`);
  lines.push(`; potencia: ${opts.powerMin}..${opts.powerMax} %`);
  lines.push(
    `; celula ${cellSize} mm, espaco ${spacing} mm, ${passes} passada(s)`,
  );
  lines.push(`; modo ${opts.mode}, S-max ${sMax}`);
  lines.push('; legenda (indice -> velocidade mm/min, potencia %):');
  const legend: MaterialTestLegendEntry[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const speed = Math.round(speeds[c]);
      const powerPct = Math.round(powers[r]);
      const powerS = Math.round((powerPct / 100) * sMax);
      legend.push({
        index: idx,
        col: c,
        row: r,
        speed,
        powerPercent: powerPct,
        powerS,
      });
      lines.push(`;   ${idx}: ${speed} mm/min, ${powerPct}% (S${powerS})`);
    }
  }
  lines.push('G21');
  lines.push('G90');
  lines.push('G94');
  lines.push('M5');
  lines.push(`G0 X0 Y0 F${opts.travelFeed}`);

  const arm = opts.mode === 'M4' ? 'M4' : 'M3';

  for (let pass = 0; pass < passes; pass++) {
    if (passes > 1) lines.push(`; pass ${pass + 1}/${passes}`);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const entry = legend[idx];
        const x0 = c * pitch;
        const y0 = r * pitch;
        const x1 = x0 + cellSize;
        const y1 = y0 + cellSize;

        // Deslocamento até a célula (laser desligado).
        lines.push(`G0 X${fmt(x0)} Y${fmt(y0)}`);
        lines.push(`${arm} S${entry.powerS}`);
        // Preenchimento com linhas horizontais, zig-zague por linha.
        const nLines = Math.max(1, Math.round(cellSize * LINES_PER_MM));
        for (let k = 0; k < nLines; k++) {
          const y = y0 + k * PITCH;
          const yc = Math.min(y, y1);
          if (k % 2 === 0) {
            lines.push(`G1 X${fmt(x1)} Y${fmt(yc)} F${entry.speed}`);
          } else {
            lines.push(`G1 X${fmt(x0)} Y${fmt(yc)} F${entry.speed}`);
          }
        }
        // Fecha a célula na última linha se necessário.
        if (nLines % 2 === 0) {
          lines.push(`G1 X${fmt(x0)} Y${fmt(y1)} F${entry.speed}`);
        }
        lines.push('M5');
      }
    }
  }

  lines.push('M5');
  lines.push('G0 X0 Y0');
  lines.push('');

  return { gcode: lines.join('\n'), width, height, legend };
}
