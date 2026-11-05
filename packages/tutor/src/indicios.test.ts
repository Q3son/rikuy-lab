import { describe, expect, it } from 'vitest';
import { CORPUS } from './corpus.ts';
import { analizarRazonamiento } from './indicios.ts';

const INDICADORES = ['variable', 'prediccion', 'justificacion'] as const;

describe('labelled corpus gate (5.4 F4)', () => {
  it('has at least 60 sentences, each unique', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(CORPUS.map((c) => c.texto)).size).toBe(CORPUS.length);
  });

  it.each(INDICADORES)('agrees with the labels on %s in at least 80% of the sentences', (indicador) => {
    const fallos = CORPUS.filter((c) => analizarRazonamiento(c.texto)[indicador] !== c[indicador]);
    const acuerdo = 1 - fallos.length / CORPUS.length;
    if (acuerdo < 0.8) console.log(indicador, fallos.map((x) => x.texto));
    expect(acuerdo).toBeGreaterThanOrEqual(0.8);
  });

  it('never reads "masa" as "más" (0 false positives)', () => {
    const conMasa = CORPUS.filter((c) => /\bmasa\b/i.test(c.texto) && !/\bm[aá]s\b/i.test(c.texto));
    expect(conMasa.length).toBeGreaterThanOrEqual(6);
    for (const c of conMasa) {
      const r = analizarRazonamiento(c.texto);
      expect(r.indicios.prediccion, c.texto).not.toContain('mas');
      // a prediction may only be found if the label says so (never a phantom one from "masa")
      expect(r.prediccion && !c.prediccion, c.texto).toBe(false);
    }
  });
});

describe('analizarRazonamiento', () => {
  it('"la masa" alone is a variable but not a prediction', () => {
    expect(analizarRazonamiento('La masa del péndulo es de 200 gramos')).toMatchObject({ variable: true, prediccion: false });
  });
  it('still reads a real comparative "más"', () => {
    expect(analizarRazonamiento('Con más masa tarda más').indicios.prediccion).toContain('mas');
  });
  it('ignores "nada más", "no más" and "más o menos"', () => {
    for (const t of ['Nada más cambié la cuerda', 'No más cambiamos eso', 'Medí más o menos 2 s']) {
      expect(analizarRazonamiento(t).prediccion, t).toBe(false);
    }
  });
  it('does not count a question "por qué" as a justification, but "por que" in a statement yes', () => {
    expect(analizarRazonamiento('¿Por qué tarda más?').justificacion).toBe(false);
    expect(analizarRazonamiento('Tarda más por que la cuerda es larga').justificacion).toBe(true);
  });
  it('does not count "voy a"/"vamos a" intentions as predictions', () => {
    expect(analizarRazonamiento('Vamos a probar con la cuerda').prediccion).toBe(false);
    expect(analizarRazonamiento('Va a tardar más').prediccion).toBe(true);
  });
  it('reports the matched evidence for each indicator', () => {
    const r = analizarRazonamiento('Si alargo la cuerda tarda más porque recorre más');
    expect(r.indicios.variable).toContain('alargo');
    expect(r.indicios.justificacion).toContain('porque');
  });
  it('exposes literal spans of the matches for quoting', () => {
    const t = 'Si alargo la cuerda tarda MÁS porque sí';
    const r = analizarRazonamiento(t);
    for (const span of [...r.spans.variable, ...r.spans.prediccion, ...r.spans.justificacion]) {
      expect(t.slice(span.ini, span.fin).length).toBeGreaterThan(0);
    }
  });
});
