import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ErrorMapa, cargarMapaTiled, objetosDeTipo } from './tiled.ts';

const plantilla = (nombre: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../content/museo/plantillas/${nombre}.json`, import.meta.url), 'utf8'));

const mini = {
  type: 'map',
  orientation: 'orthogonal',
  width: 3,
  height: 2,
  tilewidth: 16,
  tileheight: 16,
  layers: [
    { type: 'tilelayer', name: 'suelo', width: 3, height: 2, data: [1, 2, 1, 2, 1, 2] },
    { type: 'tilelayer', name: 'muros', width: 3, height: 2, data: [5, 0, 0, 0, 0, 5] },
    {
      type: 'objectgroup',
      name: 'objetos',
      objects: [
        {
          id: 7,
          name: 'puerta-1',
          type: 'puerta',
          x: 16,
          y: 0,
          width: 32,
          height: 16,
          properties: [{ name: 'destino', type: 'string', value: '/museo/sala-fisica' }],
        },
        { id: 8, name: 'z', class: 'zona', x: 0, y: 0, width: 48, height: 32 },
      ],
    },
  ],
};

describe('cargarMapaTiled', () => {
  it('reads size, tile layers and objects converted to tile units', () => {
    const mapa = cargarMapaTiled(mini);
    expect(mapa.ancho).toBe(3);
    expect(mapa.alto).toBe(2);
    expect(mapa.tamTile).toBe(16);
    expect(mapa.suelo).toEqual([1, 2, 1, 2, 1, 2]);
    expect(mapa.muros).toEqual([5, 0, 0, 0, 0, 5]);
    expect(mapa.objetos[0]).toEqual({
      id: 7,
      nombre: 'puerta-1',
      tipo: 'puerta',
      x: 1,
      y: 0,
      ancho: 2,
      alto: 1,
      props: { destino: '/museo/sala-fisica' },
    });
  });

  it('accepts the Tiled 1.9+ `class` field as the object type', () => {
    expect(objetosDeTipo(cargarMapaTiled(mini), 'zona').map((o) => o.nombre)).toEqual(['z']);
  });

  it('treats a missing walls layer as an open map', () => {
    const sinMuros = { ...mini, layers: mini.layers.filter((l) => l.name !== 'muros') };
    expect(cargarMapaTiled(sinMuros).muros).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('rejects non-orthogonal, infinite or inconsistent maps with a readable error', () => {
    expect(() => cargarMapaTiled({ ...mini, orientation: 'isometric' })).toThrow(ErrorMapa);
    expect(() => cargarMapaTiled({ ...mini, infinite: true })).toThrow(/infinite/);
    const malo = { ...mini, layers: [{ type: 'tilelayer', name: 'suelo', width: 3, height: 2, data: [1, 2] }] };
    expect(() => cargarMapaTiled(malo)).toThrow(/suelo/);
    expect(() => cargarMapaTiled(null)).toThrow(ErrorMapa);
  });

  it('loads every shipped template', () => {
    for (const nombre of ['vestibulo', 'sala-tematica', 'patio', 'auditorio']) {
      const mapa = cargarMapaTiled(plantilla(nombre));
      expect(mapa.suelo.length).toBe(mapa.ancho * mapa.alto);
      expect(objetosDeTipo(mapa, 'puerta').length).toBeGreaterThan(0);
      expect(objetosDeTipo(mapa, 'aparicion').length).toBe(1);
    }
  });
});
