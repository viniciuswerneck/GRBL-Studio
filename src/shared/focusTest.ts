/**
 * Gerador do **teste de foco / spot** (P2.13).
 *
 * Grava uma escada de linhas curtas, cada par numa **altura de Z** diferente:
 * a linha mais fina (e mais uniforme) indica a melhor altura de foco para
 * aquele material. Cada passo tem **duas potências** (baixa e alta) para julgar
 * o foco tanto na marcação leve quanto no corte — a potência alta mostra o
 * "spot" com mais contraste, a baixa mostra o ponto sem saturar o material.
 *
 * O Z é sempre **relativo ao Z atual** (G91 + G90, sem coordenada absoluta):
 * o app não sabe onde fica o zero de Z da máquina, e mandar um Z absoluto
 * poderia enfiar a cabeça no material. O programa desce até `zMin`, sobe até
 * `zMax` e **volta ao Z de partida** (a soma dos passos relativos é zero).
 *
 * Puro e testável: nada de DOM, nem de máquina aqui.
 */

/** Passos de Z por teste. */
export const FOCUS_MIN_STEPS = 3;
export const FOCUS_MAX_STEPS = 31;

/** Avanço do movimento de Z entre os passos (mm/min) — lento de propósito. */
export const FOCUS_Z_FEED = 200;

/** Opções do teste de foco. */
export interface FocusTestOptions {
  /** Número de alturas de Z (cada uma com 2 linhas). */
  steps: number;
  /**
   * Altura de Z por passo, em mm. O **sinal** é o sentido do movimento:
   * positivo afasta a cabeça do material (padrão); negativo aproxima.
   */
  zStep: number;
  /** Comprimento de cada linha (mm). */
  lineLength: number;
  /** Distância entre as linhas, no eixo Y (mm). */
  spacing: number;
  /** Avanço de gravação (mm/min). */
  feed: number;
  /** Potência da 1ª linha de cada passo (%). */
  powerLow: number;
  /** Potência da 2ª linha de cada passo (%). */
  powerHigh: number;
  /** Modo do laser. */
  mode: 'M3' | 'M4';
  /** S máximo da máquina (ex.: 1000). */
  sMax: number;
}

/** Uma linha do teste (2 por passo: baixa e alta potência). */
export interface FocusTestLine {
  /** Passo de Z (0-based). */
  step: number;
  /** Deslocamento de Z em relação ao Z de partida (mm). */
  zOffset: number;
  /** Posição Y da linha (mm). */
  y: number;
  /** Potência em % (do S-max). */
  powerPercent: number;
  /** Potência em unidades S da máquina. */
  powerS: number;
  /** `true` na linha de potência alta. */
  high: boolean;
}

export interface FocusTestResult {
  gcode: string;
  /** Largura ocupada (mm). */
  width: number;
  /** Altura ocupada (mm) — do primeiro ao último par de linhas. */
  height: number;
  lines: FocusTestLine[];
  /** Menor deslocamento de Z no teste (mm, relativo). */
  zMin: number;
  /** Maior deslocamento de Z no teste (mm, relativo). */
  zMax: number;
}

/** Formata coordenada com 3 decimais (padrão dos geradores do app). */
function fmt(v: number): string {
  return v.toFixed(3);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Passos: inteiro em [3, 31]. */
function clampSteps(value: number): number {
  return Math.round(clamp(value, FOCUS_MIN_STEPS, FOCUS_MAX_STEPS));
}

/** Passo de Z preservando o sinal (0 vira o padrão de 0,1 mm). */
function clampZStep(value: number): number {
  const raw = Number.isFinite(value) && value !== 0 ? value : 0.1;
  const magnitude = clamp(Math.abs(raw), 0.01, 5);
  return raw < 0 ? -magnitude : magnitude;
}

function clampPercent(value: number, fallback: number): number {
  const raw = Number.isFinite(value) ? value : fallback;
  return clamp(raw, 0, 100);
}

/**
 * Gera o G-code do teste de foco. Puro e testável.
 *
 * As linhas saem da frente (Y0) para trás, em pares por passo de Z — a legenda
 * no cabeçalho (e no diálogo) diz qual Z cada par representa.
 */
export function generateFocusTest(opts: FocusTestOptions): FocusTestResult {
  const steps = clampSteps(opts.steps);
  const zStep = clampZStep(opts.zStep);
  const lineLength = clamp(opts.lineLength, 1, 200);
  const spacing = clamp(opts.spacing, 0, 50);
  const feed = clamp(opts.feed, 10, 20000);
  const lowPercent = clampPercent(opts.powerLow, 10);
  const highPercent = clampPercent(opts.powerHigh, 40);
  const sMax = Math.max(1, opts.sMax);
  const mode = opts.mode === 'M3' ? 'M3' : 'M4';

  const lowS = Math.round((lowPercent / 100) * sMax);
  const highS = Math.round((highPercent / 100) * sMax);

  const half = ((steps - 1) / 2) * zStep;
  const zMin = Math.min(-half, half);
  const zMax = Math.max(-half, half);
  const direction =
    zStep > 0
      ? 'Z+ afasta a cabeca do material'
      : 'Z+ aproxima a cabeca do material';

  const lines: FocusTestLine[] = [];
  const gcode: string[] = [];

  gcode.push('; GRBL Studio — teste de foco (spot)');
  gcode.push(
    `; ${steps} passos de Z a partir do Z atual: ${fmt(zMin)} .. ${fmt(zMax)} mm (passo ${fmt(zStep)})`,
  );
  gcode.push(`; ${direction}`);
  gcode.push(
    `; 2 linhas por passo: ${lowPercent}% (S${lowS}) e ${highPercent}% (S${highS}) — modo ${mode}, S-max ${sMax}`,
  );
  gcode.push(
    `; linha ${fmt(lineLength)} mm, espaco ${fmt(spacing)} mm entre linhas, avanco ${Math.round(feed)} mm/min`,
  );
  gcode.push(
    '; a linha mais fina/uniforme indica o melhor foco; as linhas vao da frente (Y0) para tras',
  );
  gcode.push('; legenda (passo -> Z relativo mm):');
  for (let step = 0; step < steps; step++) {
    const z = (step - (steps - 1) / 2) * zStep;
    const yLow = step * 2 * spacing;
    const yHigh = (step * 2 + 1) * spacing;
    lines.push({
      step,
      zOffset: z,
      y: yLow,
      powerPercent: lowPercent,
      powerS: lowS,
      high: false,
    });
    lines.push({
      step,
      zOffset: z,
      y: yHigh,
      powerPercent: highPercent,
      powerS: highS,
      high: true,
    });
    gcode.push(
      `;   ${step}: Z${fmt(z)} -> ${lowPercent}% em Y${fmt(yLow)}, ${highPercent}% em Y${fmt(yHigh)}`,
    );
  }
  gcode.push('G21');
  gcode.push('G90');
  gcode.push('G94');
  gcode.push('M5');
  gcode.push('G0 X0 Y0');
  // Vai ao primeiro degrau de Z em modo relativo (o Z de partida é o zero).
  gcode.push('G91');
  gcode.push(`G1 Z${fmt(-half)} F${FOCUS_Z_FEED}`);
  gcode.push('G90');

  for (const line of lines) {
    if (!line.high) {
      if (line.step > 0) {
        // Sobe/desce um degrau antes do par (laser já desligado pelo M5).
        gcode.push('G91');
        gcode.push(`G1 Z${fmt(zStep)} F${FOCUS_Z_FEED}`);
        gcode.push('G90');
      }
      gcode.push(`; passo ${line.step} (Z ${fmt(line.zOffset)})`);
    }
    gcode.push(`G0 X0 Y${fmt(line.y)}`);
    gcode.push(`${mode} S${line.powerS}`);
    gcode.push(`G1 X${fmt(lineLength)} Y${fmt(line.y)} F${Math.round(feed)}`);
    gcode.push('M5');
  }

  // Volta ao Z de partida: a soma de todos os passos relativos é zero
  // (desceu `half` no início, subiu `2*half` na escada e volta `half`).
  gcode.push('G91');
  gcode.push(`G1 Z${fmt(-half)} F${FOCUS_Z_FEED}`);
  gcode.push('G90');
  gcode.push('M5');
  gcode.push('G0 X0 Y0');
  gcode.push('');

  return {
    gcode: gcode.join('\n'),
    width: lineLength,
    height: (steps * 2 - 1) * spacing,
    lines,
    zMin,
    zMax,
  };
}
