import { PRACTICAS } from '@rikuy/curriculum-cneb';
import { describe, expect, it } from 'vitest';
import { curriculoCneb, mapearPlan } from './mapeo.ts';
import { fechaSugerida, practicasSugeribles, proponerMejoras, verboObservable } from './mejoras.ts';
import { planSimulado } from './muestra.ts';

const cur = curriculoCneb();
const mapeado = mapearPlan(planSimulado(), cur);
const mejoras = proponerMejoras(mapeado, cur, practicasSugeribles(PRACTICAS));

describe('proponerMejoras', () => {
  it('is always labelled as a suggestion', () => {
    expect(mejoras.sugerencia).toBe(true);
  });

  it('lists the CNEB competencies of the grade the plan does not cover', () => {
    expect(mejoras.competenciasFaltantes.map((c) => c.competencia)).toEqual([3]);
    expect(mejoras.competenciasFaltantes[0]!.id).toBe('secundaria-2:cyt:c3');
    expect(mejoras.competenciasFaltantes[0]!.nombre).toMatch(/^Diseña y construye/);
  });

  it('proposes observable wording for desempeños that start with a non-observable verb', () => {
    const textos = mejoras.desempenosObservables.map((d) => d.original);
    expect(textos).toEqual(['Comprende el movimiento oscilatorio del péndulo y su periodo.', 'Conoce las máquinas simples usadas en la construcción con sillar.']);
    expect(mejoras.desempenosObservables[0]!.propuesta).toBe('Explica el movimiento oscilatorio del péndulo y su periodo.');
    expect(mejoras.desempenosObservables[1]!.propuesta).toBe('Describe las máquinas simples usadas en la construcción con sillar.');
  });

  it('fits the pendulum to the movement unit, lactase and breathing to the nutrition unit', () => {
    const porUnidad = (n: number) => mejoras.practicas.filter((p) => p.unidad === n).map((p) => p.slug);
    expect(porUnidad(1)).toContain('pendulo');
    expect(porUnidad(3)).toEqual(expect.arrayContaining(['lactasa', 'respiratorio']));
    expect(porUnidad(4)).toEqual([]);
  });

  it('puts every suggested practice on a weekday inside its unit period', () => {
    const p = mejoras.practicas.find((x) => x.slug === 'pendulo')!;
    expect(p.fechaSugerida >= '2026-03-16' && p.fechaSugerida <= '2026-05-15').toBe(true);
    expect(p.fechaAproximada).toBe(true);
    expect(p.motivo.length).toBeGreaterThan(10);
  });
});

describe('fechaSugerida', () => {
  it('uses the explicit dates of the unit when present, moved to a weekday', () => {
    expect(fechaSugerida({ inicio: '2026-04-06', fin: '2026-04-17' }, 1, 2026)).toEqual({ fecha: '2026-04-10', aproximada: false }); // midpoint is Sat 11 -> Fri 10
  });
  it('falls back to the unit order when there is no period', () => {
    expect(fechaSugerida(undefined, 2, 2026).aproximada).toBe(true);
  });
});

describe('verboObservable', () => {
  it('leaves observable desempeños alone', () => {
    expect(verboObservable('Describe el movimiento.')).toBeUndefined();
    expect(verboObservable('Entiende la fotosíntesis')).toBe('Explica la fotosíntesis');
  });
});
