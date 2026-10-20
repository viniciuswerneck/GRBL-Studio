/**
 * **Abas de retenção (tabs) e sobre-corte (lead-in/out)** — módulo puro.
 *
 * Uma peça pequena cortada por inteiro se solta e pode voar, queimar ou sair
 * da posição. As **abas** são trechos do contorno em que o laser desliga: a
 * peça fica presa por “pestanhas” de material que o usuário quebra no fim. O
 * caminho é dividido em N trechos de corte separados por N abas de largura
 * configurada, distribuídas por igual ao longo do perímetro.
 *
 * O **sobre-corte** resolve o “bico” no ponto onde o contorno fecha: o laser
 * continua `lead` mm além da origem do contorno (na mesma direção), então a
 * emenda recebe calor por igual em vez de um ponto duplo de ignição.
 *
 * Tudo em mm e sem arredondar: as coordenadas dos novos pontos são
 * interpoladas sobre o caminho original (mesma precisão do desenho).
 *
 * Puro e testável: sem DOM, sem IPC, sem bundle próprio (entra no `design.js`).
 */

import type { Point } from './design';

/** Limites de sanidade (a UI usa os mesmos). */
export const TAB_MAX_COUNT = 50;
export const TAB_MAX_WIDTH_MM = 20;
export const LEAD_MAX_MM = 5;
/** Espaçamento mínimo entre abas (mm) para o contorno não virar só abas. */
const MIN_CUT_MM = 0.2;

/** Quantidade de abas válida (inteiro 0..50). */
export function sanitizeTabCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(TAB_MAX_COUNT, Math.max(0, Math.floor(value)));
}

/** Largura da aba em mm (0,1..20; padrão 2 mm quando ausente). */
export function sanitizeTabWidth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 2;
  }
  return Math.min(TAB_MAX_WIDTH_MM, Math.max(0.1, value));
}

/** Sobre-corte em mm (0..5). */
export function sanitizeLead(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(LEAD_MAX_MM, value);
}

/** Comprimento do contorno, incluindo a aresta de fechamento. */
export function loopLength(points: ReadonlyArray<Point>): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}

/** Ponto a `distance` mm do início do contorno (dá a volta com módulo). */
function pointAt(
  points: ReadonlyArray<Point>,
  length: number,
  d: number,
): Point {
  if (length <= 0) return { ...points[0] };
  let rest = d % length;
  if (rest < 0) rest += length;
  let acc = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len <= 0) continue;
    if (acc + len >= rest - 1e-12) {
      const t = (rest - acc) / len;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    acc += len;
  }
  return { ...points[0] };
}

/**
 * Amostra o contorno de `d0` a `d1` (0 ≤ d0 ≤ d1 ≤ comprimento), incluindo os
 * vértices intermediários. Os extremos viram pontos exatos do caminho.
 */
function sampleSegment(
  points: ReadonlyArray<Point>,
  length: number,
  d0: number,
  d1: number,
): Point[] {
  if (d1 - d0 < 1e-9) return [pointAt(points, length, d0)];
  const out: Point[] = [pointAt(points, length, d0)];
  let acc = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    acc += len;
    if (acc > d0 + 1e-9 && acc < d1 - 1e-9) out.push({ ...b });
  }
  out.push(pointAt(points, length, d1));
  return dedupe(out);
}

function dedupe(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.hypot(last.x - p.x, last.y - p.y) < 1e-9) continue;
    out.push(p);
  }
  return out;
}

/**
 * Divide um contorno **fechado** em trechos de corte, pulando as abas.
 * Devolve `[]` quando não dá para criar abas (contorno curto demais) — aí o
 * chamador corta o contorno inteiro.
 */
export function splitByTabs(
  points: ReadonlyArray<Point>,
  count: number,
  width: number,
): Point[][] {
  const n0 = sanitizeTabCount(count);
  const w = sanitizeTabWidth(width);
  if (n0 < 1 || points.length < 3) return [];
  const length = loopLength(points);
  if (length <= 0) return [];
  // O contorno precisa de espaço para as abas **e** para os trechos de corte.
  const maxTabs = Math.floor(length / (w + MIN_CUT_MM));
  const n = Math.min(n0, maxTabs);
  if (n < 1) return [];

  // Centros das abas igualmente espaçados; a primeira aba fica no meio do
  // primeiro trecho (as abas nunca caem exatamente sobre um canto inicial).
  const step = length / n;
  const spans: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const center = (i + 0.5) * step;
    spans.push([center - w / 2, center + w / 2]);
  }

  // Os trechos de corte são os complementos das abas; o último atravessa o
  // “zero” do contorno (por isso o `+ length`), e a amostragem trata a volta.
  const cuts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const start = spans[i][1];
    const end = (i + 1 < n ? spans[i + 1][0] : spans[0][0] + length) as number;
    if (end - start > 1e-9) cuts.push([start, end]);
  }

  const out: Point[][] = [];
  for (const [d0, d1] of cuts) {
    const segment =
      d1 <= length
        ? sampleSegment(points, length, d0, d1)
        : [
            ...sampleSegment(points, length, d0, length),
            ...sampleSegment(points, length, 0, d1 - length).slice(1),
          ];
    if (segment.length >= 2) out.push(dedupe(segment));
  }
  return out;
}

/**
 * Pontos do **sobre-corte**: `distance` mm além da origem do contorno, na
 * mesma direção em que o corte começou (sem repetir o ponto inicial).
 */
export function overcutTail(
  points: ReadonlyArray<Point>,
  distance: number,
): Point[] {
  const lead = sanitizeLead(distance);
  if (lead <= 0 || points.length < 3) return [];
  const length = loopLength(points);
  if (length <= 0) return [];
  const d = Math.min(lead, length / 2);
  return sampleSegment(points, length, 0, d).slice(1);
}
