import 'fake-indexeddb/auto';
import { EventoValidado, Practica } from '@rikuy/contracts';
import { createPractice, replay, step, type LabEvent } from '@rikuy/lab-engine';
import { describe, expect, it } from 'vitest';
import { PRACTICA_PENDULO, protocoloPendulo } from '../catalogo.ts';
import { RegistroLab } from './registro.ts';
import { crearSesion, newUlid } from './sesion.ts';

describe('demo pendulum practice', () => {
  it('is a valid approved contract practice with 3 lengths × 10 oscillations', () => {
    const p = Practica.parse(PRACTICA_PENDULO);
    expect(p.estado).toBe('aprobada');
    expect(protocoloPendulo()).toEqual({ lengthsM: [0.25, 0.5, 1], oscillations: 10 });
  });
});

describe('session ids', () => {
  it('generates ULIDs and keeps the session per device', () => {
    expect(newUlid()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const a = crearSesion(storage);
    expect(crearSesion(storage)).toEqual(a);
    expect(a.dispositivo).toHaveLength(10);
  });
});

describe('RegistroLab (event log of the practice, IndexedDB)', () => {
  it('wraps lab records in valid event envelopes with contiguous seq and rebuilds the practice', async () => {
    const sesion = crearSesion(null);
    const ctx = { claseId: sesion.claseId, grupoId: sesion.grupoId, practicaId: PRACTICA_PENDULO.id, lengua: 'es' as const };
    const reg = new RegistroLab(sesion, `test-${Math.random()}`);
    let state = createPractice(protocoloPendulo(), ctx);
    const events: LabEvent[] = [];
    for (const a of [
      { type: 'predict', text: 'Más larga, más tiempo.', entrada: 'teclado' },
      { type: 'measure', lengthM: 0.5, totalTimeS: 14.2, oscillations: 10, source: 'cronometro' },
    ] as const) {
      const r = step(state, a, newUlid);
      if (!r.ok) throw new Error(r.error);
      state = r.value.state;
      events.push(...r.value.events);
    }
    for (const e of events) await reg.agregar(e);

    const sobres = await reg.todos();
    expect(sobres.map((s) => s.seq)).toEqual([1, 2]);
    for (const s of sobres) expect(EventoValidado.safeParse(s).success, JSON.stringify(s)).toBe(true);

    const leidos = await reg.eventosDe(PRACTICA_PENDULO.id);
    expect(replay(protocoloPendulo(), ctx, leidos)).toEqual(state);
  });
});
