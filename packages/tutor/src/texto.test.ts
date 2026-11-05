import { describe, expect, it } from 'vitest';
import { buscarFrase, extraerNumeros, palabras, tieneFrase, tienePalabra, tokenizar } from './texto.ts';

describe('palabras', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(palabras('¿Qué PASARÍA si caliento la leche?')).toEqual(['que', 'pasaria', 'si', 'caliento', 'la', 'leche']);
  });
  it('keeps ñ as n and splits on any non-letter', () => {
    expect(palabras('año-escolar (2.º)')).toEqual(['ano', 'escolar', '2']);
  });
});

describe('tokenizar keeps offsets into the ORIGINAL text', () => {
  it('slices back the exact original words', () => {
    const texto = '  ¿Por QUÉ sube?';
    const slices = tokenizar(texto).map((t) => texto.slice(t.ini, t.fin));
    expect(slices).toEqual(['Por', 'QUÉ', 'sube']);
  });
});

describe('tienePalabra / tieneFrase respect word boundaries', () => {
  it('"mas" is not found inside "masa"', () => {
    expect(tienePalabra('la masa no cambia', 'mas')).toBe(false);
    expect(tienePalabra('el periodo es más largo', 'mas')).toBe(true);
  });
  it('matches phrases on whole words only', () => {
    expect(tieneFrase('Quiero ver el hígado', 'ver el')).toBe(true);
    expect(tieneFrase('lleve a la clase', 've a')).toBe(false);
    expect(tieneFrase('debe aumentar', 'be a')).toBe(false);
  });
  it('accepts a trailing * as a word-prefix wildcard', () => {
    expect(tienePalabra('respiramos rapido', 'respir*')).toBe(true);
    expect(tienePalabra('espiral', 'respir*')).toBe(false);
  });
});

describe('buscarFrase', () => {
  it('returns the span of the match in the original text', () => {
    const texto = 'Creo que TARDA más porque sí';
    const m = buscarFrase(tokenizar(texto), 'tarda mas');
    expect(m).not.toBeNull();
    expect(texto.slice(m!.ini, m!.fin)).toBe('TARDA más');
  });
  it('returns null when absent', () => {
    expect(buscarFrase(tokenizar('la masa'), 'mas')).toBeNull();
  });
});

describe('extraerNumeros', () => {
  it('reads integers and decimals with comma or dot', () => {
    expect(extraerNumeros('de 30 a 60 cm, tardó 1,4 s y 0.5 m')).toEqual([30, 60, 1.4, 0.5]);
  });
  it('reads negatives', () => {
    expect(extraerNumeros('bajó a -5 grados')).toEqual([-5]);
  });
  it('returns [] when there is no number', () => {
    expect(extraerNumeros('sin números')).toEqual([]);
  });
});
