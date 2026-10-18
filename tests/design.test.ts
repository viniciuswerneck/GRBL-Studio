import { describe, expect, it } from 'vitest';
import {
  designToGcode,
  makeCircle,
  makeEllipse,
  makeRect,
  shapesToGcode,
  type DesignDocument,
  type Shape,
} from '../src/shared/design';

const baseOpts = {
  feed: 1000,
  travelFeed: 3000,
  sMax: 1000,
  powerPercent: 80,
  passes: 1,
  mode: 'M4' as const,
  samples: 12,
};

describe('makeRect / makeCircle / makeEllipse', () => {
  it('makeRect retorna 4 cantos fechados', () => {
    const r = makeRect(0, 0, 10, 5);
    expect(r).toHaveLength(4);
    expect(r[0]).toEqual({ x: 0, y: 0 });
    expect(r[2]).toEqual({ x: 10, y: 5 });
  });

  it('makeCircle retorna N pontos', () => {
    expect(makeCircle(0, 0, 5, 8)).toHaveLength(8);
  });

  it('makeEllipse retorna N pontos', () => {
    expect(makeEllipse(0, 0, 5, 3, 6)).toHaveLength(6);
  });
});

describe('designToGcode', () => {
  it('gera G-code válido para um retângulo fechado', () => {
    const doc: DesignDocument = {
      shapes: [{ kind: 'rect', points: makeRect(0, 0, 10, 5), closed: true }],
      width: 10,
      height: 5,
    };
    const g = designToGcode(doc, baseOpts);
    expect(g).toContain('G21');
    expect(g).toContain('G90');
    expect(g).toContain('M4 S800'); // 80% de 1000
    expect(g).toContain('G1 X');
    expect(g).toContain('M5');
    // fecha o contorno (volta ao ponto inicial)
    expect(g).toMatch(/G1 X0\.000 Y0\.000/);
  });

  it('forma aberta (linha) não fecha o contorno', () => {
    const doc: DesignDocument = {
      shapes: [
        {
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          closed: false,
        },
      ],
      width: 10,
      height: 0,
    };
    const g = designToGcode(doc, baseOpts);
    // só um G1 (sem fechamento)
    const g1s = g.match(/G1 X10\.000 Y0\.000/g) ?? [];
    expect(g1s).toHaveLength(1);
  });

  it('respeita passes > 1', () => {
    const doc: DesignDocument = {
      shapes: [{ kind: 'rect', points: makeRect(0, 0, 5, 5), closed: true }],
      width: 5,
      height: 5,
    };
    const g = designToGcode(doc, { ...baseOpts, passes: 2 });
    expect(g).toContain('; pass 1/2');
    expect(g).toContain('; pass 2/2');
  });

  it('respeita mode M3', () => {
    const doc: DesignDocument = {
      shapes: [{ kind: 'rect', points: makeRect(0, 0, 5, 5), closed: true }],
      width: 5,
      height: 5,
    };
    const g = designToGcode(doc, { ...baseOpts, mode: 'M3' });
    expect(g).toContain('M3 S');
    expect(g).not.toContain('M4 S');
  });

  it('usa speed/power por forma quando fornecidos', () => {
    const doc: DesignDocument = {
      shapes: [
        {
          kind: 'rect',
          points: makeRect(0, 0, 5, 5),
          closed: true,
          speed: 500,
          power: 300,
        },
      ],
      width: 5,
      height: 5,
    };
    const g = designToGcode(doc, baseOpts);
    expect(g).toContain('F500');
    expect(g).toContain('S300');
  });

  it('mistura forma com e sem override: as demais seguem o global', () => {
    const doc: DesignDocument = {
      shapes: [
        {
          kind: 'rect',
          points: makeRect(0, 0, 5, 5),
          closed: true,
          speed: 500,
          power: 300,
        },
        { kind: 'rect', points: makeRect(10, 0, 5, 5), closed: true },
      ],
      width: 15,
      height: 5,
    };
    const g = designToGcode(doc, {
      feed: 1000,
      sMax: 1000,
      powerPercent: 50,
      travelFeed: 3000,
    });
    expect(g).toContain('S300'); // override da 1ª forma
    expect(g).toContain('S500'); // 50 % de sMax na 2ª
    expect(g).toContain('F500'); // velocidade própria
    expect(g).toContain('F1000'); // velocidade global
  });

  it('ignora formas com menos de 2 pontos', () => {
    const doc: DesignDocument = {
      shapes: [{ kind: 'line', points: [{ x: 0, y: 0 }], closed: false }],
      width: 0,
      height: 0,
    };
    const g = designToGcode(doc, baseOpts);
    expect(g).not.toContain('G1 X');
  });

  it('termina com M5 e retorno à origem', () => {
    const doc: DesignDocument = {
      shapes: [{ kind: 'rect', points: makeRect(0, 0, 5, 5), closed: true }],
      width: 5,
      height: 5,
    };
    const g = designToGcode(doc, baseOpts);
    const tail = g.trim().split('\n').slice(-3);
    expect(tail).toContain('M5');
    expect(tail).toContain('G0 X0 Y0');
  });

  it('shapesToGcode é atalho equivalente', () => {
    const shapes: Shape[] = [
      { kind: 'rect', points: makeRect(0, 0, 5, 5), closed: true },
    ];
    const g1 = shapesToGcode(shapes, baseOpts);
    const g2 = designToGcode({ shapes, width: 5, height: 5 }, baseOpts);
    // A área no cabeçalho difere (width/height), mas o corpo é o mesmo.
    expect(g1).toContain('M4 S800');
    expect(g2).toContain('M4 S800');
  });

  it('ancora a arte na origem: o canto inferior esquerdo vira X0 Y0', () => {
    // Alinhamento: o usuário posiciona o laser onde vai gravar e define a
    // origem ali. O G-code tem de começar em X0 Y0 (canto inferior esquerdo do
    // desenho), de pé, sem deslocar o cabeçote — não em coordenadas absolutas
    // da prancheta. O editor usa y-down (topo = 0); a máquina usa y-up.
    const doc: DesignDocument = {
      shapes: [{ kind: 'rect', points: makeRect(4, 1, 2, 2), closed: true }],
      width: 10,
      height: 10,
    };
    const g = designToGcode(doc, baseOpts);
    expect(g).toContain('G0 X0.000 Y0.000'); // começa exatamente em X0 Y0
    expect(g).toContain('G1 X0.000 Y2.000'); // topo do desenho (Y=2), de pé
    expect(g).not.toContain('Y-'); // nada abaixo da origem
    // Onde o objeto está na prancheta não muda o G-code: a arte é ancorada.
    const outro = designToGcode(
      {
        shapes: [{ kind: 'rect', points: makeRect(7, 6, 2, 2), closed: true }],
        width: 10,
        height: 10,
      },
      baseOpts,
    );
    expect(outro).toBe(g);
  });
});

describe('espessura do traço (width)', () => {
  const paths = (g: string) => (g.match(/M5/g) ?? []).length - 2; // cabeçalho + rodapé

  it('cobre a faixa centrada com linhas paralelas', () => {
    // 2 mm de espessura em passos de 0,1 = 21 caminhos (de 8×8 a 12×12)
    const g = shapesToGcode(
      [
        {
          kind: 'rect',
          points: makeRect(0, 0, 10, 10),
          closed: true,
          width: 2,
        },
      ],
      baseOpts,
    );
    expect(paths(g)).toBe(21);
    // A área do cabeçalho inclui a espessura (12 × 12).
    expect(g).toContain('12.00 x 12.00 mm');
    // Ancorada na origem, a faixa (de -1 a 11) sai de X0 a X12.
    expect(g).toContain('X0.000');
    expect(g).toContain('X12.000');
  });

  it('uma linha aberta ganha paralelas dos dois lados', () => {
    const g = shapesToGcode(
      [
        {
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          closed: false,
          width: 2,
        },
      ],
      baseOpts,
    );
    // passo 0,1 → 21 paralelas, todas retas (2 G1 cada: nada de fechar)
    expect(paths(g)).toBe(21);
    // Ancorada na origem, a linha (de 0 a 10) sai de X1 a X11.
    expect(g).toContain('X11.000 Y');
  });

  it('espessura dentro do passo do feixe não muda o traço', () => {
    const thin = shapesToGcode(
      [
        {
          kind: 'rect',
          points: makeRect(0, 0, 10, 10),
          closed: true,
          width: 0.05,
        },
      ],
      baseOpts,
    );
    const none = shapesToGcode(
      [{ kind: 'rect', points: makeRect(0, 0, 10, 10), closed: true }],
      baseOpts,
    );
    expect(thin).toBe(none);
    expect(paths(none)).toBe(1);
  });
});
