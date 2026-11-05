import { comparisonTable, createPractice, step, type PracticeAction } from '@rikuy/lab-engine';
import { describe, expect, it } from 'vitest';
import { dictado, leerComparacion, leerTabla } from './audio.ts';

describe('Dicta tu dato', () => {
  it('turns speech into a value with a spoken and written echo to confirm', () => {
    expect(dictado('diez coma tres')).toEqual({ valor: 10.3, eco: 'Escuché 10,3 segundos. ¿Lo guardo?' });
    expect(dictado('catorce punto dos segundos')).toEqual({ valor: 14.2, eco: 'Escuché 14,2 segundos. ¿Lo guardo?' });
  });

  it('refuses what is not a usable time', () => {
    expect(dictado('no sé')).toBeNull();
    expect(dictado('cero')).toBeNull();
    expect(dictado('quinientos mil')).toBeNull();
  });
});

describe('audio-first readings', () => {
  let n = 0;
  const id = () => `01JC000000000000000000${String(++n).padStart(4, '0')}`;
  const ctx = { claseId: id(), grupoId: id(), practicaId: id(), lengua: 'es' as const };
  let s = createPractice({ lengthsM: [0.25, 1], oscillations: 10 }, ctx);
  for (const a of [
    { type: 'predict', text: 'x', entrada: 'teclado' },
    { type: 'measure', lengthM: 0.25, totalTimeS: 10.3, oscillations: 10, source: 'cronometro' },
  ] as PracticeAction[]) {
    const r = step(s, a, id);
    if (r.ok) s = r.value.state;
  }

  it('reads the table row by row', () => {
    expect(leerTabla(s.measurements)).toBe('Tienes 1 medida. 25 centímetros: 1,03 segundos por oscilación.');
    expect(leerTabla([])).toBe('Aún no tienes medidas.');
  });

  it('reads the comparison with the model without jargon', () => {
    const t = leerComparacion(comparisonTable(s));
    expect(t).toContain('25 centímetros: tu dato 1,03 segundos, el modelo 1,00 segundos, error de 3 por ciento');
    expect(t).toContain('100 centímetros: todavía sin dato');
  });
});
