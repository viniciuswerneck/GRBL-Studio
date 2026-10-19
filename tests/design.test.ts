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

  it('respeita as passadas do próprio objeto (shape.passes)', () => {
    const doc: DesignDocument = {
      shapes: [
        {
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
          ],
          closed: false,
        },
        { kind: 'rect', points: makeRect(0, 0, 5, 5), closed: true, passes: 3 },
      ],
      width: 5,
      height: 5,
    };
    const g = designToGcode(doc, baseOpts);
    // 1 volta na linha + 3 no retângulo (o global `passes` continua sendo 1)
    expect(g.match(/^M4 S800$/gm)).toHaveLength(4);
    expect(
      shapesToGcode([{ ...doc.shapes[1], passes: 0 }], baseOpts),
    ).toContain('M4 S800');
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
          // `power` é porcentagem (campo “P” do painel), não valor S cru.
          power: 30,
        },
      ],
      width: 5,
      height: 5,
    };
    const g = designToGcode(doc, baseOpts);
    expect(g).toContain('F500');
    expect(g).toContain('S300'); // 30 % de 1000
  });

  it('mistura forma com e sem override: as demais seguem o global', () => {
    const doc: DesignDocument = {
      shapes: [
        {
          kind: 'rect',
          points: makeRect(0, 0, 5, 5),
          closed: true,
          speed: 500,
          power: 30,
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
    expect(g).toContain('S300'); // override da 1ª forma (30 %)
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

describe('camadas / multi-operação (P2.2)', () => {
  const rect = (x: number, y: number, extra: Partial<Shape> = {}): Shape => ({
    kind: 'rect',
    points: makeRect(x, y, 5, 5),
    closed: true,
    ...extra,
  });

  it('emite as camadas na ordem declarada, não na ordem das formas', () => {
    const doc: DesignDocument = {
      // A forma de corte vem primeiro no array; a camada “Gravar” vem antes.
      shapes: [rect(20, 0, { layer: 'cut' }), rect(0, 0, { layer: 'engrave' })],
      width: 30,
      height: 10,
      layers: [
        { id: 'engrave', name: 'Gravar' },
        { id: 'cut', name: 'Cortar' },
      ],
    };
    const g = designToGcode(doc, baseOpts);
    const grav = g.indexOf('G0 X0.000 Y0.000');
    const cort = g.indexOf('G0 X20.000 Y0.000');
    expect(grav).toBeGreaterThan(-1);
    expect(cort).toBeGreaterThan(-1);
    expect(cort).toBeGreaterThan(grav);
    expect(g).toContain('; camada 1: Gravar');
    expect(g).toContain('; camada 2: Cortar');
  });

  it('aplica potência/velocidade/passadas/modo da camada', () => {
    const doc: DesignDocument = {
      shapes: [rect(0, 0, { layer: 'cut' })],
      width: 5,
      height: 5,
      layers: [
        {
          id: 'cut',
          name: 'Cortar',
          power: 30,
          speed: 250,
          passes: 2,
          mode: 'M3',
        },
      ],
    };
    const g = designToGcode(doc, baseOpts);
    expect(g).toContain('M3 S300'); // 30 % de 1000
    expect(g).not.toContain('M4 S');
    expect(g).toContain('F250');
    expect(g).toContain('; pass 1/2 — Cortar');
    expect(g).toContain('; pass 2/2 — Cortar');
    expect(g.match(/^M3 S300$/gm)).toHaveLength(2); // 2 passadas
  });

  it('o objeto sobrescreve a camada; o resto herda', () => {
    const doc: DesignDocument = {
      shapes: [
        rect(0, 0, { layer: 'engrave', power: 90, speed: 500 }),
        rect(10, 0, { layer: 'engrave' }),
      ],
      width: 15,
      height: 5,
      layers: [{ id: 'engrave', power: 30, speed: 250 }],
    };
    const g = designToGcode(doc, baseOpts);
    expect(g).toContain('M4 S900'); // objeto manda
    expect(g).toContain('F500');
    expect(g).toContain('M4 S300'); // a segunda herda a camada
    expect(g).toContain('F250');
  });

  it('formas sem camada usam os parâmetros globais e vão por último', () => {
    const doc: DesignDocument = {
      shapes: [
        rect(20, 0), // solta
        rect(0, 0, { layer: 'engrave' }),
      ],
      width: 30,
      height: 10,
      layers: [{ id: 'engrave', power: 60 }],
    };
    const g = designToGcode(doc, baseOpts);
    const camada = g.indexOf('M4 S600');
    const solta = g.indexOf('M4 S800'); // global 80 %
    expect(camada).toBeGreaterThan(-1);
    expect(solta).toBeGreaterThan(camada);
    // A solta é o retângulo à direita (X20), emitido depois.
    expect(g.indexOf('G0 X20.000 Y0.000')).toBeGreaterThan(camada);
  });

  it('id de camada desconhecido cai no global (nada se perde)', () => {
    const doc: DesignDocument = {
      shapes: [rect(0, 0, { layer: 'nao-existe' })],
      width: 5,
      height: 5,
      layers: [{ id: 'engrave', power: 10 }],
    };
    const g = designToGcode(doc, baseOpts);
    expect(g).toContain('M4 S800');
    expect(g).not.toContain('M4 S100');
  });

  it('cada operação começa com o laser desligado (M5 antes da nova potência)', () => {
    const doc: DesignDocument = {
      shapes: [rect(0, 0, { layer: 'engrave' }), rect(20, 0, { layer: 'cut' })],
      width: 30,
      height: 5,
      layers: [
        { id: 'engrave', power: 20 },
        { id: 'cut', power: 100 },
      ],
    };
    const lines = designToGcode(doc, baseOpts).split('\n');
    for (const marker of ['M4 S200', 'M4 S1000']) {
      const i = lines.indexOf(marker);
      expect(i).toBeGreaterThan(0);
      // O comando anterior ao ligar o laser é um deslocamento G0 e, antes
      // dele, o M5 que encerrou a operação anterior.
      expect(lines[i - 1]).toMatch(/^G0 X/);
      expect(lines.slice(0, i)).toContain('M5');
    }
  });

  it('nome de camada com quebra de linha não injeta G-code', () => {
    const doc: DesignDocument = {
      shapes: [rect(0, 0, { layer: 'x' })],
      width: 5,
      height: 5,
      layers: [{ id: 'x', name: 'Gravar\nM5\nM3 S1000' }],
    };
    const g = designToGcode(doc, baseOpts);
    expect(g).not.toMatch(/^M3 S1000$/m);
    expect(g).toContain('; camada 1: Gravar M5 M3 S1000');
  });

  it('passadas da camada multiplicam as passadas do objeto', () => {
    const doc: DesignDocument = {
      shapes: [rect(0, 0, { layer: 'cut', passes: 2 })],
      width: 5,
      height: 5,
      layers: [{ id: 'cut', passes: 3 }],
    };
    const g = designToGcode(doc, baseOpts);
    // 3 passadas da camada × 2 do objeto = 6 lances de laser.
    expect(g.match(/^M4 S800$/gm)).toHaveLength(6);
  });
});

describe('entradas degeneradas e parâmetros inválidos', () => {
  const rect5 = (extra: Partial<Shape> = {}): Shape => ({
    kind: 'rect',
    points: makeRect(0, 0, 5, 5),
    closed: true,
    ...extra,
  });
  const g1s = (g: string) => (g.match(/G1 /g) ?? []).length;

  it('contorno “fechado” de 2 pontos vira linha (não desaparece com espessura)', () => {
    const shape: Shape = {
      kind: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      closed: true,
    };
    expect(g1s(shapesToGcode([shape], baseOpts))).toBe(1);
    // Antes o traço grosso zerava os caminhos (`strokePaths` exige 3 pontos).
    const thick = shapesToGcode([{ ...shape, width: 2 }], baseOpts);
    expect(g1s(thick)).toBe(21); // 21 paralelas, 1 G1 cada
  });

  it('o cursor avança para o fim do contorno de 2 pontos', () => {
    const g = shapesToGcode(
      [
        {
          kind: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          closed: true,
        },
        {
          kind: 'polygon',
          points: [
            { x: 90, y: 5 },
            { x: 100, y: 5 },
          ],
          closed: true,
        },
      ],
      baseOpts,
    );
    // O 2º contorno começa no ponto mais próximo de onde o cabeçote parou.
    expect(g).toContain('G0 X100.000 Y0.000');
  });

  it('feed ≤ 0 volta ao padrão (nada de F0/F-negativo)', () => {
    expect(shapesToGcode([rect5()], { ...baseOpts, feed: 0 })).toContain(
      'F1000',
    );
    expect(shapesToGcode([rect5()], { ...baseOpts, feed: 0 })).not.toMatch(
      /F0\b/,
    );
    expect(shapesToGcode([rect5({ speed: -500 })], baseOpts)).not.toMatch(
      /F-\d/,
    );
  });

  it('potência fica no intervalo 0–100 % (clamp)', () => {
    expect(shapesToGcode([rect5({ power: -50 })], baseOpts)).toContain('M4 S0');
    expect(shapesToGcode([rect5({ power: 500 })], baseOpts)).toContain(
      'M4 S1000',
    );
    expect(
      shapesToGcode([rect5()], { ...baseOpts, powerPercent: 200 }),
    ).toContain('M4 S1000');
  });

  it('passes < 1 ainda gera uma passada (job não sai vazio)', () => {
    // retângulo fechado = 4 lados (3 seguimentos + o fechamento)
    expect(g1s(shapesToGcode([rect5()], { ...baseOpts, passes: 0 }))).toBe(4);
  });

  it('pontos não finitos são descartados (nada de NaN/Infinity)', () => {
    const g = shapesToGcode(
      [
        {
          kind: 'line',
          points: [
            { x: Number.NaN, y: 5 },
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: Number.POSITIVE_INFINITY, y: 3 },
          ],
          closed: false,
        },
      ],
      baseOpts,
    );
    expect(g).not.toContain('NaN');
    expect(g).not.toContain('Infinity');
    expect(g).toContain('X0.000 Y0.000');
    expect(g).toContain('X10.000');
  });

  it('forma inteiramente inválida não vira cabeçalho de área quebrado', () => {
    const g = shapesToGcode(
      [
        {
          kind: 'line',
          points: [{ x: Number.NaN, y: Number.NaN }],
          closed: false,
        },
      ],
      baseOpts,
    );
    expect(g).not.toContain('NaN');
    expect(g).not.toContain('; área');
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
