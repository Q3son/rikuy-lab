/**
 * Deterministic projection of a class log into its current state (3.1). The state is a pure
 * function of the SET of events: they are sorted by (hlc, dispositivo, seq, id) and folded, so two
 * replicas holding the same events always project the same state, whatever the arrival order.
 *
 * - Immutable records (measurements, answers, evidences) never conflict.
 * - Mutable fields owned by the teacher (class config, switches, consents) are LWW per field
 *   ordered by HLC; ties go to the highest device id (it sorts last).
 * - Teacher-authority events are only applied when they come from the device that created the
 *   class, so no group event can change authority state.
 */
import {
  EventoValidado,
  TIPOS_AUTORIDAD_DOCENTE,
  type Clase,
  type Consentimientos,
  type Estudiante,
  type Evento,
  type EventoTipado,
  type Evidencia,
  type Grupo,
  type Medicion,
  type NivelEvidencia,
  type Practica,
  type RespuestaRazonamiento,
  type TipoEvento,
} from '@rikuy/contracts';

const AUTHORITY = new Set<string>(TIPOS_AUTORIDAD_DOCENTE);

export type Switches = Record<string, boolean>; // '*' = whole class, otherwise grupoId

export interface EstadoClase {
  claseId: string;
  clase: Clase | null;
  /** Extra teacher config fields (gestos, senales) set through `clase.config`. */
  config: Record<string, unknown>;
  interruptores: { tutor: Switches; gestos: Switches; senales: Switches };
  grupos: Record<string, Grupo>;
  mediciones: Record<string, Medicion>;
  respuestas: Record<string, RespuestaRazonamiento>;
  evidencias: Record<string, Evidencia>;
  estudiantes: Record<string, Estudiante>;
  /** Keyed by `${id}@${version}`. */
  practicas: Record<string, Practica>;
  olvidados: string[];
  /** Number of valid events of the class that were projected. */
  eventos: number;
  /** Count of events per type (including the ones only other modules project). */
  porTipo: Partial<Record<TipoEvento, number>>;
}

export const compareEvents = (a: Evento, b: Evento): number =>
  a.hlc < b.hlc ? -1 : a.hlc > b.hlc ? 1
    : a.dispositivo < b.dispositivo ? -1 : a.dispositivo > b.dispositivo ? 1
      : a.seq !== b.seq ? a.seq - b.seq
        : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

export function emptyState(claseId: string): EstadoClase {
  return {
    claseId,
    clase: null,
    config: {},
    interruptores: { tutor: {}, gestos: {}, senales: {} },
    grupos: {},
    mediciones: {},
    respuestas: {},
    evidencias: {},
    estudiantes: {},
    practicas: {},
    olvidados: [],
    eventos: 0,
    porTipo: {},
  };
}

export function project(claseId: string, events: readonly Evento[]): EstadoClase {
  const typed: EventoTipado[] = [];
  const ids = new Set<string>();
  for (const raw of events) {
    if (!raw || (raw as Evento).claseId !== claseId || ids.has((raw as Evento).id)) continue;
    const parsed = EventoValidado.safeParse(raw);
    if (!parsed.success) continue;
    ids.add(raw.id);
    typed.push(parsed.data as EventoTipado);
  }
  typed.sort(compareEvents);

  const s = emptyState(claseId);
  const creation = typed.find((e) => e.tipo === 'clase.creada' && e.datos.docenteDispositivo === e.dispositivo && e.datos.id === claseId);
  const teacher = creation?.dispositivo ?? null;

  const annulled = new Map<string, string[]>(); // medicionId -> devices that annulled it
  const retired = new Set<string>();
  const forgotten = new Set<string>();
  const consents = new Map<string, Consentimientos>();
  const confirmations = new Map<string, NivelEvidencia | undefined>();
  const measuredBy = new Map<string, string>();

  for (const e of typed) {
    s.eventos++;
    s.porTipo[e.tipo] = (s.porTipo[e.tipo] ?? 0) + 1;
    if (AUTHORITY.has(e.tipo) && e.dispositivo !== teacher) continue;
    switch (e.tipo) {
      case 'clase.creada':
        if (e === creation) s.clase = { ...e.datos };
        break;
      case 'clase.config': {
        const { tutor, lengua, abierta, ...rest } = e.datos;
        if (s.clase) {
          if (tutor !== undefined) s.clase.tutor = tutor;
          if (lengua !== undefined) s.clase.lengua = lengua;
          if (abierta !== undefined) s.clase.abierta = abierta;
        }
        for (const [k, v] of Object.entries(rest)) if (v !== undefined) s.config[k] = v;
        break;
      }
      case 'clase.cerrada':
        if (s.clase) s.clase.abierta = false;
        break;
      case 'tutor.interruptor':
      case 'gestos.interruptor':
      case 'senales.interruptor': {
        const key = e.tipo.split('.')[0] as keyof EstadoClase['interruptores'];
        s.interruptores[key][e.datos.grupoId ?? '*'] = e.datos.activo;
        break;
      }
      case 'estudiante.consentimiento':
        consents.set(e.datos.estudianteId, e.datos.consentimientos);
        break;
      case 'practica.publicada':
        s.practicas[`${e.datos.id}@${e.datos.version}`] = e.datos;
        break;
      case 'practica.retirada':
        retired.add(`${e.datos.practicaId}@${e.datos.version}`);
        break;
      case 'aula.estudiante_alta':
        s.estudiantes[e.datos.id] = e.datos;
        break;
      case 'estudiante.olvidar':
        forgotten.add(e.datos.estudianteId);
        break;
      case 'grupo.unido':
        if (e.datos.dispositivo === e.dispositivo && e.datos.claseId === claseId) s.grupos[e.datos.id] = e.datos;
        break;
      case 'medicion.registrada':
        if (!s.mediciones[e.datos.id]) {
          s.mediciones[e.datos.id] = { ...e.datos, anulada: false };
          measuredBy.set(e.datos.id, e.dispositivo);
        }
        break;
      case 'medicion.anulada':
        annulled.set(e.datos.medicionId, [...(annulled.get(e.datos.medicionId) ?? []), e.dispositivo]);
        break;
      case 'respuesta.registrada':
        s.respuestas[e.datos.id] ??= e.datos;
        break;
      case 'evidencia.calculada':
        s.evidencias[e.datos.id] = { ...e.datos, confirmadaPorDocente: false };
        break;
      case 'evidencia.confirmada':
        confirmations.set(e.datos.evidenciaId, e.datos.nivel);
        break;
      default:
        break; // quipu, retos, museo, tutor turns, hints, signal aggregates: projected by their owners
    }
  }

  // Order-independent final passes (an annulment or confirmation may sort before its target).
  for (const [id, devices] of annulled) {
    const m = s.mediciones[id];
    if (m && devices.some((d) => d === measuredBy.get(id) || d === teacher)) m.anulada = true;
  }
  for (const [id, nivel] of confirmations) {
    const ev = s.evidencias[id];
    if (ev) {
      ev.confirmadaPorDocente = true;
      if (nivel !== undefined) ev.nivel = nivel;
    }
  }
  for (const key of retired) if (s.practicas[key]) s.practicas[key] = { ...s.practicas[key], estado: 'retirada' };
  for (const [id, c] of consents) if (s.estudiantes[id]) s.estudiantes[id] = { ...s.estudiantes[id], consentimientos: c };
  for (const id of forgotten) delete s.estudiantes[id];
  s.olvidados = [...forgotten].sort();
  return s;
}
