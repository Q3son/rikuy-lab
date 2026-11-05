import { describe, expect, it } from 'vitest';
import { esCitaLiteral } from './cita.ts';

const texto = 'Con 100 cm, 10 oscilaciones me dieron 20,9 s. Tarda más porque la cuerda larga recorre más camino.';

describe('esCitaLiteral', () => {
  it('accepts an exact substring', () => {
    expect(esCitaLiteral('Tarda más porque la cuerda larga recorre más camino', texto)).toBe(true);
  });

  it('accepts the whole text', () => {
    expect(esCitaLiteral(texto, texto)).toBe(true);
  });

  it('rejects a paraphrase', () => {
    expect(esCitaLiteral('Tarda mas porque la cuerda es larga', texto)).toBe(false);
  });

  it('is case sensitive and accent sensitive: no silent normalization', () => {
    expect(esCitaLiteral('tarda MÁS', texto)).toBe(false);
    expect(esCitaLiteral('tarda mas', texto)).toBe(false);
  });

  it('does not tolerate rewritten whitespace', () => {
    expect(esCitaLiteral('Con 100 cm,  10 oscilaciones', texto)).toBe(false);
  });

  it('rejects empty or blank quotes', () => {
    expect(esCitaLiteral('', texto)).toBe(false);
    expect(esCitaLiteral('   ', texto)).toBe(false);
  });

  it('rejects ellipsis-joined fragments (they are not a contiguous substring)', () => {
    expect(esCitaLiteral('Con 100 cm… recorre más camino', texto)).toBe(false);
  });
});
