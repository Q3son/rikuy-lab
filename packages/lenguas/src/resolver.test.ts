import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { crearResolutor, resolverTexto, type Catalogo, type EntradaCatalogo } from './resolver.ts';
import { REGISTRO_LENGUAS } from './registro.ts';

const entrada = (texto: string, revisado: boolean, revisor: string | null = revisado ? 'Ana' : null): EntradaCatalogo => ({
  texto,
  revisado,
  revisor,
  variedad: 'Ayacucho-Chanka',
});

const catalogos: Record<string, Catalogo> = {
  es: {
    'p.pregunta': entrada('¿Qué pasa?', true),
    'p.pista': entrada('Mira la temperatura.', false),
    'p.borrador': entrada('Texto revisado en castellano.', true),
    'solo.es': entrada('Solo castellano', true),
  },
  quy: {
    'p.pregunta': entrada('Imaymana?', true),
    'p.pista': entrada('Qhawariy.', false),
    'p.borrador': entrada('Borrador sin revisar.', false),
    'p.vacio': entrada('', true),
  },
  ayr: { 'p.pregunta': entrada('', false, null) },
};

const resolver = crearResolutor(catalogos, REGISTRO_LENGUAS);

describe('resolverTexto for the alumno role', () => {
  it('returns the reviewed text in the requested language', () => {
    expect(resolver('p.pregunta', 'quy', 'alumno')).toMatchObject({ texto: 'Imaymana?', lengua: 'quy', revisado: true, borrador: false });
  });

  it('falls back to reviewed Spanish when the requested language only has an unreviewed draft', () => {
    expect(resolver('p.borrador', 'quy', 'alumno')).toMatchObject({ texto: 'Texto revisado en castellano.', lengua: 'es', revisado: true });
  });

  it('falls back to Spanish when the key is missing in the requested language', () => {
    expect(resolver('solo.es', 'quy', 'alumno')).toMatchObject({ texto: 'Solo castellano', lengua: 'es', revisado: true });
  });

  it('never returns an unreviewed string (revisado:false)', () => {
    expect(resolver('p.pista', 'es', 'alumno')).toBeNull();
    expect(resolver('p.pista', 'quy', 'alumno')).toBeNull();
  });

  it('never returns an empty placeholder', () => {
    expect(resolver('p.vacio', 'quy', 'alumno')).toBeNull();
  });

  it('returns null for an unknown key', () => {
    expect(resolver('no.existe', 'es', 'alumno')).toBeNull();
  });
});

describe('resolverTexto for the docente role', () => {
  it('sees the drafts of the requested language, marked as borrador', () => {
    expect(resolver('p.pista', 'quy', 'docente')).toMatchObject({ texto: 'Qhawariy.', lengua: 'quy', revisado: false, borrador: true });
  });

  it('falls back past placeholders with empty text', () => {
    expect(resolver('p.pregunta', 'ayr', 'docente')).toMatchObject({ texto: '¿Qué pasa?', lengua: 'es' });
  });

  it('returns null when neither the language nor Spanish has any text', () => {
    expect(resolver('p.vacio', 'quy', 'docente')).toBeNull();
  });
});

describe('property: no unreviewed string reaches the alumno role', () => {
  const textoArb = fc.string({ maxLength: 12 });
  const entradaArb = fc.record({ texto: textoArb, revisado: fc.boolean(), revisor: fc.option(fc.string({ minLength: 1, maxLength: 8 }), { nil: null }) });
  const catalogoArb = fc.dictionary(fc.constantFrom('p.a', 'p.b', 'p.c'), entradaArb.map((e) => ({ ...e, variedad: 'v' })));

  it('for any catalogs, the alumno result is null or reviewed text from the fallback chain', () => {
    fc.assert(
      fc.property(
        catalogoArb,
        catalogoArb,
        catalogoArb,
        fc.constantFrom('p.a', 'p.b', 'p.c'),
        fc.constantFrom('es', 'quy', 'ayr'),
        (es, quy, ayr, clave, lengua) => {
          const r = crearResolutor({ es, quy, ayr }, REGISTRO_LENGUAS)(clave, lengua, 'alumno');
          if (r === null) return;
          expect(r.revisado).toBe(true);
          expect(r.borrador).toBe(false);
          expect(r.texto.trim().length).toBeGreaterThan(0);
          const cadena = [lengua, ...(lengua === 'es' ? [] : ['es'])];
          const origen = { es, quy, ayr }[r.lengua as 'es' | 'quy' | 'ayr'][clave];
          expect(cadena).toContain(r.lengua);
          expect(origen).toMatchObject({ texto: r.texto, revisado: true });
        },
      ),
      { numRuns: 400 },
    );
  });
});

describe('resolverTexto (one-off form)', () => {
  it('matches the factory with the shipped registry', () => {
    expect(resolverTexto('p.pregunta', 'quy', 'alumno', catalogos)).toEqual(resolver('p.pregunta', 'quy', 'alumno'));
  });
});
