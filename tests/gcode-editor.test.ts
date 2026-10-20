import { describe, expect, it } from 'vitest';
import {
  applyEdit,
  buildSnippet,
  type GcodeToken,
  normalizeRange,
  revertEdit,
  summarizeGcode,
  tokenizeGcodeLine,
} from '../src/shared/gcodeEditor';

/** Texto de cada trecho, na ordem — o realce é o `kind`. */
const texts = (tokens: GcodeToken[]): string[] => tokens.map((t) => t.text);
const kindOf = (tokens: GcodeToken[], text: string): string | undefined =>
  tokens.find((t) => t.text === text)?.kind;

describe('editor de G-code — realce por linha (P1.10)', () => {
  it('separa palavras coladas e classifica cada uma', () => {
    const tokens = tokenizeGcodeLine('G1X10.5Y-2F300S800');
    expect(texts(tokens)).toEqual(['G1', 'X10.5', 'Y-2', 'F300', 'S800']);
    expect(kindOf(tokens, 'G1')).toBe('code');
    expect(kindOf(tokens, 'X10.5')).toBe('axis');
    expect(kindOf(tokens, 'Y-2')).toBe('axis');
    expect(kindOf(tokens, 'F300')).toBe('feed');
    expect(kindOf(tokens, 'S800')).toBe('power');
  });

  it('classifica M, T, N e centros de arco', () => {
    const tokens = tokenizeGcodeLine('N10 M4 T1 S250');
    expect(kindOf(tokens, 'N10')).toBe('line');
    expect(kindOf(tokens, 'M4')).toBe('code');
    expect(kindOf(tokens, 'T1')).toBe('tool');
    expect(kindOf(tokens, 'S250')).toBe('power');
    const arc = tokenizeGcodeLine('G2 X0 Y0 I5 J0');
    expect(kindOf(arc, 'I5')).toBe('axis');
    expect(kindOf(arc, 'J0')).toBe('axis');
  });

  it('marca comentários de parênteses e de ponto e vírgula', () => {
    const paren = tokenizeGcodeLine('G0 X0 (ida ao zero)');
    expect(kindOf(paren, '(ida ao zero)')).toBe('comment');
    const semi = tokenizeGcodeLine('G0 X0 ; comentário até o fim');
    expect(kindOf(semi, '; comentário até o fim')).toBe('comment');
  });

  it('aceita parênteses aninhados e trata ( sem fechamento como comentário', () => {
    const nested = tokenizeGcodeLine('G1 X1 (a (b) c) Y2');
    const comment = nested.find((t) => t.kind === 'comment');
    expect(comment?.text).toBe('(a (b) c)');
    expect(kindOf(nested, 'Y2')).toBe('axis');

    const open = tokenizeGcodeLine('G1 X1 (sem fim');
    expect(open.at(-1)).toEqual({ kind: 'comment', text: '(sem fim' });
  });

  it('preserva o texto original (nada é arredondado ou normalizado)', () => {
    const line = 'G1 X10.123456 Y-0.000001 F1234.5 ; precisão intacta';
    const tokens = tokenizeGcodeLine(line);
    expect(tokens.map((t) => t.text).join('')).toBe(line);
  });

  it('não confunde letra sem número com palavra', () => {
    const tokens = tokenizeGcodeLine('G0 X0 %');
    // `%` (início/fim de programa) não é palavra: fica no trecho "plain".
    expect(tokens.some((t) => t.kind === 'plain' && t.text.includes('%'))).toBe(
      true,
    );
    expect(tokens.map((t) => t.text).join('')).toBe('G0 X0 %');
  });
});

describe('editor de G-code — resumo do programa', () => {
  it('conta comandos, comentários, rápidos, movimentos e S máximo', () => {
    const summary = summarizeGcode([
      '(cabeçalho)',
      '',
      'G21',
      'G0 X0 Y0',
      'G1 X10 Y0 F300 S250',
      'G1 X10 Y10 S1000',
      '; fim',
    ]);
    expect(summary.lines).toBe(7);
    expect(summary.commands).toBe(4);
    expect(summary.comments).toBe(3);
    expect(summary.rapids).toBe(1);
    expect(summary.moves).toBe(2);
    expect(summary.maxS).toBe(1000);
  });

  it('sem S devolve null (nunca inventa potência)', () => {
    expect(summarizeGcode(['G0 X1', 'G1 X2']).maxS).toBeNull();
  });

  it('ignora S/G dentro de comentários (não infla potência nem movimentos)', () => {
    const summary = summarizeGcode([
      'G1 X1 S100 (S999 G0)',
      '; G1 X5 S2000',
      'G0 X0',
    ]);
    expect(summary.maxS).toBe(100);
    expect(summary.moves).toBe(1);
    expect(summary.rapids).toBe(1);
    expect(summary.commands).toBe(2);
    expect(summary.comments).toBe(1);
  });
});

describe('editor de G-code — edições reversíveis', () => {
  const base = ['G0 X0', 'G1 X10 F300', 'M5'];

  it('set troca a linha e o revert restaura', () => {
    const edit = {
      kind: 'set' as const,
      index: 1,
      before: 'G1 X10 F300',
      after: 'G1 X20 F300',
    };
    const edited = applyEdit(base, edit);
    expect(edited[1]).toBe('G1 X20 F300');
    expect(base[1]).toBe('G1 X10 F300'); // entrada intacta
    expect(revertEdit(edited, edit)).toEqual(base);
  });

  it('insert e remove são inversos', () => {
    const insert = { kind: 'insert' as const, index: 2, after: 'G4 P0.5' };
    const inserted = applyEdit(base, insert);
    expect(inserted).toEqual(['G0 X0', 'G1 X10 F300', 'G4 P0.5', 'M5']);
    expect(revertEdit(inserted, insert)).toEqual(base);

    const remove = { kind: 'remove' as const, index: 0, before: 'G0 X0' };
    const removed = applyEdit(base, remove);
    expect(removed).toEqual(['G1 X10 F300', 'M5']);
    expect(revertEdit(removed, remove)).toEqual(base);
  });

  it('índice fora da faixa não quebra (clampa)', () => {
    expect(
      applyEdit(base, { kind: 'set', index: 99, before: '', after: 'X' }),
    ).toEqual(base);
    expect(applyEdit(base, { kind: 'insert', index: 99, after: 'G0' })).toEqual(
      [...base, 'G0'],
    );
    expect(
      revertEdit(['G0', 'G1'], { kind: 'remove', index: 99, before: 'X' }),
    ).toEqual(['G0', 'G1', 'X']);
  });
});

describe('editor de G-code — trecho e envio', () => {
  const lines = ['G21', 'G54', 'M4 S200', 'G1 X1 Y1', 'G1 X2 Y2', 'M5'];

  it('normaliza a seleção (ordem e limites)', () => {
    expect(normalizeRange(lines, 4, 2)).toEqual({ start: 2, end: 4 });
    expect(normalizeRange(lines, -5, 99)).toEqual({ start: 0, end: 5 });
    expect(normalizeRange([], 3, 1)).toEqual({ start: 0, end: 0 });
  });

  it('trecho a partir do início vai sem preâmbulo', () => {
    expect(buildSnippet(lines, 0, 1)).toEqual(['G21', 'G54']);
  });

  it('trecho no meio leva o preâmbulo com o estado modal', () => {
    const snippet = buildSnippet(lines, 3, 4);
    // M5 primeiro (segurança), depois os modais que valiam até a linha 3.
    expect(snippet[0]).toBe('M5');
    expect(snippet).toContain('G21');
    expect(snippet).toContain('G54');
    expect(snippet).toContain('M4');
    expect(snippet.slice(-2)).toEqual(['G1 X1 Y1', 'G1 X2 Y2']);
  });

  it('trecho de uma linha só funciona (reenvio pontual)', () => {
    const snippet = buildSnippet(lines, 5, 5);
    expect(snippet.at(-1)).toBe('M5');
    expect(snippet).toContain('M4');
  });
});
