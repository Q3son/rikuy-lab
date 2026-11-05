import { describe, expect, it } from 'vitest';
import { buscarCamino, caminoHacia, crearGrilla, distanciaARect, esLibre, moverConColision } from './grilla.ts';
import type { MapaMundo } from './tiled.ts';

/** 6 x 4 map: walls around, an inner wall at x=3 with a gap at y=2. */
function mapaPrueba(): MapaMundo {
  const plano = ['######', '#..#.#', '#....#', '######'];
  const ancho = 6;
  const alto = 4;
  const muros = plano.flatMap((fila) => [...fila].map((c) => (c === '#' ? 5 : 0)));
  return {
    ancho,
    alto,
    tamTile: 16,
    suelo: new Array(ancho * alto).fill(1),
    muros,
    objetos: [{ id: 1, nombre: 'p1', tipo: 'pedestal', x: 1, y: 2, ancho: 1, alto: 1, props: { bloquea: true } }],
  };
}

describe('collision grid', () => {
  it('blocks walls, blocking objects and out-of-bounds tiles', () => {
    const g = crearGrilla(mapaPrueba());
    expect(esLibre(g, 1, 1)).toBe(true);
    expect(esLibre(g, 0, 0)).toBe(false);
    expect(esLibre(g, 3, 1)).toBe(false);
    expect(esLibre(g, 1, 2)).toBe(false); // pedestal
    expect(esLibre(g, -1, 1)).toBe(false);
    expect(esLibre(g, 99, 1)).toBe(false);
  });

  it('can add extra blocked tiles (e.g. a door slot closed by the generator)', () => {
    const g = crearGrilla(mapaPrueba(), [{ x: 2, y: 1 }]);
    expect(esLibre(g, 2, 1)).toBe(false);
  });
});

describe('BFS pathfinding', () => {
  it('finds the shortest 4-connected path through the gap, returning tile centres', () => {
    const g = crearGrilla(mapaPrueba());
    const camino = buscarCamino(g, { x: 1.5, y: 1.5 }, (x, y) => x === 4 && y === 1);
    expect(camino).toEqual([
      { x: 2.5, y: 1.5 },
      { x: 2.5, y: 2.5 },
      { x: 3.5, y: 2.5 },
      { x: 4.5, y: 2.5 },
      { x: 4.5, y: 1.5 },
    ]);
  });

  it('returns an empty path when already at the goal and null when unreachable', () => {
    const g = crearGrilla(mapaPrueba());
    expect(buscarCamino(g, { x: 1.5, y: 1.5 }, (x, y) => x === 1 && y === 1)).toEqual([]);
    expect(buscarCamino(g, { x: 1.5, y: 1.5 }, () => false)).toBeNull();
  });

  it('walks next to a blocking target rectangle within reach', () => {
    const g = crearGrilla(mapaPrueba());
    const camino = caminoHacia(g, { x: 4.5, y: 1.5 }, { x: 1, y: 2, ancho: 1, alto: 1 }, 1);
    expect(camino).not.toBeNull();
    const fin = camino!.at(-1)!;
    expect(distanciaARect(fin.x, fin.y, { x: 1, y: 2, ancho: 1, alto: 1 })).toBeLessThanOrEqual(1);
  });
});

describe('geometry helpers', () => {
  it('distance from a point to a rectangle is 0 inside and euclidean outside', () => {
    const r = { x: 2, y: 2, ancho: 2, alto: 1 };
    expect(distanciaARect(3, 2.5, r)).toBe(0);
    expect(distanciaARect(5, 2.5, r)).toBe(1);
    expect(distanciaARect(5, 5, r)).toBeCloseTo(Math.hypot(1, 2));
  });

  it('moves freely on open tiles and slides along walls', () => {
    const g = crearGrilla(mapaPrueba());
    expect(moverConColision(g, { x: 1.5, y: 1.5 }, 0.5, 0)).toEqual({ x: 2, y: 1.5 });
    // moving up into the outer wall is refused on the y axis but keeps x motion
    const p = moverConColision(g, { x: 2.5, y: 1.5 }, 0.2, -1);
    expect(p.y).toBe(1.5);
    expect(p.x).toBeCloseTo(2.7);
  });
});
