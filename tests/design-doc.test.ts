/**
 * Documento do editor “Desenhar” (`.gstudio`): ida e volta fiel, leitura
 * tolerante (nunca lança) e saneamento de arquivos adulterados.
 */
import { describe, expect, it } from 'vitest';
import type { DesignDoc } from '../src/shared/designDoc';
import {
  DESIGN_DOC_KIND,
  DESIGN_DOC_VERSION,
  parseDesignDoc,
  serializeDesignDoc,
} from '../src/shared/designDoc';

function doc(): DesignDoc {
  return {
    page: { w: 200, h: 150 },
    activeLayer: 'l2',
    layers: [
      { id: 'l1', name: 'Gravar', color: '#ff0000', power: 40, speed: 1200 },
      { id: 'l2', color: '#00ff00', passes: 3, mode: 'M3' },
    ],
    seq: 4,
    layerSeq: 3,
    shapes: [
      {
        kind: 'rect',
        closed: true,
        points: [
          { x: 10.123456789, y: 20 },
          { x: 60, y: 20 },
          { x: 60, y: 45.5 },
          { x: 10.123456789, y: 45.5 },
        ],
        power: 75,
        speed: 800,
        passes: 2,
        width: 0.4,
        name: 'Peça',
        group: 'g1',
        layer: 'l2',
      },
      {
        kind: 'text',
        closed: true,
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
        ],
        text: {
          value: 'Oi',
          font: 'Sans',
          size: 12,
          mode: 'stroke',
          bold: true,
          spacing: 0.2,
        },
      },
      {
        kind: 'line',
        closed: false,
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
        symbol: {
          type: 'qr',
          text: 'GRBL',
          sizeMm: 20,
          ecc: 'M',
          linesPerMm: 10,
        },
      },
    ],
  };
}

function wrap(payload: Record<string, unknown>): string {
  return JSON.stringify({ kind: DESIGN_DOC_KIND, version: 1, ...payload });
}

describe('designDoc', () => {
  it('faz a volta completa sem perder precisão nem metadados', () => {
    const original = doc();
    const text = serializeDesignDoc(original, new Date('2026-10-20T12:00:00Z'));
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('"savedAt": "2026-10-20T12:00:00.000Z"');

    const parsed = parseDesignDoc(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.doc.page).toEqual({ w: 200, h: 150 });
    expect(parsed.doc.layers).toEqual(original.layers);
    expect(parsed.doc.activeLayer).toBe('l2');
    // Coordenadas exatamente como estavam (sem arredondar).
    expect(parsed.doc.shapes[0].points[0]).toEqual({
      x: 10.123456789,
      y: 20,
    });
    expect(parsed.doc.shapes[0]).toMatchObject({
      power: 75,
      speed: 800,
      passes: 2,
      width: 0.4,
      name: 'Peça',
      group: 'g1',
      layer: 'l2',
    });
    expect(parsed.doc.shapes[1].text).toEqual({
      value: 'Oi',
      font: 'Sans',
      size: 12,
      mode: 'stroke',
      bold: true,
      spacing: 0.2,
    });
    expect(parsed.doc.shapes[2].symbol).toMatchObject({
      type: 'qr',
      text: 'GRBL',
      sizeMm: 20,
      ecc: 'M',
    });
    // Contadores derivados do conteúdo: g1 → próximo 2; l2 → próximo 3.
    expect(parsed.doc.seq).toBe(2);
    expect(parsed.doc.layerSeq).toBe(3);
  });

  it('recusa o que não é documento, versão futura e JSON quebrado', () => {
    expect(parseDesignDoc('{"kind":"outro","version":1}')).toEqual({
      ok: false,
      error: 'format',
    });
    expect(parseDesignDoc(wrap({ version: DESIGN_DOC_VERSION + 1 }))).toEqual({
      ok: false,
      error: 'version',
    });
    expect(parseDesignDoc(wrap({ version: 0 }))).toEqual({
      ok: false,
      error: 'format',
    });
    expect(parseDesignDoc('{isso não é json')).toEqual({
      ok: false,
      error: 'json',
    });
    expect(parseDesignDoc(42)).toEqual({ ok: false, error: 'json' });
    expect(parseDesignDoc('[]')).toEqual({ ok: false, error: 'format' });
  });

  it('descarta pontos inválidos e formas sem geometria', () => {
    const parsed = parseDesignDoc(
      wrap({
        shapes: [
          {
            kind: 'line',
            closed: false,
            points: [
              { x: 1, y: 1 },
              { x: Number.NaN, y: 2 },
              { x: 3, y: 3 },
            ],
          },
          {
            kind: 'line',
            closed: false,
            points: [
              { x: Number.POSITIVE_INFINITY, y: 0 },
              { x: 0, y: Number.NaN },
            ],
          },
          { kind: 'estrela', closed: true, points: [{ x: 0, y: 0 }] },
          { kind: 'rect', closed: true, points: 'nada' },
        ],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.doc.shapes).toHaveLength(1);
    expect(parsed.doc.shapes[0].points).toEqual([
      { x: 1, y: 1 },
      { x: 3, y: 3 },
    ]);
  });

  it('normaliza números fora de faixa vindos de um arquivo adulterado', () => {
    const parsed = parseDesignDoc(
      wrap({
        shapes: [
          {
            kind: 'rect',
            closed: true,
            points: [{ x: 0, y: 0 }],
            power: 250,
            passes: 0,
            speed: -10,
            width: 0,
          },
        ],
        layers: [{ id: 'l1', power: 999, passes: -8, speed: 0, mode: 'M5' }],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const sh = parsed.doc.shapes[0];
    expect(sh.power).toBe(100);
    expect(sh.passes).toBe(1);
    expect(sh.speed).toBeUndefined();
    expect(sh.width).toBeUndefined();
    const layer = parsed.doc.layers[0];
    expect(layer.power).toBe(100);
    expect(layer.passes).toBe(1);
    expect(layer.speed).toBeUndefined();
    // Modo inválido é descartado (herda o global).
    expect(layer.mode).toBeUndefined();
  });

  it('limpa metadados de texto inválidos e símbolo sem conteúdo', () => {
    const parsed = parseDesignDoc(
      wrap({
        shapes: [
          {
            kind: 'text',
            closed: true,
            points: [{ x: 0, y: 0 }],
            text: { value: 'Oi', font: 'Sans', size: 10, mode: 'carimbo' },
            symbol: { type: 'qr', text: '   ' },
          },
        ],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.doc.shapes[0].text?.mode).toBe('vector');
    expect(parsed.doc.shapes[0].symbol).toBeUndefined();
  });

  it('remove camadas repetidas e referências a camadas inexistentes', () => {
    const parsed = parseDesignDoc(
      wrap({
        activeLayer: 'l9',
        layers: [{ id: 'l1' }, { id: 'l1', name: 'repetida' }],
        shapes: [
          {
            kind: 'line',
            closed: false,
            points: [{ x: 0, y: 0 }],
            layer: 'l9',
          },
        ],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.doc.layers).toEqual([{ id: 'l1' }]);
    expect(parsed.doc.shapes[0].layer).toBeUndefined();
    // Sem camada ativa válida, a primeira assume.
    expect(parsed.doc.activeLayer).toBe('l1');
  });

  it('continua a numeração de grupos e camadas a partir do arquivo', () => {
    const parsed = parseDesignDoc(
      wrap({
        layers: [{ id: 'l1' }, { id: 'l7' }],
        shapes: [
          {
            kind: 'line',
            closed: false,
            points: [{ x: 0, y: 0 }],
            group: 'g3',
          },
          {
            kind: 'line',
            closed: false,
            points: [{ x: 1, y: 1 }],
            group: 'g12',
          },
        ],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.doc.seq).toBe(13);
    expect(parsed.doc.layerSeq).toBe(8);
  });

  it('aceita documento vazio e usa a página padrão quando ela falta', () => {
    const parsed = parseDesignDoc(wrap({ shapes: [], layers: [] }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.doc.shapes).toEqual([]);
    expect(parsed.doc.page).toEqual({ w: 150, h: 130 });
    expect(parsed.doc.layers).toEqual([{ id: 'l1' }]);
  });
});
