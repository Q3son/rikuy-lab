import { describe, expect, it } from 'vitest';
import { citaLiteral, desempenoTexto, ubicarCita } from './cita.ts';
import { subconjunto } from './datos.ts';
import type { DesempenoRef } from '@rikuy/contracts';

const CITA_LACTASA = 'Propone procedimientos para observar, manipular la variable independiente, medir la variable dependiente y controlar la variable interviniente.';

function referencia(overrides: Partial<DesempenoRef> = {}): DesempenoRef {
  return {
    nivel: 'secundaria',
    grado: 2,
    area: 'ciencia-y-tecnologia',
    competencia: 1,
    desempeno: 2,
    cita: CITA_LACTASA,
    ...overrides,
  };
}

describe('ubicarCita', () => {
  it('locates an exact performance text with its level, grade, competency and performance numbers', () => {
    const hallazgos = ubicarCita(CITA_LACTASA);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toMatchObject({ nivel: 'secundaria', grado: 2, competencia: 1, desempeno: 2 });
    expect(hallazgos[0]?.inicio).toBeGreaterThanOrEqual(0);
  });

  it('accepts a literal substring of a performance text', () => {
    const hallazgos = ubicarCita('Propone procedimientos para observar, manipular la variable independiente');
    // The same wording appears in more than one grade, so every official location comes back.
    expect(hallazgos.some((h) => h.nivel === 'secundaria' && h.grado === 2 && h.competencia === 1 && h.desempeno === 2)).toBe(true);
  });

  it('rejects a paraphrase, even with one word changed', () => {
    expect(ubicarCita('Propone procedimientos para observar, manipular la variable independiente, medir la variable dependiente y controlar las variables intervinientes.')).toEqual([]);
  });

  it('is case sensitive', () => {
    expect(ubicarCita(CITA_LACTASA.toLowerCase())).toEqual([]);
  });

  it('is whitespace exact', () => {
    expect(ubicarCita(CITA_LACTASA.replace(', medir', ',  medir'))).toEqual([]);
  });

  it('rejects citations shorter than 20 characters, even when they are substrings', () => {
    expect(ubicarCita('Propone')).toEqual([]);
    expect(ubicarCita('')).toEqual([]);
  });

  it('locates every performance in the subset by its own text (no performance is unlocatable)', () => {
    for (const grado of subconjunto.grados) {
      for (const competencia of grado.competencias) {
        competencia.desempenos.forEach((texto, i) => {
          const propio = ubicarCita(texto).find(
            (h) => h.nivel === grado.nivel && h.grado === grado.grado && h.competencia === competencia.numero && h.desempeno === i + 1,
          );
          expect(propio, `${grado.id} C${competencia.numero} D${i + 1}`).toBeDefined();
        });
      }
    }
  });
});

describe('desempenoTexto', () => {
  it('returns the official text of a numbered performance', () => {
    expect(desempenoTexto('secundaria', 2, 1, 2)?.startsWith(CITA_LACTASA)).toBe(true);
  });

  it('returns undefined for an unknown grade, competency or performance', () => {
    expect(desempenoTexto('secundaria', 6, 1, 1)).toBeUndefined();
    expect(desempenoTexto('secundaria', 2, 9, 1)).toBeUndefined();
    expect(desempenoTexto('secundaria', 2, 1, 99)).toBeUndefined();
  });
});

describe('citaLiteral', () => {
  it('accepts a reference whose quote is the exact text of the declared performance', () => {
    expect(citaLiteral(referencia())).toBe(true);
  });

  it('accepts a literal substring of the declared performance', () => {
    expect(citaLiteral(referencia({ cita: 'controlar la variable interviniente.' }))).toBe(true);
  });

  it('rejects a quote that is not in the declared performance', () => {
    expect(citaLiteral(referencia({ cita: 'Formula preguntas acerca de las variables que influyen en un hecho.' }))).toBe(false);
  });

  it('rejects a wrong competency number even when the quote exists elsewhere', () => {
    expect(citaLiteral(referencia({ competencia: 2 }))).toBe(false);
  });

  it('rejects a wrong performance number, grade or level', () => {
    expect(citaLiteral(referencia({ desempeno: 3 }))).toBe(false);
    expect(citaLiteral(referencia({ grado: 3 }))).toBe(false);
    expect(citaLiteral(referencia({ nivel: 'primaria' }))).toBe(false);
  });

  it('rejects a quote shorter than the 20 character minimum', () => {
    expect(citaLiteral(referencia({ cita: 'interviniente.' }))).toBe(false);
    expect(citaLiteral(referencia({ cita: 'controlar la variable' }))).toBe(true);
  });

  it('rejects a reference to an area other than science and technology', () => {
    expect(citaLiteral({ ...referencia(), area: 'matematica' } as unknown as DesempenoRef)).toBe(false);
  });
});
