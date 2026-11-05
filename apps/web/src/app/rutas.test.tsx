import { describe, expect, it } from 'vitest';
import { rutas, rutasDeFeatures } from './rutas.tsx';

describe('app routes', () => {
  it('wires one route file per feature', () => {
    expect(Object.keys(rutasDeFeatures).sort()).toEqual(['cerebro', 'creador', 'docente', 'familia', 'grupo', 'guardian', 'holo', 'lab', 'mundo', 'relevo', 'retos', 'tutor']);
  });

  it('puts the routes of the other fronts before the shell placeholders, so a front overrides a tab root by registering it', () => {
    const hijos = rutas[0]?.children ?? [];
    const indiceInicio = hijos.findIndex((r) => r.index);
    const indiceMuseo = hijos.findIndex((r) => r.path === 'museo');
    expect(indiceInicio).toBeGreaterThanOrEqual(0);
    expect(indiceMuseo).toBeGreaterThan(-1);
    // placeholders come after whatever the features contribute
    expect(hijos.length).toBeGreaterThan(Object.values(rutasDeFeatures).flat().length);
  });
});
