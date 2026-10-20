/**
 * **Custo por peça** — módulo puro.
 *
 * O preço de uma peça cortada tem duas parcelas: o **tempo de máquina** (mão de
 * obra + depreciação + energia, informado por hora) e o **material** (preço da
 * chapa por m² × área ocupada pela arte). O tempo vem do mesmo estimador do
 * G-code (`estimateSeconds`), então o número bate com o rótulo do arquivo.
 *
 * Fora do cálculo, de propósito: refugo, energia em standby, acabamento e
 * impostos — o usuário embute o que quiser na tarifa da máquina.
 *
 * Sem DOM e sem IPC: o renderer só formata e persiste.
 */

/** Moedas suportadas (o locale de formatação vem daqui). */
export type CostCurrency = 'BRL' | 'USD' | 'EUR';

export const COST_CURRENCIES: readonly CostCurrency[] = ['BRL', 'USD', 'EUR'];

/** Limite de sanidade para tarifa/hora e preço/m² (evita overflow/typo). */
export const COST_MAX = 100_000;

export interface CostInputs {
  /** Tempo estimado do programa, em segundos. */
  seconds: number;
  /** Área de material consumida, em mm². */
  areaMm2: number;
  /** Custo da máquina por hora (moeda corrente). */
  machinePerHour: number;
  /** Custo da chapa por m² (moeda corrente). */
  materialPerM2: number;
}

export interface CostBreakdown {
  /** Parcela do tempo de máquina. */
  machine: number;
  /** Parcela do material. */
  material: number;
  /** Soma das duas (o que a peça custa). */
  total: number;
}

const LOCALE: Record<CostCurrency, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'es-ES',
};

/** Tarifa/preço válidos: número finito, ≥ 0 e ≤ `COST_MAX`. */
export function sanitizeCost(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(COST_MAX, value);
}

/** Moeda válida (padrão BRL, a do público-alvo). */
export function sanitizeCurrency(value: unknown): CostCurrency {
  return value === 'USD' || value === 'EUR' || value === 'BRL' ? value : 'BRL';
}

/** Custo da peça: parcela da máquina + parcela do material. */
export function estimateCost(inputs: CostInputs): CostBreakdown {
  const seconds = Number.isFinite(inputs.seconds)
    ? Math.max(0, inputs.seconds)
    : 0;
  const area = Number.isFinite(inputs.areaMm2)
    ? Math.max(0, inputs.areaMm2)
    : 0;
  const machine = (seconds / 3600) * sanitizeCost(inputs.machinePerHour);
  const material = (area / 1_000_000) * sanitizeCost(inputs.materialPerM2);
  return { machine, material, total: machine + material };
}

/** Formata um valor na moeda escolhida (2 casas; só apresentação). */
export function formatMoney(value: number, currency: CostCurrency): string {
  const v = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(LOCALE[currency], {
      style: 'currency',
      currency,
    }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}
