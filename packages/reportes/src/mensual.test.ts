import { describe, expect, it } from 'vitest';
import {
  K_MIN,
  construirReporteMensual,
  estimarPaginas,
  validarEntradaMensual,
  validarReporteAgregado,
  type AulaMes,
  type EntradaMensual,
} from './index.ts';

const aula = (seccion: string, over: Partial<AulaMes> = {}): AulaMes => ({
  colegioCodigo: '0123456',
  seccion,
  sincronizada: true,
  exhibicionesRealizadas: 8,
  sesiones: 10,
  sesionesConEvidencia: 8,
  diasCierre: 4,
  diasCierreCubiertos: 3,
  paquetesEnviados: 20,
  paquetesDevueltos: 12,
  entregasPorCanal: { qr: 14, whatsapp: 4, correo: 2 },
  sesionesSinRed: 3,
  minutosAudioQuechua: 90,
  gruposActivos: 6,
  cobertura: [
    { competencia: 1, capacidad: 'Problematiza situaciones', gruposConEvidencia: 6, gruposTotal: 6 },
    { competencia: 2, capacidad: 'Comprende y usa conocimientos', gruposConEvidencia: 0, gruposTotal: 6 },
    { competencia: 3, capacidad: 'Evalúa implicancias', gruposConEvidencia: 3, gruposTotal: 6 },
  ],
  conceptos: [
    { conceptoId: 'periodo', etiqueta: 'Periodo del péndulo', gruposQueCostaron: 4, exhibicionSugerida: 'Péndulo simple' },
    { conceptoId: 'masa', etiqueta: 'Masa', gruposQueCostaron: 1 },
  ],
  ayuda: { pedidos: 5, cierres: 4, gruposInvolucrados: 6 },
  nudosQuipu: 22,
  ...over,
});

const entrada = (over: Partial<EntradaMensual> = {}): EntradaMensual => ({
  destinatario: 'director',
  periodo: { mes: '2026-11', desde: '2026-11-01', hasta: '2026-11-30' },
  colegioCodigo: '0123456',
  aulas: [aula('2.° A'), aula('2.° B'), aula('3.° A', { sincronizada: false })],
  ultimaSincronizacion: '2026-11-28',
  versionCneb: 'CNEB-2016',
  ...over,
});

describe('reporte mensual a director y UGEL (modelo del PDF)', () => {
  it('identifies the school by its modular code, never by name or person', () => {
    const r = construirReporteMensual(entrada());
    expect(r.tipo).toBe('director_mensual');
    expect(r.colegioCodigo).toBe('0123456');
    expect(() => construirReporteMensual(entrada({ colegioCodigo: 'Colegio San Juan' }))).toThrow(/código modular/);
  });

  it('says how many classrooms synced and excludes the rest from the figures', () => {
    const r = construirReporteMensual(entrada());
    expect(r.cifras.cobertura).toEqual({ sincronizadas: 2, total: 3, leyenda: '2 de 3 aulas sincronizaron' });
    expect(r.cifras.exhibicionesRealizadas).toBe(16);
    expect(r.cifras.sesiones).toEqual({ conEvidencia: 16, total: 20 });
    expect(r.cifras.seccionesActivas).toBe(2);
  });

  it('suppresses cells under 5 groups and never lists a suppressed concept', () => {
    const r = construirReporteMensual(entrada());
    expect(r.supresionMinima).toBe(K_MIN);
    const cov = r.coberturaPorSeccion.find((s) => s.seccion === '2.° A');
    expect(cov?.capacidades.map((c) => c.grupos)).toEqual([{ suprimido: false, valor: 6 }, { suprimido: false, valor: 0 }, { suprimido: true }]);
    expect(r.conceptosQueCostaron.map((c) => c.conceptoId)).toEqual(['periodo']);
    expect(r.conceptosQueCostaron[0]?.grupos).toEqual({ suprimido: false, valor: 8 });
    expect(r.conceptosQueCostaron.some((c) => c.conceptoId === 'masa')).toBe(false);
  });

  it('peer-help counts are per section, in section order, hidden under 5 groups', () => {
    const r = construirReporteMensual(entrada({ aulas: [aula('2.° B'), aula('2.° A', { ayuda: { pedidos: 2, cierres: 1, gruposInvolucrados: 3 } })] }));
    expect(r.ayudaEntrePares.map((a) => a.seccion)).toEqual(['2.° A', '2.° B']);
    expect(r.ayudaEntrePares[0]).toMatchObject({ pedidos: { suprimido: true }, cierres: { suprimido: true } });
    expect(r.ayudaEntrePares[1]?.pedidos).toEqual({ suprimido: false, valor: 5 });
  });

  it('has the required sections and the honesty notes', () => {
    const r = construirReporteMensual(entrada());
    expect(r.continuidad).toMatchObject({ diasCierre: 8, paquetesEnviados: 40, paquetesDevueltos: 24 });
    expect(r.brechas).toMatchObject({ sesionesSinRed: 6, horasAudioQuechua: 3 });
    expect(r.metodo.leyenda).toMatch(/orienta, no califica/i);
    expect(r.metodo.ultimaSincronizacion).toBe('2026-11-28');
  });

  it('UGEL adds a territorial table by modular code: no ranking, no traffic lights', () => {
    const u = construirReporteMensual(
      entrada({
        destinatario: 'ugel',
        colegioCodigo: undefined,
        ugelCodigo: '150101',
        aulas: [aula('2.° A', { colegioCodigo: '0999999' }), aula('1.° A', { colegioCodigo: '0000123', exhibicionesRealizadas: 1 }), aula('1.° B', { colegioCodigo: '0555555', exhibicionesRealizadas: 30 })],
      }),
    );
    expect(u.tipo).toBe('ugel_mensual');
    expect(u.tablaTerritorial?.filas.map((f) => f.colegioCodigo)).toEqual(['0000123', '0555555', '0999999']);
    const claves = JSON.stringify(u);
    expect(claves).not.toMatch(/ranking|semaforo|semáforo|puesto|color|riesgo/i);
  });

  it('never contains quotes, aliases, student or group identifiers, or Guardián data (contract test)', () => {
    for (const d of ['director', 'ugel'] as const) {
      const r = construirReporteMensual(entrada(d === 'ugel' ? { destinatario: 'ugel', colegioCodigo: undefined, ugelCodigo: '150101' } : {}));
      expect(validarReporteAgregado(r)).toEqual([]);
    }
  });

  it('an input with Guardián-looking extra fields is rejected and cannot change the report', () => {
    const limpia = entrada();
    const sucia = { ...limpia, aulas: limpia.aulas.map((a) => ({ ...a, guardian: { sugerencias: 3 }, checkins: 12 })) } as unknown as EntradaMensual;
    expect(validarEntradaMensual(sucia).length).toBeGreaterThan(0);
    expect(validarEntradaMensual(limpia)).toEqual([]);
    expect(construirReporteMensual(sucia)).toEqual(construirReporteMensual(limpia));
  });

  it('fits the page budget: 4 A4 pages for the director, 6 for the UGEL', () => {
    const d = construirReporteMensual(entrada({ aulas: Array.from({ length: 12 }, (_, i) => aula(`${(i % 5) + 1}.° ${'ABC'[i % 3]}${i}`)) }));
    expect(estimarPaginas(d)).toBeLessThanOrEqual(4);
    const muchos = Array.from({ length: 60 }, (_, i) => aula('1.° A', { colegioCodigo: String(1000 + i).padStart(7, '0') }));
    const u = construirReporteMensual(entrada({ destinatario: 'ugel', colegioCodigo: undefined, ugelCodigo: '150101', aulas: muchos }));
    expect(estimarPaginas(u)).toBeLessThanOrEqual(6);
    expect(u.tablaTerritorial?.totalColegios).toBe(60);
  });
});
