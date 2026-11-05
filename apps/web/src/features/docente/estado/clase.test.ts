import { EventoValidado } from '@rikuy/contracts';
import { proyectar } from '@rikuy/evidencia';
import { describe, expect, it } from 'vitest';
import { serviciosSimulados } from '../simulacion/receptor.ts';
import { crearAlmacenClase, type AlmacenMemoria } from './clase.ts';

const memoria = (): AlmacenMemoria => {
  let guardado: string | null = null;
  return { leer: () => guardado, escribir: (v) => { guardado = v; } };
};
const nuevo = () => crearAlmacenClase({ ...serviciosSimulados, ahora: (() => { let t = 1_762_300_800_000; return () => (t += 1000); })() }, memoria());

describe('class store', () => {
  it('creates a class with valid, signed, contract-checked events', () => {
    const a = nuevo();
    a.getState().crearClase({ grado: 2, seccion: 'B', lengua: 'es', estudiantes: 12, contexto: null });
    const { eventos } = a.getState();
    expect(eventos.filter((e) => !EventoValidado.safeParse(e).success)).toEqual([]);
    const p = proyectar(eventos);
    expect(p.clase).toMatchObject({ grado: 2, seccion: 'B', abierta: true });
    expect(p.clase?.codigo).toMatch(/^[A-Z0-9]{6}$/);
    expect(p.estudiantes.map((s) => s.alias)).toEqual(Array.from({ length: 12 }, (_, i) => `E${String(i + 1).padStart(2, '0')}`));
  });

  it('keeps the roster pseudonymous: names only go to the local padron, never to events', () => {
    const a = nuevo();
    a.getState().crearClase({ grado: 2, seccion: 'B', lengua: 'es', estudiantes: 2, contexto: null, padron: ['Yeni Quispe', 'Rumi Condori'] });
    expect(JSON.stringify(a.getState().eventos)).not.toMatch(/Yeni|Rumi|Quispe/);
    expect(a.getState().padron).toEqual({ E01: 'Yeni Quispe', E02: 'Rumi Condori' });
  });

  it('ingests events idempotently', () => {
    const a = nuevo();
    a.getState().cargarDemo();
    const n = a.getState().eventos.length;
    const e = a.getState().eventos[3];
    expect(a.getState().ingestar([e, e])).toEqual({ nuevos: 0, ignorados: 2 });
    expect(a.getState().eventos).toHaveLength(n);
  });

  it('refuses to ingest events of another class', () => {
    const a = nuevo();
    a.getState().cargarDemo();
    const ajeno = { ...a.getState().eventos[5], id: '01JC0000000000000000000XX9', claseId: '01JC0000000000000000000C99' };
    expect(a.getState().ingestar([ajeno])).toEqual({ nuevos: 0, ignorados: 1 });
  });

  it('confirms an evidence with a signed teacher event, optionally correcting the level', () => {
    const a = nuevo();
    a.getState().cargarDemo();
    a.getState().recibirGrupoDeEjemplo('Condor');
    const ev = proyectar(a.getState().eventos).evidencias[0].dato;
    a.getState().confirmar(ev.id, 2);
    const ultimo = a.getState().eventos.at(-1)!;
    expect(ultimo.tipo).toBe('evidencia.confirmada');
    expect(EventoValidado.safeParse(ultimo).success).toBe(true);
    expect(proyectar(a.getState().eventos).confirmaciones.at(-1)).toMatchObject({ evidenciaId: ev.id, nivel: 2 });
  });

  it('the tutor kill switch writes a signed event and is reflected in the projection', () => {
    const a = nuevo();
    a.getState().cargarDemo();
    a.getState().setTutor(false);
    expect(a.getState().eventos.at(-1)).toMatchObject({ tipo: 'tutor.interruptor', datos: { activo: false } });
    expect(proyectar(a.getState().eventos).interruptores.tutor).toBe(false);
  });

  it('persists and restores', () => {
    const m = memoria();
    const a = crearAlmacenClase(serviciosSimulados, m);
    a.getState().cargarDemo();
    const b = crearAlmacenClase(serviciosSimulados, m);
    expect(b.getState().eventos).toHaveLength(a.getState().eventos.length);
  });
});
