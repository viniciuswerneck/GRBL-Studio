import { describe, expect, it } from 'vitest';
import { parseGcode } from '../src/shared/preview';

describe('parseGcode — movimentos lineares', () => {
  it('interpreta G0 e G1 em modo absoluto (G90)', () => {
    const p = parseGcode('G21 G90\nG0 X10 Y0\nG1 X10 Y5 F1000 S500\nM5');
    expect(p.moves).toHaveLength(2);
    expect(p.moves[0]).toMatchObject({
      rapid: true,
      x0: 0,
      y0: 0,
      x1: 10,
      y1: 0,
    });
    expect(p.moves[1]).toMatchObject({
      rapid: false,
      x0: 10,
      y0: 0,
      x1: 10,
      y1: 5,
    });
    expect(p.bounds).toEqual({ xMin: 0, xMax: 10, yMin: 0, yMax: 5 });
    expect(p.cutMm).toBeCloseTo(5, 9);
  });

  it('interpreta coordenadas relativas (G91)', () => {
    const p = parseGcode('G90 G0 X0 Y0\nG91\nG1 X5 Y0\nG1 X0 Y5');
    // G0 na origem não gera movimento; sobram os dois trechos relativos.
    expect(p.moves[0]).toMatchObject({ x0: 0, y0: 0, x1: 5, y1: 0 });
    expect(p.moves[1]).toMatchObject({ x0: 5, y0: 0, x1: 5, y1: 5 });
  });

  it('converte polegadas (G20) para mm', () => {
    const p = parseGcode('G20 G90\nG1 X1 Y1');
    expect(p.moves[0]!.x1).toBeCloseTo(25.4, 9);
    expect(p.moves[0]!.y1).toBeCloseTo(25.4, 9);
  });

  it('mantém o eixo não informado (movimento modal por eixo)', () => {
    const p = parseGcode('G90\nG0 X3 Y4\nG1 X7');
    expect(p.moves[1]).toMatchObject({ x0: 3, y0: 4, x1: 7, y1: 4 });
  });
});

describe('parseGcode — arcos', () => {
  it('interpreta G2/G3 por I/J (centro relativo)', () => {
    const p = parseGcode('G90 G0 X10 Y0\nG2 X0 Y10 I-10 J0');
    expect(p.moves.length).toBeGreaterThan(2);
    const last = p.moves.at(-1)!;
    expect(last.x1).toBeCloseTo(0, 6);
    expect(last.y1).toBeCloseTo(10, 6);
    // Todos os pontos ficam no círculo de raio 10 centrado em (0,0).
    for (const m of p.moves.slice(1)) {
      expect(Math.hypot(m.x1, m.y1)).toBeCloseTo(10, 3);
    }
  });

  it('interpreta arco por R e escolhe o lado pelo sentido', () => {
    const cw = parseGcode('G90 G0 X0 Y0\nG2 X10 Y0 R5');
    const ccw = parseGcode('G90 G0 X0 Y0\nG3 X10 Y0 R5');
    // Meio-círculo: o ponto médio fica em y=±5.
    const midCw = cw.moves[Math.floor(cw.moves.length / 2)]!;
    const midCcw = ccw.moves[Math.floor(ccw.moves.length / 2)]!;
    expect(Math.abs(midCw.y1)).toBeGreaterThan(4);
    expect(Math.sign(midCw.y1)).toBe(-Math.sign(midCcw.y1));
  });

  it('G90.1 usa centro de arco absoluto', () => {
    const p = parseGcode('G90 G90.1 G0 X10 Y0\nG2 X0 Y10 I0 J0');
    for (const m of p.moves.slice(1)) {
      expect(Math.hypot(m.x1, m.y1)).toBeCloseTo(10, 3);
    }
  });
});

describe('parseGcode — tolerância e utilitários', () => {
  it('ignora comentários e números de linha', () => {
    const p = parseGcode(
      'N10 G21 (milímetros)\nN20 G90 ; absoluto\nN30 G0 X5 Y5\n(bloco)\nN40 G1 X5 Y10',
    );
    expect(p.moves).toHaveLength(2);
    expect(p.moves[0]!.line).toBe(2);
    expect(p.moves[1]!.line).toBe(4);
  });

  it('G92 redefine a posição sem gerar movimento', () => {
    const p = parseGcode('G90\nG92 X0 Y0\nG0 X2 Y3\nG1 X2 Y8');
    expect(p.moves).toHaveLength(2); // G92 não é movimento
    expect(p.moves[1]).toMatchObject({ x0: 2, y0: 3, x1: 2, y1: 8 });
  });

  it('linhas malformadas não quebram o parser', () => {
    const p = parseGcode('G21\nlixo X?\nG1 @@@\nM5\n;;;\n');
    expect(p.moves).toHaveLength(0);
    expect(p.bounds).toBeNull();
  });

  it('arquivo de varredura real conta a linha de origem por trecho', () => {
    const text = [
      'G21',
      'G90',
      'G94',
      'M5',
      'G0 X0 Y0',
      'M4',
      'G1 X10 Y0 S1000 F1000',
      'M5',
      'G0 X0 Y1',
      'M4',
      'G1 X10 Y1 S1000 F1000',
      'M5',
    ].join('\n');
    const p = parseGcode(text);
    // G0 X0 Y0 na origem não gera movimento; sobram 1 rápido + 2 cortes.
    expect(p.moves).toHaveLength(3);
    expect(p.moves.filter((m) => !m.rapid)).toHaveLength(2);
    expect(p.cutMm).toBeCloseTo(20, 9);
    expect(p.totalLines).toBe(12);
  });
});
