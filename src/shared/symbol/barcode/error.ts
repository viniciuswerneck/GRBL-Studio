/**
 * Erro dos encoders de código de barras — a UI traduz pelo `code` (padrão
 * "nenhuma lógica de protocolo/formato na UI"). Quando o problema é um dígito
 * verificador, `expected`/`given` carregam o esperado × o informado.
 */

export type BarcodeErrorCode =
  | 'empty'
  | 'bad-chars'
  | 'bad-length'
  | 'check-digit'
  | 'bad-option';

export class BarcodeError extends Error {
  constructor(
    readonly code: BarcodeErrorCode,
    message: string,
    readonly expected?: string,
    readonly given?: string,
  ) {
    super(message);
    this.name = 'BarcodeError';
  }
}

/** Erro de dígito verificador com o esperado × o informado explícitos. */
export function checkDigitError(expected: string, given: string): BarcodeError {
  return new BarcodeError(
    'check-digit',
    `dígito verificador inválido: esperado ${expected}, informado ${given}`,
    expected,
    given,
  );
}
