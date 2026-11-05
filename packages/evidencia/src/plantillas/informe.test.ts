import { describe, expect, it } from 'vitest';
import { renderInforme } from './informe.ts';

const cap = (nombre: string, con: number, total: number) => ({ nombre, gruposConEvidencia: con, gruposTotal: total });
const capacidades = (con: number, total: number) => [
  cap('Problematiza situaciones', con, total),
  cap('Diseña estrategias para hacer indagación', con, total),
  cap('Genera y registra datos o información', con, total),
  cap('Analiza datos e información', con, total),
  cap('Evalúa y comunica el proceso y resultados de su indagación', con, total),
];

const base = {
  alcance: 'director',
  institucion: 'IE 40123 Santa Rosa de Chivay',
  mes: '2026-10',
  datosSimulados: true,
  sincronizacion: { aulasSincronizadas: 3, aulasTotal: 5, ultima: '2026-11-02' },
  cifras: { exhibicionesRealizadas: 14, seccionesActivas: 5, pctSesionesConEvidencia: 82, diasCierreCubiertos: 0, coberturaDatosPct: 60 },
  cobertura: [
    { seccion: '3.º A', capacidades: capacidades(7, 8) },
    { seccion: '2.º B', capacidades: capacidades(6, 6) },
    { seccion: '1.º C', capacidades: capacidades(3, 4) }, // only 4 groups: must be suppressed
  ],
  conceptos: [{ concepto: 'Longitud → periodo', gruposAfectados: 9, gruposTotal: 18 }],
  continuidad: { diasCierre: 0, paquetesEnviados: 40, paquetesDevueltosQr: 22, porCanal: { qr: 18, whatsapp: 16, a4: 6 } },
  brechas: { sesionesSinRed: 11, horasAudioQuechua: 3.5 },
  ayuda: { pedidos: 12, cerrados: 10 },
} as const;

const ugel = {
  ...base,
  alcance: 'ugel',
  institucion: 'UGEL Caylloma',
  territorial: [
    { codigoModular: '0654321', gruposConEvidencia: 30, gruposTotal: 40 },
    { codigoModular: '0123456', gruposConEvidencia: 3, gruposTotal: 4 },
    { codigoModular: '0555555', gruposConEvidencia: 12, gruposTotal: 20 },
  ],
} as const;

describe('monthly report for the principal', () => {
  const r = renderInforme(base);

  it('matches the snapshot (e-mail, text, WhatsApp and printable page)', () => {
    expect(r.asunto).toMatchSnapshot('asunto');
    expect(r.texto).toMatchSnapshot('texto');
    expect(r.whatsapp).toMatchSnapshot('whatsapp');
    expect(r.html).toMatchSnapshot('html');
    expect(r.htmlImprimible).toMatchSnapshot('imprimible');
  });

  it('is a 4-page A4 document for the principal and 6 for the UGEL', () => {
    expect(r.paginasMax).toBe(4);
    expect(renderInforme(ugel).paginasMax).toBe(6);
    expect(r.htmlImprimible).toContain('@page{size:A4');
  });

  it('suppresses cells with fewer than 5 groups, without leaking the real number', () => {
    for (const t of [r.texto, r.htmlImprimible, r.html]) {
      expect(t).toContain('menos de 5 grupos');
      expect(t).not.toContain('3 de 4');
    }
  });

  it('says when not every classroom synchronized', () => {
    expect(r.texto).toContain('3 de 5 aulas sincronizaron');
  });

  it('labels simulated data and carries the provenance footer', () => {
    expect(r.htmlImprimible).toContain('Datos de ejemplo');
    expect(r.htmlImprimible).toContain('El informe no incluye nombres de estudiantes ni imágenes.');
    expect(r.htmlImprimible).toContain('Orienta, no califica');
  });

  it('never carries students, nicknames, quotes, Guardian, risk colors or rankings', () => {
    for (const t of [r.texto, r.html, r.htmlImprimible, r.whatsapp]) {
      expect(t).not.toMatch(/«|Condor|Vizcacha|Puma|Kantu|Guardi[aá]n|riesgo|sem[aá]foro|alerta|ranking|mejor|peor|puntaje|\bE\d{2}\b/i);
    }
  });

  it('orders classrooms alphabetically, never by value', () => {
    const t = r.texto;
    expect(t.indexOf('1.º C')).toBeLessThan(t.indexOf('2.º B'));
    expect(t.indexOf('2.º B')).toBeLessThan(t.indexOf('3.º A'));
    const permutado = renderInforme({ ...base, cobertura: [...base.cobertura].reverse() });
    expect(permutado.texto).toBe(t);
  });

  it('rejects fields outside the allow-list', () => {
    expect(() => renderInforme({ ...base, alumnos: ['E01'] })).toThrow();
    expect(() => renderInforme({ ...base, guardian: { cursos: 3 } })).toThrow();
  });

  it('escapes HTML in names', () => {
    const x = renderInforme({ ...base, institucion: '<script>alert(1)</script>' });
    expect(x.html).not.toContain('<script>alert');
    expect(x.htmlImprimible).not.toContain('<script>alert');
  });

  it('is an attachment-ready message: the PDF is described, not embedded', () => {
    expect(r.adjunto.nombre).toBe('informe-director-2026-10.pdf');
  });
});

describe('monthly report for the UGEL', () => {
  const r = renderInforme(ugel);

  it('lists schools by modular code with no color coding and no ordering by result', () => {
    const t = r.texto;
    expect(t.indexOf('0123456')).toBeLessThan(t.indexOf('0555555'));
    expect(t.indexOf('0555555')).toBeLessThan(t.indexOf('0654321'));
    expect(renderInforme({ ...ugel, territorial: [...ugel.territorial].reverse() }).texto).toBe(t);
  });

  it('suppresses a school with fewer than 5 groups', () => {
    expect(r.texto).not.toContain('3 de 4');
    expect(r.texto).toMatch(/0123456[^\n]*menos de 5 grupos/);
  });

  it('matches the snapshot', () => {
    expect(r.texto).toMatchSnapshot('texto');
  });
});
