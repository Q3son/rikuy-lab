import { describe, expect, it } from 'vitest';
import type { Evidencia, MemoriaEntrada, Medicion } from '@rikuy/contracts';
import { ids } from '@rikuy/contracts/fixtures';
import {
  esquemaReporteVigente,
  reporteCompetenciasAgregado,
  reporteDocente,
  validarReporteAgregado,
  type FilaAgregable,
} from './index.ts';

const ev = (n: number, nivel: Evidencia['nivel'], extra: Partial<Evidencia> = {}): Evidencia => ({
  id: `01JC${'0'.repeat(18)}V${String(n).padStart(3, '0')}`,
  respuestaId: ids.respuesta,
  grupoId: ids.grupo1,
  claseId: ids.clase,
  indicador: 'prediccion',
  nivel,
  estado: 'ok',
  cita: 'Entre más larga la cuerda, más tarda',
  desempeno: { competencia: 1, desempeno: 1 },
  fuente: 'reglas',
  confirmadaPorDocente: true,
  ...extra,
});

describe('reporteDocente (per competency, per performance, literal quotes)', () => {
  const memoria: MemoriaEntrada[] = [
    {
      id: ids.memoria, estudianteId: ids.estudiante1, aulaId: ids.aula,
      competencia: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1 },
      conceptos: ['periodo'], tipo: 'logro', resumen: 'Predijo que al alargar la cuerda tarda más y su dato lo confirmó',
      evidenciaIds: [], hlc: '1762300800000-0000-docente1',
    },
  ];
  const mediciones: Medicion[] = [
    { id: ids.medicion, claseId: ids.clase, grupoId: ids.grupo1, practicaId: ids.practica, variable: 'longitud', valorIndependiente: 0.5, repeticion: 1, magnitud: 'periodo', valor: 1.43, unidad: 's', fuente: 'cronometro', anulada: false },
  ];

  it('groups by competency and performance with the observed level and the literal quote', () => {
    const r = reporteDocente({ alcance: { tipo: 'grupo', grupoId: ids.grupo1 }, evidencias: [ev(1, 2), ev(2, 3, { desempeno: { competencia: 1, desempeno: 2 }, cita: 'Mi dato coincide con el modelo' })], memoria, mediciones, rango: { desde: '2026-11-01', hasta: '2026-11-30' } });
    expect(r.esquemaReporte).toBe(esquemaReporteVigente);
    const c1 = r.competencias[0];
    expect(c1?.competencia).toBe(1);
    expect(c1?.desempenos.map((d) => [d.desempeno, d.nivel])).toEqual([[1, 2], [2, 3]]);
    expect(c1?.desempenos[0]?.citas).toEqual(['Entre más larga la cuerda, más tarda']);
    expect(c1?.memoria).toEqual(['Predijo que al alargar la cuerda tarda más y su dato lo confirmó']);
    expect(r.mediciones).toEqual([{ variable: 'longitud', valorIndependiente: 0.5, magnitud: 'periodo', valor: 1.43, unidad: 's' }]);
  });

  it('"NO" means not assessable, never zero, and never lowers the level of the others', () => {
    const r = reporteDocente({ alcance: { tipo: 'clase' }, evidencias: [ev(1, 'NO', { estado: 'no_observable' }), ev(2, 'NO', { estado: 'no_observable' })], memoria: [], mediciones: [], rango: { desde: '2026-11-01', hasta: '2026-11-30' } });
    expect(r.competencias[0]?.desempenos[0]?.nivel).toBe('NO');
    const mixto = reporteDocente({ alcance: { tipo: 'clase' }, evidencias: [ev(1, 'NO'), ev(2, 2)], memoria: [], mediciones: [], rango: { desde: '2026-11-01', hasta: '2026-11-30' } });
    expect(mixto.competencias[0]?.desempenos[0]?.nivel).toBe(2);
  });

  it('ignores annulled measurements and is reproducible (same input, same source hash)', () => {
    const a = reporteDocente({ alcance: { tipo: 'clase' }, evidencias: [ev(1, 1)], memoria: [], mediciones: [{ ...mediciones[0]!, anulada: true }], rango: { desde: '2026-11-01', hasta: '2026-11-30' } });
    expect(a.mediciones).toEqual([]);
    const b = reporteDocente({ alcance: { tipo: 'clase' }, evidencias: [ev(1, 1)], memoria: [], mediciones: [{ ...mediciones[0]!, anulada: true }], rango: { desde: '2026-11-01', hasta: '2026-11-30' } });
    expect(b.hashFuente).toBe(a.hashFuente);
    expect(b.hashFuente).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('reporteCompetenciasAgregado (director / UGEL)', () => {
  const fila = (n: number, nivel: FilaAgregable['nivel'], over: Partial<FilaAgregable> = {}): FilaAgregable => ({
    colegioCodigo: '0123456', aulaId: ids.aula, grupoId: `01JC${'0'.repeat(18)}G${String(n).padStart(3, '0')}`, competencia: 1, nivel, semana: '2026-11-02', ...over,
  });
  const doce = Array.from({ length: 12 }, (_, i) => fila(i, i < 7 ? 2 : i < 10 ? 3 : 1));

  it('counts groups per level and suppresses cells under 5 (with complementary suppression)', () => {
    const r = reporteCompetenciasAgregado({ destinatario: 'director', filas: doce, periodo: { desde: '2026-11-01', hasta: '2026-11-30' } });
    const c = r.competencias[0]!;
    expect(c.total).toEqual({ suprimido: false, valor: 12 });
    expect(c.niveles['2']).toEqual({ suprimido: false, valor: 7 });
    expect(c.niveles['3']).toEqual({ suprimido: true });
    expect(c.niveles['1']).toEqual({ suprimido: true });
  });

  it('a competency with fewer than 5 groups is entirely suppressed', () => {
    const r = reporteCompetenciasAgregado({ destinatario: 'director', filas: doce.slice(0, 4), periodo: { desde: '2026-11-01', hasta: '2026-11-30' } });
    expect(r.competencias[0]?.total).toEqual({ suprimido: true });
  });

  it('counts each group once per competency (its highest level)', () => {
    const repetidas = [...doce, fila(0, 3), fila(0, 1)];
    const r = reporteCompetenciasAgregado({ destinatario: 'director', filas: repetidas, periodo: { desde: '2026-11-01', hasta: '2026-11-30' } });
    expect(r.competencias[0]?.total).toEqual({ suprimido: false, valor: 12 });
  });

  it('never carries quotes, aliases, groups or students (contract test)', () => {
    const r = reporteCompetenciasAgregado({ destinatario: 'ugel', filas: doce, periodo: { desde: '2026-11-01', hasta: '2026-11-30' } });
    expect(validarReporteAgregado(r)).toEqual([]);
    const txt = JSON.stringify(r);
    expect(txt).not.toMatch(/cita|alias|apodo|grupoId|estudiante|aulaId|01JC/);
  });

  it('the validator rejects a report that smuggles a forbidden field', () => {
    expect(validarReporteAgregado({ x: { cita: 'frase literal' } }).length).toBeGreaterThan(0);
    expect(validarReporteAgregado({ x: { alias: 'E01' } }).length).toBeGreaterThan(0);
    expect(validarReporteAgregado({ nota: 'el alumno estaba triste' }).length).toBeGreaterThan(0);
  });

  it('UGEL rows are by school code and week, ordered by code, never by result', () => {
    const otro = Array.from({ length: 6 }, (_, i) => fila(100 + i, 3, { colegioCodigo: '0000001' }));
    const r = reporteCompetenciasAgregado({ destinatario: 'ugel', filas: [...doce, ...otro], periodo: { desde: '2026-11-01', hasta: '2026-11-30' } });
    expect(r.porColegio?.map((c) => c.colegioCodigo)).toEqual(['0000001', '0123456']);
  });
});
