import { Sala } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { SALAS_CONTENIDO } from './contenido.ts';
import { estiloSala, rutaDeSala } from './salas.ts';

describe('hall catalog (content/museo/salas.json)', () => {
  it('ships the seven halls of the museum, each a valid Sala contract', () => {
    expect(SALAS_CONTENIDO.map((s) => s.titulo.es)).toEqual([
      'Física',
      'Biología',
      'Química',
      'Tierra y ambiente',
      'Taller',
      'Patio de juegos',
      'Auditorio',
    ]);
    for (const s of SALAS_CONTENIDO) expect(Sala.safeParse(s).success).toBe(true);
  });
});

describe('hall wayfinding style', () => {
  it('uses the DESIGN.md hall colour token, glyph and provisional Quechua name', () => {
    expect(estiloSala({ id: 'sala-fisica', titulo: { es: 'Física', quy: 'Kallpa' } })).toEqual({
      color: 'hall-fisica',
      glifo: 'orbita',
      nombre: 'Física',
      sublabel: 'Kallpa',
    });
    expect(estiloSala({ id: 'sala-biologia', titulo: { es: 'Biología' } }).glifo).toBe('hoja');
    expect(estiloSala({ id: 'sala-quimica', titulo: { es: 'Química' } }).glifo).toBe('matraz');
    expect(estiloSala({ id: 'sala-tierra', titulo: { es: 'Tierra y ambiente' } }).color).toBe('hall-tierra');
  });

  it('gives every hall a glyph and a colour, with a neutral fallback for unknown halls', () => {
    for (const s of SALAS_CONTENIDO) {
      const e = estiloSala(s);
      expect(e.glifo).toBeTruthy();
      expect(e.color).toBeTruthy();
    }
    expect(estiloSala({ id: 'sala-matematica', titulo: { es: 'Matemática' } })).toMatchObject({
      color: 'primary',
      glifo: 'museo',
      sublabel: undefined,
    });
  });

  it('routes each hall door to its app route', () => {
    expect(rutaDeSala('sala-fisica')).toBe('/museo/sala-fisica');
    expect(rutaDeSala('patio')).toBe('/museo/patio');
  });
});
