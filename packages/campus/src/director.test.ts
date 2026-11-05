import { describe, expect, it } from 'vitest';
import { dirigir } from './director.ts';

const base = {
  escenaId: 'vestibulo',
  primeraVisita: false,
  gruposEnSala: 0,
  sinRed: false,
  hoy: { exhibicionId: 'exh-pendulo', salaId: 'sala-fisica', titulo: 'El péndulo', sala: 'Física' },
};

describe('Rikuy scene director (rules, no AI)', () => {
  it('greets on the first visit and points to the door of today’s exhibit', () => {
    const d = dirigir({ ...base, primeraVisita: true });
    expect(d.expresion).toBe('curiosa');
    expect(d.mensaje).toMatch(/Hola/);
    expect(d.mensaje).toMatch(/Física/);
    expect(d.senalar).toBe('puerta-sala-fisica');
  });

  it('inside today’s hall it points to the exhibit itself', () => {
    const d = dirigir({ ...base, escenaId: 'sala-fisica' });
    expect(d.senalar).toBe('exh-exh-pendulo');
    expect(d.mensaje).toMatch(/péndulo/);
  });

  it('counts the other groups inside the hall', () => {
    expect(dirigir({ ...base, escenaId: 'sala-fisica', gruposEnSala: 3 }).mensaje).toMatch(/3 grupos más/);
    expect(dirigir({ ...base, escenaId: 'sala-fisica', gruposEnSala: 1 }).mensaje).toMatch(/1 grupo más/);
  });

  it('asks a question when the group is next to a destination', () => {
    const d = dirigir({ ...base, escenaId: 'sala-fisica', cerca: { id: 'exh-exh-pendulo', etiqueta: 'El péndulo' } });
    expect(d.mensaje).toMatch(/\?/);
    expect(d.senalar).toBeUndefined();
  });

  it('reassures offline with the "sin red" expression', () => {
    const d = dirigir({ ...base, sinRed: true });
    expect(d.expresion).toBe('sin_red');
    expect(d.mensaje).toMatch(/Sin red/);
  });

  it('celebrates a knot without any score', () => {
    const d = dirigir({ ...base, nudoNuevo: true });
    expect(d.expresion).toBe('celebra');
    expect(d.mensaje).not.toMatch(/punto|puntaje|ranking/i);
  });

  it('falls back to a plain prompt when there is no exhibit for today', () => {
    const d = dirigir({ ...base, hoy: undefined });
    expect(d.senalar).toBeUndefined();
    expect(d.mensaje.length).toBeGreaterThan(0);
  });
});
