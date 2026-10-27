<script lang="ts">
/**
 * DesignView — Editor vetorial com Biblioteca de Símbolos.
 * Conecta ao backend via IPC (window.grbl.design.*)
 */

import { Button } from './Button.svelte';
import { Select } from './Select.svelte';
import { Card } from './Card.svelte';
import { Badge } from './Badge.svelte';
import { onMount } from 'svelte';

// Types
interface Point { x: number; y: number; }
interface Shape {
  kind: 'line' | 'rect' | 'circle' | 'ellipse' | 'polygon' | 'text';
  closed?: boolean;
  points: Point[];
  layerId?: string;
  powerPct?: number;
  speedMmMin?: number;
  kerfMm?: number;
  kerfSide?: 'inside' | 'outside' | 'center';
  fillRule?: 'nonzero' | 'evenodd';
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: 'start' | 'center' | 'end';
  textMode?: 'vector' | 'stroke' | 'fill';
}

interface LibraryItem {
  id: string;
  nameKey: string;
  category: 'basic' | 'nature' | 'deco';
  paths: Array<{ points: Point[]; closed?: boolean }>;
}

interface LibraryCategory {
  id: 'basic' | 'nature' | 'deco';
  label: string;
  icon: string;
}

// Estado
let shapes = $state<Shape[]>([]);
let selectedShapeIds = $state<Set<string>>(new Set());
let libraryItems = $state<LibraryItem[]>([]);
let activeCategory = $state<'basic' | 'nature' | 'deco'>('basic');
let symbolSizeMm = $state(40);
let isInserting = $state(false);
let canvasScale = $state(1);
let canvasOffset = $state({ x: 0, y: 0 });
let mousePos = $state({ x: 0, y: 0 });
let hoveredShapeId = $state<string | null>(null);
let dragState = $state<{ active: boolean; shapeId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

// Categorias da biblioteca
const CATEGORIES: LibraryCategory[] = [
  { id: 'basic', label: 'Básicas', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { id: 'nature', label: 'Natureza', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z' },
  { id: 'deco', label: 'Decorativas', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.21c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z' }
];

// i18n keys para nomes dos símbolos (fallback para PT)
const SYMBOL_NAMES: Record<string, string> = {
  star5: 'Estrela 5 pontas',
  star6: 'Estrela 6 pontas',
  hexagon: 'Hexágono',
  heart: 'Coração',
  bolt: 'Raio',
  arrow: 'Seta',
  moon: 'Lua',
  sun: 'Sol',
  frame: 'Moldura',
  corners: 'Cantos',
  check: 'Check',
  cross: 'Cruz',
  xmark: 'X',
  divider: 'Divisória'
};

// Carregar biblioteca do backend
async function loadLibrary() {
  try {
    // Tenta via IPC
    if (window.grbl?.design?.getLibrary) {
      const result = await window.grbl.design.getLibrary();
      if (result?.ok && result.items) {
        libraryItems = result.items;
        return;
      }
    }
  } catch (e) {
    console.warn('IPC getLibrary failed, using fallback', e);
  }
  
  // Fallback: usa dados estáticos do shapesLibrary (importa via worker ou fetch)
  try {
    // Como não temos import direto, usamos dados hardcoded baseados no shapesLibrary.ts
    libraryItems = [
      { id: 'star5', nameKey: 'design.lib.star5', category: 'basic', paths: [{ points: makeStar(5, 0.382), closed: true }] },
      { id: 'star6', nameKey: 'design.lib.star6', category: 'basic', paths: [{ points: makeStar(6, 0.55), closed: true }] },
      { id: 'hexagon', nameKey: 'design.lib.hexagon', category: 'basic', paths: [{ points: makePolygon(6, Math.PI/6), closed: true }] },
      { id: 'heart', nameKey: 'design.lib.heart', category: 'basic', paths: [{ points: makeHeart(), closed: true }] },
      { id: 'bolt', nameKey: 'design.lib.bolt', category: 'basic', paths: [{ points: makeBolt(), closed: true }] },
      { id: 'arrow', nameKey: 'design.lib.arrow', category: 'basic', paths: [{ points: makeArrow(), closed: true }] },
      { id: 'moon', nameKey: 'design.lib.moon', category: 'nature', paths: [{ points: makeMoon(), closed: true }] },
      { id: 'sun', nameKey: 'design.lib.sun', category: 'nature', paths: makeSun() },
      { id: 'frame', nameKey: 'design.lib.frame', category: 'deco', paths: [{ points: makeRect(0,0,1,1), closed: true }, { points: makeRect(0.08,0.08,0.92,0.92), closed: true }] },
      { id: 'corners', nameKey: 'design.lib.corners', category: 'deco', paths: makeCorners() },
      { id: 'check', nameKey: 'design.lib.check', category: 'deco', paths: [{ points: makeCheck(), closed: false }] },
      { id: 'cross', nameKey: 'design.lib.cross', category: 'deco', paths: [{ points: makeCross(), closed: true }] },
      { id: 'xmark', nameKey: 'design.lib.xmark', category: 'deco', paths: [{ points: [{x:0.12,y:0.12},{x:0.88,y:0.88}], closed: false }, { points: [{x:0.88,y:0.12},{x:0.12,y:0.88}], closed: false }] },
      { id: 'divider', nameKey: 'design.lib.divider', category: 'deco', paths: [{ points: [{x:0,y:0.5},{x:0.42,y:0.5}], closed: false }, { points: [{x:0.58,y:0.5},{x:1,y:0.5}], closed: false }, { points: [{x:0.5,y:0.38},{x:0.58,y:0.5},{x:0.5,y:0.62},{x:0.42,y:0.5}], closed: true }] }
    ];
  } catch (e) {
    console.error('Failed to load library fallback', e);
  }
}

// Helpers geométricos (copiados de shapesLibrary.ts)
const TAU = Math.PI * 2;
function makePolygon(n: number, rot = 0): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    pts.push({ x: 0.5 + Math.cos(a) * 0.5, y: 0.5 + Math.sin(a) * 0.5 });
  }
  return pts;
}
function makeStar(n: number, inner: number, rot = Math.PI/2): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * TAU;
    const r = i % 2 === 0 ? 0.5 : inner * 0.5;
    pts.push({ x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r });
  }
  return pts;
}
function makeHeart(steps = 72): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * TAU;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    pts.push({ x, y });
  }
  return pts;
}
function makeBolt(): Point[] {
  return [
    { x: 0.62, y: 1 }, { x: 0.18, y: 0.5 }, { x: 0.45, y: 0.5 },
    { x: 0.38, y: 0 }, { x: 0.82, y: 0.52 }, { x: 0.55, y: 0.52 }
  ];
}
function makeArrow(): Point[] {
  return [
    { x: 0, y: 0.35 }, { x: 0.58, y: 0.35 }, { x: 0.58, y: 0.12 },
    { x: 1, y: 0.5 }, { x: 0.58, y: 0.88 }, { x: 0.58, y: 0.65 },
    { x: 0, y: 0.65 }
  ];
}
function makeMoon(): Point[] {
  const outer = arc(0.5, 0.5, 0.5, -Math.PI/2, Math.PI/2, 28);
  const r = Math.hypot(0.22, 0.5);
  const a = Math.atan2(0.5, 0.22);
  const inner = arc(0.28, 0.5, r, a, -a, 28);
  return [...outer, ...inner];
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number, steps = 24): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}
function makeSun() {
  const rays = Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * TAU;
    return { points: [{ x: 0.5 + Math.cos(a)*0.32, y: 0.5 + Math.sin(a)*0.32 }, { x: 0.5 + Math.cos(a)*0.48, y: 0.5 + Math.sin(a)*0.48 }], closed: false };
  });
  return [{ points: circle(0.5, 0.5, 0.22), closed: true }, ...rays];
}
function circle(cx: number, cy: number, r: number, steps = 40): Point[] {
  return arc(cx, cy, r, 0, TAU, steps);
}
function makeRect(x0: number, y0: number, x1: number, y1: number): Point[] {
  return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
}
function makeCorners() {
  return [
    { points: [{ x: 0, y: 0.2 }, { x: 0, y: 0 }, { x: 0.2, y: 0 }], closed: false },
    { points: [{ x: 0.8, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0.2 }], closed: false },
    { points: [{ x: 1, y: 0.8 }, { x: 1, y: 1 }, { x: 0.8, y: 1 }], closed: false },
    { points: [{ x: 0.2, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0.8 }], closed: false }
  ];
}
function makeCheck() {
  return [{ x: 0.12, y: 0.55 }, { x: 0.4, y: 0.22 }, { x: 0.9, y: 0.82 }];
}
function makeCross() {
  return [
    { x: 0.35, y: 0 }, { x: 0.65, y: 0 }, { x: 0.65, y: 0.35 },
    { x: 1, y: 0.35 }, { x: 1, y: 0.65 }, { x: 0.65, y: 0.65 },
    { x: 0.65, y: 1 }, { x: 0.35, y: 1 }, { x: 0.35, y: 0.65 },
    { x: 0, y: 0.65 }, { x: 0, y: 0.35 }, { x: 0.35, y: 0.35 }
  ];
}

// IPC helpers
async function insertSymbol(itemId: string, x: number, y: number) {
  try {
    if (window.grbl?.design?.insertSymbol) {
      const result = await window.grbl.design.insertSymbol({ itemId, x, y, sizeMm: symbolSizeMm });
      if (result?.ok && result.shapes) {
        // Adiciona shapes retornados
        const newIds = result.shapes.map((s: Shape, i: number) => {
          const id = `shape-${Date.now()}-${i}`;
          return { id, ...s };
        });
        for (const s of newIds) {
          shapes = [...shapes, { ...s, id: s.id }];
        }
      }
    } else {
      // Fallback local
      const item = libraryItems.find(i => i.id === itemId);
      if (item) {
        const newShapes = libraryShapesLocal(item, symbolSizeMm, x, y);
        for (const s of newShapes) {
          shapes = [...shapes, { ...s, id: `shape-${Date.now()}-${Math.random()}` }];
        }
      }
    }
  } catch (e) {
    console.error('insertSymbol error', e);
  }
}

// Local libraryShapes implementation
function libraryShapesLocal(item: LibraryItem, sizeMm: number, cx = 0, cy = 0): Shape[] {
  if (!item) return [];
  const bounds = itemBounds(item);
  if (!bounds) return [];
  const size = Math.round(Math.min(Math.max(sizeMm, 5), 400) * 10) / 10;
  const w = Math.max(bounds.maxX - bounds.minX, 1e-9);
  const h = Math.max(bounds.maxY - bounds.minY, 1e-9);
  const scale = size / Math.max(w, h);
  const mx = (bounds.minX + bounds.maxX) / 2;
  const my = (bounds.minY + bounds.maxY) / 2;
  return item.paths.map(path => ({
    kind: 'line' as const,
    closed: Boolean(path.closed),
    points: path.points.map(p => ({
      x: cx + (p.x - mx) * scale,
      y: cy - (p.y - my) * scale // Y invertido para canvas
    }))
  }));
}

function itemBounds(item: LibraryItem) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const path of item.paths) {
    for (const p of path.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

// Canvas interactions
function screenToCanvas(clientX: number, clientY: number) {
  const canvas = canvasRef;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - canvasOffset.x) / canvasScale,
    y: (clientY - rect.top - canvasOffset.y) / canvasScale
  };
}

function handleCanvasClick(e: MouseEvent) {
  if (isInserting) {
    const pos = screenToCanvas(e.clientX, e.clientY);
    // Acha o símbolo selecionado na sidebar (primeiro da categoria ativa)
    const item = libraryItems.find(i => i.category === activeCategory);
    if (item) {
      insertSymbol(item.id, pos.x, pos.y);
      isInserting = false;
    }
    return;
  }
  
  // Seleção de shape
  const pos = screenToCanvas(e.clientX, e.clientY);
  const hit = hitTest(pos.x, pos.y);
  if (e.shiftKey && hit) {
    selectedShapeIds = new Set([...selectedShapeIds, hit]);
  } else if (hit) {
    selectedShapeIds = new Set([hit]);
  } else {
    selectedShapeIds.clear();
  }
}

function handleCanvasMouseDown(e: MouseEvent) {
  const pos = screenToCanvas(e.clientX, e.clientY);
  const hit = hitTest(pos.x, pos.y);
  if (hit) {
    dragState = {
      active: true,
      shapeId: hit,
      startX: e.clientX,
      startY: e.clientY,
      origX: getShapeCenter(hit).x,
      origY: getShapeCenter(hit).y
    };
  }
}

function handleWindowMouseMove(e: MouseEvent) {
  const canvas = canvasRef;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (e.clientX >= rect.left && e.clientX <= rect.right && 
      e.clientY >= rect.top && e.clientY <= rect.bottom) {
    const pos = screenToCanvas(e.clientX, e.clientY);
    mousePos = { x: pos.x.toFixed(2), y: pos.y.toFixed(2) };
    // Hover
    const hit = hitTest(pos.x, pos.y);
    hoveredShapeId = hit;
  }
  
  if (dragState?.active) {
    const dx = (e.clientX - dragState.startX) / canvasScale;
    const dy = (e.clientY - dragState.startY) / canvasScale;
    moveShape(dragState.shapeId, dragState.origX + dx, dragState.origY + dy);
  }
}

function handleWindowMouseUp() {
  dragState = null;
}

function hitTest(x: number, y: number): string | null {
  // Simples: verifica bounding box
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    if (shape.kind === 'line' && shape.points.length > 0) {
      const bounds = getShapeBounds(shape);
      if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
        return shape.id;
      }
    }
  }
  return null;
}

function getShapeBounds(shape: Shape) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of shape.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function getShapeCenter(shapeId: string) {
  const shape = shapes.find(s => s.id === shapeId);
  if (!shape) return { x: 0, y: 0 };
  const bounds = getShapeBounds(shape);
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

function moveShape(shapeId: string, x: number, y: number) {
  const shape = shapes.find(s => s.id === shapeId);
  if (!shape) return;
  const center = getShapeCenter(shapeId);
  const dx = x - center.x;
  const dy = y - center.y;
  shape.points = shape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
  shapes = [...shapes]; // trigger reactivity
}

function deleteSelected() {
  if (selectedShapeIds.size > 0) {
    shapes = shapes.filter(s => !selectedShapeIds.has(s.id));
    selectedShapeIds.clear();
  }
}

// Canvas ref
let canvasRef: HTMLCanvasElement | null = null;

function drawCanvas() {
  const canvas = canvasRef;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  // Clear
  ctx.fillStyle = '#0b131f';
  ctx.fillRect(0, 0, rect.width, rect.height);
  
  // Grid
  drawGrid(ctx, rect);
  
  // Transform
  ctx.save();
  ctx.translate(canvasOffset.x, canvasOffset.y);
  ctx.scale(canvasScale, canvasScale);
  
  // Draw shapes
  for (const shape of shapes) {
    drawShape(ctx, shape, selectedShapeIds.has(shape.id), hoveredShapeId === shape.id);
  }
  
  ctx.restore();
  
  // Coordinates
  ctx.fillStyle = '#6b7b8d';
  ctx.font = '11px var(--font-mono, monospace)';
  ctx.fillText(`X: ${mousePos.x}  Y: ${mousePos.y}`, 10, rect.height - 10);
}

function drawGrid(ctx: CanvasRenderingContext2D, rect: DOMRect) {
  const gridSize = 10 * canvasScale; // 10mm grid
  const offsetX = canvasOffset.x % gridSize;
  const offsetY = canvasOffset.y % gridSize;
  
  ctx.strokeStyle = 'rgba(148,190,255,0.04)';
  ctx.lineWidth = 1;
  
  for (let x = offsetX; x < rect.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rect.height);
    ctx.stroke();
  }
  for (let y = offsetY; y < rect.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(rect.width, y);
    ctx.stroke();
  }
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, selected: boolean, hovered: boolean) {
  if (shape.points.length === 0) return;
  
  const isSelected = selected;
  const isHovered = hovered && !isSelected;
  
  ctx.strokeStyle = isSelected ? '#4cc2ff' : (isHovered ? '#ffd86b' : '#b9d7ee');
  ctx.lineWidth = isSelected ? 2 / canvasScale : 1 / canvasScale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  for (let i = 1; i < shape.points.length; i++) {
    ctx.lineTo(shape.points[i].x, shape.points[i].y);
  }
  if (shape.closed) ctx.closePath();
  ctx.stroke();
  
  // Selection handles
  if (isSelected) {
    const bounds = getShapeBounds(shape);
    ctx.fillStyle = '#4cc2ff';
    const handleSize = 6 / canvasScale;
    [[bounds.minX, bounds.minY], [bounds.maxX, bounds.minY], [bounds.minX, bounds.maxY], [bounds.maxX, bounds.maxY]].forEach(([hx, hy]) => {
      ctx.fillRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
    });
  }
}

// Lifecycle
onMount(() => {
  loadLibrary();
  
  // Render loop
  function render() {
    drawCanvas();
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
  
  // Event listeners
  window.addEventListener('mousemove', handleWindowMouseMove);
  window.addEventListener('mouseup', handleWindowMouseUp);
  
  return () => {
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp);
  };
});

// Keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    deleteSelected();
  }
  if (e.key === 'Escape') {
    isInserting = false;
    selectedShapeIds.clear();
  }
}

// Computed
const filteredItems = $derived(libraryItems.filter(i => i.category === activeCategory));

</script>

<div class="design-view" onkeydown={handleKeyDown}>
  <!-- Toolbar -->
  <header class="design-toolbar">
    <div class="toolbar-group">
      <span class="toolbar-title">Desenhar</span>
      <Badge variant="outline">v0.23.0</Badge>
    </div>
    
    <div class="toolbar-group">
      <label class="toolbar-label">Categoria</label>
      <Select 
        bind:value={activeCategory} 
        options={[
          { value: 'basic', label: 'Básicas' },
          { value: 'nature', label: 'Natureza' },
          { value: 'deco', label: 'Decorativas' }
        ]}
        class="toolbar-select"
      />
    </div>
    
    <div class="toolbar-group">
      <label class="toolbar-label">Tamanho (mm)</label>
      <input 
        type="number" 
        bind:value={symbolSizeMm} 
        min="5" 
        max="400" 
        step="1"
        class="toolbar-input"
        aria-label="Tamanho do símbolo em mm"
      />
    </div>
    
    <div class="toolbar-group">
      <Button 
        variant={isInserting ? 'primary' : 'secondary'} 
        onclick={() => isInserting = !isInserting}
        aria-pressed={isInserting}
      >
        {isInserting ? 'Cancelar inserção' : 'Inserir símbolo'}
      </Button>
    </div>
    
    <div class="toolbar-group toolbar-spacer"></div>
    
    <div class="toolbar-group">
      <Button variant="secondary" onclick={() => { canvasOffset = { x: 0, y: 0 }; canvasScale = 1; }} title="Centralizar (Home)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      </Button>
      <Button variant="secondary" onclick={() => { canvasScale = Math.min(2, canvasScale * 1.2); }} title="Zoom in (+)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h8"/><path d="M12 8v8"/></svg>
      </Button>
      <Button variant="secondary" onclick={() => { canvasScale = Math.max(0.1, canvasScale / 1.2); }} title="Zoom out (-)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h8"/></svg>
      </Button>
    </div>
    
    <div class="toolbar-group">
      <Button variant="danger" onclick={deleteSelected} disabled={selectedShapeIds.size === 0} title="Excluir (Del)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        <span>{selectedShapeIds.size} selecionado(s)</span>
      </Button>
    </div>
  </header>

  <!-- Main content -->
  <div class="design-main">
    <!-- Sidebar: Symbol Library -->
    <aside class="design-sidebar" role="complementary" aria-label="Biblioteca de símbolos">
      <div class="sidebar-header">
        <h3>Biblioteca de Símbolos</h3>
        <p class="sidebar-hint">Clique para inserir no centro • Arraste para posicionar</p>
      </div>
      
      <div class="symbol-grid" role="listbox" aria-label="Símbolos disponíveis">
        {#each filteredItems as item}
          <button
            class="symbol-card {selectedShapeIds.has(item.id) ? 'selected' : ''}"
            role="option"
            aria-selected={false}
            aria-label={SYMBOL_NAMES[item.id] || item.id}
            onclick={() => {
              isInserting = true;
              // O símbolo será inserido no próximo clique no canvas
            }}
            onmouseenter={() => {}}
          >
            <div class="symbol-preview" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {#each item.paths as path}
                  <path 
                    d={pathToD(path.points, path.closed)} 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"
                  />
                {/each}
              </svg>
            </div>
            <span class="symbol-name">{SYMBOL_NAMES[item.id] || item.id}</span>
          </button>
        {/each}
      </div>
    </aside>

    <!-- Canvas area -->
    <main class="design-canvas-area" role="main">
      <div class="canvas-wrapper">
        <canvas 
          bind:this={canvasRef}
          class="design-canvas"
          onclick={handleCanvasClick}
          onmousedown={handleCanvasMouseDown}
          onwheel={(e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            canvasScale = Math.max(0.1, Math.min(5, canvasScale * factor));
          }}
          oncontextmenu={(e) => e.preventDefault()}
        ></canvas>
        
        {#if isInserting}
          <div class="insert-hint">
            Clique no canvas para inserir o símbolo • ESC para cancelar
          </div>
        {/if}
      </div>
      
      <div class="canvas-status">
        <span>Escala: {(canvasScale * 100).toFixed(0)}%</span>
        <span>Formas: {shapes.length}</span>
        <span>X: {mousePos.x}  Y: {mousePos.y}</span>
      </div>
    </main>
  </div>
</div>

<style>
  .design-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 600px;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui, system-ui, sans-serif);
  }

  /* Toolbar */
  .design-toolbar {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .toolbar-title {
    font-weight: 600;
    font-size: var(--fs-16);
    color: var(--text);
  }

  .toolbar-label {
    font-size: var(--fs-13);
    color: var(--text-sub);
    white-space: nowrap;
  }

  .toolbar-select {
    min-width: 140px;
  }

  .toolbar-input {
    width: 80px;
    padding: var(--sp-1) var(--sp-2);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    background: var(--bg);
    color: var(--text);
    font: inherit;
    font-size: var(--fs-13);
  }

  .toolbar-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(76,194,255,0.2);
  }

  .toolbar-spacer {
    flex: 1;
  }

  /* Sidebar */
  .design-main {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  .design-sidebar {
    width: 260px;
    flex-shrink: 0;
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .sidebar-header {
    padding: var(--sp-4);
    border-bottom: 1px solid var(--border);
  }

  .sidebar-header h3 {
    margin: 0 0 var(--sp-1);
    font-size: var(--fs-14);
    font-weight: 600;
  }

  .sidebar-hint {
    margin: 0;
    font-size: var(--fs-12);
    color: var(--text-sub);
    line-height: 1.4;
  }

  .symbol-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--sp-3);
    padding: var(--sp-3);
  }

  .symbol-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-3);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .symbol-card:hover {
    border-color: var(--accent);
    background: rgba(76,194,255,0.05);
  }

  .symbol-card:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(76,194,255,0.3);
  }

  .symbol-preview {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
  }

  .symbol-preview svg {
    width: 100%;
    height: 100%;
  }

  .symbol-name {
    font-size: var(--fs-12);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  /* Canvas area */
  .design-canvas-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    position: relative;
  }

  .canvas-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .design-canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
    touch-action: none;
  }

  .design-canvas:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .insert-hint {
    position: absolute;
    top: var(--sp-4);
    left: 50%;
    transform: translateX(-50%);
    padding: var(--sp-2) var(--sp-4);
    background: var(--accent);
    color: #04111e;
    border-radius: var(--r-full);
    font-weight: 600;
    font-size: var(--fs-13);
    z-index: 10;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .canvas-status {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-2) var(--sp-4);
    background: var(--bg-card);
    border-top: 1px solid var(--border);
    font-size: var(--fs-12);
    color: var(--text-sub);
    font-family: var(--font-mono, monospace);
  }

  /* Helper: pathToD */
  function pathToD(points, closed) {
    if (!points.length) return '';
    let d = `M${points[0].x * 100} ${points[0].y * 100}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L${points[i].x * 100} ${points[i].y * 100}`;
    }
    if (closed) d += ' Z';
    return d;
  }
</style>
</script>