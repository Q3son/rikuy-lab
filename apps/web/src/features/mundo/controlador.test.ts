import { describe, expect, it, vi } from 'vitest';
import { construirMuseo } from './catalogo.ts';
import { ControladorMundo } from './controlador.ts';

describe('world controller', () => {
  it('walks to a destination along the BFS path and reports the arrival once', () => {
    const museo = construirMuseo();
    const llegar = vi.fn();
    const c = new ControladorMundo(museo.vestibulo, llegar);
    expect(c.irA('puerta-sala-fisica')).toBe(true);
    expect(c.camino.length).toBeGreaterThan(0);
    for (let i = 0; i < 200; i++) c.paso(0.1);
    expect(llegar).toHaveBeenCalledTimes(1);
    expect(llegar.mock.calls[0]![0].destino).toBe('/museo/sala-fisica');
    expect(c.camino).toEqual([]);
  });

  it('refuses unknown or locked destinations', () => {
    const museo = construirMuseo();
    const c = new ControladorMundo(museo.vestibulo, () => {});
    expect(c.irA('nada')).toBe(false);
  });

  it('moves with the keyboard, colliding with walls, and cancels a walk', () => {
    const museo = construirMuseo();
    const c = new ControladorMundo(museo.vestibulo, () => {});
    c.irA('puerta-sala-fisica');
    const antes = { ...c.pos };
    c.mover(0, 1, 0.1); // keyboard step south
    expect(c.camino).toEqual([]);
    expect(c.pos.y).toBeGreaterThan(antes.y);
    for (let i = 0; i < 100; i++) c.mover(0, 1, 0.1);
    expect(c.pos.y).toBeLessThan(museo.vestibulo.mapa.alto - 1); // stopped by the wall
  });

  it('knows which destination is near the group', () => {
    const museo = construirMuseo();
    const c = new ControladorMundo(museo.salas['sala-fisica']!, () => {});
    c.irA('exh-exh-pendulo');
    for (let i = 0; i < 200; i++) c.paso(0.1);
    expect(c.cercano()?.id).toBe('exh-exh-pendulo');
  });

  it('opens the nearby destination with the interact key, and nothing when far', () => {
    const museo = construirMuseo();
    const abrir = vi.fn();
    const c = new ControladorMundo(museo.salas['sala-fisica']!, abrir);
    c.camino = [];
    const lejos = c.cercano() ? undefined : c.interactuar();
    expect(lejos).toBeUndefined();
    c.irA('exh-exh-pendulo', { abrir: false });
    for (let i = 0; i < 200; i++) c.paso(0.1);
    expect(abrir).not.toHaveBeenCalled();
    expect(c.interactuar()?.id).toBe('exh-exh-pendulo');
    expect(abrir).toHaveBeenCalledTimes(1);
  });
});
