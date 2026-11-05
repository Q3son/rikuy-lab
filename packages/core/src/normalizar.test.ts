import { describe, expect, it } from 'vitest';
import { containsWord, normalizar, tokens } from './normalizar.ts';

describe('normalizar', () => {
  it('lowercases, strips accents and collapses punctuation and spaces', () => {
    expect(normalizar('  ¿Qué  PASARÍA si caliento la leche?! ')).toBe('que pasaria si caliento la leche');
  });

  it('keeps ñ distinct from n (año is not ano)', () => {
    expect(normalizar('AÑO Niño')).toBe('año niño');
  });

  it('turns numbers with comma decimals into a single token', () => {
    expect(tokens('mide 0,5 m y 1.25 s')).toEqual(['mide', '0,5', 'm', 'y', '1.25', 's']);
  });

  it('is idempotent', () => {
    const s = 'Él dijo: "¡Más rápido!"';
    expect(normalizar(normalizar(s))).toBe(normalizar(s));
  });
});

describe('containsWord (word boundaries)', () => {
  it('matches "más" only as a whole word, never inside "masa"', () => {
    expect(containsWord('la masa del péndulo', 'más')).toBe(false);
    expect(containsWord('oscila más rápido', 'mas')).toBe(true);
  });

  it('matches multi-word phrases on boundaries', () => {
    expect(containsWord('Si aumento la longitud, el periodo crece', 'la longitud')).toBe(true);
    expect(containsWord('la longitudinal', 'la longitud')).toBe(false);
  });

  it('an empty needle never matches', () => {
    expect(containsWord('algo', '  ')).toBe(false);
  });
});
