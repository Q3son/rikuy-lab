import { describe, expect, it } from 'vitest';
import { CATALOGOS, validarCatalogo } from './catalogos.ts';

describe('shipped catalogs', () => {
  it('ships es, quy and ayr', () => {
    expect(Object.keys(CATALOGOS).sort()).toEqual(['ayr', 'es', 'quy']);
  });

  it('validates with no errors', () => {
    for (const [codigo, catalogo] of Object.entries(CATALOGOS)) {
      expect(validarCatalogo(codigo, catalogo), codigo).toEqual([]);
    }
  });

  it('has a Spanish key for every key in Quechua and Aymara (the es catalog is the reference)', () => {
    const claves = new Set(Object.keys(CATALOGOS.es));
    for (const codigo of ['quy', 'ayr'] as const) {
      const faltantes = Object.keys(CATALOGOS[codigo]).filter((c) => !claves.has(c));
      expect(faltantes, codigo).toEqual([]);
    }
  });

  it('keeps Quechua and Aymara as pending placeholders: no invented translation text', () => {
    for (const codigo of ['quy', 'ayr'] as const) {
      for (const [clave, entrada] of Object.entries(CATALOGOS[codigo])) {
        expect(entrada.texto, `${codigo}:${clave}`).toBe('');
        expect(entrada.revisado, `${codigo}:${clave}`).toBe(false);
        expect(entrada.revisor, `${codigo}:${clave}`).toBeNull();
      }
    }
  });

  it('gives every Spanish entry a variety and a text', () => {
    for (const [clave, entrada] of Object.entries(CATALOGOS.es)) {
      expect(entrada.texto.length, clave).toBeGreaterThan(0);
      expect(entrada.variedad.length, clave).toBeGreaterThan(0);
    }
  });
});

describe('validarCatalogo', () => {
  it('rejects an entry marked revisado without a reviewer', () => {
    const errores = validarCatalogo('es', { 'a.b': { texto: 'Hola', revisado: true, revisor: null, variedad: 'es-PE' } });
    expect(errores.join('\n')).toMatch(/revisor/);
  });

  it('rejects a reviewed entry with empty text', () => {
    const errores = validarCatalogo('es', { 'a.b': { texto: '', revisado: true, revisor: 'Ana', variedad: 'es-PE' } });
    expect(errores.join('\n')).toMatch(/texto vacío/);
  });

  it('rejects missing fields and wrong types', () => {
    const errores = validarCatalogo('es', { 'a.b': { texto: 3, revisado: 'si', variedad: '' } as never });
    expect(errores.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects a key in a non-reference catalog that does not exist in es', () => {
    const errores = validarCatalogo('quy', { 'a.b': { texto: '', revisado: false, revisor: null, variedad: 'Ayacucho-Chanka' } }, new Set(['x.y']));
    expect(errores.join('\n')).toMatch(/a\.b/);
  });
});
