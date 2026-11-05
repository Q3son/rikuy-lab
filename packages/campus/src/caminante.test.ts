import { describe, expect, it } from 'vitest';
import { avanzar, chunksVisibles, encuadrar } from './caminante.ts';

describe('path walker', () => {
  it('walks along the path at the given speed and consumes reached waypoints', () => {
    const r = avanzar({ x: 0.5, y: 0.5 }, [{ x: 1.5, y: 0.5 }, { x: 1.5, y: 1.5 }], 4, 0.25);
    expect(r.pos).toEqual({ x: 1.5, y: 0.5 });
    expect(r.camino).toEqual([{ x: 1.5, y: 1.5 }]);
    expect(r.dir).toBe(0); // east
  });

  it('stops exactly on the last waypoint', () => {
    const r = avanzar({ x: 0.5, y: 0.5 }, [{ x: 0.5, y: 1.5 }], 4, 1);
    expect(r.pos).toEqual({ x: 0.5, y: 1.5 });
    expect(r.camino).toEqual([]);
    expect(r.dir).toBe(2); // south
  });

  it('does nothing without a path', () => {
    expect(avanzar({ x: 2, y: 2 }, [], 4, 1)).toEqual({ pos: { x: 2, y: 2 }, camino: [], dir: undefined });
  });
});

describe('camera and chunks', () => {
  it('centres the camera on the player and clamps it to the map', () => {
    expect(encuadrar({ x: 10, y: 10 }, { ancho: 30, alto: 22 }, { ancho: 11, alto: 14 })).toEqual({ x: 4.5, y: 3 });
    expect(encuadrar({ x: 1, y: 1 }, { ancho: 30, alto: 22 }, { ancho: 11, alto: 14 })).toEqual({ x: 0, y: 0 });
    // map smaller than the view: centred
    expect(encuadrar({ x: 1, y: 1 }, { ancho: 8, alto: 8 }, { ancho: 11, alto: 14 })).toEqual({ x: -1.5, y: -3 });
  });

  it('lists only the 16x16 chunks that intersect the view', () => {
    expect(chunksVisibles({ x: 0, y: 0 }, { ancho: 11, alto: 14 }, { ancho: 40, alto: 40 })).toEqual([[0, 0]]);
    expect(chunksVisibles({ x: 10, y: 10 }, { ancho: 11, alto: 14 }, { ancho: 40, alto: 40 })).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]);
  });
});
