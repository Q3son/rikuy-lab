import type { Exhibicion } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { PLANTILLAS, SALAS_CONTENIDO } from './contenido.ts';
import { generarMuseo } from './generador.ts';
import { buscarCamino, distanciaARect } from './grilla.ts';

const PRACTICA = '01JC0000000000000000000P01';
const exh = (id: string, salaId: string, pedestal = 'p1', extra: Partial<Exhibicion> = {}): Exhibicion => ({
  id,
  salaId,
  practicaId: PRACTICA,
  pedestal,
  recursos: [],
  ...extra,
});
const titulos = { 'exh-pendulo': 'El péndulo', 'exh-caida': 'Caída libre' };

describe('curator gate', () => {
  it('closes the back gallery until the room question is answered', () => {
    const exhs = Array.from({ length: 3 }, (_, i) => exh(`f${i}`, 'sala-fisica', `p${i + 1}`));
    const cerrado = generarMuseo({ salas: SALAS_CONTENIDO, exhibiciones: exhs, plantillas: PLANTILLAS }).salas['sala-fisica']!;
    expect(cerrado.curador).not.toBeNull();
    expect(cerrado.rejaAbierta).toBe(false);
    expect(cerrado.destinos.filter((d) => d.trasReja).map((d) => d.exhibicionId)).toEqual(['f2']);
    const atras = cerrado.destinos.find((d) => d.exhibicionId === 'f2')!;
    expect(buscarCamino(cerrado.grilla, cerrado.aparicion, (x, y) => distanciaARect(x + 0.5, y + 0.5, atras.rect) <= 1.5)).toBeNull();
    const abierto = generarMuseo({ salas: SALAS_CONTENIDO, exhibiciones: exhs, plantillas: PLANTILLAS, rejasAbiertas: new Set(['sala-fisica']) }).salas['sala-fisica']!;
    expect(abierto.destinos.some((d) => d.trasReja)).toBe(false);
  });
});

describe('generarMuseo', () => {
  const museo = generarMuseo({
    salas: SALAS_CONTENIDO,
    exhibiciones: [exh('exh-pendulo', 'sala-fisica'), exh('exh-lactasa', 'sala-biologia')],
    retos: [{ id: 'feria', titulo: 'Feria de Chivay' }],
    titulos,
    plantillas: PLANTILLAS,
  });

  it('opens one vestibule door per hall, routed to the hall, and closes unused slots', () => {
    const puertas = museo.vestibulo.destinos.filter((d) => d.tipo === 'puerta');
    expect(puertas.map((p) => p.destino)).toEqual([
      '/museo/sala-fisica',
      '/museo/sala-biologia',
      '/museo/sala-quimica',
      '/museo/sala-tierra',
      '/museo/sala-taller',
      '/museo/patio',
      '/museo/auditorio',
    ]);
    expect(puertas[0]!.etiqueta).toBe('Física');
    // slot 8 is closed: its tiles are walls again
    const slot8 = museo.vestibulo.mapa.objetos.find((o) => o.nombre === 'puerta-8')!;
    expect(museo.vestibulo.mapa.muros[slot8.y * museo.vestibulo.mapa.ancho + slot8.x]).not.toBe(0);
  });

  it('builds one scene per hall with its exit back to the vestibule', () => {
    expect(Object.keys(museo.salas)).toEqual(SALAS_CONTENIDO.map((s) => s.id));
    const fisica = museo.salas['sala-fisica']!;
    expect(fisica.destinos.find((d) => d.tipo === 'puerta')!.destino).toBe('/museo');
  });

  it('places approved exhibits on pedestals as interactive destinations', () => {
    const fisica = museo.salas['sala-fisica']!;
    const pendulo = fisica.destinos.find((d) => d.exhibicionId === 'exh-pendulo')!;
    expect(pendulo).toMatchObject({ tipo: 'exhibicion', destino: '/exhibicion/exh-pendulo', etiqueta: 'El péndulo' });
    expect(fisica.destinos.filter((d) => d.tipo === 'exhibicion')).toHaveLength(1);
  });

  it('a new approved practice appears as an exhibit without editing any map', () => {
    const conNueva = generarMuseo({
      salas: SALAS_CONTENIDO,
      exhibiciones: [exh('exh-pendulo', 'sala-fisica'), exh('exh-caida', 'sala-fisica', 'p1')],
      titulos,
      plantillas: PLANTILLAS,
    });
    const fisica = conNueva.salas['sala-fisica']!;
    const ids = fisica.destinos.filter((d) => d.tipo === 'exhibicion').map((d) => d.exhibicionId);
    expect(ids).toEqual(['exh-pendulo', 'exh-caida']); // pedestal clash resolved to the next free pedestal
  });

  it('keeps exhibits that do not fit on pedestals in the list (sinPedestal)', () => {
    const muchas = Array.from({ length: 8 }, (_, i) => exh(`e${i}`, 'sala-quimica', `p${i + 1}`));
    const m = generarMuseo({ salas: SALAS_CONTENIDO, exhibiciones: muchas, plantillas: PLANTILLAS });
    expect(m.salas['sala-quimica']!.destinos.filter((d) => d.tipo === 'exhibicion')).toHaveLength(6);
    expect(m.salas['sala-quimica']!.sinPedestal.map((e) => e.id)).toEqual(['e6', 'e7']);
  });

  it('marks quipu-locked exhibits unless the unlock resolver opens them', () => {
    const bloqueada = exh('exh-sorpresa', 'sala-fisica', 'p2', { bloqueadaHasta: 'quipu:5' });
    const cerrado = generarMuseo({ salas: SALAS_CONTENIDO, exhibiciones: [bloqueada], plantillas: PLANTILLAS });
    expect(cerrado.salas['sala-fisica']!.destinos.find((d) => d.exhibicionId === 'exh-sorpresa')!.bloqueada).toBe(
      'quipu:5',
    );
    const abierto = generarMuseo({
      salas: SALAS_CONTENIDO,
      exhibiciones: [bloqueada],
      plantillas: PLANTILLAS,
      desbloqueada: () => true,
    });
    expect(abierto.salas['sala-fisica']!.destinos.find((d) => d.exhibicionId === 'exh-sorpresa')!.bloqueada).toBe(
      undefined,
    );
  });

  it('puts the Patio challenges on its stations, routed to the challenge', () => {
    const patio = museo.salas.patio!;
    expect(patio.destinos.find((d) => d.tipo === 'reto')).toMatchObject({
      retoId: 'feria',
      destino: '/retos/feria',
      etiqueta: 'Feria de Chivay',
    });
  });

  it('every destination of every scene is reachable from the spawn point once the curator gate is open', () => {
    const abierto = generarMuseo({
      salas: SALAS_CONTENIDO,
      exhibiciones: Array.from({ length: 6 }, (_, i) => exh(`f${i}`, 'sala-fisica', `p${i + 1}`)),
      retos: [{ id: 'feria', titulo: 'Feria' }],
      plantillas: PLANTILLAS,
      rejasAbiertas: new Set(SALAS_CONTENIDO.map((s) => s.id)),
    });
    for (const escena of [abierto.vestibulo, ...Object.values(abierto.salas)]) {
      for (const d of escena.destinos) {
        const camino = buscarCamino(escena.grilla, escena.aparicion, (x, y) => distanciaARect(x + 0.5, y + 0.5, d.rect) <= 1.5);
        expect(camino, `${escena.id} → ${d.id}`).not.toBeNull();
      }
    }
  });
});
