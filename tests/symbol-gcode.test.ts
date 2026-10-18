/**
 * Do símbolo ao G-code (RF-SYM-1/3/5/6): geometria de varredura, invariantes de
 * segurança do G-code e avisos de legibilidade.
 */

import { describe, expect, it } from 'vitest';
import {
  barsToBands,
  bandsExtent,
  bandsToScanSegments,
  invertBands,
  matrixToBands,
} from '../src/shared/symbol/mask';
import {
  applyOverscan,
  qrToGcode,
  symbolToGcode,
  symbolWarnings,
} from '../src/shared/symbol/gcode';
import { encodeQr } from '../src/shared/symbol/qr';

const baseParams = {
  feed: 1000,
  travelFeed: 3000,
  sMax: 1000,
  powerPercent: 100,
  passes: 1,
  mode: 'M4' as const,
};

describe('matrixToBands', () => {
  const matrix = [
    [true, false, true],
    [false, false, false],
    [true, true, true],
  ];

  it('converte módulos em faixas, com a primeira linha no topo', () => {
    const { bands, extent } = matrixToBands(matrix, { moduleMm: 0.5 });
    // A linha do topo fica na faixa mais alta (Y cresce para cima).
    const top = bands[0];
    expect(top.y0).toBe(3);
    expect(top.y1).toBe(3.5);
    // Só as linhas com módulos escuros viram faixa.
    expect(bands).toHaveLength(2);
    const bottom = bands[1];
    expect(bottom.y0).toBe(2);
    expect(bottom.runs).toEqual([{ x0: 2, x1: 3.5 }]); // quiet zone 4 + linha cheia
    // A caixa total inclui a quiet zone dos dois lados.
    expect(extent).toEqual({ widthMm: 5.5, heightMm: 5.5 });
  });

  it('junta módulos escuros vizinhos num trecho só', () => {
    const { bands } = matrixToBands(matrix, {
      moduleMm: 1,
      quietZoneModules: 0,
    });
    const top = bands.find((b) => b.y0 === 2);
    expect(top?.runs).toEqual([
      { x0: 0, x1: 1 },
      { x0: 2, x1: 3 },
    ]);
    const bottom = bands.find((b) => b.y0 === 0);
    expect(bottom?.runs).toEqual([{ x0: 0, x1: 3 }]);
    // Extensão dos trechos (sem quiet zone).
    expect(bandsExtent(bands)).toEqual({ widthMm: 3, heightMm: 3 });
  });

  it('módulo inválido devolve nada', () => {
    expect(matrixToBands(matrix, { moduleMm: 0 }).bands).toEqual([]);
    expect(matrixToBands(matrix, { moduleMm: Number.NaN }).extent).toEqual({
      widthMm: 0,
      heightMm: 0,
    });
  });

  it('extensão inclui a quiet zone, mesmo em linha/coluna em branco', () => {
    const { extent } = matrixToBands(matrix, {
      moduleMm: 1,
      quietZoneModules: 4,
    });
    expect(extent).toEqual({ widthMm: 11, heightMm: 11 });
  });

  it('funciona com linhas de largura diferente da altura (robustez)', () => {
    const { bands, extent } = matrixToBands([[true, false, true]], {
      moduleMm: 1,
      quietZoneModules: 0,
    });
    expect(bands[0].runs).toEqual([
      { x0: 0, x1: 1 },
      { x0: 2, x1: 3 },
    ]);
    expect(extent).toEqual({ widthMm: 3, heightMm: 1 });
  });
});

describe('bandsToScanSegments', () => {
  it('distribui as linhas dentro da faixa, uniformemente', () => {
    const { bands } = matrixToBands(
      [
        [true, true],
        [true, true],
      ],
      { moduleMm: 0.5, quietZoneModules: 0 },
    );
    const segments = bandsToScanSegments(bands, { linesPerMm: 10 });
    // 0,5 mm × 10 = 5 linhas por módulo → 2 módulos de altura = 10 linhas.
    expect(segments).toHaveLength(10);
    const ys = [...new Set(segments.map((s) => s.y0))].sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(0.05, 6);
    expect(ys[1] - ys[0]).toBeCloseTo(0.1, 6);
    expect(ys[ys.length - 1]).toBeCloseTo(0.95, 6);
    // Todas as linhas cobrem a largura toda.
    for (const s of segments) {
      expect(s.x0).toBe(0);
      expect(s.x1).toBe(1);
    }
  });

  it('garante ao menos uma linha por faixa', () => {
    const segments = bandsToScanSegments(
      [{ y0: 0, y1: 0.05, runs: [{ x0: 0, x1: 1 }] }],
      { linesPerMm: 2 },
    );
    expect(segments).toHaveLength(1);
  });

  it('descarta trechos menores que o mínimo pedido', () => {
    const segments = bandsToScanSegments(
      [
        {
          y0: 0,
          y1: 1,
          runs: [
            { x0: 0, x1: 0.05 },
            { x0: 1, x1: 2 },
          ],
        },
      ],
      { linesPerMm: 2, minRunMm: 0.1 },
    );
    for (const s of segments) expect(s.x1 - s.x0).toBeGreaterThanOrEqual(0.1);
  });
});

describe('invertBands / barsToBands', () => {
  it('inverte a polaridade dentro da caixa', () => {
    const { bands, extent } = matrixToBands([[true, false, true]], {
      moduleMm: 1,
      quietZoneModules: 0,
    });
    const inverted = invertBands(bands, extent);
    expect(inverted[0].runs).toEqual([{ x0: 1, x1: 2 }]);
  });

  it('inverter com quiet zone cobre também as bordas', () => {
    const { bands, extent } = matrixToBands([[true]], {
      moduleMm: 1,
      quietZoneModules: 2,
    });
    const inverted = invertBands(bands, extent);
    expect(inverted[0].runs).toEqual([
      { x0: 0, x1: 2 },
      { x0: 3, x1: 5 },
    ]);
    expect(extent.widthMm).toBe(5);
  });

  it('barras viram uma faixa com a quiet zone', () => {
    const { bands, extent } = barsToBands(
      [
        { x0: 0, x1: 2 },
        { x0: 3, x1: 4 },
      ],
      { xDimMm: 0.5, barHeightMm: 10, totalModules: 14, quietZoneModules: 10 },
    );
    expect(bands).toHaveLength(1);
    expect(bands[0].y1).toBe(10);
    expect(bands[0].runs[0]).toEqual({ x0: 5, x1: 6 });
    expect(extent).toEqual({ widthMm: 17, heightMm: 10 });
  });
});

describe('symbolToGcode', () => {
  const extent = { widthMm: 10, heightMm: 10 };

  it('respeita os invariantes do projeto', () => {
    const res = symbolToGcode(
      [
        { x0: 0, y0: 0, x1: 5, y1: 0 },
        { x0: 0, y0: 0.5, x1: 5, y1: 0.5 },
      ],
      extent,
      baseParams,
    );
    const lines = res.gcode.split('\n');
    expect(lines).toContain('G21');
    expect(lines).toContain('G90');
    expect(lines).toContain('G94');
    expect(lines[0].startsWith(';')).toBe(true);
    // Nunca deslocar (G0) com o laser armado: M5 antes de cada G0.
    let armed = false;
    for (const line of lines) {
      if (/^M[34] S/.test(line)) armed = true;
      else if (line.trim() === 'M5') armed = false;
      else if (line.startsWith('G0')) expect(armed).toBe(false);
    }
    // M5 do cabeçalho + um por trecho + o da cauda.
    expect(lines.filter((l) => l === 'M5').length).toBe(4);
    expect(lines).toContain('G0 X0 Y0');
    expect(lines[lines.length - 1]).toBe('');
    // S dentro do $30
    for (const l of lines) {
      if (l.startsWith('M4 S') || l.startsWith('M3 S')) {
        expect(Number(l.slice(4))).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('coordenadas com 3 casas e translação pela origem', () => {
    const res = symbolToGcode([{ x0: 0, y0: 0, x1: 1.2345, y1: 0 }], extent, {
      ...baseParams,
      originX: 5,
      originY: 2,
    });
    expect(res.gcode).toContain('G1 X6.234 Y2.000 F1000');
    expect(res.gcode).toContain('G0 X5.000 Y2.000');
    expect(res.burnMm).toBeCloseTo(1.2345, 6);
  });

  it('zigue-zague: a linha ímpar volta ao contrário (menos G0)', () => {
    const res = symbolToGcode(
      [
        { x0: 0, y0: 0, x1: 5, y1: 0 },
        { x0: 0, y0: 0.5, x1: 5, y1: 0.5 },
      ],
      extent,
      baseParams,
    );
    const g1 = res.gcode.split('\n').filter((l) => l.startsWith('G1'));
    expect(g1[0]).toBe('G1 X5.000 Y0.000 F1000');
    expect(g1[1]).toBe('G1 X0.000 Y0.500 F1000');
  });

  it('passadas múltiplas são marcadas e repetem os trechos', () => {
    const res = symbolToGcode([{ x0: 0, y0: 0, x1: 1, y1: 0 }], extent, {
      ...baseParams,
      passes: 3,
    });
    expect(res.gcode).toContain('; pass 1/3');
    expect(res.gcode).toContain('; pass 3/3');
    expect(res.segments).toBe(3);
  });

  it('parâmetros inválidos caem no padrão (sem quebrar o job)', () => {
    const res = symbolToGcode(
      [
        { x0: 0, y0: 0, x1: 1, y1: 0 },
        { x0: Number.NaN, y0: 0, x1: 1, y1: 0 },
        { x0: 0, y0: 0, x1: 0, y1: 0 },
      ],
      extent,
      { ...baseParams, feed: 0, sMax: -5, powerPercent: Number.NaN, passes: 0 },
    );
    expect(res.segments).toBe(1);
    expect(res.gcode).toContain('F1000');
    expect(res.gcode).toContain('S1000');
    expect(res.gcode).not.toContain('NaN');
  });

  it('potência é porcentagem do $30 e fica no teto', () => {
    const res = symbolToGcode([{ x0: 0, y0: 0, x1: 1, y1: 0 }], extent, {
      ...baseParams,
      sMax: 1000,
      powerPercent: 250,
    });
    expect(res.gcode).toContain('M4 S1000');
    const half = symbolToGcode([{ x0: 0, y0: 0, x1: 1, y1: 0 }], extent, {
      ...baseParams,
      sMax: 1000,
      powerPercent: 30,
    });
    expect(half.gcode).toContain('M4 S300');
  });

  it('M3 quando pedido', () => {
    const res = symbolToGcode([{ x0: 0, y0: 0, x1: 1, y1: 0 }], extent, {
      ...baseParams,
      mode: 'M3',
    });
    expect(res.gcode).toContain('M3 S1000');
    expect(res.gcode).not.toContain('M4');
  });
});

describe('applyOverscan', () => {
  it('estende os dois lados mantendo o sentido', () => {
    expect(applyOverscan([{ x0: 1, y0: 0, x1: 3, y1: 0 }], 0.5)).toEqual([
      { x0: 0.5, y0: 0, x1: 3.5, y1: 0 },
    ]);
    // No sentido inverso (zigue-zague), as pontas também crescem.
    expect(applyOverscan([{ x0: 3, y0: 0, x1: 1, y1: 0 }], 0.5)).toEqual([
      { x0: 3.5, y0: 0, x1: 0.5, y1: 0 },
    ]);
    // Não passa do X0.
    expect(applyOverscan([{ x0: 0, y0: 0, x1: 1, y1: 0 }], 2)).toEqual([
      { x0: 0, y0: 0, x1: 3, y1: 0 },
    ]);
  });

  it('overscan zero é identidade', () => {
    const segs = [{ x0: 0, y0: 0, x1: 1, y1: 0 }];
    expect(applyOverscan(segs, 0)).toEqual(segs);
  });
});

describe('symbolWarnings', () => {
  const base = {
    moduleMm: 0.5,
    quietZoneModules: 4,
    quietZoneMinModules: 4,
    linesPerMm: 10,
    widthMm: 30,
    heightMm: 30,
    originX: 0,
    originY: 0,
  };

  it('sem avisos num caso saudável', () => {
    expect(symbolWarnings(base)).toEqual([]);
  });

  it('acusa módulo menor que o ponto do laser', () => {
    expect(symbolWarnings({ ...base, moduleMm: 0.1 })).toContain(
      'module-small',
    );
  });

  it('acusa módulo pequeno demais para leitura', () => {
    expect(symbolWarnings({ ...base, moduleMm: 0.2 })).toContain('module-tiny');
  });

  it('acusa quiet zone reduzida', () => {
    expect(symbolWarnings({ ...base, quietZoneModules: 1 })).toContain(
      'quiet-zone-small',
    );
  });

  it('acusa poucas linhas por módulo', () => {
    expect(symbolWarnings({ ...base, linesPerMm: 4 })).toContain(
      'lines-too-few',
    );
  });

  it('acusa símbolo fora da área de trabalho', () => {
    expect(
      symbolWarnings({ ...base, originX: 400, workAreaX: 400, workAreaY: 400 }),
    ).toContain('outside-work-area');
    expect(
      symbolWarnings({ ...base, widthMm: 30, workAreaX: 20, workAreaY: 20 }),
    ).toContain('outside-work-area');
    // Dentro da área: sem aviso.
    expect(
      symbolWarnings({ ...base, originX: 10, workAreaX: 400, workAreaY: 400 }),
    ).toEqual([]);
  });
});

describe('qrToGcode', () => {
  it('gera o G-code de um QR com o cabeçalho do símbolo', () => {
    const res = qrToGcode('https://lab.werneck.dev.br', {
      ...baseParams,
      moduleMm: 0.5,
      linesPerMm: 10,
    });
    expect(res.qr.version).toBeGreaterThanOrEqual(1);
    expect(res.qr.ecc).toBe('M');
    expect(res.moduleMm).toBe(0.5);
    expect(res.linesPerModule).toBe(5);
    expect(res.warnings).toEqual([]);
    expect(res.widthMm).toBeCloseTo((res.qr.size + 8) * 0.5, 6);
    expect(res.heightMm).toBeCloseTo(res.widthMm, 6);
    expect(res.gcode).toContain('; QR Code (GRBL Studio)');
    expect(res.gcode).toContain('conteúdo: https://lab.werneck.dev.br');
    expect(res.gcode).toContain('ECC M');
    // Cabeçalho de segurança + rodapé
    expect(res.gcode).toContain('G21');
    expect(res.gcode.trimEnd().endsWith('G0 X0 Y0')).toBe(true);
    expect(res.segments).toBeGreaterThan(0);
    expect(res.burnMm).toBeGreaterThan(0);
  });

  it('versão e ECC pedidos aparecem no resultado', () => {
    const res = qrToGcode('GRBL Studio', {
      ...baseParams,
      ecc: 'H',
      version: 5,
      moduleMm: 1,
    });
    expect(res.qr.version).toBe(5);
    expect(res.qr.ecc).toBe('H');
    expect(res.gcode).toContain('versão 5 · ECC H');
  });

  it('avisa quando o módulo é pequeno ou a área não cabe', () => {
    const res = qrToGcode('AVISO', {
      ...baseParams,
      moduleMm: 0.15,
      linesPerMm: 10,
      workAreaX: 40,
      workAreaY: 40,
    });
    expect(res.warnings).toContain('module-small');
    expect(res.warnings).toContain('module-tiny');
    expect(res.warnings).toContain('lines-too-few');
    // Módulo de 0,5 mm (5 linhas por módulo) fica saudável.
    expect(
      qrToGcode('AVISO', { ...baseParams, moduleMm: 0.5 }).warnings,
    ).toEqual([]);
  });

  it('polaridade invertida inverte os trechos', () => {
    const normal = qrToGcode('POLARIDADE', { ...baseParams, moduleMm: 0.5 });
    const inverted = qrToGcode('POLARIDADE', {
      ...baseParams,
      moduleMm: 0.5,
      invert: true,
    });
    expect(normal.segments).not.toBe(inverted.segments);
    expect(inverted.gcode).toContain('polaridade invertida');
  });

  it('trunca o conteúdo do cabeçalho', () => {
    const res = qrToGcode('x'.repeat(80), { ...baseParams, labelMaxChars: 20 });
    const line = res.gcode
      .split('\n')
      .find((l) => l.startsWith('; conteúdo:')) as string;
    expect(line.length).toBeLessThanOrEqual('; conteúdo: '.length + 20);
    expect(line.endsWith('…')).toBe(true);
  });

  it('é consistente com o encoder (mesma matriz)', () => {
    const qr = encodeQr('CONSISTENTE', { mask: 3 });
    const res = qrToGcode('CONSISTENTE', { ...baseParams, mask: 3 });
    expect(res.qr.mask).toBe(3);
    expect(res.qr.size).toBe(qr.size);
  });
});
