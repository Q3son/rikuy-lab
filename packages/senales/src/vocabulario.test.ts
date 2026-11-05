import { describe, expect, it } from 'vitest';
import { EmocionAutorreporte } from '@rikuy/contracts';
import { contieneEtiquetaEmocional, afirmarSinEtiquetasEmocionales } from './index.ts';

describe('contieneEtiquetaEmocional', () => {
  it('detects every declared emotion word and common inflections', () => {
    for (const e of EmocionAutorreporte.options) expect(contieneEtiquetaEmocional({ x: e })).toBe(true);
    for (const w of ['triste', 'frustrado', 'ansioso', 'aburrido', 'en riesgo', 'confundido', 'Enojada']) {
      expect(contieneEtiquetaEmocional([w])).toBe(true);
    }
  });
  it('lets pedagogical wording through', () => {
    expect(contieneEtiquetaEmocional({ t: 'Lleva 3 sesiones sin avanzar en la habilidad medir. Pidió hablar con usted.' })).toBe(false);
  });
  it('scans nested keys and values', () => {
    expect(contieneEtiquetaEmocional({ a: [{ frustracion: 1 }] })).toBe(true);
    expect(() => afirmarSinEtiquetasEmocionales({ a: { b: 'se siente triste' } })).toThrow();
  });
  it('skips only the declared verbatim student field', () => {
    expect(contieneEtiquetaEmocional({ textoDelEstudiante: 'estoy triste' })).toBe(false);
    expect(contieneEtiquetaEmocional({ otro: 'estoy triste' })).toBe(true);
  });
});
