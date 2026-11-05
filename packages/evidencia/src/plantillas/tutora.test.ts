import { describe, expect, it } from 'vitest';
import { renderTutora } from './tutora.ts';

const entrada = {
  claseEtiqueta: '2.º B',
  fechaIni: '2026-11-02',
  fechaFin: '2026-11-06',
  exhibiciones: 3,
  gruposEntregaron: 5,
  gruposTotal: 6,
  competencia: {
    nombre: 'Indaga mediante métodos científicos para construir sus conocimientos',
    capacidades: [
      { nombre: 'Problematiza situaciones', conEvidencia: 5, trabajadas: 6 },
      { nombre: 'Genera y registra datos o información', conEvidencia: 4, trabajadas: 6 },
    ],
  },
  costaron: [{ concepto: 'Longitud → periodo', gruposAfectados: 4, gruposTotal: 6 }],
  dudas: [{ tema: 'Contar las oscilaciones' }],
  ayuda: { pedidos: 7, cerrados: 6, nudosPorConfirmar: 4 },
  pendientes: { gruposSinEntregar: 1, nudosPorConfirmar: 4, vitrinasPorAbrir: 0, mensajesPorAprobar: 2, cierreEscolar: { fecha: '2026-12-11', fuente: 'Infobae, 13 oct 2026' } },
  proxima: { titulo: 'Plano inclinado' },
  enlaceApp: 'https://rikuy.app/#/docente',
  sincronizadoHasta: 'viernes 17:00',
} as const;

describe('weekly digest for the teacher-tutor', () => {
  const r = renderTutora(entrada);

  it('matches the snapshot in the three shapes', () => {
    expect(r.asunto).toMatchSnapshot('asunto');
    expect(r.texto).toMatchSnapshot('texto');
    expect(r.whatsapp).toMatchSnapshot('whatsapp');
    expect(r.html).toMatchSnapshot('html');
  });

  it('puts the week and the class in the subject, without students', () => {
    expect(r.asunto).toBe('Rikuy · 2.º B · semana del 2 al 6 de noviembre');
  });

  it('keeps the fixed order: summary, competency, difficulties, pending, next, button, footer', () => {
    const t = r.texto;
    const orden = ['Esta semana:', 'Competencia que avanzó', 'Lo que les costó', 'Ayuda entre pares', 'Pendientes', 'Próxima exhibición', 'Abrir Mi clase de hoy', 'Orienta, no califica'];
    const pos = orden.map((x) => t.indexOf(x));
    expect(pos.every((x) => x >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it('shows "sin evidencia aún" as a gap, never as a zero', () => {
    expect(r.texto).toContain('5 de 6');
    expect(r.texto).toContain('sin evidencia aún');
  });

  it('never carries quotes, nicknames, scores, ordering by progress or Guardian', () => {
    for (const t of [r.texto, r.html, r.whatsapp].map((x) => x.replaceAll('2.º B', '2.º sección'))) {
      expect(t).not.toMatch(/«|Condor|Vizcacha|Puma|Kantu|Guardi[aá]n|check-in|para acercarse|ranking|puntaje|mejor grupo|\b(AD|B|C)\b/i);
    }
  });

  it('rejects a field that is not in the allow-list (a Guardian count, a quote, a score)', () => {
    expect(() => renderTutora({ ...entrada, guardian: { sugerencias: 2 } })).toThrow();
    expect(() => renderTutora({ ...entrada, citas: ['hola'] })).toThrow();
    expect(() => renderTutora({ ...entrada, ranking: [] })).toThrow();
  });

  it('does not depend on the order of the capacities in a way that reorders by value', () => {
    const invertido = renderTutora({ ...entrada, competencia: { ...entrada.competencia, capacidades: [...entrada.competencia.capacidades].reverse() } });
    // the template keeps the order it receives: the composer decides, the template never sorts by value
    expect(invertido.texto.indexOf('Genera y registra')).toBeLessThan(invertido.texto.indexOf('Problematiza'));
  });

  it('escapes HTML in every dynamic value', () => {
    const x = renderTutora({ ...entrada, proxima: { titulo: '<img src=x onerror=alert(1)>' } });
    expect(x.html).not.toContain('<img src=x');
  });

  it('sends a short WhatsApp message with the link, not the whole report', () => {
    expect(r.whatsapp.length).toBeLessThan(400);
    expect(r.whatsapp).toContain('https://rikuy.app/#/docente');
  });

  it('adds the local sentence when the class context has one', () => {
    expect(renderTutora({ ...entrada, fraseLocal: 'Falta poco para Yaku Raymi.' }).texto).toContain('Falta poco para Yaku Raymi.');
  });
});
