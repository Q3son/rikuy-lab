import { Comando } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { ModeloTutorSimulado } from './tutorMock.ts';

describe('ModeloTutorSimulado (mock of the F4 port)', () => {
  const tutor = new ModeloTutorSimulado();

  it.each([
    { momento: 'prediccion' as const, texto: 'Si alargo la cuerda tarda más' },
    { momento: 'medicion' as const, longitudM: 0.5 },
    { momento: 'comparacion' as const, errorMedio: 0.04 },
    { momento: 'comparacion' as const, errorMedio: 0.25 },
    { momento: 'conclusion' as const, texto: 'Con 1 m tardó más' },
  ])('answers %o with a question, honest source and valid commands', async (entrada) => {
    const r = await tutor.responder(entrada);
    expect(r.fuente).toBe('reglas');
    expect(r.texto).toMatch(/\?/);
    expect(r.texto).not.toMatch(/\d/); // never reveals a numeric value
    for (const c of r.comandos) expect(Comando.safeParse(c).success).toBe(true);
  });

  it('moves the hologram to the length being measured', async () => {
    const r = await tutor.responder({ momento: 'medicion', longitudM: 1 });
    expect(r.comandos).toContainEqual({ tool: 'fijar_variable', args: { variable: 'longitud', valor: 1 } });
  });
});
