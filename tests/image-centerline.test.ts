import { describe, expect, it } from 'vitest';
import {
  buildWorkingMask,
  centerlineToGcode,
  pathLength,
  pruneSpurs,
  simplifyOpenPath,
  thinMask,
  traceCenterline,
  traceSkeleton,
} from '../src/shared/image/centerline';
import { imageToGcode, validateOptions } from '../src/shared/image/gcode';
import type { ImageToGcodeOptions } from '../src/shared/image/types';

/** Máscara legível: 'X' = matéria (1), '.' = fundo (0). */
const mask = (rows: string[]): Uint8Array => {
  const h = rows.length;
  const w = rows[0]!.length;
  const out = new Uint8Array(w * h);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      out[y * w + x] = ch === 'X' ? 1 : 0;
    });
  });
  return out;
};

const count = (m: Uint8Array): number => {
  let n = 0;
  for (const v of m) if (v) n++;
  return n;
};

/** Imagem RGBA branca (255) com um retângulo preto em [x0..x1) × [y0..y1). */
const withRect = (
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
    }
  }
  return out;
};

const solid = (w: number, h: number, v: number): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
};

const options = (
  o: Partial<ImageToGcodeOptions> = {},
): ImageToGcodeOptions => ({
  adjust: {
    brightness: 0,
    contrast: 0,
    whiteClip: 0,
    invert: false,
    blackWhite: false,
    bwThreshold: 0.5,
  },
  geometry: {
    widthMm: 10,
    heightMm: 10,
    offsetX: 0,
    offsetY: 0,
    linesPerMm: 2,
    direction: 'h',
    dotSizeMm: 0.08,
  },
  engrave: {
    speedMmMin: 1000,
    travelSpeedMmMin: 5000,
    sMin: 0,
    sMax: 1000,
    mode: 'M4',
  },
  algorithm: 'centerline',
  ...o,
});

/** Caixa de um traço em pixels. */
const bbox = (path: { x: number; y: number }[]) => {
  const xs = path.map((p) => p.x);
  const ys = path.map((p) => p.y);
  return {
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    y0: Math.min(...ys),
    y1: Math.max(...ys),
  };
};

describe('thinMask (Zhang–Suen)', () => {
  it('não mexe numa linha de 1 px', () => {
    const m = mask(['XXXXXXXXXX']);
    expect([...thinMask(m, 10, 1)]).toEqual([...m]);
  });

  it('barra grossa vira uma linha de 1 px de espessura', () => {
    const m = mask(Array.from({ length: 24 }, () => 'XXXXXXX'));
    const skel = thinMask(m, 7, 24);
    expect(count(skel)).toBeLessThan(40);
    // Cada linha tem no máximo 2 pixels (degraus do afinamento).
    for (let y = 0; y < 24; y++) {
      let row = 0;
      for (let x = 0; x < 7; x++) row += skel[y * 7 + x]!;
      expect(row).toBeLessThanOrEqual(2);
    }
    // O esqueleto é vertical e atravessa a barra.
    const paths = traceSkeleton(skel, 7, 24);
    expect(paths).toHaveLength(1);
    const box = bbox(paths[0]!);
    // O afinamento encurta as pontas ~meia espessura (7 px de barra).
    expect(box.y1 - box.y0).toBeGreaterThan(14);
    expect(box.x1 - box.x0).toBeLessThanOrEqual(1);
  });

  it('anel vira um laço fechado', () => {
    const m = mask([
      '............',
      '..XXXXXXXX..',
      '..XXXXXXXX..',
      '..XX....XX..',
      '..XX....XX..',
      '..XX....XX..',
      '..XX....XX..',
      '..XXXXXXXX..',
      '..XXXXXXXX..',
      '............',
    ]);
    const skel = thinMask(m, 12, 10);
    const paths = traceSkeleton(skel, 12, 10);
    expect(paths).toHaveLength(1);
    const path = paths[0]!;
    expect(path[0]).toEqual(path[path.length - 1]);
    expect(pathLength(path)).toBeGreaterThan(20);
  });

  it('não altera a máscara de entrada', () => {
    const m = mask(['XXXX', 'XXXX', 'XXXX']);
    const before = [...m];
    thinMask(m, 4, 3);
    expect([...m]).toEqual(before);
  });
});

describe('traceSkeleton', () => {
  it('cruz tem 4 braços saindo da junção', () => {
    const m = mask([
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      'XXXXXXXXXXXX',
      'XXXXXXXXXXXX',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
      '.....XX.....',
    ]);
    const skel = thinMask(m, 12, 12);
    const paths = traceSkeleton(skel, 12, 12);
    expect(paths).toHaveLength(4);
    // Todos os braços partem do mesmo ponto (a junção).
    const ends = new Map<string, number>();
    for (const p of paths) {
      for (const end of [p[0]!, p[p.length - 1]!]) {
        const k = `${end.x},${end.y}`;
        ends.set(k, (ends.get(k) ?? 0) + 1);
      }
    }
    expect([...ends.values()].filter((n) => n === 4)).toHaveLength(1);
  });

  it('pixel isolado não vira traço', () => {
    expect(traceSkeleton(mask(['X']), 1, 1)).toEqual([]);
  });

  it('cada aresta é usada uma vez (sem traço duplicado)', () => {
    const skel = mask(['XXXX', 'X..X', 'X..X', 'XXXX']);
    const paths = traceSkeleton(skel, 4, 4);
    // O anel 4x4 tem grau 2 em tudo -> um laço fechado.
    expect(paths).toHaveLength(1);
    expect(paths[0]![0]).toEqual(paths[0]![paths[0]!.length - 1]);
  });
});

describe('pruneSpurs', () => {
  it('remove esporão curto preso numa junção', () => {
    const paths = [
      [
        { x: 0, y: 5 },
        { x: 5, y: 5 },
      ],
      [
        { x: 5, y: 5 },
        { x: 10, y: 5 },
      ],
      [
        { x: 5, y: 5 },
        { x: 6, y: 4 },
      ],
    ];
    const pruned = pruneSpurs(paths, 4);
    expect(pruned).toHaveLength(2);
    expect(pruned.every((p) => p[0]!.y === 5 || p[1]!.y === 5)).toBe(true);
  });

  it('mantém traço curto entre duas pontas livres', () => {
    const paths = [
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
    ];
    expect(pruneSpurs(paths, 4)).toHaveLength(1);
  });

  it('mantém braço longo mesmo com ponta livre', () => {
    const paths = [
      [
        { x: 5, y: 5 },
        { x: 5, y: 20 },
      ],
      [
        { x: 5, y: 5 },
        { x: 20, y: 5 },
      ],
    ];
    expect(pruneSpurs(paths, 4)).toHaveLength(2);
  });
});

describe('simplifyOpenPath (RDP aberto)', () => {
  it('remove o degrau e mantém as duas pontas', () => {
    const pts = Array.from({ length: 11 }, (_, i) => ({ x: i, y: i % 2 }));
    const out = simplifyOpenPath(pts, 0.9);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[out.length - 1]).toEqual({ x: 10, y: 0 });
    expect(out.length).toBeLessThan(pts.length);
  });

  it('tolerância 0 mantém todos os pontos', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ];
    expect(simplifyOpenPath(pts, 0)).toHaveLength(3);
  });
});

describe('buildWorkingMask', () => {
  it('reduz imagens grandes mantendo traço fino', () => {
    const w = 1200;
    const h = 800;
    const gray = new Float32Array(w * h).fill(1);
    for (let y = 0; y < h; y++) gray[y * w + 600] = 0; // linha de 1 px
    const working = buildWorkingMask(gray, w, h, 0.5, 200);
    expect(working.width).toBeLessThanOrEqual(200);
    expect(working.height).toBeLessThanOrEqual(200);
    expect(working.step).toBe(6);
    // A linha sobrevive à redução.
    let dark = 0;
    for (const v of working.mask) if (v) dark++;
    expect(dark).toBeGreaterThan(0);
  });

  it('não reduz imagem pequena', () => {
    const working = buildWorkingMask(
      new Float32Array(10 * 10).fill(1),
      10,
      10,
      0.5,
      900,
    );
    expect(working.step).toBe(1);
    expect(working.width).toBe(10);
  });
});

describe('traceCenterline', () => {
  it('barra horizontal vira um traço só, de ponta a ponta', () => {
    const img = withRect(60, 40, 5, 15, 55, 25);
    const { paths } = traceCenterline(img, 60, 40, options());
    expect(paths).toHaveLength(1);
    const box = bbox(paths[0]!);
    expect(box.x0).toBeGreaterThan(3);
    expect(box.x1).toBeLessThan(57);
    // Pontas encurtadas ~meia espessura (10 px), como em qualquer esqueleto.
    expect(box.x1 - box.x0).toBeGreaterThan(36);
    expect(box.y1 - box.y0).toBeLessThanOrEqual(2);
  });

  it('cruz gera 4 traços', () => {
    const img = withRect(60, 60, 0, 27, 60, 33);
    const out = withRect(60, 60, 27, 0, 33, 60);
    for (let i = 0; i < out.length; i++) if (out[i] === 0) img[i] = 0;
    const { paths } = traceCenterline(img, 60, 60, options());
    expect(paths).toHaveLength(4);
    for (const p of paths) expect(pathLength(p)).toBeGreaterThan(20);
  });

  it('é determinístico', () => {
    const img = withRect(40, 40, 8, 8, 32, 20);
    const a = traceCenterline(img, 40, 40, options()).paths;
    const b = traceCenterline(img, 40, 40, options()).paths;
    expect(a).toEqual(b);
  });
});

describe('centerlineToGcode', () => {
  it('emite linhas únicas com S, sem fechar o traço', () => {
    // "L": um traço com canto -> pelo menos dois G1 (o canto é preservado).
    const img = withRect(80, 60, 10, 25, 70, 35);
    const arm = withRect(80, 60, 10, 8, 20, 35);
    for (let i = 0; i < arm.length; i++) if (arm[i] === 0) img[i] = 0;
    const res = centerlineToGcode(img, 80, 60, options());
    const lines = res.gcode.trimEnd().split('\n');
    expect(lines.slice(0, 4)).toEqual(['G21', 'G90', 'G94', 'M5']);
    expect(lines[lines.length - 1]).toBe('M5');
    expect(res.stats.paths).toBeGreaterThanOrEqual(1);
    expect(res.stats.segments).toBeGreaterThan(1);
    expect(res.stats.contours).toBeUndefined();

    const g1 = lines.filter((l) => l.startsWith('G1'));
    expect(g1.length).toBe(res.stats.segments);
    // `S` é modal: aparece no primeiro G1 e some enquanto não muda.
    expect(g1[0]).toContain(' S1000');
    expect(lines.indexOf('M4')).toBeGreaterThan(3);
    expect(lines.indexOf('M4')).toBeLessThan(lines.indexOf(g1[0]!));
    expect(
      lines.filter((l) => l.startsWith('G0')).every((l) => !l.includes('F')),
    ).toBe(true);

    // Caminho aberto: o último ponto não repete o primeiro.
    const flat = res.contourPaths!;
    let i = 0;
    let paths = 0;
    while (i < flat.length) {
      const n = flat[i++]!;
      expect(n).toBeLessThan(0);
      const len = -n;
      const first = { x: flat[i]!, y: flat[i + 1]! };
      i += len * 2;
      const last = { x: flat[i - 2]!, y: flat[i - 1]! };
      expect(last).not.toEqual(first);
      paths++;
    }
    expect(paths).toBe(res.stats.paths);
  });

  it('respeita a área de trabalho e o offset', () => {
    const img = withRect(50, 50, 0, 0, 50, 50);
    const res = centerlineToGcode(
      img,
      50,
      50,
      options({
        geometry: {
          widthMm: 20,
          heightMm: 20,
          offsetX: 5,
          offsetY: 7,
          linesPerMm: 2,
          direction: 'h',
          dotSizeMm: 0.08,
        },
      }),
    );
    expect(res.stats.bounds.xMin).toBeGreaterThanOrEqual(5);
    expect(res.stats.bounds.xMax).toBeLessThanOrEqual(25);
    expect(res.stats.bounds.yMin).toBeGreaterThanOrEqual(7);
    expect(res.stats.bounds.yMax).toBeLessThanOrEqual(27);
  });

  it('imagem em branco não emite G1', () => {
    const res = centerlineToGcode(solid(40, 40, 255), 40, 40, options());
    expect(res.stats.paths).toBe(0);
    expect(res.stats.segments).toBe(0);
    expect(res.gcode).not.toContain('G1');
    expect(res.gcode.trimEnd().split('\n').pop()).toBe('M5');
  });

  it('duas passadas repetem o caminho', () => {
    const img = withRect(40, 40, 10, 18, 30, 22);
    const one = centerlineToGcode(img, 40, 40, options());
    const two = centerlineToGcode(img, 40, 40, options({ passes: 2 }));
    expect(two.stats.segments).toBe(one.stats.segments * 2);
    expect(two.gcode).toContain('; pass 2/2');
  });

  it('entra pelo pipeline com algorithm centerline', () => {
    const img = withRect(40, 40, 10, 18, 30, 22);
    const res = imageToGcode(img, 40, 40, options());
    expect(res.stats.paths).toBeGreaterThanOrEqual(1);
    expect(res.gcode).toContain('G1');
  });
});

describe('validateOptions (centerline)', () => {
  it('aceita os padrões', () => {
    expect(() => validateOptions(options())).not.toThrow();
  });

  it('rejeita ramo mínimo negativo e resolução fora da faixa', () => {
    expect(() => validateOptions(options({ minBranchPx: -1 }))).toThrow(
      /Ramo mínimo/,
    );
    expect(() => validateOptions(options({ centerlineMaxDim: 10 }))).toThrow(
      /Resolução do centerline/,
    );
  });

  it('rejeita algoritmo desconhecido', () => {
    expect(() =>
      validateOptions(
        options({
          algorithm: 'nope' as unknown as ImageToGcodeOptions['algorithm'],
        }),
      ),
    ).toThrow(/Algoritmo inválido/);
  });
});
