import { describe, expect, it } from 'vitest';
import { CONCEPTOS, ARISTAS, RELACIONES, conceptoPorId, conceptosMencionados, validarGrafo, vecinos } from './conceptos.ts';

describe('concept graph data', () => {
  it('is valid: unique ids, edges between existing nodes, known relations, no self loops', () => {
    expect(validarGrafo({ nodos: CONCEPTOS, aristas: ARISTAS })).toEqual([]);
  });

  it('has no isolated concept (every node touches at least one edge)', () => {
    const tocados = new Set(ARISTAS.flatMap((a) => [a.desde, a.hasta]));
    expect(CONCEPTOS.filter((n) => !tocados.has(n.id)).map((n) => n.id)).toEqual([]);
  });

  it('uses only the relations declared in RELACIONES', () => {
    expect(new Set(ARISTAS.map((a) => a.relacion))).toEqual(new Set(RELACIONES));
  });
});

describe('validarGrafo', () => {
  const nodos = [
    { id: 'a', label: 'A', system: 'fisica', level: 'fenomeno', synonyms: ['a'] },
    { id: 'b', label: 'B', system: 'fisica', level: 'fenomeno', synonyms: ['b'] },
  ] as const;

  it('reports duplicate ids, dangling edges, unknown relations and self loops', () => {
    const errores = validarGrafo({
      nodos: [...nodos, nodos[0]],
      aristas: [
        { desde: 'a', hasta: 'zz', relacion: 'contiene' },
        { desde: 'a', hasta: 'b', relacion: 'inventada' as never },
        { desde: 'b', hasta: 'b', relacion: 'contiene' },
      ],
    });
    expect(errores.join('\n')).toMatch(/duplicad/i);
    expect(errores.join('\n')).toMatch(/zz/);
    expect(errores.join('\n')).toMatch(/inventada/);
    expect(errores.join('\n')).toMatch(/consigo mismo|self/i);
  });
});

describe('vecinos (one hop, both directions)', () => {
  it('returns the concepts linked to a node in either direction, without duplicates', () => {
    const ids = vecinos('lactasa').map((n) => n.id);
    expect(ids).toContain('enterocito'); // enterocito -> lactasa (produce)
    expect(ids).toContain('lactosa'); // lactasa -> lactosa (actua_sobre)
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns nothing for an unknown id', () => {
    expect(vecinos('no-existe')).toEqual([]);
  });

  it('does not walk more than one hop', () => {
    expect(vecinos('lactasa').map((n) => n.id)).not.toContain('glucosa');
  });
});

describe('conceptoPorId', () => {
  it('finds a node by id and returns undefined for unknown ids', () => {
    expect(conceptoPorId('pendulo')?.label).toBe('Péndulo simple');
    expect(conceptoPorId('zz')).toBeUndefined();
  });
});

describe('conceptosMencionados', () => {
  it('finds concepts named in a student answer, ignoring case and accents', () => {
    const ids = conceptosMencionados('¿La LACTASA se rompe al calentar la leche?').map((n) => n.id);
    expect(ids).toContain('lactasa');
    expect(ids).toContain('temperatura');
  });

  it('matches whole words only', () => {
    // "pulmon" must not match inside "pulmonar" (a different word)
    expect(conceptosMencionados('la respiración pulmonar').map((n) => n.id)).not.toContain('pulmon');
  });

  it('matches accented words through their unaccented synonyms', () => {
    expect(conceptosMencionados('Los pulmones se llenan de aire').map((n) => n.id)).toContain('pulmon');
  });

  it('returns nothing for text without concepts', () => {
    expect(conceptosMencionados('hola, ¿cómo estás?')).toEqual([]);
  });
});
