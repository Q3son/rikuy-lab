import { describe, expect, it } from 'vitest';
import { renderFamilia } from './familia.ts';
import { contarPalabras } from './texto.ts';

const A = {
  variante: 'A',
  fechaIni: '2026-11-02',
  fechaFin: '2026-11-06',
  verbo: 'midieron',
  exhibicionCorta: 'un péndulo con una piedra y una cuerda',
  preguntaCasa: '¿de qué depende lo que tarda en ir y volver?',
  lengua: 'quy',
  audioUrl: 'https://rikuy.app/a/pendulo-quy.opus',
  enlaceLigero: 'https://rikuy.app/#/p/abc.1z',
  pictogramas: ['cuerda', 'piedra', 'reloj'],
} as const;

const B = { ...A, variante: 'B', nombre: 'Yeni', linea: { tipo: 'ayudo' } } as const;

describe('family weekly message, variant A (group, no child name)', () => {
  const r = renderFamilia(A);

  it('matches the snapshot in the three shapes', () => {
    expect(r.whatsapp).toMatchSnapshot('whatsapp');
    expect(r.texto).toMatchSnapshot('texto');
    expect(r.html).toMatchSnapshot('html');
    expect(r.asunto).toMatchSnapshot('asunto');
  });

  it('keeps the narrative under 40 words', () => {
    expect(r.palabras).toBeLessThanOrEqual(40);
    expect(r.palabras).toBeGreaterThan(10);
  });

  it('says "su hijo o hija" and never a child name', () => {
    expect(r.whatsapp).toContain('su hijo o hija');
    expect(() => renderFamilia({ ...A, nombre: 'Yeni' })).toThrow();
  });

  it('has the pictograms line, the audio link and the unsubscribe word', () => {
    expect(r.whatsapp).toContain('🧵 🪨 ⏱️');
    expect(r.whatsapp).toContain('https://rikuy.app/a/pendulo-quy.opus');
    expect(r.whatsapp).toMatch(/responda BAJA/);
    expect(r.pictogramas).toEqual(['cuerda', 'piedra', 'reloj']);
  });

  it('builds the audio from pre-recorded blocks of at most 35 seconds', () => {
    expect(r.audio?.bloques.map((b) => b.clave)).toEqual(['fijo.saludo', 'exhibicion', 'pregunta', 'fijo.cierre']);
    expect(r.audio?.totalSegundos).toBeLessThanOrEqual(35);
  });

  it('without a recorded Quechua audio, says so and never offers a synthetic voice', () => {
    const sin = renderFamilia({ ...A, audioUrl: undefined });
    expect(sin.whatsapp).toContain('El audio en quechua llega pronto.');
    expect(sin.audio).toBeNull();
    expect(sin.whatsapp).not.toMatch(/🔊/);
  });

  it('never talks about grades, rankings, comparisons or feelings', () => {
    for (const t of [r.whatsapp, r.texto, r.html]) {
      expect(t).not.toMatch(/\b(AD|B|C)\b/);
      expect(t).not.toMatch(/nota|puntaje|ranking|promedio|mejor que|riesgo|frustr|ansied|tristeza|emoci|no logr|sin evidencia/i);
    }
  });

  it('escapes anything that reaches the HTML', () => {
    const x = renderFamilia({ ...A, preguntaCasa: '¿qué pasa con <b>onclick="x"</b>?' });
    expect(x.html).not.toContain('<b>onclick');
    expect(x.html).toContain('&lt;b&gt;');
  });

  it('rejects a Quechua paragraph that is not reviewed', () => {
    expect(() => renderFamilia({ ...A, parrafoQuechua: { texto: 'texto', revisado: false } })).toThrow();
  });

  it('accepts a reviewed Quechua paragraph', () => {
    const x = renderFamilia({ ...A, parrafoQuechua: { texto: 'Imamanta kay yachay', revisado: true } });
    expect(x.whatsapp).toContain('Imamanta kay yachay');
  });

  it('rejects messages that would break the 40-word promise', () => {
    expect(() => renderFamilia({ ...A, preguntaCasa: 'uno '.repeat(30) })).toThrow();
    expect(() => renderFamilia({ ...A, exhibicionCorta: 'palabra '.repeat(12) })).toThrow();
  });

  it('adds the local sentence from the class context and counts it', () => {
    const x = renderFamilia({ ...A, fraseLocal: 'Falta poco para Yaku Raymi.' });
    expect(x.whatsapp).toContain('Falta poco para Yaku Raymi.');
    expect(x.palabras).toBe((r.palabras ?? 0) + contarPalabras('Falta poco para Yaku Raymi.'));
  });
});

describe('family weekly message, variant B (individual, opt-in)', () => {
  it('names only the first name and one positive line', () => {
    const r = renderFamilia(B);
    expect(r.whatsapp).toContain('Yeni');
    expect(r.whatsapp).toContain('ayudó a otro grupo a entender');
    expect(r.whatsapp).not.toContain('su hijo o hija');
  });

  it('can quote the phrase the student chose to share', () => {
    const r = renderFamilia({ ...B, linea: { tipo: 'frase', texto: 'Si alargo la cuerda, tarda más.' } });
    expect(r.whatsapp).toContain('«Si alargo la cuerda, tarda más.»');
  });

  it('does not accept a second name, a surname or digits in the name', () => {
    expect(() => renderFamilia({ ...B, nombre: 'Yeni Quispe' })).toThrow();
    expect(() => renderFamilia({ ...B, nombre: 'Y3ni' })).toThrow();
  });

  it('matches the snapshot', () => {
    expect(renderFamilia(B).whatsapp).toMatchSnapshot();
  });
});
