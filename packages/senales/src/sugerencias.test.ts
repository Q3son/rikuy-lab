import { describe, expect, it } from 'vitest';
import { AlertaDocente, type SenalApoyo } from '@rikuy/contracts';
import { hlcs, ids } from '@rikuy/contracts/fixtures';
import {
  MAX_SUGERENCIAS_POR_SEMANA,
  afirmarSinEtiquetasEmocionales,
  construirAutorreporte,
  construirPedidoDeAyuda,
  crearRegistroSugerencias,
  generarSugerencias,
  inicioDeSemana,
  planificarSemana,
  type PedidoDeAyuda,
} from './index.ts';

const AHORA = Date.UTC(2026, 10, 5, 15, 0, 0); // Thursday 5 Nov 2026, 10:00 Lima
const senal = (estado: SenalApoyo['estado'], estudianteId: string = ids.estudiante1, n = 1): SenalApoyo => ({
  id: `01JC${'0'.repeat(18)}S${String(n).padStart(3, '0')}`,
  claseId: ids.clase,
  grupoId: ids.grupo1,
  estudianteId,
  estado,
  relativoALineaBase: true,
  confianza: 0.7,
  generadoEn: AHORA,
  expiraEn: AHORA + 600_000,
  eventoIds: [ids.evento1],
});
const pedido = (estudianteId: string, extra: Partial<PedidoDeAyuda> = {}): PedidoDeAyuda =>
  construirPedidoDeAyuda({ id: ids.respuesta, estudianteId, claseId: ids.clase, destino: 'docente', urgente: false, hlc: hlcs.h2, ...extra });
const compartido = (emocion: 'frustracion' | 'calma', estudianteId: string = ids.estudiante1) =>
  construirAutorreporte({
    id: ids.respuesta, estudianteId, claseId: ids.clase, pasoId: 'medir', hlc: hlcs.h2,
    emociones: [{ emocion, intensidad: 'mucho' }], visibilidad: 'mi_docente', texto: 'No me sale',
  });
const ctx = { ahora: AHORA, tutorId: 'tutor-1', nombrePaso: (p: string) => (p === 'medir' ? 'medir 10 oscilaciones' : p) };

describe('generarSugerencias (acercarse a conversar, pedagogical wording only)', () => {
  it('a student request to talk creates a suggestion and says so plainly', () => {
    const r = generarSugerencias({ senales: [], pedidos: [pedido(ids.estudiante1)], autorreportes: [] }, ctx);
    expect(r.sugerencias).toHaveLength(1);
    const s = r.sugerencias[0];
    expect(s).toMatchObject({ origen: 'pidio_hablar', sugerencia: 'acercarse_a_conversar', visibilidad: 'solo_docente', escalarSiseVe: false });
    expect(s?.texto).toMatch(/Pidió hablar con usted/);
    expect(s?.guiaConversacion.length).toBeGreaterThan(0);
  });

  it('one behaviour signal alone creates nothing (needs a request or two channels)', () => {
    expect(generarSugerencias({ senales: [senal('atascado_en_habilidad')], pedidos: [], autorreportes: [] }, ctx).sugerencias).toEqual([]);
  });

  it('two channels that coincide (shared check-in + stuck) create a suggestion without naming any feeling', () => {
    const r = generarSugerencias({ senales: [senal('atascado_en_habilidad')], pedidos: [], autorreportes: [compartido('frustracion')] }, ctx);
    expect(r.sugerencias[0]?.origen).toBe('canales_coinciden');
    expect(r.sugerencias[0]?.texto).toMatch(/sin avanzar/);
    afirmarSinEtiquetasEmocionales(r.sugerencias);
  });

  it('a private check-in never contributes to an individual suggestion', () => {
    const privado = { ...compartido('frustracion'), visibilidad: 'solo_yo' as const };
    expect(generarSugerencias({ senales: [senal('atascado_en_habilidad')], pedidos: [], autorreportes: [privado] }, ctx).sugerencias).toEqual([]);
  });

  it('a discrepancy signal creates a "canales_discrepan" suggestion with a valid contract alert', () => {
    const r = generarSugerencias({ senales: [senal('discrepancia_autorreporte_conducta')], pedidos: [], autorreportes: [] }, ctx);
    expect(r.sugerencias[0]?.origen).toBe('canales_discrepan');
    expect(AlertaDocente.safeParse(r.sugerencias[0]?.alerta).success).toBe(true);
  });

  it('the human decides: closing needs the teacher and keeps a local label', () => {
    const reg = crearRegistroSugerencias();
    const [s] = generarSugerencias({ senales: [], pedidos: [pedido(ids.estudiante1)], autorreportes: [] }, ctx).sugerencias;
    reg.registrar('tutor-1', s!);
    reg.decidir(s!.id, 'ya_converse', AHORA);
    expect(reg.etiquetaLocal(s!.id)).toBe('ya_converse');
    expect(reg.pendientes('tutor-1')).toHaveLength(0);
  });
});

describe('SíseVe escalation', () => {
  it('an urgent request escalates, tells the teacher to follow the route and carries no content', () => {
    const r = generarSugerencias({ senales: [], pedidos: [pedido(ids.estudiante1, { urgente: true })], autorreportes: [] }, ctx);
    const s = r.sugerencias[0];
    expect(s?.escalarSiseVe).toBe(true);
    expect(s?.texto).toMatch(/SíseVe/);
    expect(s?.aviso).toMatch(/director/);
  });

  it('an escalation is never held back by the weekly cap', () => {
    const pedidos = [1, 2, 3, 4].map((i) => pedido(`01JC${'0'.repeat(18)}E${String(i).padStart(3, '0')}`));
    const urgente = pedido(ids.estudiante3, { urgente: true });
    const todas = generarSugerencias({ senales: [], pedidos: [...pedidos, urgente], autorreportes: [] }, ctx).sugerencias;
    const plan = planificarSemana(todas, { tutorId: 'tutor-1', ahora: AHORA, yaEmitidasEstaSemana: 3 });
    expect(plan.emitir.map((s) => s.escalarSiseVe)).toEqual([true]);
    expect(plan.diferidas).toHaveLength(4);
  });

  it('a request addressed to another adult is not routed to the teacher as a suggestion', () => {
    const r = generarSugerencias({ senales: [], pedidos: [pedido(ids.estudiante1, { destino: 'otro_adulto' })], autorreportes: [] }, ctx);
    expect(r.sugerencias).toEqual([]);
    expect(r.paraOtroAdulto).toBe(1);
  });
});

describe('weekly cap: at most 3 per tutor per week', () => {
  const muchos = Array.from({ length: 7 }, (_, i) => pedido(`01JC${'0'.repeat(18)}E${String(i).padStart(3, '0')}`));
  const todas = generarSugerencias({ senales: [], pedidos: muchos, autorreportes: [] }, ctx).sugerencias;

  it('emits only 3 and defers the rest to next week', () => {
    expect(MAX_SUGERENCIAS_POR_SEMANA).toBe(3);
    const p = planificarSemana(todas, { tutorId: 'tutor-1', ahora: AHORA, yaEmitidasEstaSemana: 0 });
    expect(p.emitir).toHaveLength(3);
    expect(p.diferidas).toHaveLength(4);
  });
  it('counts what was already emitted this week', () => {
    expect(planificarSemana(todas, { tutorId: 'tutor-1', ahora: AHORA, yaEmitidasEstaSemana: 2 }).emitir).toHaveLength(1);
    expect(planificarSemana(todas, { tutorId: 'tutor-1', ahora: AHORA, yaEmitidasEstaSemana: 3 }).emitir).toHaveLength(0);
  });
  it('requests from the student rank before coinciding channels, then discrepancies', () => {
    const mix = generarSugerencias(
      {
        senales: [senal('discrepancia_autorreporte_conducta', ids.estudiante2, 2), senal('atascado_en_habilidad', ids.estudiante3, 3)],
        pedidos: [pedido(ids.estudiante1)],
        autorreportes: [compartido('frustracion', ids.estudiante3)],
      },
      ctx,
    ).sugerencias;
    expect(planificarSemana(mix, { tutorId: 'tutor-1', ahora: AHORA, yaEmitidasEstaSemana: 0 }).emitir.map((s) => s.origen)).toEqual(['pidio_hablar', 'canales_coinciden', 'canales_discrepan']);
  });
  it('the registry counts per tutor and per Lima week (Monday start)', () => {
    const reg = crearRegistroSugerencias();
    for (const s of todas.slice(0, 3)) reg.registrar('tutor-1', s);
    expect(reg.emitidasEnSemana('tutor-1', AHORA)).toBe(3);
    expect(reg.emitidasEnSemana('tutor-2', AHORA)).toBe(0);
    expect(reg.emitidasEnSemana('tutor-1', AHORA + 7 * 24 * 3600_000)).toBe(0);
    const lunes = inicioDeSemana(AHORA);
    expect(new Date(lunes - 5 * 3600_000).getUTCDay()).toBe(1);
  });
});
