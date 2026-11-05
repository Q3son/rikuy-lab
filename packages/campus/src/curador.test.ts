import { describe, expect, it } from 'vitest';
import { CURADORES, preguntaDeSala, responderCurador } from './curador.ts';
import { SALAS_CONTENIDO } from './contenido.ts';

describe('room curator (PixelMAI echo)', () => {
  it('has a room question for every thematic hall', () => {
    for (const s of SALAS_CONTENIDO.filter((x) => x.plantilla === 'sala-tematica')) {
      const p = preguntaDeSala(s.id);
      expect(p, s.id).toBeDefined();
      expect(p!.pregunta).toMatch(/\?$/);
      expect(p!.opciones.length).toBeGreaterThanOrEqual(3);
    }
    expect(CURADORES.every((c) => c.opciones.some((o) => /no sé/i.test(o.texto)))).toBe(true);
  });

  it('opens the gate with any honest answer and replies with a question (no answer key)', () => {
    const p = preguntaDeSala('sala-fisica')!;
    for (let i = 0; i < p.opciones.length; i++) {
      const r = responderCurador('sala-fisica', i);
      expect(r).toMatchObject({ abre: true });
      expect(r!.mensaje).toMatch(/\?/);
    }
    expect(JSON.stringify(CURADORES)).not.toMatch(/correcta/);
  });

  it('ignores unknown halls or options', () => {
    expect(responderCurador('patio', 0)).toBeNull();
    expect(responderCurador('sala-fisica', 99)).toBeNull();
  });
});
