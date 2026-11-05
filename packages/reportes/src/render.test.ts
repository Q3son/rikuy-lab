import { describe, expect, it } from 'vitest';
import {
  aCsv,
  construirReporteMensual,
  csvDeCompetencias,
  generadorHtmlImprimible,
  htmlImprimible,
  reporteCompetenciasAgregado,
  type AulaMes,
  type FilaAgregable,
} from './index.ts';

describe('CSV (RFC 4180, UTF-8 with BOM for Excel)', () => {
  it('starts with a BOM, uses CRLF and quotes commas, quotes and line breaks', () => {
    const csv = aCsv([['Competencia', 'Nota'], ['Indaga, explica', 'dijo "sí"'], ['línea\nnueva', 3]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toBe('﻿Competencia,Nota\r\n"Indaga, explica","dijo ""sí"""\r\n"línea\nnueva",3\r\n');
  });
  it('keeps accents and eñes intact', () => {
    expect(aCsv([['Péndulo', 'año']])).toContain('Péndulo,año');
  });
  it('defuses spreadsheet formulas', () => {
    expect(aCsv([['=HYPERLINK("x")', '+1', '@a', '-b']])).toContain("'=HYPERLINK");
  });
  it('writes suppressed cells as "<5", never as a number', () => {
    const filas: FilaAgregable[] = Array.from({ length: 12 }, (_, i) => ({ colegioCodigo: '0123456', aulaId: 'a', grupoId: `g${i}`, competencia: 1, nivel: i < 8 ? 2 : 3, semana: '2026-11-02' }));
    const csv = csvDeCompetencias(reporteCompetenciasAgregado({ destinatario: 'director', filas, periodo: { desde: '2026-11-01', hasta: '2026-11-30' } }));
    expect(csv).toContain('<5');
    expect(csv.split('\r\n')[0]).toContain('Competencia');
  });
});

describe('printable HTML (browser prints it to PDF with no network)', () => {
  const aula: AulaMes = {
    colegioCodigo: '0123456', seccion: '2.° A', sincronizada: true, exhibicionesRealizadas: 8, sesiones: 10, sesionesConEvidencia: 8,
    diasCierre: 4, diasCierreCubiertos: 3, paquetesEnviados: 20, paquetesDevueltos: 12, entregasPorCanal: { qr: 14, whatsapp: 4, correo: 2 },
    sesionesSinRed: 3, minutosAudioQuechua: 90, gruposActivos: 6,
    cobertura: [{ competencia: 1, capacidad: 'Problematiza <situaciones>', gruposConEvidencia: 6, gruposTotal: 6 }],
    conceptos: [{ conceptoId: 'periodo', etiqueta: 'Periodo', gruposQueCostaron: 5 }],
    ayuda: { pedidos: 5, cierres: 4, gruposInvolucrados: 6 }, nudosQuipu: 3,
  };
  const reporte = construirReporteMensual({
    destinatario: 'director', periodo: { mes: '2026-11', desde: '2026-11-01', hasta: '2026-11-30' }, colegioCodigo: '0123456',
    aulas: [aula], ultimaSincronizacion: '2026-11-28', versionCneb: 'CNEB-2016', ejemplo: true,
  });

  it('is a standalone A4 document with print styles, no scripts, no remote resources and no images', () => {
    const html = htmlImprimible(reporte);
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('@media print');
    expect(html).toContain('size: A4');
    expect(html).not.toMatch(/<script|<img|https?:\/\//i);
  });
  it('escapes content, shows suppressed cells as "&lt;5" and the provenance footer', () => {
    const html = htmlImprimible(reporte);
    expect(html).toContain('Problematiza &lt;situaciones&gt;');
    expect(html).toContain('Datos guardados en cada celular, sincronizados el 2026-11-28. El informe no incluye nombres de estudiantes ni imágenes.');
    expect(html).toContain('Datos de ejemplo');
  });
  it('identifies the school by code and carries no mascot or gamification language', () => {
    const html = htmlImprimible(reporte);
    expect(html).toContain('0123456');
    expect(html).not.toMatch(/mascota|nudos?\b|ranking|puntos|racha/i);
  });
  it('the PDF port has an offline HTML adapter', async () => {
    const f = await generadorHtmlImprimible.generar(reporte);
    expect(f.tipoMime).toBe('text/html');
    expect(f.nombre).toBe('informe-director-2026-11-0123456.html');
    expect(String(f.contenido)).toContain('@media print');
  });
});
