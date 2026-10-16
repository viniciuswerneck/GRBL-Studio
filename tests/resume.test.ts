import { describe, expect, it } from 'vitest';
import { buildPreamble, buildResume, suggestStart } from '../src/shared/resume';

const PROGRAM = [
  'G21',
  'G90',
  'G94',
  'M5',
  'G0 X0 Y0',
  'M4',
  'G1 X10 Y0 S200 F1000',
  'G1 X10 Y10 S200',
  'G1 X0 Y10 S200',
  'G0 X0 Y0',
  'M5',
];

describe('retomada (RF-GC-7)', () => {
  it('não altera o programa quando começa do zero', () => {
    expect(buildResume(PROGRAM, 0)).toEqual(PROGRAM);
  });

  it('reconstrói o estado modal vigente antes da linha', () => {
    // Antes do índice 6 (primeiro G1) o laser já foi armado com M4.
    const preamble = buildPreamble(PROGRAM.slice(0, 6));
    expect(preamble).toEqual(['M5', 'G21', 'G90', 'G94', 'M4']);
  });

  it('ignora modais que ainda não apareceram', () => {
    expect(buildPreamble(['G0 X1 Y1'])).toEqual(['M5']);
  });

  it('reafirma o último valor de cada modal (sobreposição)', () => {
    const preamble = buildPreamble([
      'G21 G90 G94',
      'M4',
      'G20', // polegadas por último
      'G91', // incremental por último
      'G17',
    ]);
    expect(preamble).toEqual(['M5', 'G17', 'G20', 'G91', 'G94', 'M4']);
  });

  it('assume S0 no M3 para não acender o laser parado', () => {
    expect(buildPreamble(['M3 S500'])).toEqual(['M5', 'M3 S0']);
  });

  it('remove comentários e linhas vazias do preâmbulo', () => {
    const preamble = buildPreamble([
      '( setup )',
      'G21 ; unidades',
      '   ',
      'M4',
    ]);
    expect(preamble).toEqual(['M5', 'G21', 'M4']);
  });

  it('preserva os offsets de trabalho (G54–G59)', () => {
    expect(buildPreamble(['G54', 'G57'])).toEqual(['M5', 'G57']);
  });

  it('mantém o G90.1 (arcos) separado do G90/G91', () => {
    const preamble = buildPreamble(['G90', 'G91', 'G90.1']);
    expect(preamble).toEqual(['M5', 'G91', 'G90.1']);
  });

  it('monta o programa retomado com preâmbulo + cauda', () => {
    const resumed = buildResume(PROGRAM, 6);
    expect(resumed.slice(0, 6)).toEqual([
      'M5',
      'G21',
      'G90',
      'G94',
      'M4',
      'G1 X10 Y0 S200 F1000',
    ]);
    expect(resumed.at(-1)).toBe('M5');
  });

  it('limita o índice ao tamanho do programa', () => {
    expect(buildResume(PROGRAM, 999)).toEqual([
      ...buildPreamble(PROGRAM),
      ...[],
    ]);
    expect(buildResume(PROGRAM, -5)).toEqual(PROGRAM);
  });

  it('sugere retomada algumas linhas antes do confirmado', () => {
    expect(suggestStart(120, 10)).toBe(110);
    expect(suggestStart(3, 10)).toBe(0);
    expect(suggestStart(0)).toBe(0);
  });
});
