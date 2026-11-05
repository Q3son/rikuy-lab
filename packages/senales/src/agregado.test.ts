import { describe, expect, it } from 'vitest';
import { EventoAprendizaje } from '@rikuy/contracts';
import { hlcs, ids } from '@rikuy/contracts/fixtures';
import { afirmarSinEtiquetasEmocionales, agregarCurso, construirAutorreporte, MIN_PARTICIPANTES } from './index.ts';

const INICIO = 1762300800000;
const est = (i: number) => `01JC${'0'.repeat(18)}E${String(i).padStart(3, '0')}`;
const grupo = (i: number) => `01JC${'0'.repeat(18)}G${String(i).padStart(3, '0')}`;
const pista = (i: number, minuto: number, g = 1, paso = 'medir') =>
  EventoAprendizaje.parse({
    id: `01JC${'0'.repeat(18)}P${String(i).padStart(3, '0')}`,
    claseId: ids.clase,
    grupoId: grupo(g),
    pasoId: paso,
    hlc: `${INICIO + minuto * 60_000}-0000-docente1`,
    tipo: 'pista_solicitada',
    nivel: 1,
  });
const ar = (i: number, ayuda: 'pista' | 'pausa', vis: 'solo_yo' | 'mi_docente' = 'solo_yo') =>
  construirAutorreporte({
    id: `01JC${'0'.repeat(18)}A${String(i).padStart(3, '0')}`,
    estudianteId: est(i), claseId: ids.clase, pasoId: 'medir', hlc: hlcs.h2,
    emociones: [{ emocion: 'confusion', intensidad: 'mucho' }], ayuda, visibilidad: vis,
  });

describe('agregarCurso (class aggregate, 5 or more)', () => {
  const cinco = [1, 2, 3, 4, 5].map(est);

  it('is suppressed below 5 participants, with the exact message', () => {
    expect(MIN_PARTICIPANTES).toBe(5);
    const r = agregarCurso({ participantes: cinco.slice(0, 4), autorreportes: [], eventos: [], inicioClaseMs: INICIO, gruposTotal: 2 });
    expect(r).toEqual({ estado: 'suprimido', mensaje: 'Muy pocos participantes para mostrar un resumen.' });
  });

  it('shows hint requests per 5-minute bin with an actionable sentence about instruction', () => {
    const eventos = [pista(1, 21, 1), pista(2, 22, 2), pista(3, 23, 3), pista(4, 24, 4), pista(5, 3, 5)];
    const r = agregarCurso({ participantes: cinco, autorreportes: [], eventos, inicioClaseMs: INICIO, gruposTotal: 5, nombrePaso: () => 'medir 10 oscilaciones' });
    if (r.estado !== 'visible') throw new Error('should be visible');
    expect(r.participan).toBe(5);
    expect(r.pistasPorBin.find((b) => b.desdeMin === 20)).toMatchObject({ pedidos: 4, grupos: 4 });
    expect(r.oracion).toBe('Entre los minutos 20 y 25, 4 de 5 grupos pidieron pista en «medir 10 oscilaciones». Revisa cómo se explica ese paso.');
  });

  it('the help asked by check-ins shows only from 5 distinct responses, privates included, without ids', () => {
    const cuatro = [1, 2, 3, 4].map((i) => ar(i, 'pista'));
    const sin = agregarCurso({ participantes: cinco, autorreportes: cuatro, eventos: [], inicioClaseMs: INICIO, gruposTotal: 2 });
    if (sin.estado !== 'visible') throw new Error('visible');
    expect(sin.ayudaDeseada).toBeUndefined();
    const cincoAr = [1, 2, 3, 4, 5].map((i) => ar(i, i < 4 ? 'pista' : 'pausa', i % 2 ? 'solo_yo' : 'mi_docente'));
    const con = agregarCurso({ participantes: cinco, autorreportes: cincoAr, eventos: [], inicioClaseMs: INICIO, gruposTotal: 2 });
    if (con.estado !== 'visible') throw new Error('visible');
    expect(con.ayudaDeseada).toEqual({ pista: 3, pausa: 2 });
    expect(JSON.stringify(con)).not.toContain(est(1));
    afirmarSinEtiquetasEmocionales(con);
  });
});
