import { describe, expect, it } from 'vitest';
import { LARGO_MAXIMO, enmascarar, estanCerca, lectoresCerca, limitarRitmo, prepararMensaje } from './charla.ts';

describe('charla de cerca (ported from AulaQuipu chat-rules)', () => {
  it('masks blocked words, also with accents, capitals and plurals', () => {
    expect(enmascarar('Qué IDIOTAS somos')).toBe('Qué *** somos');
    expect(enmascarar('Estúpido péndulo')).toBe('*** péndulo');
    expect(enmascarar('el péndulo oscila')).toBe('el péndulo oscila');
  });

  it('cleans spaces and control characters', () => {
    expect(prepararMensaje('  hola\n\n  grupo  ')).toEqual({ ok: true, texto: 'hola grupo' });
  });

  it('refuses empty, too long, links, emails and phone numbers', () => {
    expect(prepararMensaje('   ').ok).toBe(false);
    expect(prepararMensaje(42).ok).toBe(false);
    expect(prepararMensaje('a'.repeat(LARGO_MAXIMO + 1)).ok).toBe(false);
    expect(prepararMensaje('miren www.algo.com')).toEqual({ ok: false, motivo: 'No se pueden enviar enlaces ni correos' });
    expect(prepararMensaje('escribe a ana@correo.pe').ok).toBe(false);
    expect(prepararMensaje('llama al 987 654 321')).toEqual({ ok: false, motivo: 'No compartas teléfonos ni datos personales' });
  });

  it('keeps short numbers such as measurements', () => {
    expect(prepararMensaje('medimos 1.42 s en 10 oscilaciones')).toEqual({ ok: true, texto: 'medimos 1.42 s en 10 oscilaciones' });
  });

  it('rate-limits: a pause between messages and a cap per burst', () => {
    const enviados: number[] = [];
    expect(limitarRitmo(enviados, 0)).toBeNull();
    expect(limitarRitmo(enviados, 500)).toMatch(/Espera/);
    for (let t = 2000; t <= 8000; t += 2000) expect(limitarRitmo(enviados, t)).toBeNull();
    expect(limitarRitmo(enviados, 10000)).toMatch(/rápido/);
    expect(limitarRitmo(enviados, 40000)).toBeNull();
  });

  it('is near only in the same hall and within the radius', () => {
    expect(estanCerca({ x: 1, y: 1, salaId: 'a' }, { x: 4, y: 1, salaId: 'a' })).toBe(true);
    expect(estanCerca({ x: 1, y: 1, salaId: 'a' }, { x: 4, y: 1, salaId: 'b' })).toBe(false);
    expect(estanCerca({ x: 1, y: 1, salaId: 'a' }, { x: 9, y: 1, salaId: 'a' })).toBe(false);
  });

  it('lists the readers around the sender, with the receiver tolerance', () => {
    const otros = [
      { id: 'a', x: 3, y: 0 },
      { id: 'b', x: 5, y: 0 },
      { id: 'c', x: 7, y: 0 },
    ];
    expect(lectoresCerca({ x: 0, y: 0 }, otros).map((o) => o.id)).toEqual(['a', 'b']);
  });
});
