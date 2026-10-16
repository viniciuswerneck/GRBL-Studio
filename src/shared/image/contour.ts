/**
 * Traçado de contornos (RF-IMG-6): máscara binária -> polígonos fechados.
 *
 * Método: para cada pixel de matéria (1) são emitidas as arestas do seu
 * quadrado cujo vizinho **não** é matéria (borda). As arestas são dirigidas
 * (matéria sempre à esquerda) e encadeadas em laços fechados.
 *
 * Canto de sela (dois pixels de matéria na diagonal): o vértice tem 2 saídas
 * possíveis; escolhe-se a que vira à esquerda em relação à aresta de entrada
 * (`cross(entrada, saída) > 0`). Isso mantém cada ilhote no seu próprio laço
 * (quadrado de matéria nunca "furava" o fundo vizinho pelo canto).
 *
 * Coordenadas: canto de pixel em unidades inteiras — pixel (x, y) ocupa o
 * quadrado [x, x+1] × [y, y+1]; (0,0) = canto superior esquerdo.
 */

export interface PixelPoint {
  x: number;
  y: number;
}

/** Polígono fechado em coordenadas de canto de pixel (o fecho é implícito). */
export type Contour = PixelPoint[];

// Direções: 0 = direita, 1 = baixo, 2 = esquerda, 3 = cima.
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

/**
 * Traça todos os contornos da máscara (1 = matéria).
 * Cada aresta de borda é usada exatamente uma vez; o laço sempre fecha.
 */
export function traceContours(
  mask: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): Contour[] {
  if (width <= 0 || height <= 0) throw new Error('Dimensão de máscara inválida.');
  if (mask.length < width * height) throw new Error('Máscara incompatível com as dimensões.');

  const material = (x: number, y: number): boolean =>
    x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x] !== 0;

  // Chave única do vértice (x varia 0..width, y varia 0..height).
  const key = (x: number, y: number): number => y * (width + 1) + x;

  const edges = new Map<number, number[]>();
  const add = (x: number, y: number, dir: number): void => {
    const k = key(x, y);
    let list = edges.get(k);
    if (!list) {
      list = [];
      edges.set(k, list);
    }
    list.push(dir);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 0) continue;
      // Vizinhança 4: vizinho de matéria compartilha a aresta (não é borda).
      if (!material(x, y - 1)) add(x, y, 0); // topo: (x,y) -> (x+1,y)
      if (!material(x + 1, y)) add(x + 1, y, 1); // direita: (x+1,y) -> (x+1,y+1)
      if (!material(x, y + 1)) add(x + 1, y + 1, 2); // base: (x+1,y+1) -> (x,y+1)
      if (!material(x - 1, y)) add(x, y + 1, 3); // esquerda: (x,y+1) -> (x,y)
    }
  }

  const contours: Contour[] = [];
  for (const [k, list] of edges) {
    while (list.length > 0) {
      const startDir = list.pop()!;
      const sx = k % (width + 1);
      const sy = (k - sx) / (width + 1);

      const contour: Contour = [{ x: sx, y: sy }];
      let cx = sx + DX[startDir]!;
      let cy = sy + DY[startDir]!;
      let dir = startDir;

      while (cx !== sx || cy !== sy) {
        contour.push({ x: cx, y: cy });
        const next = edges.get(key(cx, cy));
        if (!next || next.length === 0) {
          throw new Error('Falha ao traçar o contorno (máscara inconsistente).');
        }
        dir = pickDirection(next, dir);
        next.splice(next.indexOf(dir), 1); // dirs são únicos por vértice
        cx += DX[dir]!;
        cy += DY[dir]!;
      }

      if (contour.length >= 3) contours.push(contour);
    }
  }
  return contours;
}

/**
 * Escolhe a aresta de saída: com 1 candidata é inevitável; com 2 (sela) vira
 * à esquerda da aresta de entrada — nunca empate (candidatas são perpendiculares).
 */
function pickDirection(candidates: number[], inDir: number): number {
  if (candidates.length === 1) return candidates[0]!;
  const ix = DX[inDir]!;
  const iy = DY[inDir]!;
  for (const dir of candidates) {
    if (ix * DY[dir]! - iy * DX[dir]! > 0) return dir;
  }
  return candidates[0]!; // inalcançável (defensivo)
}

/** Área do polígono (fórmula do trapézio/sapato), em px². Sempre >= 0. */
export function polygonArea(contour: Contour): number {
  let sum = 0;
  const n = contour.length;
  for (let i = 0; i < n; i++) {
    const a = contour[i]!;
    const b = contour[(i + 1) % n]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Simplificação de Ramer–Douglas–Peucker sobre o laço aberto (primeiro ponto
 * fixo). Remove o degrau de 1 px das bordas: o laser corta na diagonal, não
 * no pixel. `epsilonPx` em pixels da imagem (0 = mantém tudo).
 */
export function simplifyContour(contour: Contour, epsilonPx: number): Contour {
  const n = contour.length;
  if (n < 4 || !Number.isFinite(epsilonPx) || epsilonPx <= 0) return contour.slice();

  const pts: PixelPoint[] = [...contour, contour[0]!]; // fecha explicitamente
  const keep = new Array<boolean>(pts.length).fill(false);
  keep[0] = true;
  keep[pts.length - 1] = true;

  const stack: Array<[number, number]> = [[0, pts.length - 1]];
  while (stack.length > 0) {
    const [s, e] = stack.pop()!;
    if (e - s < 2) continue;

    let maxDist = -1;
    let maxIdx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = pointSegmentDistance(pts[i]!, pts[s]!, pts[e]!);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxIdx >= 0 && maxDist > epsilonPx) {
      keep[maxIdx] = true;
      stack.push([s, maxIdx], [maxIdx, e]);
    }
  }

  const out: Contour = [];
  for (let i = 0; i < pts.length - 1; i++) if (keep[i]) out.push(pts[i]!);
  return out;
}

/** Distância de um ponto ao segmento [a, b]. */
function pointSegmentDistance(p: PixelPoint, a: PixelPoint, b: PixelPoint): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return Math.hypot(wx, wy);
  let t = (wx * vx + wy * vy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return Math.hypot(wx - t * vx, wy - t * vy);
}
