/**
 * Bench thresholds para CI gate (P1-2).
 * Estes valores vêm dos requisitos RNF-11/RNF-12 em docs/DESIGN.md
 * e do PLANO_DE_ACAO.md.
 */
export const BENCH_THRESHOLDS = {
  /** Startup total (cold) ≤ 1,8 s (RNF-11: ≤ 1,5 s + margem CI) */
  startupMs: 1800,
  /** PSS X11 ≤ 300 MB (RNF-11: ≤ 280 MB + margem CI) */
  pssX11Mb: 300,
  /** PSS Wayland ≤ 320 MB (RNF-11: ≤ 300 MB + margem CI) */
  pssWaylandMb: 320,
  /** FPS mínimo durante job ≥ 50 (RNF-12: ≥ 55 FPS + margem CI) */
  fpsMin: 50,
  /** Latência IPC P95 ≤ 20 ms (RNF-12: resposta ≤ 100 ms) */
  ipcP95Ms: 20,
} as const;

/** Type helper para uso em scripts de validação. */
export type BenchThresholds = typeof BENCH_THRESHOLDS;
