/**
 * Collision grid, BFS pathfinding and proximity helpers. Pure and testable in Node (1.3).
 * Pattern credit: AulaQuipu by paoloose (https://github.com/paoloose/aulaquipu,
 * `apps/web-app/lib/campus/map.ts`): boolean collision grid, BFS to the first tile that satisfies a goal,
 * `distToRect` proximity. Reimplemented here (no code copied), with typed arrays and an index queue.
 */
import type { MapaMundo } from './tiled.ts';

export interface Punto {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface Grilla {
  ancho: number;
  alto: number;
  /** 1 = blocked, row-major. */
  bloqueada: Uint8Array;
}

export function crearGrilla(mapa: MapaMundo, extras: readonly Punto[] = []): Grilla {
  const { ancho, alto } = mapa;
  const bloqueada = new Uint8Array(ancho * alto);
  for (let i = 0; i < bloqueada.length; i++) {
    if (mapa.muros[i] !== 0 || mapa.suelo[i] === 0) bloqueada[i] = 1;
  }
  const marcar = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < ancho && y < alto) bloqueada[y * ancho + x] = 1;
  };
  for (const o of mapa.objetos) {
    if (o.props.bloquea !== true) continue;
    for (let y = Math.floor(o.y); y < Math.ceil(o.y + o.alto); y++) {
      for (let x = Math.floor(o.x); x < Math.ceil(o.x + o.ancho); x++) marcar(x, y);
    }
  }
  for (const p of extras) marcar(p.x, p.y);
  return { ancho, alto, bloqueada };
}

export function esLibre(g: Grilla, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= g.ancho || y >= g.alto) return false;
  return g.bloqueada[y * g.ancho + x] === 0;
}

const VECINOS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * Breadth-first search from the tile under `desde` to the first tile where `meta(x, y)` holds.
 * Returns the tile centres to walk (start excluded), [] if already there, or null if unreachable.
 */
export function buscarCamino(g: Grilla, desde: Punto, meta: (x: number, y: number) => boolean): Punto[] | null {
  const sx = Math.floor(desde.x);
  const sy = Math.floor(desde.y);
  const total = g.ancho * g.alto;
  if (sx < 0 || sy < 0 || sx >= g.ancho || sy >= g.alto) return null;
  const previo = new Int32Array(total).fill(-2);
  const cola = new Int32Array(total);
  let cabeza = 0;
  let fin = 0;
  const inicio = sy * g.ancho + sx;
  previo[inicio] = -1;
  cola[fin++] = inicio;
  while (cabeza < fin) {
    const k = cola[cabeza++]!;
    const x = k % g.ancho;
    const y = (k - x) / g.ancho;
    if (meta(x, y)) {
      const camino: Punto[] = [];
      for (let c = k; c !== inicio; c = previo[c]!) {
        camino.push({ x: (c % g.ancho) + 0.5, y: Math.floor(c / g.ancho) + 0.5 });
      }
      return camino.reverse();
    }
    for (const [dx, dy] of VECINOS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!esLibre(g, nx, ny)) continue;
      const nk = ny * g.ancho + nx;
      if (previo[nk] !== -2) continue;
      previo[nk] = k;
      cola[fin++] = nk;
    }
  }
  return null;
}

/** Distance in tiles from a point to a rectangle (0 when inside). */
export function distanciaARect(px: number, py: number, r: Rect): number {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.ancho));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.alto));
  return Math.hypot(dx, dy);
}

/** Path to the nearest free tile whose centre is within `alcance` tiles of `rect`. */
export function caminoHacia(g: Grilla, desde: Punto, rect: Rect, alcance: number): Punto[] | null {
  return buscarCamino(g, desde, (x, y) => distanciaARect(x + 0.5, y + 0.5, rect) <= alcance);
}

/** Moves a point by (dx, dy) in tiles, resolving each axis separately so it slides along walls. */
export function moverConColision(g: Grilla, p: Punto, dx: number, dy: number): Punto {
  let { x, y } = p;
  if (dx !== 0 && esLibre(g, Math.floor(x + dx), Math.floor(y))) x += dx;
  if (dy !== 0 && esLibre(g, Math.floor(x), Math.floor(y + dy))) y += dy;
  return { x, y };
}
