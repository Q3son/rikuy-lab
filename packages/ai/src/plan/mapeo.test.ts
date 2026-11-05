import { describe, expect, it } from 'vitest';
import { PlanExtraido, type ItemExtraido } from './esquemas.ts';
import { curriculoCneb, mapearItem, mapearPlan } from './mapeo.ts';

const cur = curriculoCneb();
const fuente = { pagina: 1, fragmento: 'texto' };
const item = (tipo: ItemExtraido['tipo'], texto: string): ItemExtraido => ({ tipo, texto, confianza: 0.9, fuente });
const sec2 = { nivel: 'secundaria' as const, grado: 2 };

describe('mapearItem: desempeños', () => {
  it('maps a literal copy of an official desempeño as exact with its CNEB id', () => {
    const c = mapearItem(item('desempeno', 'Describe cómo se produce la reflexión, la refracción y la dispersión de las ondas.'), cur, sec2);
    expect(c).toMatchObject({ estado: 'exacta', literal: true, id: 'secundaria-2:cyt:c2:d3', competencia: 2, desempeno: 3, puntaje: 1 });
  });

  it('maps a literal fragment (a sentence of a longer desempeño) as exact', () => {
    const c = mapearItem(item('desempeno', 'Plantea hipótesis en las que establece relaciones de causalidad entre las variables.'), cur, sec2);
    expect(c).toMatchObject({ estado: 'exacta', literal: true, id: 'secundaria-2:cyt:c1:d1' });
  });

  it('treats case, accents and punctuation differences as exact but not literal', () => {
    const c = mapearItem(item('desempeno', 'describe como se produce la reflexion la refraccion y la dispersion de las ondas'), cur, sec2);
    expect(c).toMatchObject({ estado: 'exacta', literal: false, id: 'secundaria-2:cyt:c2:d3' });
    expect(c.puntaje).toBeLessThan(1);
  });

  it('maps a "precisado" desempeño (teacher wording) as approximate to the closest official one', () => {
    const c = mapearItem(item('desempeno', 'Describe el movimiento rectilíneo uniforme relacionando distancia, tiempo y velocidad en situaciones cotidianas.'), cur, sec2);
    expect(c).toMatchObject({ estado: 'aproximada', id: 'secundaria-2:cyt:c2:d5' });
    expect(c.puntaje).toBeGreaterThan(0.5);
    expect(c.puntaje).toBeLessThan(1);
    expect(c.textoOficial).toContain('Describe el movimiento');
  });

  it('flags an item with no CNEB counterpart and never invents an id', () => {
    const c = mapearItem(item('desempeno', 'Valora la gastronomía arequipeña en las festividades de la ciudad.'), cur, sec2);
    expect(c.estado).toBe('sin_correspondencia');
    expect(c.id).toBeUndefined();
    expect(c.textoOficial).toBeUndefined();
  });
});

describe('mapearItem: competencias, capacidades, contenidos', () => {
  it('maps a competency by its official name', () => {
    expect(mapearItem(item('competencia', 'Indaga mediante métodos científicos para construir conocimientos'), cur, sec2)).toMatchObject({ estado: 'exacta', id: 'secundaria-2:cyt:c1', competencia: 1 });
  });

  it('maps a competency written with small differences as approximate', () => {
    const c = mapearItem(item('competencia', 'Diseña y construye soluciones tecnológicas para resolver problemas'), cur, sec2);
    expect(c.competencia).toBe(3);
    expect(['exacta', 'aproximada']).toContain(c.estado);
  });

  it('maps a capacity to its competency', () => {
    expect(mapearItem(item('capacidad', 'Genera y registra datos e información'), cur, sec2)).toMatchObject({ estado: 'exacta', id: 'secundaria-2:cyt:c1:cap3', competencia: 1, capacidad: 3 });
  });

  it('relates a content topic to the desempeño that covers it', () => {
    const c = mapearItem(item('contenido', 'Calor y temperatura: transferencia de calor entre cuerpos'), cur, sec2);
    expect(c).toMatchObject({ estado: 'aproximada', id: 'secundaria-2:cyt:c2:d4' });
  });

  it('leaves evidences and instruments out of the CNEB mapping (no_aplica)', () => {
    expect(mapearItem(item('evidencia', 'Informe de indagación sobre el péndulo'), cur, sec2).estado).toBe('no_aplica');
    expect(mapearItem(item('instrumento', 'Lista de cotejo'), cur, sec2).estado).toBe('no_aplica');
  });
});

describe('mapearPlan', () => {
  const plan = PlanExtraido.parse({
    tipoDocumento: 'unidad',
    nivel: 'secundaria',
    grado: 2,
    area: 'Ciencia y Tecnología',
    unidades: [
      {
        titulo: 'Unidad 1',
        items: [
          item('desempeno', 'Describe cómo se produce la reflexión, la refracción y la dispersión de las ondas.'),
          item('desempeno', 'Valora la gastronomía arequipeña en las festividades de la ciudad.'),
          item('evidencia', 'Informe'),
        ],
      },
    ],
  });

  it('gives every item a stable id, its source and a combined confidence', () => {
    const m = mapearPlan(plan, cur);
    const [a, b] = m.unidades[0]!.items;
    expect(a!.id).toBe('u1-i1');
    expect(a!.fuente).toEqual(fuente);
    expect(a!.confianzaTotal).toBeCloseTo(0.9);
    expect(b!.confianzaTotal).toBe(0);
    expect(m.resumen).toEqual({ total: 3, exactas: 1, aproximadas: 0, sinCorrespondencia: 1, noAplica: 1 });
  });

  it('warns when the grade is not in the document and searches every grade of the level', () => {
    const sinGrado = PlanExtraido.parse({ ...plan, grado: undefined });
    const m = mapearPlan(sinGrado, cur);
    expect(m.avisos.join(' ')).toMatch(/grado/);
    expect(m.unidades[0]!.items[0]!.correspondencia.estado).toBe('exacta');
  });
});
