/**
 * Importação PDF (P2.4/RF-DSN-15): objetos, streams comprimidos, operadores de
 * caminho, Form XObjects, imagens, texto, rotação e G-code. PDFs de teste são
 * montados aqui e comprimidos com `node:zlib` (mesmo caminho do app).
 */
import { deflateSync, inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { PdfError, parsePdf, pdfToGcode } from '../src/shared/pdf';

const inflate = (data: Uint8Array): Uint8Array =>
  new Uint8Array(inflateSync(Buffer.from(data)));

function obj(num: number, body: string): string {
  return `${num} 0 obj\n${body}\nendobj\n`;
}

function flate(text: string): string {
  return deflateSync(Buffer.from(text, 'latin1')).toString('latin1');
}

function stream(dict: string, data: string, compress = true): string {
  const raw = compress ? flate(data) : data;
  const filter = compress ? ' /Filter /FlateDecode' : '';
  return `<< ${dict}${filter} /Length ${raw.length} >>\nstream\n${raw}\nendstream`;
}

function buildPdf(objects: string[], trailerExtra = ''): string {
  return `%PDF-1.4\n${objects.join('')}trailer\n<< /Root 1 0 R${trailerExtra} >>\n%%EOF\n`;
}

/** PDF de uma página: Catálogo, Pages (com MediaBox) e Page com conteúdo. */
function simplePdf(
  content: string,
  opts: { resources?: string; mediaBox?: string; extra?: string[] } = {},
): string {
  const mediaBox = opts.mediaBox ?? '[0 0 612 792]';
  const resources = opts.resources ?? '<< >>';
  return buildPdf([
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>'),
    obj(2, `<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox ${mediaBox} >>`),
    obj(
      3,
      `<< /Type /Page /Parent 2 0 R /Resources ${resources} /Contents 4 0 R >>`,
    ),
    obj(4, stream('', content)),
    ...(opts.extra ?? []),
  ]);
}

const MM = 25.4 / 72;

describe('parsePdf — caminhos', () => {
  it('lê um retângulo (`re`) e converte pontos para mm', () => {
    const doc = parsePdf(simplePdf('100 100 200 200 re S'), inflate);
    expect(doc.contours).toHaveLength(1);
    expect(doc.contours[0].closed).toBe(true);
    expect(doc.contours[0].points).toHaveLength(4);
    expect(doc.width).toBeCloseTo(200 * MM, 4);
    expect(doc.height).toBeCloseTo(200 * MM, 4);
    expect(doc.pages).toBe(1);
  });

  it('lê polilinha aberta (`m`/`l`)', () => {
    const doc = parsePdf(simplePdf('10 10 m 100 10 l S'), inflate);
    expect(doc.contours).toHaveLength(1);
    expect(doc.contours[0].closed).toBe(false);
    expect(doc.width).toBeCloseTo(90 * MM, 4);
    expect(doc.height).toBeCloseTo(0, 6);
  });

  it('aplica a matriz `cm` aos pontos do caminho', () => {
    const doc = parsePdf(
      simplePdf('2 0 0 2 0 0 cm 10 10 m 20 20 l S'),
      inflate,
    );
    expect(doc.contours[0].points).toEqual([
      { x: 0, y: 0 },
      { x: (40 - 20) * MM, y: (40 - 20) * MM },
    ]);
  });

  it('amostra a Bézier cúbica (`c`) em polilinha', () => {
    const doc = parsePdf(simplePdf('0 0 m 0 50 50 50 50 0 c S'), inflate);
    expect(doc.contours[0].points.length).toBeGreaterThan(4);
    expect(doc.width).toBeCloseTo(50 * MM, 4);
  });

  it('respeita o fechamento (`h`) antes de pintar', () => {
    const doc = parsePdf(simplePdf('0 0 m 10 0 l 10 10 l h S'), inflate);
    expect(doc.contours).toHaveLength(1);
    expect(doc.contours[0].closed).toBe(true);
    expect(doc.contours[0].points).toHaveLength(3);
  });

  it('interpreta um Form XObject (`Do`) com /Matrix', () => {
    const form = obj(
      5,
      stream(
        '/Type /XObject /Subtype /Form /Matrix [1 0 0 1 5 5] /BBox [0 0 100 100] /Resources << >>',
        '0 0 10 0 re f',
      ),
    );
    const doc = parsePdf(
      simplePdf('/Fm0 Do', {
        resources: '<< /XObject << /Fm0 5 0 R >> >>',
        extra: [form],
      }),
      inflate,
    );
    expect(doc.contours).toHaveLength(1);
    expect(doc.width).toBeCloseTo(10 * MM, 4);
  });
});

describe('parsePdf — texto, imagens e rotação', () => {
  it('marca texto sem gerar geometria (fontes não viram curvas)', () => {
    const doc = parsePdf(
      simplePdf('BT /F1 12 Tf 10 10 Td (oi) Tj ET'),
      inflate,
    );
    expect(doc.contours).toEqual([]);
    expect(doc.textSkipped).toBe(true);
  });

  it('conta imagens bitmap ignoradas', () => {
    const image = obj(
      5,
      stream('/Type /XObject /Subtype /Image /Width 1 /Height 1', ''),
    );
    const doc = parsePdf(
      simplePdf('q 50 0 0 50 0 0 cm /Im0 Do Q', {
        resources: '<< /XObject << /Im0 5 0 R >> >>',
        extra: [image],
      }),
      inflate,
    );
    expect(doc.contours).toEqual([]);
    expect(doc.imagesSkipped).toBe(1);
  });

  it('rotaciona a página 90° (a geometria acompanha o que se vê)', () => {
    const pdf = buildPdf([
      obj(1, '<< /Type /Catalog /Pages 2 0 R >>'),
      obj(
        2,
        '<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 612 792] >>',
      ),
      obj(3, '<< /Type /Page /Parent 2 0 R /Rotate 90 /Contents 4 0 R >>'),
      obj(4, stream('', '100 100 200 50 re S')),
    ]);
    const doc = parsePdf(pdf, inflate);
    expect(doc.width).toBeCloseTo(50 * MM, 4);
    expect(doc.height).toBeCloseTo(200 * MM, 4);
  });

  it('decodifica stream sem compressão (sem /Filter)', () => {
    const pdf = buildPdf([
      obj(1, '<< /Type /Catalog /Pages 2 0 R >>'),
      obj(
        2,
        '<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 100 100] >>',
      ),
      obj(3, '<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>'),
      obj(4, stream('', '10 10 80 80 re S', false)),
    ]);
    const doc = parsePdf(pdf, inflate);
    expect(doc.contours).toHaveLength(1);
    expect(doc.width).toBeCloseTo(80 * MM, 4);
  });

  it('decodifica filtro ASCIIHexDecode', () => {
    const hex = Buffer.from('10 10 80 80 re S', 'latin1').toString('hex');
    const pdf = buildPdf([
      obj(1, '<< /Type /Catalog /Pages 2 0 R >>'),
      obj(
        2,
        '<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 100 100] >>',
      ),
      obj(3, '<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>'),
      obj(
        4,
        `<< /Filter /ASCIIHexDecode /Length ${hex.length} >>\nstream\n${hex}>\nendstream`,
      ),
    ]);
    const doc = parsePdf(pdf, inflate);
    expect(doc.contours).toHaveLength(1);
    expect(doc.width).toBeCloseTo(80 * MM, 4);
  });
});

describe('parsePdf — robustez', () => {
  it('lê uma Page dentro de um object stream (/ObjStm)', () => {
    const header = '7 0 ';
    const inner = '<< /Type /Page /Parent 2 0 R /Contents 5 0 R >>';
    const pdf = buildPdf([
      obj(1, '<< /Type /Catalog /Pages 2 0 R >>'),
      obj(
        2,
        '<< /Type /Pages /Kids [7 0 R] /Count 1 /MediaBox [0 0 100 100] >>',
      ),
      obj(5, stream('', '10 10 80 80 re S')),
      obj(
        6,
        stream(`/Type /ObjStm /N 1 /First ${header.length}`, header + inner),
      ),
    ]);
    const doc = parsePdf(pdf, inflate);
    expect(doc.pages).toBe(1);
    expect(doc.contours).toHaveLength(1);
    expect(doc.width).toBeCloseTo(80 * MM, 4);
  });

  it('recusa PDF criptografado com erro tipado', () => {
    const pdf = buildPdf(
      [obj(1, '<< /Type /Catalog /Pages 2 0 R >>')],
      ' /Encrypt 9 0 R',
    );
    expect(() => parsePdf(pdf, inflate)).toThrow(PdfError);
    try {
      parsePdf(pdf, inflate);
    } catch (err) {
      expect((err as PdfError).code).toBe('encrypted');
    }
  });

  it('devolve documento vazio quando não há páginas', () => {
    const doc = parsePdf(buildPdf([obj(1, '<< /Type /Catalog >>')]), inflate);
    expect(doc.pages).toBe(0);
    expect(doc.contours).toEqual([]);
  });
});

describe('pdfToGcode', () => {
  it('emite G-code com cabeçalho PDF e Y para cima', () => {
    const doc = parsePdf(simplePdf('0 0 m 0 100 l S'), inflate);
    const gcode = pdfToGcode(doc, { feed: 700, travelFeed: 2500 });
    expect(gcode).toContain('importação PDF');
    expect(gcode).toContain('G21');
    expect(gcode).toContain('G90');
    expect(gcode).toContain('M5');
    expect(gcode).toContain('G0 X0.000 Y0.000 F2500');
    expect(gcode).not.toContain('Y-');
  });
});
