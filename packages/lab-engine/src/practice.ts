/**
 * Practice state machine (2.2, 5.4 F3): predict → measure → compare → conclude.
 *
 * Pure reducer: `step(state, action, nextId)` returns the next state plus the lab records to
 * append to the event log (`respuesta.registrada`, `medicion.registrada`, `medicion.anulada`).
 * `replay` rebuilds the state from those records, so a reload in airplane mode resumes the
 * practice exactly where the group left it.
 *
 * Rules: the prediction is mandatory before any measurement (the datum belongs to the student);
 * each length is measured over N oscillations (10 by default); measurements are never deleted,
 * only annulled; the conclusion must cite one of the group's own data.
 */
import type { Lengua, Medicion, Practica, RespuestaRazonamiento } from '@rikuy/contracts';
import { pendulumPeriod, STANDARD_GRAVITY } from './models.ts';
import type { IdGenerator } from './ports.ts';
import { mean, relativeError } from './statistics.ts';

export interface PendulumProtocol {
  /** Lengths to measure, in metres (e.g. 0.25, 0.5, 1.0). */
  lengthsM: readonly number[];
  /** Oscillations timed per measurement. */
  oscillations: number;
  /** Gravity used by the model; standard gravity if omitted. */
  gravity?: number;
}

export interface PracticeContext {
  claseId: string;
  grupoId: string;
  practicaId: string;
  lengua: Lengua;
}

export type Phase = 'prediction' | 'measurement' | 'comparison' | 'done';
export type MeasurementSource = 'cronometro' | 'acelerometro' | 'manual';
export type Entrada = RespuestaRazonamiento['entrada'];

export interface MeasurementRow {
  id: string;
  lengthM: number;
  attempt: number;
  periodS: number;
  source: MeasurementSource;
  annulled: boolean;
}

export interface PracticeState {
  phase: Phase;
  protocol: PendulumProtocol;
  context: PracticeContext;
  prediction: { id: string; text: string } | null;
  measurements: MeasurementRow[];
  conclusion: { id: string; text: string; citedLengthM: number | null } | null;
}

export type PracticeAction =
  | { type: 'predict'; text: string; entrada: Entrada }
  | { type: 'measure'; lengthM: number; totalTimeS: number; oscillations: number; source: MeasurementSource }
  | { type: 'annul'; measurementId: string; reason?: string }
  | { type: 'compare' }
  | { type: 'conclude'; text: string; citedLengthM: number; entrada: Entrada };

export type PracticeError =
  | 'prediction_required'
  | 'prediction_empty'
  | 'prediction_locked'
  | 'unknown_length'
  | 'wrong_oscillation_count'
  | 'invalid_time'
  | 'unknown_measurement'
  | 'measurements_incomplete'
  | 'not_compared'
  | 'conclusion_empty'
  | 'cited_length_not_measured'
  | 'practice_finished';

export type LabEvent =
  | { tipo: 'respuesta.registrada'; datos: RespuestaRazonamiento }
  | { tipo: 'medicion.registrada'; datos: Medicion }
  | { tipo: 'medicion.anulada'; datos: { medicionId: string; motivo?: string } };

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export type StepResult = Result<{ state: PracticeState; events: LabEvent[] }, PracticeError>;

export interface ComparisonRow {
  lengthM: number;
  measuredPeriodS: number | null;
  theoreticalPeriodS: number;
  relativeError: number | null;
  source: MeasurementSource | null;
}

export interface ComparisonTable {
  rows: ComparisonRow[];
  /** Mean relative error over the measured lengths (NaN without data). */
  meanRelativeError: number;
}

const TEXT_MAX = 500;
const VARIABLE = 'longitud';
const MAGNITUDE = 'periodo';
const UNIT = 's';

export function protocolFromPractice(p: Practica): PendulumProtocol {
  return { lengthsM: [...p.protocolo.valoresIndependiente], oscillations: p.protocolo.repeticiones };
}

export function createPractice(protocol: PendulumProtocol, context: PracticeContext): PracticeState {
  return { phase: 'prediction', protocol, context, prediction: null, measurements: [], conclusion: null };
}

const fail = (error: PracticeError): StepResult => ({ ok: false, error });
const done = (state: PracticeState, events: LabEvent[]): StepResult => ({ ok: true, value: { state, events } });

export function step(state: PracticeState, action: PracticeAction, nextId: IdGenerator): StepResult {
  if (state.phase === 'done') return fail('practice_finished');
  if (action.type !== 'predict' && !state.prediction) return fail('prediction_required');

  switch (action.type) {
    case 'predict': {
      if (state.prediction) return fail('prediction_locked');
      const text = action.text.trim();
      if (!text) return fail('prediction_empty');
      const datos = answer(state.context, nextId(), 'prediccion', text, action.entrada);
      return done({ ...state, phase: 'measurement', prediction: { id: datos.id, text: datos.texto } }, [{ tipo: 'respuesta.registrada', datos }]);
    }
    case 'measure': {
      if (!state.protocol.lengthsM.includes(action.lengthM)) return fail('unknown_length');
      if (action.oscillations !== state.protocol.oscillations) return fail('wrong_oscillation_count');
      if (!(Number.isFinite(action.totalTimeS) && action.totalTimeS > 0)) return fail('invalid_time');
      const attempt = state.measurements.filter((m) => m.lengthM === action.lengthM).length + 1;
      const row: MeasurementRow = {
        id: nextId(),
        lengthM: action.lengthM,
        attempt,
        periodS: action.totalTimeS / action.oscillations,
        source: action.source,
        annulled: false,
      };
      return done({ ...state, measurements: [...state.measurements, row] }, [{ tipo: 'medicion.registrada', datos: toMedicion(state.context, row) }]);
    }
    case 'annul': {
      const target = state.measurements.find((m) => m.id === action.measurementId);
      if (!target) return fail('unknown_measurement');
      const measurements = state.measurements.map((m) => (m.id === target.id ? { ...m, annulled: true } : m));
      const datos = action.reason ? { medicionId: target.id, motivo: action.reason.slice(0, 200) } : { medicionId: target.id };
      return done({ ...state, measurements }, [{ tipo: 'medicion.anulada', datos }]);
    }
    case 'compare': {
      const complete = state.protocol.lengthsM.every((L) => latestValid(state, L));
      if (!complete) return fail('measurements_incomplete');
      return done({ ...state, phase: 'comparison' }, []);
    }
    case 'conclude': {
      if (state.phase !== 'comparison') return fail('not_compared');
      const text = action.text.trim();
      if (!text) return fail('conclusion_empty');
      if (!latestValid(state, action.citedLengthM)) return fail('cited_length_not_measured');
      const datos = answer(state.context, nextId(), 'conclusion', text, action.entrada);
      return done(
        { ...state, phase: 'done', conclusion: { id: datos.id, text: datos.texto, citedLengthM: action.citedLengthM } },
        [{ tipo: 'respuesta.registrada', datos }],
      );
    }
  }
}

/** One row per protocol length, using the latest attempt that was not annulled. */
export function comparisonTable(state: PracticeState): ComparisonTable {
  const g = state.protocol.gravity ?? STANDARD_GRAVITY;
  const rows = state.protocol.lengthsM.map((lengthM): ComparisonRow => {
    const theoreticalPeriodS = pendulumPeriod(lengthM, g);
    const m = latestValid(state, lengthM);
    return {
      lengthM,
      theoreticalPeriodS,
      measuredPeriodS: m ? m.periodS : null,
      relativeError: m ? relativeError(m.periodS, theoreticalPeriodS) : null,
      source: m ? m.source : null,
    };
  });
  const errors = rows.flatMap((r) => (r.relativeError === null ? [] : [r.relativeError]));
  return { rows, meanRelativeError: mean(errors) };
}

/** Rebuilds the state from the group's lab records, in log order. */
export function replay(protocol: PendulumProtocol, context: PracticeContext, events: readonly LabEvent[]): PracticeState {
  let state = createPractice(protocol, context);
  for (const e of events) {
    if (e.tipo === 'respuesta.registrada' && e.datos.momento === 'prediccion' && !state.prediction) {
      state = { ...state, phase: 'measurement', prediction: { id: e.datos.id, text: e.datos.texto } };
    } else if (e.tipo === 'respuesta.registrada' && e.datos.momento === 'conclusion') {
      state = { ...state, phase: 'done', conclusion: { id: e.datos.id, text: e.datos.texto, citedLengthM: null } };
    } else if (e.tipo === 'medicion.registrada') {
      const d = e.datos;
      const row: MeasurementRow = {
        id: d.id,
        lengthM: d.valorIndependiente,
        attempt: d.repeticion,
        periodS: d.valor,
        source: d.fuente === 'foto-tabla' ? 'manual' : d.fuente,
        annulled: d.anulada,
      };
      state = { ...state, measurements: [...state.measurements, row] };
    } else if (e.tipo === 'medicion.anulada') {
      state = { ...state, measurements: state.measurements.map((m) => (m.id === e.datos.medicionId ? { ...m, annulled: true } : m)) };
    }
  }
  return state;
}

function latestValid(state: PracticeState, lengthM: number): MeasurementRow | undefined {
  return state.measurements.filter((m) => m.lengthM === lengthM && !m.annulled).at(-1);
}

function answer(ctx: PracticeContext, id: string, momento: 'prediccion' | 'conclusion', texto: string, entrada: Entrada): RespuestaRazonamiento {
  return { id, claseId: ctx.claseId, grupoId: ctx.grupoId, momento, texto: texto.slice(0, TEXT_MAX), lengua: ctx.lengua, entrada, pistasUsadasAntes: 0 };
}

function toMedicion(ctx: PracticeContext, row: MeasurementRow): Medicion {
  return {
    id: row.id,
    claseId: ctx.claseId,
    grupoId: ctx.grupoId,
    practicaId: ctx.practicaId,
    variable: VARIABLE,
    valorIndependiente: row.lengthM,
    repeticion: row.attempt,
    magnitud: MAGNITUDE,
    valor: row.periodS,
    unidad: UNIT,
    fuente: row.source,
    anulada: false,
  };
}
