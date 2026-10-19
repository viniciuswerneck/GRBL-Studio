/**
 * Do símbolo ao G-code (RF-SYM-1/3/5/6): geometria de varredura, invariantes de
 * segurança do G-code e avisos de legibilidade.
 */

import { describe, expect, it } from 'vitest';
import {
  barsToVerticalSegments,
  bandsExtent,
  bandsToScanSegments,
  invertBands,
  matrixToBands,
} from '../src/shared/symbol/mask';
import {
  applyOverscan,
  barcodeToGcode,
  dataMatrixToGcode,
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

describe('invertBands / barsToVerticalSegments', () => {
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

  it('varre as barras na vertical, com a direção alternada', () => {
    const segments = barsToVerticalSegments(
      [
        { x: 0, w: 2 },
        { x: 3, w: 1 },
      ],
      {
        xDimMm: 0.5,
        barHeightMm: 10,
        totalModules: 4,
        quietZoneModules: 0,
        linesPerMm: 10,
      },
    );
    // Barra de 1 mm → 10 linhas; barra de 0,5 mm → 5 linhas.
    expect(segments).toHaveLength(15);
    for (const s of segments) {
      expect(s.x0).toBe(s.x1); // verticais
      expect(Math.abs(s.y1 - s.y0)).toBeCloseTo(10, 9); // altura toda
    }
    // SoBe/desce alternado (menos G0 entre linhas).
    expect([segments[0].y0, segments[0].y1]).toEqual([0, 10]);
    expect([segments[1].y0, segments[1].y1]).toEqual([10, 0]);
  });

  it('respeita a quiet zone e garante 1 linha na barra estreita', () => {
    const segments = barsToVerticalSegments([{ x: 0, w: 1 }], {
      xDimMm: 0.25,
      barHeightMm: 5,
      totalModules: 1,
      quietZoneModules: 10,
      linesPerMm: 10,
    });
    expect(segments).toHaveLength(3); // 0,25 × 10 = 2,5 → 3
    for (const s of segments) {
      expect(s.x0).toBeGreaterThan(10 * 0.25);
      expect(s.x0).toBeLessThan(11 * 0.25);
    }
  });

  it('invertido queima os espaços (inclusive as quiet zones)', () => {
    const segments = barsToVerticalSegments([{ x: 1, w: 1 }], {
      xDimMm: 1,
      barHeightMm: 10,
      totalModules: 3,
      quietZoneModules: 0,
      linesPerMm: 10,
      invert: true,
    });
    const where = [...new Set(segments.map((s) => Math.floor(s.x0)))].sort();
    expect(where).toEqual([0, 2]);
  });

  it('parâmetros inválidos devolvem nada', () => {
    const bad = [
      { xDimMm: 0, barHeightMm: 10, totalModules: 4, linesPerMm: 10 },
      { xDimMm: 0.5, barHeightMm: 0, totalModules: 4, linesPerMm: 10 },
      { xDimMm: 0.5, barHeightMm: 10, totalModules: 0, linesPerMm: 10 },
      { xDimMm: 0.5, barHeightMm: 10, totalModules: 4, linesPerMm: 0 },
    ];
    for (const opts of bad) {
      expect(barsToVerticalSegments([{ x: 0, w: 1 }], opts)).toEqual([]);
    }
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

  it('estende no eixo do movimento (segmento vertical)', () => {
    expect(applyOverscan([{ x0: 2, y0: 0, x1: 2, y1: 10 }], 0.5)).toEqual([
      { x0: 2, y0: 0, x1: 2, y1: 10.5 },
    ]);
    // Sentido invertido (varredura de cima para baixo).
    expect(applyOverscan([{ x0: 2, y0: 10, x1: 2, y1: 0 }], 0.5)).toEqual([
      { x0: 2, y0: 10.5, x1: 2, y1: 0 },
    ]);
  });

  it('preserva a ordem quando os segmentos já vêm ordenados', () => {
    const segments = [
      { x0: 0, y0: 0, x1: 0, y1: 10 },
      { x0: 0.1, y0: 10, x1: 0.1, y1: 0 },
    ];
    const res = symbolToGcode(
      segments,
      { widthMm: 1, heightMm: 10 },
      {
        ...baseParams,
        presorted: true,
      },
    );
    const g1 = res.gcode.split('\n').filter((l) => l.startsWith('G1'));
    expect(g1[0]).toBe('G1 X0.000 Y10.000 F1000');
    expect(g1[1]).toBe('G1 X0.100 Y0.000 F1000');
  });
});

describe('barcodeToGcode (1D → G-code)', () => {
  it('gera um Code 128 com HRI, dentro dos invariantes', () => {
    const res = barcodeToGcode('GRBL-STUDIO', {
      ...baseParams,
      symbology: 'code128',
    });
    expect(res.barcode.symbology).toBe('code128');
    expect(res.xDimMm).toBe(0.5);
    expect(res.barHeightMm).toBe(10);
    expect(res.quietZoneModules).toBe(10);
    expect(res.linesPerModule).toBe(5);
    expect(res.warnings).toEqual([]);
    expect(res.gcode).toContain('; Código de barras Code 128 (GRBL Studio)');
    expect(res.gcode).toContain('conteúdo: GRBL-STUDIO');
    // Largura = (módulos + 2 × quiet) × X-dim.
    expect(res.widthMm).toBeCloseTo((res.barcode.totalModules + 20) * 0.5, 6);
    // Altura = barras + gap + HRI.
    expect(res.heightMm).toBeGreaterThan(10);
    // Invariantes: M5 antes de cada G0 e G0 X0 Y0 na cauda.
    const lines = res.gcode.split('\n');
    let armed = false;
    for (const line of lines) {
      if (/^M[34] S/.test(line)) armed = true;
      else if (line.trim() === 'M5') armed = false;
      else if (line.startsWith('G0')) expect(armed).toBe(false);
    }
    expect(res.gcode.trimEnd().endsWith('G0 X0 Y0')).toBe(true);
    expect(res.gcode).not.toContain('NaN');
  });

  it('a queima fica dentro da caixa do símbolo (com a quiet zone)', () => {
    const res = barcodeToGcode('590123412345', {
      ...baseParams,
      symbology: 'ean13',
    });
    const left = res.quietZoneModules * res.xDimMm;
    const right = res.widthMm - left;
    for (const line of res.gcode.split('\n')) {
      if (!line.startsWith('G1')) continue;
      const x = Number(line.slice(3).split(' ')[0].slice(1));
      expect(x).toBeGreaterThanOrEqual(left - 1e-6);
      expect(x).toBeLessThanOrEqual(right + 1e-6);
    }
  });

  it('EAN-13 traz o dígito verificador no cabeçalho', () => {
    const res = barcodeToGcode('590123412345', {
      ...baseParams,
      symbology: 'ean13',
    });
    expect(res.barcode.data).toBe('5901234123457');
    expect(res.barcode.checkDigit).toBe(7);
    expect(res.gcode).toContain('verificador 7');
  });

  it('propaga o erro de dígito verificador', () => {
    expect(() =>
      barcodeToGcode('5901234123458', { ...baseParams, symbology: 'ean13' }),
    ).toThrow(/esperado 7/);
  });

  it('avisa do X-dimension pequeno e das barras baixas', () => {
    const res = barcodeToGcode('GRBL', {
      ...baseParams,
      symbology: 'code128',
      xDimMm: 0.1,
      barHeightMm: 3,
    });
    expect(res.warnings).toContain('x-dim-small');
    expect(res.warnings).toContain('bar-height-small');
    expect(res.warnings).toContain('module-tiny');
  });

  it('o HRI pode ser desligado', () => {
    const withHri = barcodeToGcode('GRBL', {
      ...baseParams,
      symbology: 'code128',
    });
    const without = barcodeToGcode('GRBL', {
      ...baseParams,
      symbology: 'code128',
      hri: false,
    });
    expect(without.heightMm).toBe(10);
    expect(withHri.heightMm).toBeGreaterThan(without.heightMm);
    expect(withHri.segments).toBeGreaterThan(without.segments);
  });

  it('largura final manda no X-dimension', () => {
    const res = barcodeToGcode('GRBL', {
      ...baseParams,
      symbology: 'code128',
      targetWidthMm: 40,
    });
    expect(res.widthMm).toBeCloseTo(40, 6);
    expect(res.xDimMm).toBeCloseTo(40 / (res.barcode.totalModules + 20), 6);
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

describe('dimensionamento em mm (RF-SYM-3)', () => {
  it('a largura alvo define o lado do símbolo (quadrado)', () => {
    const res = qrToGcode('TAMANHO', { ...baseParams, targetWidthMm: 30 });
    expect(res.widthMm).toBeCloseTo(30, 6);
    expect(res.heightMm).toBeCloseTo(30, 6);
    expect(res.moduleMm).toBeCloseTo(30 / (res.qr.size + 8), 9);
    expect(res.moduleYMm).toBeCloseTo(res.moduleMm, 9);
    expect(res.warnings).not.toContain('stretched');
    expect(res.gcode).toContain(`módulo ${res.moduleMm.toFixed(3)} mm`);
  });

  it('largura × altura independentes esticam o símbolo e avisam', () => {
    const res = qrToGcode('ESTICADO', {
      ...baseParams,
      targetWidthMm: 30,
      targetHeightMm: 15,
    });
    expect(res.widthMm).toBeCloseTo(30, 6);
    expect(res.heightMm).toBeCloseTo(15, 6);
    expect(res.moduleYMm).toBeCloseTo(res.moduleMm / 2, 9);
    expect(res.warnings).toContain('stretched');
    expect(res.gcode).toContain(
      `módulo ${res.moduleMm.toFixed(3)} × ${res.moduleYMm.toFixed(3)} mm`,
    );
  });

  it('o alvo vence o lado do módulo; sem alvo, o módulo manda', () => {
    const alvo = qrToGcode('PRIORIDADE', {
      ...baseParams,
      moduleMm: 0.5,
      targetHeightMm: 20,
    });
    expect(alvo.heightMm).toBeCloseTo(20, 6);
    expect(alvo.widthMm).toBeCloseTo(20, 6);
    const modulo = qrToGcode('PRIORIDADE', { ...baseParams, moduleMm: 0.5 });
    expect(modulo.moduleMm).toBe(0.5);
  });

  it('nunca esmaga o módulo abaixo do mínimo (0,05 mm) e avisa', () => {
    const res = qrToGcode('x'.repeat(80), {
      ...baseParams,
      version: 40,
      targetWidthMm: 5,
    });
    expect(res.moduleMm).toBeGreaterThanOrEqual(0.05);
    expect(res.widthMm).toBeGreaterThan(5);
    expect(res.warnings).toContain('module-tiny');
  });

  it('mantém o tamanho pedido mesmo quando a versão cresce', () => {
    const pequeno = qrToGcode('A', { ...baseParams, targetWidthMm: 25 });
    const grande = qrToGcode('A'.repeat(60), {
      ...baseParams,
      targetWidthMm: 25,
    });
    expect(grande.qr.size).toBeGreaterThan(pequeno.qr.size);
    expect(grande.widthMm).toBeCloseTo(25, 6);
    expect(grande.moduleMm).toBeLessThan(pequeno.moduleMm);
  });
});

describe('matrixToBands — eixos independentes', () => {
  it('moduleYMm estica só o eixo Y', () => {
    const matrix = [[true]];
    const quadrado = matrixToBands(matrix, {
      moduleMm: 0.5,
      quietZoneModules: 0,
    });
    const esticado = matrixToBands(matrix, {
      moduleMm: 0.5,
      moduleYMm: 1,
      quietZoneModules: 0,
    });
    expect(quadrado.extent).toEqual({ widthMm: 0.5, heightMm: 0.5 });
    expect(esticado.extent).toEqual({ widthMm: 0.5, heightMm: 1 });
    expect(esticado.bands[0].y1 - esticado.bands[0].y0).toBeCloseTo(1, 9);
    expect(esticado.bands[0].runs[0].x1).toBeCloseTo(0.5, 9);
  });

  it('moduleYMm inválido devolve geometria vazia', () => {
    const geometry = matrixToBands([[true]], {
      moduleMm: 0.5,
      moduleYMm: 0,
    });
    expect(geometry.bands).toEqual([]);
    expect(geometry.extent).toEqual({ widthMm: 0, heightMm: 0 });
  });
});

describe('barcodeToGcode — simbologias novas (RF-SYM-7)', () => {
  it('ITF-14 (13 dígitos → verificador) gera 135 módulos com HRI de 14', () => {
    const res = barcodeToGcode('0950110153000', {
      ...baseParams,
      symbology: 'itf14',
    });
    expect(res.barcode.symbology).toBe('itf14');
    expect(res.barcode.totalModules).toBe(135);
    expect(res.barcode.checkDigit).toBe(3);
    expect(res.barcode.hri).toBe('09501101530003');
    expect(res.gcode).toContain('ITF-14');
    expect(res.gcode).not.toMatch(/NaN|Infinity/);
  });

  it('Codabar, Code 93 e GS1-128 geram G-code com o nome no cabeçalho', () => {
    const cases: Array<[string, string, string]> = [
      ['codabar', 'A1234B', 'Codabar'],
      ['code93', 'GRBL-STUDIO', 'Code 93'],
      ['gs1-128', '0109501101530003^10ABC123', 'GS1-128'],
    ];
    for (const [symbology, text, name] of cases) {
      const res = barcodeToGcode(text, {
        ...baseParams,
        symbology: symbology as never,
      });
      expect(res.gcode).toContain(name);
      expect(res.lines).toBeGreaterThan(0);
      expect(res.widthMm).toBeGreaterThan(0);
      expect(res.gcode).not.toMatch(/NaN|Infinity/);
      // Invariantes do G-code: M5 antes do G0 de retorno e na cauda.
      expect(res.gcode).toContain('M5');
      expect(res.gcode.trimEnd().endsWith('G0 X0 Y0')).toBe(true);
    }
  });
});

describe('dataMatrixToGcode (2D → G-code, RF-SYM-7)', () => {
  it('gera ECC200 com quiet zone de 1 módulo e cabeçalho próprio', () => {
    const res = dataMatrixToGcode('GRBL Studio', { ...baseParams });
    expect(res.datamatrix.size).toBeGreaterThanOrEqual(10);
    expect(res.quietZoneModules).toBe(1);
    expect(res.gcode).toContain('Data Matrix ECC200');
    expect(res.gcode).toContain('1 bloco(s) EC');
    expect(res.gcode).not.toMatch(/NaN|Infinity/);
    expect(res.gcode).toContain('M5');
    expect(res.gcode.trimEnd().endsWith('G0 X0 Y0')).toBe(true);
  });

  it('respeita o tamanho alvo em mm (quiet zone incluída)', () => {
    const res = dataMatrixToGcode('123456', {
      ...baseParams,
      targetWidthMm: 10,
    });
    expect(res.widthMm).toBeCloseTo(10, 6);
    expect(res.heightMm).toBeCloseTo(10, 6);
    // 10×10 módulos + 1 de quiet zone de cada lado = 12 → 10/12 mm por módulo.
    expect(res.moduleMm).toBeCloseTo(10 / 12, 6);
    expect(res.linesPerModule).toBeGreaterThanOrEqual(3);
  });

  it('aceita tamanho forçado e avisa quando o módulo fica pequeno', () => {
    const res = dataMatrixToGcode('A', {
      ...baseParams,
      size: 144,
      targetWidthMm: 8,
      workAreaX: 5,
      workAreaY: 5,
    });
    expect(res.datamatrix.size).toBe(144);
    expect(res.warnings).toContain('module-small');
    expect(res.warnings).toContain('outside-work-area');
  });
});

describe('cabeçalho — limite de bytes do buffer RX (RF-SYM-3)', () => {
  const encoder = new TextEncoder();
  // Latin-1: `—` e acentos ocupam 2 bytes cada; contar caracteres mentiria.
  const longLabel = `${'çãõáé'.repeat(30)}—fim`;
  const maxLineBytes = 110;
  const overlong = (gcode: string) =>
    gcode
      .split('\n')
      .filter((line) => line.trim() !== '')
      .filter((line) => encoder.encode(line).length > maxLineBytes);

  it('nenhuma linha do QR passa do teto (rótulo longo com acentos)', () => {
    const result = qrToGcode(longLabel, {
      ...baseParams,
      label: longLabel,
      labelMaxChars: 60,
    });
    expect(overlong(result.gcode)).toEqual([]);
    expect(result.gcode).toContain('conteúdo: ');
    expect(result.gcode).toMatch(/conteúdo: [^\n]*…/);
  });

  it('nenhuma linha do Data Matrix passa do teto', () => {
    const result = dataMatrixToGcode('DM 123', {
      ...baseParams,
      label: longLabel,
      labelMaxChars: 60,
    });
    expect(overlong(result.gcode)).toEqual([]);
  });

  it('nenhuma linha do código de barras passa do teto', () => {
    const result = barcodeToGcode('GRBL-STUDIO', {
      ...baseParams,
      symbology: 'code128',
      label: longLabel,
      labelMaxChars: 60,
    });
    expect(overlong(result.gcode)).toEqual([]);
  });
});

describe('avisos do Code 39 (mudança silenciosa de dado)', () => {
  it('avisa quando o Code 39 converte o conteúdo para maiúsculas', () => {
    const up = barcodeToGcode('GRBL-STUDIO', {
      ...baseParams,
      symbology: 'code39',
    });
    expect(up.warnings).not.toContain('uppercased');

    const lower = barcodeToGcode('grbl-studio', {
      ...baseParams,
      symbology: 'code39',
    });
    expect(lower.warnings).toContain('uppercased');
    expect(lower.barcode.data).toBe('GRBL-STUDIO');
  });

  it('não avisa nas outras simbologias (têm minúsculas no alfabeto)', () => {
    const r = barcodeToGcode('grbl-studio', {
      ...baseParams,
      symbology: 'code128',
    });
    expect(r.warnings).not.toContain('uppercased');
  });
});
