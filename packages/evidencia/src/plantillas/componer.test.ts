import { describe, expect, it } from 'vitest';
import { avancePorGrupo } from '../avance.ts';
import { coberturaPorCapacidad } from '../cobertura.ts';
import { construirEscenario } from '../demo/escenario.ts';
import { construirVistaEvidencias } from '../evidencias.ts';
import { proyectar } from '../proyeccion.ts';
import { sha256 } from '../mensajeria/sha256.ts';
import { componerDirector, componerTutora, construirMensajeSaliente } from './componer.ts';
import { renderInforme } from './informe.ts';
import { renderTutora } from './tutora.ts';

const esc = construirEscenario();
const p = proyectar(esc.eventos);
const vista = construirVistaEvidencias(p);
const avance = avancePorGrupo(p, 30);
const cobertura = coberturaPorCapacidad(vista);
const comun = { fechaIni: '2026-11-02', fechaFin: '2026-11-06', enlaceApp: 'https://rikuy.app/#/docente' };

describe('composers: contract data in, allow-listed template input out', () => {
  it('builds a valid weekly digest from the class events', () => {
    const entrada = componerTutora({ p, vista, avance, cobertura, ...comun, exhibiciones: 1, sincronizadoHasta: 'viernes 17:00', mensajesPorAprobar: 2 });
    const r = renderTutora(entrada);
    expect(r.texto).toContain('4 de 4 grupos entregaron evidencia');
    expect(r.texto).toContain('Problematiza situaciones');
  });

  it('gives the same digest whatever the order of the events (and the same as without Guardian signals)', () => {
    const a = renderTutora(componerTutora({ p, vista, avance, cobertura, ...comun, exhibiciones: 1, sincronizadoHasta: 'viernes 17:00' }));
    const conSenales = [
      ...esc.eventos,
      {
        ...esc.eventos[3], id: '01JC0000000000000000000SE01', seq: 777, tipo: 'senales.agregado' as const,
        datos: { grupoId: esc.grupoIds.Condor, ventana: 1, confusion: { alto: 9, medio: 1, bajo: 0 }, frustracion: { alto: 9, medio: 0, bajo: 1 }, atencion: { alto: 0, medio: 0, bajo: 10 } },
      },
    ].reverse();
    const p2 = proyectar(conSenales);
    const v2 = construirVistaEvidencias(p2);
    const b = renderTutora(componerTutora({ p: p2, vista: v2, avance: avancePorGrupo(p2, 30), cobertura: coberturaPorCapacidad(v2), ...comun, exhibiciones: 1, sincronizadoHasta: 'viernes 17:00' }));
    expect(b).toEqual(a);
  });

  it('builds a principal report from one classroom and suppresses it when it has fewer than 5 groups', () => {
    const entrada = componerDirector({ p, cobertura, institucion: 'IE 40123', mes: '2026-11', seccion: '2.º B', ultimaSync: '2026-11-06', exhibiciones: 1, datosSimulados: true });
    const r = renderInforme(entrada);
    expect(r.texto).toContain('menos de 5 grupos');
    expect(r.texto).not.toMatch(/4 de 4/);
  });
});

describe('outgoing message', () => {
  const r = renderTutora(componerTutora({ p, vista, avance, cobertura, ...comun, exhibiciones: 1, sincronizadoHasta: 'viernes 17:00' }));

  it('derives a stable idempotency key from period, recipient and template', () => {
    const base = { id: '01JC00000000000000000MSG01', plantilla: 'tutora_semanal' as const, periodo: '2026-W45', destinatarioClave: 'docente', renderizado: r, vigenteHasta: '2026-11-11T23:59:00.000Z', consentimientoRef: 'alta-2026-03' };
    const a = construirMensajeSaliente(base);
    const b = construirMensajeSaliente({ ...base, id: '01JC00000000000000000MSG02' });
    expect(a.claveIdempotencia).toBe(b.claveIdempotencia);
    expect(a.claveIdempotencia).toBe(sha256('2026-W45|docente|tutora_semanal'));
    expect(construirMensajeSaliente({ ...base, periodo: '2026-W46' }).claveIdempotencia).not.toBe(a.claveIdempotencia);
  });

  it('keeps the rendered body and attaches the PDF by hash when there is one', () => {
    const m = construirMensajeSaliente({ id: '01JC00000000000000000MSG01', plantilla: 'director_mensual', periodo: '2026-10', destinatarioClave: 'director', renderizado: r, adjuntos: [{ tipo: 'pdf', hash: 'a'.repeat(64) }], vigenteHasta: '2026-11-30T00:00:00.000Z', consentimientoRef: 'x' });
    expect(m.cuerpo.texto).toBe(r.texto);
    expect(m.cuerpo.html).toBe(r.html);
    expect(m.adjuntos).toEqual([{ tipo: 'pdf', hash: 'a'.repeat(64) }]);
  });
});
