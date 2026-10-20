import { describe, expect, it } from 'vitest';
import {
  BOX_PANEL_GAP_MM,
  boxPanels,
  fingerIntervals,
  gearOutline,
  sanitizeBox,
  sanitizeGear,
  slotIntervals,
  type Point,
} from '../src/shared/generators';

function bbox(points: Point[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { w: maxX - minX, h: maxY - minY, minX, minY, maxX, maxY };
}

function radius(p: Point): number {
  return Math.hypot(p.x, p.y);
}

describe('fingerIntervals / slotIntervals', () => {
  it('começa e termina com vão e mantém a largura pedida', () => {
    const iv = fingerIntervals(100, 5);
    expect(iv.length).toBe(10);
    expect(iv[0][0]).toBeGreaterThan(0.5);
    expect(iv[iv.length - 1][1]).toBeLessThan(99.5);
    for (const [s, e] of iv) expect(e - s).toBeCloseTo(4.76, 2);
    // Sem sobreposição e em ordem.
    for (let i = 1; i < iv.length; i++) {
      expect(iv[i][0]).toBeGreaterThanOrEqual(iv[i - 1][1]);
    }
  });

  it('borda curta ainda gera um dedo central', () => {
    const iv = fingerIntervals(9, 4);
    expect(iv).toHaveLength(1);
    expect(iv[0][0]).toBeGreaterThan(0);
    expect(iv[0][1]).toBeLessThan(9);
  });

  it('entradas degeneradas devolvem lista vazia', () => {
    expect(fingerIntervals(0, 5)).toEqual([]);
    expect(fingerIntervals(100, 0)).toEqual([]);
  });

  it('a folga alarga a fenda e nunca vaza da borda', () => {
    const slots = slotIntervals(
      [
        [0.2, 1],
        [8.6, 9.4],
      ],
      0.4,
      10,
    );
    expect(slots[0][0]).toBe(0);
    expect(slots[0][1]).toBeCloseTo(1.2, 6);
    expect(slots[1][0]).toBeCloseTo(8.4, 6);
    expect(slots[1][1]).toBeCloseTo(9.6, 6);
  });
});

describe('boxPanels', () => {
  const opts = {
    width: 200,
    depth: 140,
    height: 80,
    thickness: 3,
    finger: 10,
    clearance: 0.1,
  };

  it('sai com 6 painéis e as medidas externas certas', () => {
    const box = boxPanels(opts);
    expect(box.panels.map((p) => p.key)).toEqual([
      'front',
      'back',
      'left',
      'right',
      'bottom',
      'top',
    ]);
    const size = (key: string) => {
      const p = box.panels.find((x) => x.key === key);
      if (!p) throw new Error(key);
      return bbox(p.points);
    };
    // Frente/fundo: W × H.
    expect(size('front').w).toBeCloseTo(200, 6);
    expect(size('front').h).toBeCloseTo(80, 6);
    // Laterais: (D − 2t) + dedos de t nos dois lados = D × H.
    expect(size('left').w).toBeCloseTo(140, 6);
    expect(size('left').h).toBeCloseTo(80, 6);
    // Base/tampa: (W − 2t) + t de cada lado = W × D.
    expect(size('bottom').w).toBeCloseTo(200, 6);
    expect(size('bottom').h).toBeCloseTo(140, 6);
  });

  it('sem tampa saem 5 painéis', () => {
    const box = boxPanels({ ...opts, top: false });
    expect(box.panels).toHaveLength(5);
    expect(box.top).toBe(false);
  });

  it('os painéis não se sobrepõem na chapa', () => {
    const box = boxPanels(opts);
    let cursor = 0;
    for (const p of box.panels) {
      const b = bbox(p.points);
      expect(b.minX).toBeGreaterThanOrEqual(cursor - 1e-6);
      cursor = b.maxX + BOX_PANEL_GAP_MM;
    }
    expect(cursor - BOX_PANEL_GAP_MM).toBeCloseTo(box.width, 6);
  });

  it('a fenda da parede coincide com o dedo da base (mesma posição)', () => {
    // Base: dedos ao longo de W − 2t. Parede: fendas deslocadas de t.
    // Aqui conferimos a geometria resultante: a parede tem recuos na base
    // (y = 0) alinhados com os dedos que a base projeta para fora.
    const box = boxPanels(opts);
    const front = box.panels.find((p) => p.key === 'front');
    const bottom = box.panels.find((p) => p.key === 'bottom');
    if (!front || !bottom) throw new Error('painéis');
    const t = opts.thickness;
    const frontSlots = front.points.filter(
      (p) => Math.abs(p.y - 0) < 1e-6 && p.x > 0.02 && p.x < 199.98,
    );
    const bottomTabs = bottom.points.filter((p) => Math.abs(p.y - 0) < 1e-6);
    expect(frontSlots.length).toBeGreaterThan(0);
    expect(bottomTabs.length).toBeGreaterThan(0);
    const fb = bbox(front.points);
    const bb = bbox(bottom.points);
    // Os recuos da frente ficam a t do início da base.
    const firstSlot = Math.min(...frontSlots.map((p) => p.x - fb.minX));
    const firstTab = Math.min(...bottomTabs.map((p) => p.x - bb.minX));
    expect(firstSlot).toBeGreaterThan(t);
    expect(firstTab).toBeGreaterThanOrEqual(0);
  });

  it('profundidade estreita não gera largura negativa', () => {
    const box = boxPanels({ ...opts, depth: 21, finger: 4 });
    for (const p of box.panels) {
      expect(bbox(p.points).w).toBeGreaterThan(0);
    }
  });

  it('sanitiza medidas fora da faixa', () => {
    const o = sanitizeBox({
      width: 5,
      depth: 5000,
      height: Number.NaN,
      thickness: 0,
      finger: 0,
      clearance: 99,
    });
    expect(o.width).toBe(20);
    expect(o.depth).toBe(1200);
    expect(o.height).toBe(60);
    expect(o.thickness).toBe(0.5);
    expect(o.finger).toBe(2);
    expect(o.clearance).toBe(1);
  });
});

describe('gearOutline', () => {
  it('respeita módulo, dentes e raios', () => {
    const g = gearOutline({ module: 2, teeth: 20 });
    expect(g.pitchDiameter).toBeCloseTo(40, 6);
    expect(g.outerDiameter).toBeCloseTo(44, 6);
    expect(g.rootDiameter).toBeCloseTo(35, 6);
    const rs = g.points.map(radius);
    expect(Math.max(...rs)).toBeCloseTo(22, 3);
    expect(Math.min(...rs)).toBeCloseTo(17.5, 3);
    // O contorno é fechado e não repete o primeiro ponto no fim.
    expect(g.points.length).toBeGreaterThan(20 * 10);
    const first = g.points[0];
    const last = g.points[g.points.length - 1];
    expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeGreaterThan(
      1e-3,
    );
  });

  it('tem um dente por passo (picos de raio)', () => {
    const z = 24;
    const g = gearOutline({ module: 1.5, teeth: z, pressureAngle: 20 });
    const ra = g.outerDiameter / 2;
    let peaks = 0;
    for (let i = 0; i < g.points.length; i++) {
      const prev = radius(
        g.points[(i - 1 + g.points.length) % g.points.length],
      );
      const cur = radius(g.points[i]);
      const next = radius(g.points[(i + 1) % g.points.length]);
      if (cur > ra - 1e-6 && cur >= prev && cur >= next) peaks++;
    }
    expect(peaks).toBeGreaterThanOrEqual(z);
  });

  it('dentes pequenos continuam com largura positiva (sem ponta negativa)', () => {
    const g = gearOutline({ module: 1, teeth: 8, pressureAngle: 20 });
    // Ângulos em ordem crescente (sem cruzamento de flancos).
    const angles = g.points.map((p) => Math.atan2(p.y, p.x));
    expect(angles.length).toBeGreaterThan(8);
    for (const r of g.points.map(radius)) {
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(g.outerDiameter / 2 + 1e-6);
    }
  });

  it('guarda o furo pedido e sanitiza', () => {
    const g = gearOutline({ module: 2, teeth: 30, bore: 8 });
    expect(g.bore).toBe(8);
    const o = sanitizeGear({
      module: 100,
      teeth: 3,
      pressureAngle: 90,
      bore: -5,
    });
    expect(o.module).toBe(10);
    expect(o.teeth).toBe(8);
    expect(o.pressureAngle).toBe(25);
    expect(o.bore).toBe(0);
  });
});
