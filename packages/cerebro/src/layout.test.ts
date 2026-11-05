import { describe, expect, it } from 'vitest';
import { conteosPorCompetencia, construirMapa, layoutPorDefecto, resolverLayout, type GrafoCurricular, type PosicionNodo } from './index.ts';
import type { MemoriaEntrada } from '@rikuy/contracts';
import { ids } from '@rikuy/contracts/fixtures';

const grafo: GrafoCurricular = {
  nodos: [
    { id: 'c1', tipo: 'competencia', etiqueta: 'Indaga' },
    { id: 'c2', tipo: 'competencia', etiqueta: 'Explica' },
    ...['a', 'b', 'c'].map((x) => ({ id: x, tipo: 'concepto' as const, etiqueta: x, padre: 'c1' })),
    { id: 'd', tipo: 'concepto' as const, etiqueta: 'd', padre: 'c2' },
    { id: 'suelto', tipo: 'concepto' as const, etiqueta: 'suelto' },
  ],
  aristas: [{ desde: 'a', hasta: 'b', tipo: 'depende_de' }],
};

describe('layout', () => {
  it('fallback layout is deterministic, covers every node and stays inside the viewBox', () => {
    const l = layoutPorDefecto(grafo);
    expect(layoutPorDefecto(grafo)).toEqual(l);
    expect(l.map((p) => p.nodeId).sort()).toEqual(grafo.nodos.map((n) => n.id).sort());
    for (const p of l) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(800);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(600);
    }
  });
  it('no two nodes share a position', () => {
    const l = layoutPorDefecto(grafo);
    expect(new Set(l.map((p) => `${p.x},${p.y}`)).size).toBe(l.length);
  });
  it('uses the precomputed {nodeId, x, y} layout from curriculum-cneb when it covers the graph', () => {
    const f9: PosicionNodo[] = grafo.nodos.map((n, i) => ({ nodeId: n.id, x: 10 + i * 5, y: 20 }));
    expect(resolverLayout(grafo, f9)).toEqual(f9);
  });
  it('falls back when the precomputed layout is missing or incomplete', () => {
    expect(resolverLayout(grafo, undefined)).toEqual(layoutPorDefecto(grafo));
    expect(resolverLayout(grafo, [{ nodeId: 'a', x: 1, y: 1 }])).toEqual(layoutPorDefecto(grafo));
  });
  it('the map carries a position for each node', () => {
    const m = construirMapa({ grafo, memoria: [], evidencias: [], exploraciones: [] });
    expect(m.nodos.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });
});

describe('teacher and aula aggregates', () => {
  const m = (est: string, conceptos: string[]): MemoriaEntrada => ({
    id: `01JC${'0'.repeat(18)}M${est.slice(-3)}`,
    estudianteId: est,
    aulaId: ids.aula,
    competencia: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1 },
    conceptos,
    tipo: 'logro',
    resumen: 'x',
    evidenciaIds: [],
    hlc: '1762300800000-0000-docente1',
  });
  const est = (i: number) => `01JC${'0'.repeat(18)}E${String(i).padStart(3, '0')}`;

  it('counts nodes with evidence per competency and never lists students', () => {
    const memoria = [1, 2, 3, 4, 5].map((i) => m(est(i), ['a']));
    const r = conteosPorCompetencia(grafo, memoria);
    if (r.suprimido) throw new Error('should show');
    expect(r.competencias.find((c) => c.id === 'c1')).toMatchObject({ nodosConEvidencia: 1, nodosTotal: 3 });
    expect(JSON.stringify(r)).not.toContain(est(1));
  });
  it('is suppressed below 5 students', () => {
    expect(conteosPorCompetencia(grafo, [1, 2, 3, 4].map((i) => m(est(i), ['a']))).suprimido).toBe(true);
  });
});
