/**
 * Importação de **SVG** → G-code de contorno.
 *
 * O GRBL Studio não tem editor vetorial próprio; este módulo permite abrir
 * um `.svg` (Inkscape, Illustrator, etc.) e convertê-lo em G-code de contorno
 * (G0/G1), reaproveitando o pipeline de envio/preview do app. Curvas
 * (Bézier cúbica/quadrática e arcos) são amostradas em polilinhas.
 *
 * Escopo v1: `<path>` (M/L/H/V/C/Q/Z) + `<rect>`, `<circle>`, `<ellipse>`,
 * `<line>`, `<polyline>`, `<polygon>`. Atributos de transformação básicos
 * (translate/scale) são aplicados; grupos aninhados e CSS não são resolvidos.
 */

export interface SvgPoint {
  x: number;
  y: number;
}

export interface SvgContour {
  points: SvgPoint[];
  closed: boolean;
}

export interface SvgDocument {
  width: number;
  height: number;
  contours: SvgContour[];
}

export interface SvgToGcodeOptions {
  feed: number; // mm/min para G1
  travelFeed: number; // mm/min para G0
  scale: number; // fator de escala (1 = unidades do SVG em mm)
  flipY: boolean; // inverte Y (SVG é y-down)
  samples: number; // amostras por curva (mínimo)
}

const DEFAULT_OPTS: SvgToGcodeOptions = {
  feed: 1000,
  travelFeed: 3000,
  scale: 1,
  flipY: true,
  samples: 12,
};

function num(v: string | null): number {
  if (v === null) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function parseNumbers(s: string): number[] {
  const m = s.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  return m ? m.map((v) => parseFloat(v)) : [];
}

/** Amostra uma Bézier cúbica em `n` pontos (excluindo o ponto inicial). */
function sampleCubic(
  p0: SvgPoint,
  p1: SvgPoint,
  p2: SvgPoint,
  p3: SvgPoint,
  n: number,
): SvgPoint[] {
  const out: SvgPoint[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x =
      u * u * u * p0.x +
      3 * u * u * t * p1.x +
      3 * u * t * t * p2.x +
      t * t * t * p3.x;
    const y =
      u * u * u * p0.y +
      3 * u * u * t * p1.y +
      3 * u * t * t * p2.y +
      t * t * t * p3.y;
    out.push({ x, y });
  }
  return out;
}

/** Amostra uma Bézier quadrática em `n` pontos. */
function sampleQuad(
  p0: SvgPoint,
  p1: SvgPoint,
  p2: SvgPoint,
  n: number,
): SvgPoint[] {
  const out: SvgPoint[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
    const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
    out.push({ x, y });
  }
  return out;
}

/** Amostra um arco elíptico (rx, ry) rotacionado. Simplificado: linear em θ. */
function sampleArc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startAngle: number,
  endAngle: number,
  n: number,
): SvgPoint[] {
  const out: SvgPoint[] = [];
  for (let i = 1; i <= n; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / n);
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return out;
}

/** Parseia o atributo `d` de um <path>. */
function parsePathD(d: string): SvgContour[] {
  const contours: SvgContour[] = [];
  let current: SvgPoint[] = [];
  let x = 0,
    y = 0;
  let startX = 0,
    startY = 0;
  let closed = false;

  const tokens =
    d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) ?? [];
  for (const tok of tokens) {
    const cmd = tok[0];
    const nums = parseNumbers(tok.slice(1));
    const rel = cmd === cmd.toLowerCase() && cmd !== 'z' && cmd !== 'Z';
    switch (cmd) {
      case 'M':
      case 'm': {
        if (current.length > 0) {
          contours.push({ points: current, closed });
          current = [];
          closed = false;
        }
        for (let i = 0; i < nums.length; i += 2) {
          const nx = rel ? x + nums[i] : nums[i];
          const ny = rel ? y + nums[i + 1] : nums[i + 1];
          if (i === 0) {
            x = nx;
            y = ny;
            startX = x;
            startY = y;
            current.push({ x, y });
          } else {
            x = nx;
            y = ny;
            current.push({ x, y });
          }
        }
        break;
      }
      case 'L':
      case 'l': {
        for (let i = 0; i < nums.length; i += 2) {
          x = rel ? x + nums[i] : nums[i];
          y = rel ? y + nums[i + 1] : nums[i + 1];
          current.push({ x, y });
        }
        break;
      }
      case 'H':
      case 'h': {
        for (const v of nums) {
          x = rel ? x + v : v;
          current.push({ x, y });
        }
        break;
      }
      case 'V':
      case 'v': {
        for (const v of nums) {
          y = rel ? y + v : v;
          current.push({ x, y });
        }
        break;
      }
      case 'C':
      case 'c': {
        for (let i = 0; i < nums.length; i += 6) {
          const x1 = rel ? x + nums[i] : nums[i];
          const y1 = rel ? y + nums[i + 1] : nums[i + 1];
          const x2 = rel ? x + nums[i + 2] : nums[i + 2];
          const y2 = rel ? y + nums[i + 3] : nums[i + 3];
          const x3 = rel ? x + nums[i + 4] : nums[i + 4];
          const y3 = rel ? y + nums[i + 5] : nums[i + 5];
          const pts = sampleCubic(
            { x, y },
            { x: x1, y: y1 },
            { x: x2, y: y2 },
            { x: x3, y: y3 },
            12,
          );
          current.push(...pts);
          x = x3;
          y = y3;
        }
        break;
      }
      case 'Q':
      case 'q': {
        for (let i = 0; i < nums.length; i += 4) {
          const x1 = rel ? x + nums[i] : nums[i];
          const y1 = rel ? y + nums[i + 1] : nums[i + 1];
          const x2 = rel ? x + nums[i + 2] : nums[i + 2];
          const y2 = rel ? y + nums[i + 3] : nums[i + 3];
          const pts = sampleQuad(
            { x, y },
            { x: x1, y: y1 },
            { x: x2, y: y2 },
            12,
          );
          current.push(...pts);
          x = x2;
          y = y2;
        }
        break;
      }
      case 'A':
      case 'a': {
        // Arco elíptico: aproxima por segmentos lineares (amostragem).
        for (let i = 0; i < nums.length; i += 7) {
          const rx = Math.abs(nums[i]);
          const ry = Math.abs(nums[i + 1]);
          const xRot = nums[i + 2];
          const largeArc = nums[i + 3];
          const sweep = nums[i + 4];
          const ex = rel ? x + nums[i + 5] : nums[i + 5];
          const ey = rel ? y + nums[i + 6] : nums[i + 6];
          // Conversão simplificada: amostra N pontos ao longo da corda.
          const n = 16;
          for (let k = 1; k <= n; k++) {
            const t = k / n;
            current.push({ x: x + (ex - x) * t, y: y + (ey - y) * t });
          }
          x = ex;
          y = ey;
          void rx;
          void ry;
          void xRot;
          void largeArc;
          void sweep;
        }
        break;
      }
      case 'Z':
      case 'z': {
        if (current.length > 0) {
          current.push({ x: startX, y: startY });
          closed = true;
        }
        break;
      }
      default:
        break;
    }
  }

  if (current.length > 0) contours.push({ points: current, closed });
  return contours;
}

function parseTransform(s: string | null): {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
} {
  const out = { sx: 1, sy: 1, tx: 0, ty: 0 };
  if (!s) return out;
  const t = s.match(/translate\(([^)]+)\)/);
  if (t) {
    const n = parseNumbers(t[1]);
    out.tx += n[0] ?? 0;
    out.ty += n[1] ?? 0;
  }
  const sc = s.match(/scale\(([^)]+)\)/);
  if (sc) {
    const n = parseNumbers(sc[1]);
    out.sx *= n[0] ?? 1;
    out.sy *= n[1] ?? n[0] ?? 1;
  }
  return out;
}

function applyTransform(
  p: SvgPoint,
  tr: { sx: number; sy: number; tx: number; ty: number },
): SvgPoint {
  return { x: p.x * tr.sx + tr.tx, y: p.y * tr.sy + tr.ty };
}

/** Parseia um documento SVG em contornos (sem DOMParser — funciona em Node e browser). */
export function parseSvg(text: string): SvgDocument {
  const svgTagMatch = text.match(/<svg\b[^>]*>/i);
  const svgTag = svgTagMatch ? svgTagMatch[0] : '';
  const vbMatch = svgTag.match(/viewBox\s*=\s*"([^"]*)"/i);
  const vb = vbMatch ? vbMatch[1].split(/[\s,]+/).map(Number) : [];
  const widthAttr = svgTag.match(/\bwidth\s*=\s*"([^"]*)"/i)?.[1];
  const heightAttr = svgTag.match(/\bheight\s*=\s*"([^"]*)"/i)?.[1];
  const width = vb.length >= 4 ? vb[2] : num(widthAttr ?? '100');
  const height = vb.length >= 4 ? vb[3] : num(heightAttr ?? '100');
  const offsetX = vb.length >= 4 ? vb[0] : 0;
  const offsetY = vb.length >= 4 ? vb[1] : 0;

  const contours: SvgContour[] = [];

  function attrs(tag: string): Record<string, string> {
    const out: Record<string, string> = {};
    const re = /([\w-]+)\s*=\s*"([^"]*)"/g;
    let m = re.exec(tag);
    while (m !== null) {
      out[m[1]] = m[2];
      m = re.exec(tag);
    }
    return out;
  }

  function handleLeaf(
    tagName: string,
    a: Record<string, string>,
    tr: { sx: number; sy: number; tx: number; ty: number },
  ) {
    const tag = tagName.toLowerCase();
    if (tag === 'path' && a.d) {
      for (const cont of parsePathD(a.d)) {
        contours.push({
          points: cont.points.map((p) => applyTransform(p, tr)),
          closed: cont.closed,
        });
      }
      return;
    }
    if (tag === 'rect') {
      const x = num(a.x);
      const y = num(a.y);
      const w = num(a.width);
      const h = num(a.height);
      const rx = num(a.rx) || num(a.ry);
      const ry = num(a.ry) || rx;
      const r = Math.min(rx, ry, w / 2, h / 2);
      const pts: SvgPoint[] = [];
      if (r <= 0) {
        pts.push(
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
          { x, y },
        );
      } else {
        const n = 6;
        pts.push({ x: x + r, y });
        pts.push({ x: x + w - r, y });
        for (let i = 1; i <= n; i++) {
          const ang = -Math.PI / 2 + (Math.PI / 2) * (i / n);
          pts.push({
            x: x + w - r + r * Math.cos(ang),
            y: y + r + r * Math.sin(ang),
          });
        }
        pts.push({ x: x + w, y: y + r });
        pts.push({ x: x + w, y: y + h - r });
        for (let i = 1; i <= n; i++) {
          const ang = 0 + (Math.PI / 2) * (i / n);
          pts.push({
            x: x + w - r + r * Math.cos(ang),
            y: y + h - r + r * Math.sin(ang),
          });
        }
        pts.push({ x: x + w - r, y: y + h });
        pts.push({ x: x + r, y: y + h });
        for (let i = 1; i <= n; i++) {
          const ang = Math.PI / 2 + (Math.PI / 2) * (i / n);
          pts.push({
            x: x + r + r * Math.cos(ang),
            y: y + h - r + r * Math.sin(ang),
          });
        }
        pts.push({ x, y: y + h - r });
        pts.push({ x, y: y + r });
        for (let i = 1; i <= n; i++) {
          const ang = Math.PI + (Math.PI / 2) * (i / n);
          pts.push({
            x: x + r + r * Math.cos(ang),
            y: y + r + r * Math.sin(ang),
          });
        }
        pts.push({ x: x + r, y });
      }
      contours.push({
        points: pts.map((p) => applyTransform(p, tr)),
        closed: true,
      });
      return;
    }
    if (tag === 'circle') {
      const cx = num(a.cx);
      const cy = num(a.cy);
      const r = num(a.r);
      const pts = sampleArc(cx, cy, r, r, 0, Math.PI * 2, 24);
      pts.unshift({ x: cx + r, y: cy });
      contours.push({
        points: pts.map((p) => applyTransform(p, tr)),
        closed: true,
      });
      return;
    }
    if (tag === 'ellipse') {
      const cx = num(a.cx);
      const cy = num(a.cy);
      const rx = num(a.rx);
      const ry = num(a.ry);
      const pts = sampleArc(cx, cy, rx, ry, 0, Math.PI * 2, 24);
      pts.unshift({ x: cx + rx, y: cy });
      contours.push({
        points: pts.map((p) => applyTransform(p, tr)),
        closed: true,
      });
      return;
    }
    if (tag === 'line') {
      const x1 = num(a.x1);
      const y1 = num(a.y1);
      const x2 = num(a.x2);
      const y2 = num(a.y2);
      contours.push({
        points: [
          { x: x1, y: y1 },
          { x: x2, y: y2 },
        ].map((p) => applyTransform(p, tr)),
        closed: false,
      });
      return;
    }
    if (tag === 'polyline' || tag === 'polygon') {
      const nums = parseNumbers(a.points ?? '');
      const pts: SvgPoint[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2)
        pts.push({ x: nums[i], y: nums[i + 1] });
      contours.push({
        points: pts.map((p) => applyTransform(p, tr)),
        closed: tag === 'polygon',
      });
      return;
    }
  }

  // Tokeniza e percorre, mantendo pilha de transform (para <g>).
  const stack: { sx: number; sy: number; tx: number; ty: number }[] = [
    { sx: 1, sy: 1, tx: -offsetX, ty: -offsetY },
  ];
  const tokens = text.match(/<\/?[a-zA-Z][^>]*>/g) ?? [];
  let skipDepth = 0;
  for (const tok of tokens) {
    if (skipDepth > 0) {
      if (tok.startsWith('</')) {
        const name = tok
          .slice(2)
          .replace(/[^a-zA-Z].*/, '')
          .toLowerCase();
        if (name === 'defs' || name === 'style' || name === 'script')
          skipDepth--;
      }
      continue;
    }
    if (tok.startsWith('</')) {
      const name = tok
        .slice(2)
        .replace(/[^a-zA-Z].*/, '')
        .toLowerCase();
      if (name === 'g' && stack.length > 1) stack.pop();
      continue;
    }
    const nameMatch = tok.match(/^<([a-zA-Z][\w-]*)/);
    const name = nameMatch ? nameMatch[1].toLowerCase() : '';
    if (!name) continue;
    if (
      name === 'defs' ||
      name === 'style' ||
      name === 'script' ||
      name === 'title' ||
      name === 'desc' ||
      name === 'metadata'
    ) {
      skipDepth++;
      continue;
    }
    const a = attrs(tok);
    if (name === 'g') {
      const tr = parseTransform(a.transform ?? null);
      const parent = stack[stack.length - 1];
      const c = {
        sx: parent.sx * tr.sx,
        sy: parent.sy * tr.sy,
        tx: parent.tx + parent.sx * tr.tx,
        ty: parent.ty + parent.sy * tr.ty,
      };
      stack.push(c);
      continue;
    }
    if (name === 'svg') continue;
    const tr = stack[stack.length - 1];
    handleLeaf(name, a, tr);
  }

  // Normaliza: desloca para que min x/y = 0.
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const cont of contours) {
    for (const p of cont.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (!Number.isFinite(minX) || contours.length === 0) {
    return {
      width: width > 0 ? width : 100,
      height: height > 0 ? height : 100,
      contours: [],
    };
  }
  for (const cont of contours) {
    for (const p of cont.points) {
      p.x -= minX;
      p.y -= minY;
    }
  }
  const w = maxX - minX;
  const h = maxY - minY;
  return { width: w > 0 ? w : width, height: h > 0 ? h : height, contours };
}

/** Converte um documento SVG em G-code de contorno. */
export function svgToGcode(
  doc: SvgDocument,
  opts: Partial<SvgToGcodeOptions> = {},
): string {
  const o = { ...DEFAULT_OPTS, ...opts };
  const lines: string[] = [];
  lines.push('; GRBL Studio — importação SVG');
  lines.push(
    `; ${doc.contours.length} contorno(s), ${doc.width.toFixed(2)} x ${doc.height.toFixed(2)} mm`,
  );
  lines.push('G21');
  lines.push('G90');
  lines.push('G94');
  lines.push('M5');

  const flip = o.flipY ? -1 : 1;
  const oy = o.flipY ? doc.height : 0;

  const fmt = (v: number) => v.toFixed(3);

  for (const cont of doc.contours) {
    if (cont.points.length === 0) continue;
    const pts = cont.points.map((p) => ({
      x: p.x * o.scale,
      y: (oy + p.y * flip) * o.scale,
    }));
    // Deslocamento até o início (laser desligado).
    lines.push(`G0 X${fmt(pts[0].x)} Y${fmt(pts[0].y)} F${o.travelFeed}`);
    for (let i = 1; i < pts.length; i++) {
      lines.push(`G1 X${fmt(pts[i].x)} Y${fmt(pts[i].y)} F${o.feed}`);
    }
    if (cont.closed && pts.length > 2) {
      lines.push(`G1 X${fmt(pts[0].x)} Y${fmt(pts[0].y)} F${o.feed}`);
    }
  }

  lines.push('M5');
  lines.push('G0 X0 Y0');
  lines.push('');
  return lines.join('\n');
}

/** Atalho: texto SVG → G-code. */
export function svgTextToGcode(
  text: string,
  opts: Partial<SvgToGcodeOptions> = {},
): string {
  return svgToGcode(parseSvg(text), opts);
}
