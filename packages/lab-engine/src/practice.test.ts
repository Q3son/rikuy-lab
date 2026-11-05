import { Medicion, Practica, RespuestaRazonamiento } from '@rikuy/contracts';
import { ejemplos, ids } from '@rikuy/contracts/fixtures';
import { describe, expect, it } from 'vitest';
import { pendulumPeriod } from './models.ts';
import {
  comparisonTable,
  createPractice,
  protocolFromPractice,
  replay,
  step,
  type LabEvent,
  type PracticeAction,
  type PracticeState,
} from './practice.ts';

const context = { claseId: ids.clase, grupoId: ids.grupo1, practicaId: ids.practica, lengua: 'es' as const };
const protocol = { lengthsM: [0.25, 0.5, 1.0], oscillations: 10 };

/** Deterministic ULID generator for tests. */
function idGen() {
  let n = 0;
  return () => `01JC000000000000000000${String(++n).padStart(4, '0')}`;
}

function run(state: PracticeState, actions: PracticeAction[], nextId = idGen()) {
  const events: LabEvent[] = [];
  for (const a of actions) {
    const r = step(state, a, nextId);
    if (!r.ok) throw new Error(r.error);
    state = r.value.state;
    events.push(...r.value.events);
  }
  return { state, events };
}

const predict: PracticeAction = { type: 'predict', text: 'Si alargo la cuerda, tarda más porque recorre más camino.', entrada: 'teclado' };
const measure = (
  lengthM: number,
  totalTimeS = pendulumPeriod(lengthM) * 10,
  source: 'cronometro' | 'acelerometro' = 'cronometro',
  oscillations = 10,
): PracticeAction => ({ type: 'measure', lengthM, totalTimeS, oscillations, source });
const conclude = (text: string, citedLengthM: number): PracticeAction => ({ type: 'conclude', text, citedLengthM, entrada: 'teclado' });

describe('protocolFromPractice', () => {
  it('reads lengths and oscillations from the contract practice', () => {
    expect(protocolFromPractice(Practica.parse(ejemplos.practica))).toEqual({ lengthsM: [0.3, 0.6, 0.9], oscillations: 10 });
  });
});

describe('practice state machine', () => {
  it('starts in the prediction phase', () => {
    expect(createPractice(protocol, context).phase).toBe('prediction');
  });

  it('GATE: cannot measure without a prediction', () => {
    expect(step(createPractice(protocol, context), measure(0.5), idGen())).toEqual({ ok: false, error: 'prediction_required' });
  });

  it('GATE: cannot compare or conclude without a prediction either', () => {
    expect(step(createPractice(protocol, context), { type: 'compare' }, idGen())).toEqual({ ok: false, error: 'prediction_required' });
    expect(step(createPractice(protocol, context), conclude('x', 0.5), idGen())).toEqual({ ok: false, error: 'prediction_required' });
  });

  it('rejects an empty prediction', () => {
    const r = step(createPractice(protocol, context), { type: 'predict', text: '   ', entrada: 'teclado' }, idGen());
    expect(r).toEqual({ ok: false, error: 'prediction_empty' });
  });

  it('records the prediction as a reasoning answer and opens the measurement', () => {
    const { state, events } = run(createPractice(protocol, context), [predict]);
    expect(state.phase).toBe('measurement');
    expect(state.prediction?.text).toMatch(/alargo/);
    expect(events).toHaveLength(1);
    expect(events[0].tipo).toBe('respuesta.registrada');
    const datos = RespuestaRazonamiento.parse(events[0].datos);
    expect(datos.momento).toBe('prediccion');
    expect(datos.grupoId).toBe(ids.grupo1);
  });

  it('locks the prediction once measuring', () => {
    const { state } = run(createPractice(protocol, context), [predict]);
    expect(step(state, predict, idGen())).toEqual({ ok: false, error: 'prediction_locked' });
  });

  it('records a measurement of 10 oscillations as a period in a valid Medicion', () => {
    const { state, events } = run(createPractice(protocol, context), [predict, measure(0.5, 14.2)]);
    expect(state.measurements).toHaveLength(1);
    const m = Medicion.parse(events[1].datos);
    expect(m).toMatchObject({ variable: 'longitud', valorIndependiente: 0.5, repeticion: 1, magnitud: 'periodo', unidad: 's', fuente: 'cronometro' });
    expect(m.valor).toBeCloseTo(1.42, 10);
  });

  it('rejects unknown lengths, wrong oscillation counts and invalid times', () => {
    const { state } = run(createPractice(protocol, context), [predict]);
    expect(step(state, measure(0.7), idGen())).toEqual({ ok: false, error: 'unknown_length' });
    expect(step(state, measure(0.5, 14, 'cronometro', 7), idGen())).toEqual({ ok: false, error: 'wrong_oscillation_count' });
    expect(step(state, measure(0.5, 0), idGen())).toEqual({ ok: false, error: 'invalid_time' });
    expect(step(state, measure(0.5, Number.NaN), idGen())).toEqual({ ok: false, error: 'invalid_time' });
  });

  it('numbers repeated attempts and lets a measurement be annulled (never deleted)', () => {
    const { state, events } = run(createPractice(protocol, context), [predict, measure(0.5, 31), measure(0.5, 14.2)]);
    expect(state.measurements.map((m) => m.attempt)).toEqual([1, 2]);
    const r = step(state, { type: 'annul', measurementId: state.measurements[0].id, reason: 'dato raro' }, idGen());
    if (!r.ok) throw new Error(r.error);
    expect(r.value.state.measurements[0].annulled).toBe(true);
    expect(r.value.state.measurements).toHaveLength(2);
    expect(r.value.events[0]).toEqual({ tipo: 'medicion.anulada', datos: { medicionId: (events[1].datos as Medicion).id, motivo: 'dato raro' } });
    expect(step(state, { type: 'annul', measurementId: 'nope' }, idGen())).toEqual({ ok: false, error: 'unknown_measurement' });
  });

  it('only compares once every length has a valid measurement', () => {
    const { state } = run(createPractice(protocol, context), [predict, measure(0.25), measure(0.5)]);
    expect(step(state, { type: 'compare' }, idGen())).toEqual({ ok: false, error: 'measurements_incomplete' });
  });

  it('compares with T = 2π√(L/g) and reports the relative error', () => {
    const { state } = run(createPractice(protocol, context), [predict, measure(0.25, 10.3), measure(0.5, 14.0), measure(1.0, 20.9), { type: 'compare' }]);
    expect(state.phase).toBe('comparison');
    const table = comparisonTable(state);
    expect(table.rows.map((r) => r.lengthM)).toEqual([0.25, 0.5, 1.0]);
    const row = table.rows[2];
    expect(row.measuredPeriodS).toBeCloseTo(2.09, 10);
    expect(row.theoreticalPeriodS).toBeCloseTo(pendulumPeriod(1.0), 10);
    expect(row.relativeError).toBeCloseTo(Math.abs(2.09 - pendulumPeriod(1)) / pendulumPeriod(1), 10);
    expect(table.meanRelativeError).toBeCloseTo(table.rows.reduce((s, r) => s + (r.relativeError ?? 0), 0) / 3, 10);
  });

  it('lists lengths without data as pending rows', () => {
    const { state } = run(createPractice(protocol, context), [predict, measure(0.5, 14.2)]);
    const table = comparisonTable(state);
    expect(table.rows[0]).toMatchObject({ lengthM: 0.25, measuredPeriodS: null, relativeError: null });
    expect(table.meanRelativeError).toBeCloseTo(table.rows[1].relativeError!, 10);
  });

  it('uses the latest valid attempt per length in the table', () => {
    const { state } = run(createPractice(protocol, context), [predict, measure(0.25), measure(0.5, 31), measure(0.5, 14.2), measure(1)]);
    expect(comparisonTable(state).rows[1].measuredPeriodS).toBeCloseTo(1.42, 10);
  });

  it('requires a conclusion that cites one of the group own data', () => {
    const { state } = run(createPractice(protocol, context), [predict, measure(0.25), measure(0.5), measure(1), { type: 'compare' }]);
    expect(step(state, conclude('Tarda más', 0.7), idGen())).toEqual({ ok: false, error: 'cited_length_not_measured' });
    expect(step(state, conclude(' ', 1), idGen())).toEqual({ ok: false, error: 'conclusion_empty' });
    const r = step(state, conclude('Con 100 cm tardó 2,0 s y con 25 cm 1,0 s.', 1), idGen());
    if (!r.ok) throw new Error(r.error);
    expect(r.value.state.phase).toBe('done');
    expect(RespuestaRazonamiento.parse(r.value.events[0].datos).momento).toBe('conclusion');
  });

  it('cannot conclude before comparing', () => {
    const { state } = run(createPractice(protocol, context), [predict, measure(0.25)]);
    expect(step(state, conclude('x', 0.25), idGen())).toEqual({ ok: false, error: 'not_compared' });
  });

  it('rejects every action once finished', () => {
    const { state } = run(createPractice(protocol, context), [
      predict, measure(0.25), measure(0.5), measure(1), { type: 'compare' }, conclude('Con 1 m tarda más.', 1),
    ]);
    expect(step(state, measure(0.5), idGen())).toEqual({ ok: false, error: 'practice_finished' });
  });

  it('rebuilds the same state from the persisted events (offline reload)', () => {
    const actions: PracticeAction[] = [predict, measure(0.25), measure(0.5, 31), measure(0.5, 14.2), measure(1, 20.1, 'acelerometro'), { type: 'compare' }];
    const { state, events } = run(createPractice(protocol, context), actions);
    const annul = step(state, { type: 'annul', measurementId: state.measurements[1].id }, idGen());
    if (!annul.ok) throw new Error(annul.error);
    const rebuilt = replay(protocol, context, [...events, ...annul.value.events]);
    expect(rebuilt.prediction?.text).toBe(state.prediction?.text);
    expect(rebuilt.measurements).toEqual(annul.value.state.measurements);
    expect(rebuilt.phase).toBe('measurement');
    const rebuiltDone = replay(protocol, context, [...events, ...run(state, [conclude('Con 1 m tarda más.', 1)]).events]);
    expect(rebuiltDone.phase).toBe('done');
  });
});
