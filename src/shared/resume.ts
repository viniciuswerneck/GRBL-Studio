/**
 * Retomada de um job interrompido (RF-GC-7).
 *
 * O GRBL trabalha por passos (sem memória de arquivo): ao retomar, o app precisa
 * reenviar a partir de uma linha escolhida **e** reafirmar o estado modal que o
 * programa tinha até ali (unidades, plano, distância, offsets, laser/spindle).
 *
 * Este módulo é puro e testável: recebe as linhas do arquivo e o índice de
 * retomada, e devolve o programa final já com o preâmbulo de segurança.
 */

/** Estado modal rastreado e reconstruído antes de retomar. */
const MODAL_CLASSES: Array<{ kind: string; test: RegExp }> = [
  { kind: 'plane', test: /^G(17|18|19)$/ },
  { kind: 'units', test: /^G(20|21)$/ },
  { kind: 'distance', test: /^G9(0|1)$/ },
  { kind: 'arc', test: /^G9(0|1)\.1$/ },
  { kind: 'feed', test: /^G9(3|4)$/ },
  { kind: 'offset', test: /^G5[4-9](\.[0-9])?$/ },
  { kind: 'laser', test: /^M(3|4|5)$/ },
];

/** Ordem em que os modais são reafirmados (do geral para o específico). */
const MODAL_ORDER = [
  'plane',
  'units',
  'distance',
  'arc',
  'feed',
  'offset',
  'laser',
];

/** Maiúsculas, sem comentários de parênteses nem de ponto e vírgula. */
function clean(line: string): string {
  return line
    .replace(/\(.*?\)/g, ' ')
    .replace(/;.*$/, ' ')
    .trim();
}

/** Palavras de uma linha, já normalizadas. */
function tokens(line: string): string[] {
  return clean(line).toUpperCase().split(/\s+/).filter(Boolean);
}

/**
 * Reconstrói os comandos modais vigentes antes de `before`.
 * Sempre começa com `M5` (laser/rosca desligados) por segurança.
 */
export function buildPreamble(before: string[]): string[] {
  const last: Record<string, string> = {};
  for (const line of before) {
    for (const token of tokens(line)) {
      for (const { kind, test } of MODAL_CLASSES) {
        if (test.test(token)) last[kind] = token;
      }
    }
  }

  const preamble = ['M5'];
  for (const kind of MODAL_ORDER) {
    const command = last[kind];
    if (!command) continue;
    if (kind === 'laser') {
      if (command === 'M5') continue; // já garantido
      // M3/M4 sem S usariam o S modal anterior; M3 nasce com S0 (laser off).
      preamble.push(command === 'M3' ? 'M3 S0' : 'M4');
    } else {
      preamble.push(command);
    }
  }
  return preamble;
}

/**
 * Programa de retomada: preâmbulo de segurança + linhas da `startIndex` em
 * diante. Com `startIndex` 0 devolve o próprio arquivo (sem cópia desnecessária).
 */
export function buildResume(lines: string[], startIndex: number): string[] {
  const start = Math.max(0, Math.min(Math.trunc(startIndex), lines.length));
  if (start === 0) return [...lines];
  return [...buildPreamble(lines.slice(0, start)), ...lines.slice(start)];
}

/**
 * Sugere um ponto de retomada `linesBack` linhas antes do que foi confirmado
 * (`done`), para o laser não recomeçar em cima de material já queimado.
 */
export function suggestStart(done: number, linesBack = 10): number {
  return Math.max(0, Math.trunc(done) - Math.max(0, Math.trunc(linesBack)));
}
