import { describe, expect, it } from 'vitest';
import { K_MIN, celda, suprimirFila } from './index.ts';

describe('cell suppression (k >= 5)', () => {
  it('hides any cell whose base is below 5, including 0 < n < 5, and shows 5 or more', () => {
    expect(K_MIN).toBe(5);
    expect(celda(3, 4)).toEqual({ suprimido: true });
    expect(celda(5, 5)).toEqual({ suprimido: false, valor: 5 });
    expect(celda(0, 0)).toEqual({ suprimido: false, valor: 0 });
  });

  it('an empty cell stays visible as zero (nothing to protect)', () => {
    expect(celda(0, 12)).toEqual({ suprimido: false, valor: 0 });
  });

  it('suppresses a row primary cell and, if only one, a second one so the total cannot reveal it', () => {
    const fila = suprimirFila({ a: 7, b: 3, c: 9 }, 19);
    expect(fila.total).toEqual({ suprimido: false, valor: 19 });
    expect(fila.celdas.b).toEqual({ suprimido: true });
    // a second (the smallest visible) is suppressed as well, otherwise 19 - 7 - 9 = 3
    expect(Object.values(fila.celdas).filter((c) => c.suprimido)).toHaveLength(2);
    expect(fila.celdas.c).toEqual({ suprimido: false, valor: 9 });
  });

  it('with no suppressed cell nothing else is hidden', () => {
    const fila = suprimirFila({ a: 7, b: 6 }, 13);
    expect(Object.values(fila.celdas).every((c) => !c.suprimido)).toBe(true);
  });

  it('a row with a total below 5 is entirely suppressed', () => {
    const fila = suprimirFila({ a: 2, b: 1 }, 3);
    expect(fila.total).toEqual({ suprimido: true });
    expect(Object.values(fila.celdas).every((c) => c.suprimido)).toBe(true);
  });
});
