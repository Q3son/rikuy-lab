import { describe, expect, it } from 'vitest';
import { AsientoQuipu } from '@rikuy/contracts';
import { ids } from '@rikuy/contracts/fixtures';
import * as quipu from './index.ts';
import {
  agregarAsiento,
  asientosDeAyuda,
  crearLibro,
  desbloqueosDe,
  emitirPorReglas,
  nuevosAsientos,
  revocarAyuda,
  saldoAula,
  saldoGrupo,
  saldoTotalAula,
  type AyudaCerrada,
  type SnapshotClase,
} from './index.ts';

const g = (n: number) => `01JC${'0'.repeat(18)}G${String(n).padStart(3, '0')}`;
const DIA = 24 * 3600 * 1000;
const T0 = Date.UTC(2026, 10, 5, 15, 0, 0); // Thursday

const snapshot = (over: Partial<SnapshotClase> = {}): SnapshotClase => ({
  aulaId: ids.aula,
  claseId: ids.clase,
  grupos: [
    { grupoId: g(1), predijoAntesDeMedir: true, medicionCompleta: true, concluyoConDato: true, evidenciaRef: ids.evidencia },
    { grupoId: g(2), predijoAntesDeMedir: true, medicionCompleta: false, concluyoConDato: false },
  ],
  retosCooperativosCompletados: [],
  ...over,
});

describe('emitirPorReglas (pure, deterministic, teacher-phone only)', () => {
  it('gives the classroom a knot when every group predicted before measuring', () => {
    const a = emitirPorReglas(snapshot());
    expect(a.filter((x) => x.motivo === 'todos_predijeron')).toEqual([expect.objectContaining({ beneficiario: { tipo: 'aula' }, nudos: 1, emitidoPor: 'reglas' })]);
  });
  it('does not when one group did not', () => {
    const s = snapshot({ grupos: [{ grupoId: g(1), predijoAntesDeMedir: true, medicionCompleta: false, concluyoConDato: false }, { grupoId: g(2), predijoAntesDeMedir: false, medicionCompleta: false, concluyoConDato: false }] });
    expect(emitirPorReglas(s).some((x) => x.motivo === 'todos_predijeron')).toBe(false);
  });
  it('gives a group a knot for a complete measurement and for a conclusion backed by evidence', () => {
    const a = emitirPorReglas(snapshot());
    expect(a.filter((x) => x.beneficiario.tipo === 'grupo').map((x) => [x.motivo, x.beneficiario])).toEqual(
      expect.arrayContaining([
        ['medicion_completa', { tipo: 'grupo', grupoId: g(1) }],
        ['conclusion_con_dato', { tipo: 'grupo', grupoId: g(1) }],
      ]),
    );
    expect(a.find((x) => x.motivo === 'conclusion_con_dato')?.evidenciaRef).toBe(ids.evidencia);
  });
  it('a conclusion without evidence earns nothing', () => {
    const s = snapshot({ grupos: [{ grupoId: g(1), predijoAntesDeMedir: false, medicionCompleta: false, concluyoConDato: true }] });
    expect(emitirPorReglas(s).some((x) => x.motivo === 'conclusion_con_dato')).toBe(false);
  });
  it('cooperative challenges add to the classroom', () => {
    const a = emitirPorReglas(snapshot({ retosCooperativosCompletados: ['reto-1'] }));
    expect(a.filter((x) => x.motivo === 'reto_cooperativo')).toHaveLength(1);
  });
  it('every emitted entry is a valid contract entry with a stable id; re-running adds nothing', () => {
    const a = emitirPorReglas(snapshot());
    for (const x of a) expect(AsientoQuipu.safeParse(x).success).toBe(true);
    expect(emitirPorReglas(snapshot()).map((x) => x.id)).toEqual(a.map((x) => x.id));
    const libro = a.reduce(agregarAsiento, crearLibro());
    expect(nuevosAsientos(libro, a)).toEqual([]);
  });
});

describe('Ayudante del museo: knots for peer help', () => {
  const ayuda = (n: number, over: Partial<AyudaCerrada> = {}): AyudaCerrada => ({
    id: `01JC${'0'.repeat(18)}H${String(n).padStart(3, '0')}`,
    aulaId: ids.aula,
    claseId: ids.clase,
    ayudanteGrupoId: g(1),
    pideGrupoId: g(2),
    conceptoId: 'periodo-pendulo',
    resultado: 'nos_ayudo',
    juez: 'evaluable',
    confirmacion: 'docente',
    ts: T0,
    ...over,
  });
  const regla = { requiereDocente: true };

  it('goes to the helper group and adds one to the classroom; the group that asked loses nothing', () => {
    const r = asientosDeAyuda(ayuda(1), [], regla);
    if (!('asientos' in r)) throw new Error('expected entries');
    expect(r.asientos).toHaveLength(2);
    expect(r.asientos.map((a) => a.beneficiario)).toEqual(expect.arrayContaining([{ tipo: 'grupo', grupoId: g(1) }, { tipo: 'aula' }]));
    expect(r.asientos.every((a) => a.motivo === 'ayudo_a_otro_grupo' && a.nudos === 1)).toBe(true);
    const libro = r.asientos.reduce(agregarAsiento, crearLibro());
    expect(saldoGrupo(libro, g(2))).toBe(0);
    expect(saldoGrupo(libro, g(1))).toBe(1);
    expect(saldoAula(libro, ids.aula)).toBe(1);
  });
  it('keeps a request "por confirmar" until the teacher sees it when the class rule says so', () => {
    expect(asientosDeAyuda(ayuda(1, { confirmacion: 'pendiente' }), [], regla)).toEqual({ pendiente: true });
  });
  it('without teacher rule an evaluable close counts; a not-evaluable one still needs the teacher', () => {
    expect('asientos' in asientosDeAyuda(ayuda(1, { confirmacion: 'automatica' }), [], { requiereDocente: false })).toBe(true);
    expect(asientosDeAyuda(ayuda(1, { confirmacion: 'automatica', juez: 'no_evaluable' }), [], { requiereDocente: false })).toMatchObject({ rechazada: 'requiere_docente' });
  });
  it('a group cannot help itself and "aún no" earns nothing', () => {
    expect(asientosDeAyuda(ayuda(1, { pideGrupoId: g(1) }), [], regla)).toMatchObject({ rechazada: 'mismo_grupo' });
    expect(asientosDeAyuda(ayuda(1, { resultado: 'aun_no' }), [], regla)).toMatchObject({ rechazada: 'sin_ayuda' });
  });
  it('anti-collusion: max 3 per helper group per day', () => {
    const previas = [1, 2, 3].map((n) => ayuda(n, { pideGrupoId: g(10 + n), conceptoId: `c${n}` }));
    expect(asientosDeAyuda(ayuda(4, { pideGrupoId: g(20), conceptoId: 'c9' }), previas, regla)).toMatchObject({ rechazada: 'tope_diario' });
    expect('asientos' in asientosDeAyuda(ayuda(4, { pideGrupoId: g(20), conceptoId: 'c9', ts: T0 + DIA }), previas, regla)).toBe(true);
  });
  it('anti-collusion: one per (helper, asker, concept) per week', () => {
    const previas = [ayuda(1)];
    expect(asientosDeAyuda(ayuda(2, { ts: T0 + DIA }), previas, regla)).toMatchObject({ rechazada: 'repetida_semana' });
    expect(asientosDeAyuda(ayuda(2, { conceptoId: 'otro' }), previas, regla)).toHaveProperty('asientos');
    expect(asientosDeAyuda(ayuda(2, { ts: T0 + 8 * DIA }), previas, regla)).toHaveProperty('asientos');
  });
  it('the teacher can revoke: a correction in the ledger, never a deletion', () => {
    const a = ayuda(1);
    const r = asientosDeAyuda(a, [], regla);
    if (!('asientos' in r)) throw new Error('expected entries');
    const libro = r.asientos.reduce(agregarAsiento, crearLibro());
    const correcciones = revocarAyuda(a);
    expect(correcciones).toHaveLength(2);
    const despues = correcciones.reduce(agregarAsiento, libro);
    expect(despues.asientos).toHaveLength(4);
    expect(saldoGrupo(despues, g(1))).toBe(0);
    expect(correcciones.every((c) => c.emitidoPor === 'docente' && c.motivo === 'correccion_docente' && c.nudos === -1)).toBe(true);
  });
});

describe('no purchases, no rankings', () => {
  it('exposes no spend, buy or rank-by-group API', () => {
    const nombres = Object.keys(quipu).join(' ');
    expect(nombres).not.toMatch(/gastar|comprar|canjear|tienda|ranking|clasific|ordenar|posicion|top\b/i);
  });
  it('unlocks are collective and monotonic in the classroom balance', () => {
    const catalogo = [{ id: 'sala-fisica', nudos: 3 }, { id: 'deco-1', nudos: 8 }];
    expect(desbloqueosDe(0, catalogo)).toEqual([]);
    expect(desbloqueosDe(3, catalogo)).toEqual(['sala-fisica']);
    expect(desbloqueosDe(9, catalogo)).toEqual(['sala-fisica', 'deco-1']);
  });
  it('the classroom balance counts the classroom cord and every group cord of that classroom', () => {
    const libro = [
      { id: quipu.idDeterminista('x', '1'), aulaId: ids.aula, beneficiario: { tipo: 'aula' as const }, nudos: 2, motivo: 'todos_predijeron' as const, emitidoPor: 'reglas' as const },
      { id: quipu.idDeterminista('x', '2'), aulaId: ids.aula, beneficiario: { tipo: 'grupo' as const, grupoId: g(1) }, nudos: 3, motivo: 'medicion_completa' as const, emitidoPor: 'reglas' as const },
    ].reduce(agregarAsiento, crearLibro());
    expect(saldoTotalAula(libro, ids.aula)).toBe(5);
  });
});
