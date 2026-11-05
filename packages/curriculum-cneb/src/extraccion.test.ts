import { describe, expect, it } from 'vitest';
import { extraerCyT, serializarSubconjunto, type DocumentoFuente } from './extraccion.ts';

const fuenteSecundaria: DocumentoFuente = {
  nivel: 'secundaria',
  fuente: { titulo: 'Programa Curricular de Educación Secundaria', institucion: 'MINEDU', url: 'https://example.test/s.pdf' },
  grados: [
    {
      id: 'secundaria-2',
      nombre: '2.º grado de secundaria',
      ciclo: 'VI',
      areas: [
        { id: 'matematica', nombre: 'Matemática', competencias: [] },
        {
          id: 'ciencia-y-tecnologia',
          nombre: 'Ciencia y Tecnología',
          competencias: [
            {
              nombre: 'Indaga',
              capacidades: ['Problematiza'],
              estandar: 'Estándar de prueba.',
              desempenos: ['Propone procedimientos para observar, manipular la variable independiente.'],
              temas: ['no oficial'],
            },
            { nombre: 'Explica', capacidades: [], estandar: 'E.', desempenos: ['Describe el movimiento cualitativa y cuantitativamente.'], temas: [] },
          ],
        },
      ],
    },
  ],
};

const fuentePrimaria: DocumentoFuente = {
  nivel: 'primaria',
  fuente: { titulo: 'Programa Curricular de Educación Primaria', institucion: 'MINEDU', url: 'https://example.test/p.pdf' },
  grados: [
    {
      id: 'primaria-1',
      nombre: '1.º grado de primaria',
      ciclo: 'III',
      areas: [{ id: 'ciencia-y-tecnologia', nombre: 'Ciencia y Tecnología', competencias: [{ nombre: 'Diseña', capacidades: [], estandar: 'D.', desempenos: ['Describe las necesidades de los seres vivos.'], temas: [] }] }],
    },
  ],
};

const entradas = [
  { archivo: 'secundaria.json', sha256: 'a'.repeat(64), documento: fuenteSecundaria },
  { archivo: 'primaria.json', sha256: 'b'.repeat(64), documento: fuentePrimaria },
];

describe('extraerCyT', () => {
  it('keeps only the science and technology area, ordered by level and grade', () => {
    const subset = extraerCyT(entradas);
    expect(subset.grados.map((g) => g.id)).toEqual(['primaria-1', 'secundaria-2']);
    expect(subset.grados[1]?.competencias.map((c) => c.nombre)).toEqual(['Indaga', 'Explica']);
  });

  it('numbers competencies from 1 and builds the contract id', () => {
    const subset = extraerCyT(entradas);
    const comp = subset.grados[1]?.competencias[1];
    expect(comp?.numero).toBe(2);
    expect(comp?.id).toBe('secundaria-2:cyt:c2');
  });

  it('drops the non-official temas field', () => {
    const json = serializarSubconjunto(extraerCyT(entradas));
    expect(json).not.toContain('no oficial');
    expect(json).not.toContain('"temas"');
  });

  it('records each source file hash and marks the quotes as pending PDF verification', () => {
    const subset = extraerCyT(entradas);
    expect(subset.archivos).toEqual([
      { nombre: 'primaria.json', sha256: 'b'.repeat(64) },
      { nombre: 'secundaria.json', sha256: 'a'.repeat(64) },
    ]);
    expect(subset.verificacion.estado).toBe('pendiente');
  });

  it('is deterministic: the same input produces byte-identical output', () => {
    const a = serializarSubconjunto(extraerCyT(entradas));
    const b = serializarSubconjunto(extraerCyT([...entradas].reverse()));
    expect(a).toBe(b);
    expect(a.endsWith('\n')).toBe(true);
  });

  it('fails closed when a grade has no science and technology area', () => {
    const roto: DocumentoFuente = { ...fuentePrimaria, grados: [{ ...fuentePrimaria.grados[0]!, areas: [] }] };
    expect(() => extraerCyT([{ archivo: 'roto.json', sha256: 'c'.repeat(64), documento: roto }])).toThrow(/ciencia-y-tecnologia/);
  });

  it('fails when the grade id does not match the level', () => {
    const roto: DocumentoFuente = { ...fuentePrimaria, grados: [{ ...fuentePrimaria.grados[0]!, id: 'secundaria-1' }] };
    expect(() => extraerCyT([{ archivo: 'roto.json', sha256: 'c'.repeat(64), documento: roto }])).toThrow(/nivel/);
  });
});
