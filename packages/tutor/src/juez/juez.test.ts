import { Evidencia } from '@rikuy/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { agregarCorridas } from './agregar.ts';
import { sanitizarCita, ubicarCita } from './cita.ts';
import { conclusionCoherente, contrastarPrediccion } from './conclusion.ts';
import { construirEvidencia } from './evidencia.ts';
import { juzgarConModelo } from './modelo.ts';
import { construirPromptJuez } from './prompt.ts';
import { juzgarConReglas, juzgarRespuesta } from './reglas.ts';
import type { ContextoJuez, DatoMedido, ModeloJuez, SolicitudJuez } from './tipos.ts';

const ctx: ContextoJuez = {
  variables: [{ id: 'longitud', etiqueta: 'Longitud de la cuerda' }, { id: 'masa', etiqueta: 'Masa' }],
  variableProbada: 'longitud',
  conceptos: ['distancia', 'recorrido', 'gravedad', 'oscilacion'],
};

/** The group's own data: longer string -> longer period (each x with 3 repetitions). */
const periodo = (l: number) => 2 * Math.PI * Math.sqrt(l / 9.8);
const datosDirectos: DatoMedido[] = [0.3, 0.6, 0.9].flatMap((x) => [0, 1, 2].map((k) => ({ x, y: Number((periodo(x) + k * 0.01).toFixed(2)) })));
const datosInversos: DatoMedido[] = [0.3, 0.6, 0.9].flatMap((x) => [{ x, y: Number((3 - x * 2).toFixed(2)) }]);
const datosPlanos: DatoMedido[] = [0.3, 0.6, 0.9].flatMap((x) => [{ x, y: 1.5 }, { x, y: 1.51 }]);

describe('quotes are literal (gate: a quote is always a substring of the answer)', () => {
  it('ubicarCita finds the exact slice even if case or accents differ', () => {
    const resp = 'Creo que ES más LEJOS porque estaba oscuro';
    const sitio = ubicarCita('es mas lejos', resp);
    expect(sitio).not.toBeNull();
    expect(resp.slice(sitio!.ini, sitio!.fin)).toBe('ES más LEJOS');
  });
  it('sanitizarCita returns the student words, or the whole answer when the model invents', () => {
    expect(sanitizarCita('es mas lejos', 'Creo que ES más LEJOS')).toBe('ES más LEJOS');
    expect(sanitizarCita('inventado por el modelo', 'la cuerda es larga')).toBe('la cuerda es larga');
    expect(sanitizarCita('', 'la cuerda es larga')).toBe('la cuerda es larga');
  });
  it('property: for ANY answer and ANY proposed quote the result is a substring of the answer', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 120 }), fc.string({ maxLength: 40 }), (respuesta, cita) => {
        expect(respuesta.includes(sanitizarCita(cita, respuesta))).toBe(true);
      }),
    );
  });
  it('property: a quote taken from the answer is returned as that same text', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 80 }), fc.nat(), fc.nat(), (respuesta, a, b) => {
        const i = a % respuesta.length;
        const j = i + 1 + (b % (respuesta.length - i));
        const cita = respuesta.slice(i, j);
        if (cita.trim() === '') return;
        expect(respuesta.includes(sanitizarCita(cita, respuesta))).toBe(true);
      }),
    );
  });
  it('every rule verdict quotes literally from the answer', () => {
    const textos = [
      'Si alargo la cuerda el péndulo va a tardar más porque recorre más distancia',
      'la masa no cambia nada',
      '¿qué?',
      'No sé',
      'MIS DATOS dicen que con 0,6 m tarda 1,55 s y con 0,9 m tarda 1,9 s',
    ];
    for (const t of textos) {
      for (const momento of ['prediccion', 'justificacion', 'conclusion'] as const) {
        for (const v of juzgarRespuesta(momento, t, ctx, datosDirectos)) {
          expect(t.includes(v.cita), `${momento}/${v.indicador}: "${v.cita}"`).toBe(true);
        }
      }
    }
  });
});

describe('agregarCorridas (3 runs, median, "dudoso" on disagreement) - ported from Educacion', () => {
  it('all agree -> ok', () => {
    expect(agregarCorridas([{ nivel: 2, cita: 'a' }, { nivel: 2, cita: 'a' }, { nivel: 2, cita: 'a' }])).toMatchObject({ nivel: 2, estado: 'ok' });
  });
  it('disagreement -> dudoso with the median level', () => {
    expect(agregarCorridas([{ nivel: 2, cita: '' }, { nivel: 3, cita: '' }, { nivel: 2, cita: '' }])).toMatchObject({ nivel: 2, estado: 'dudoso' });
    expect(agregarCorridas([{ nivel: 1, cita: '' }, { nivel: 3, cita: '' }, { nivel: 2, cita: '' }])).toMatchObject({ nivel: 2, estado: 'dudoso' });
  });
  it('"NO" is kept apart from 0 and is "no_observable"', () => {
    expect(agregarCorridas([{ nivel: 'NO', cita: '' }, { nivel: 'NO', cita: '' }, { nivel: 'NO', cita: '' }])).toMatchObject({ nivel: 'NO', estado: 'no_observable' });
    expect(agregarCorridas([{ nivel: 0, cita: 'x' }, { nivel: 0, cita: 'x' }, { nivel: 0, cita: 'x' }]).estado).toBe('ok');
  });
  it('keeps the quote of a run that has the chosen level', () => {
    expect(agregarCorridas([{ nivel: 1, cita: 'uno' }, { nivel: 2, cita: 'dos' }, { nivel: 3, cita: 'tres' }]).cita).toBe('dos');
  });
});

describe('rule judge: inquiry indicators', () => {
  const v = (momento: Parameters<typeof juzgarRespuesta>[0], texto: string, indicador: string, datos: DatoMedido[] = datosDirectos) =>
    juzgarRespuesta(momento, texto, ctx, datos).find((x) => x.indicador === indicador)!;

  it('empty or "¿qué?" is NO (not assessable), never 0; "no sé" is 0', () => {
    for (const t of ['', '   ', '¿qué?', '¿otra vez?']) {
      const r = juzgarRespuesta('prediccion', t, ctx, datosDirectos);
      expect(r.every((x) => x.nivel === 'NO' && x.estado === 'no_observable'), t).toBe(true);
    }
    expect(v('prediccion', 'No sé', 'prediccion')).toMatchObject({ nivel: 0, estado: 'ok' });
  });

  it('variable: names the tested variable, holds others fixed', () => {
    expect(v('prediccion', 'Voy a ver qué pasa', 'variable').nivel).toBe(0);
    expect(v('prediccion', 'La temperatura cambia todo', 'variable').nivel).toBe(1); // a factor, but not of this practice
    expect(v('prediccion', 'Cambiar la cuerda', 'variable').nivel).toBe(2);
    expect(v('prediccion', 'Cambio solo la longitud y dejo la masa igual', 'variable').nivel).toBe(3);
  });

  it('prediction: none / vague effect / direction / direction + variable + condition', () => {
    expect(v('prediccion', 'La cuerda es verde', 'prediccion').nivel).toBe(0);
    expect(v('prediccion', 'La cuerda influye', 'prediccion').nivel).toBe(1);
    expect(v('prediccion', 'Tardará más', 'prediccion').nivel).toBe(2);
    expect(v('prediccion', 'Si alargo la cuerda el péndulo tarda más', 'prediccion').nivel).toBe(3);
  });

  it('prediction: "la masa" is a variable, never a "más" prediction', () => {
    expect(v('prediccion', 'La masa del péndulo es de 200 gramos', 'prediccion').nivel).toBe(0);
  });

  it('justification: a bare "porque sí" is not a reason; a concept makes it level 3', () => {
    expect(v('prediccion', 'Tarda más porque sí', 'justificacion').nivel).toBe(0);
    expect(v('prediccion', 'Tarda más porque pesa', 'justificacion').nivel).toBe(1);
    expect(v('prediccion', 'Tarda más porque la cuerda es larga', 'justificacion').nivel).toBe(2);
    expect(v('prediccion', 'Tarda más porque recorre más distancia', 'justificacion').nivel).toBe(3);
  });

  it('use of the data: vague / a number of their own / two numbers', () => {
    expect(v('conclusion', 'La cuerda larga tarda más', 'uso_del_dato').nivel).toBe(0);
    expect(v('conclusion', 'Según lo que medimos tarda más', 'uso_del_dato').nivel).toBe(1);
    expect(v('conclusion', 'Con 0,9 m tardó 1,9 s', 'uso_del_dato').nivel).toBe(2);
    expect(v('conclusion', 'Con 0,3 m tardó 1,1 s y con 0,9 m tardó 1,9 s', 'uso_del_dato').nivel).toBe(3);
  });

  it('use of the data is NO when the group has no measurements', () => {
    expect(v('conclusion', 'Con 0,9 m tardó 1,9 s', 'uso_del_dato', [])).toMatchObject({ nivel: 'NO', estado: 'no_observable' });
  });

  it('juzgarConReglas judges every requested indicator with source "reglas"', () => {
    const out = juzgarConReglas({ indicador: 'prediccion', respuesta: 'Tardará más', contexto: ctx, datos: datosDirectos });
    expect(out.fuente).toBe('reglas');
    expect(out.indicador).toBe('prediccion');
  });
});

describe('conclusion_coherente against the group own data (not against a text)', () => {
  const c = (texto: string, datos: DatoMedido[]) => conclusionCoherente(texto, ctx, datos);

  it('matching a direct relation scores 2, and 3 when it cites the data', () => {
    expect(c('A mayor longitud mayor periodo', datosDirectos).nivel).toBe(2);
    expect(c('Mientras más largo es el hilo más se demora', datosDirectos).nivel).toBe(2);
    expect(c('A mayor longitud mayor periodo, con 0,3 m dio 1,1 s y con 0,9 m dio 1,9 s', datosDirectos).nivel).toBe(3);
  });
  it('the same words are INCOHERENT when the group data say the opposite', () => {
    expect(c('A mayor longitud mayor periodo', datosInversos).nivel).toBe(0);
    expect(c('A mayor longitud menor periodo', datosInversos).nivel).toBe(2);
  });
  it('"no changes" is coherent only with flat data', () => {
    expect(c('La longitud no cambia el periodo', datosPlanos).nivel).toBe(2);
    expect(c('La longitud no cambia el periodo', datosDirectos).nivel).toBe(0);
    expect(c('Si alargo la cuerda tarda más', datosPlanos).nivel).toBe(0);
  });
  it('a claim about another variable cannot be judged with this data -> NO', () => {
    expect(c('La masa no cambia el periodo', datosDirectos)).toMatchObject({ nivel: 'NO', estado: 'no_observable' });
  });
  it('without enough data or without a claim it is NO or 1, never a guess', () => {
    expect(c('A mayor longitud mayor periodo', []).nivel).toBe('NO');
    expect(c('A mayor longitud mayor periodo', [{ x: 0.3, y: 1.1 }]).nivel).toBe('NO');
    expect(c('Fue divertido medir', datosDirectos).nivel).toBe(1);
    expect(c('¿qué?', datosDirectos).nivel).toBe('NO');
  });
  it('the quote is a substring of the conclusion', () => {
    const t = 'Pienso que, a mayor longitud, mayor periodo. Fin.';
    expect(t.includes(c(t, datosDirectos).cita)).toBe(true);
  });
  it('contrastarPrediccion reuses the same comparison for the memory projection', () => {
    expect(contrastarPrediccion('Si alargo la cuerda tarda más', ctx, datosDirectos)).toBe('confirma');
    expect(contrastarPrediccion('Si alargo la cuerda tarda más', ctx, datosInversos)).toBe('contradice');
    expect(contrastarPrediccion('Tardará más', ctx, [])).toBe('indeterminado');
    expect(contrastarPrediccion('Hola', ctx, datosDirectos)).toBe('indeterminado');
  });
});

describe('LLM judge behind ModeloJuez: 3 runs, literal quotes, rules as floor', () => {
  const solicitud: SolicitudJuez = { indicador: 'prediccion', respuesta: 'Si alargo la cuerda tarda más', contexto: ctx, datos: datosDirectos };
  const modelo = (respuestas: Array<{ nivel: 0 | 1 | 2 | 3 | 'NO'; cita: string } | 'fallo'>): ModeloJuez => {
    let i = 0;
    return {
      fuente: 'ia-local',
      async juzgar() {
        const r = respuestas[i++ % respuestas.length]!;
        return r === 'fallo' ? { ok: false, error: { tipo: 'timeout', detalle: 'lento' } } : { ok: true, valor: r };
      },
    };
  };

  it('aggregates three runs and marks the source', async () => {
    const v = await juzgarConModelo(modelo([{ nivel: 3, cita: 'tarda más' }, { nivel: 3, cita: 'tarda más' }, { nivel: 3, cita: 'tarda más' }]), solicitud);
    expect(v).toMatchObject({ nivel: 3, estado: 'ok', fuente: 'ia-local', cita: 'tarda más' });
    expect(v.corridas).toEqual(['3', '3', '3']);
  });
  it('disagreement is "dudoso" for the teacher', async () => {
    const v = await juzgarConModelo(modelo([{ nivel: 2, cita: 'tarda más' }, { nivel: 3, cita: 'tarda más' }, { nivel: 2, cita: 'tarda más' }]), solicitud);
    expect(v).toMatchObject({ nivel: 2, estado: 'dudoso' });
  });
  it('a run whose quote is not in the answer does not count; too few valid runs -> rules', async () => {
    const v = await juzgarConModelo(modelo([{ nivel: 3, cita: 'texto inventado' }, { nivel: 3, cita: 'otro invento' }, { nivel: 3, cita: 'tarda más' }]), solicitud);
    expect(v.fuente).toBe('reglas');
    expect(solicitud.respuesta.includes(v.cita)).toBe(true);
  });
  it('model failures fall back to the rules (the classroom is never left hanging)', async () => {
    const v = await juzgarConModelo(modelo(['fallo']), solicitud);
    expect(v.fuente).toBe('reglas');
    expect(v.nivel).toBe(3);
  });
  it('quote tolerance: the model may change case/accents, the verdict still quotes the student text', async () => {
    const v = await juzgarConModelo(modelo([{ nivel: 3, cita: 'TARDA MAS' }]), solicitud);
    expect(v.cita).toBe('tarda más');
  });
});

describe('prompt for the LLM judge (rubric-anchored)', () => {
  it('includes every level, at least two examples per level, and the literal-quote rule', () => {
    const p = construirPromptJuez({ indicador: 'prediccion', respuesta: 'Tardará más', contexto: ctx, datos: [] });
    for (const l of ['0', '1', '2', '3', 'NO']) expect(p.system).toContain(`Nivel ${l}`);
    expect((p.system.match(/Ejemplo:/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect(p.system).toMatch(/copiada exactamente/);
    expect(p.user).toContain('Tardará más');
  });
  it('forbids inferring emotions or judging the way of speaking', () => {
    const p = construirPromptJuez({ indicador: 'variable', respuesta: 'x', contexto: ctx, datos: [] });
    expect(p.system).toMatch(/no infieres emociones/);
  });
});

describe('evidence for the contract', () => {
  it('builds a valid Evidencia (nivel, cita, fuente, estado)', () => {
    const [veredicto] = juzgarRespuesta('prediccion', 'Si alargo la cuerda tarda más', ctx, datosDirectos);
    const e = construirEvidencia(veredicto!, {
      id: '01JC0000000000000000000V01',
      respuestaId: '01JC0000000000000000000R01',
      grupoId: '01JC0000000000000000000G01',
      claseId: '01JC0000000000000000000C01',
      desempeno: { competencia: 1, desempeno: 1 },
    });
    expect(Evidencia.safeParse(e).success).toBe(true);
    expect(e.confirmadaPorDocente).toBe(false);
  });
});
