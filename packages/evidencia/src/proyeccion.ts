/**
 * Projection of the event log into the entities the teacher panel reads (3.1: the truth is the
 * append-only log, entities are projections). Pure: no I/O, no clock, deterministic.
 *
 * Learning-signal aggregates are read here only because the contract allows the per-group
 * count strip (5.4). They never mix with evidence and never carry student ids.
 */
import {
  DATOS_POR_TIPO,
  type AgregadoSenales,
  type Clase,
  type Estudiante,
  type Evento,
  type Evidencia,
  type Grupo,
  type Medicion,
  type RespuestaRazonamiento,
  type TipoEvento,
} from '@rikuy/contracts';

export interface Con<T> {
  dato: T;
  hlc: string;
  dispositivo: string;
  estudianteIds: string[];
}

export interface Confirmacion {
  evidenciaId: string;
  nivel?: Evidencia['nivel'];
  hlc: string;
}

export interface ProyeccionClase {
  clase: Clase | null;
  /** Join order (HLC, then id): never by any level. */
  grupos: Grupo[];
  estudiantes: Estudiante[];
  respuestas: Con<RespuestaRazonamiento>[];
  mediciones: Con<Medicion>[];
  evidencias: Con<Evidencia>[];
  confirmaciones: Confirmacion[];
  agregadosSenales: AgregadoSenales[];
  interruptores: { tutor: boolean | null; gestos: boolean | null; senales: boolean | null };
  cerrada: boolean;
  diagnostico: { invalidos: number; duplicados: number };
}

function parsear<T extends TipoEvento>(e: Evento, tipo: T) {
  return DATOS_POR_TIPO[tipo].safeParse(e.datos);
}

const porHlc = (a: Evento, b: Evento) => (a.hlc === b.hlc ? (a.dispositivo < b.dispositivo ? -1 : 1) : a.hlc < b.hlc ? -1 : 1);

export function proyectar(eventos: readonly Evento[]): ProyeccionClase {
  const vistos = new Set<string>();
  const unicos: Evento[] = [];
  let duplicados = 0;
  for (const e of eventos) {
    if (vistos.has(e.id)) {
      duplicados += 1;
      continue;
    }
    vistos.add(e.id);
    unicos.push(e);
  }
  unicos.sort(porHlc);

  const out: ProyeccionClase = {
    clase: null,
    grupos: [],
    estudiantes: [],
    respuestas: [],
    mediciones: [],
    evidencias: [],
    confirmaciones: [],
    agregadosSenales: [],
    interruptores: { tutor: null, gestos: null, senales: null },
    cerrada: false,
    diagnostico: { invalidos: 0, duplicados },
  };
  const anuladas = new Set<string>();
  const olvidados = new Set<string>();

  for (const e of unicos) {
    const meta = { hlc: e.hlc, dispositivo: e.dispositivo, estudianteIds: e.autor.estudianteIds ?? [] };
    const invalido = () => {
      out.diagnostico.invalidos += 1;
    };
    switch (e.tipo) {
      case 'clase.creada': {
        const r = parsear(e, 'clase.creada');
        if (r.success) out.clase = r.data;
        else invalido();
        break;
      }
      case 'clase.cerrada':
        out.cerrada = true;
        break;
      case 'clase.config': {
        const r = parsear(e, 'clase.config');
        if (!r.success) invalido();
        else {
          if (r.data.tutor && out.clase) out.clase = { ...out.clase, tutor: r.data.tutor };
          if (r.data.abierta !== undefined && out.clase) out.clase = { ...out.clase, abierta: r.data.abierta };
        }
        break;
      }
      case 'tutor.interruptor':
      case 'gestos.interruptor':
      case 'senales.interruptor': {
        const r = parsear(e, e.tipo);
        if (!r.success) invalido();
        else if (!r.data.grupoId) out.interruptores[e.tipo.split('.')[0] as 'tutor' | 'gestos' | 'senales'] = r.data.activo;
        break;
      }
      case 'aula.estudiante_alta': {
        const r = parsear(e, 'aula.estudiante_alta');
        if (!r.success) invalido();
        else out.estudiantes.push(r.data);
        break;
      }
      case 'estudiante.olvidar': {
        const r = parsear(e, 'estudiante.olvidar');
        if (!r.success) invalido();
        else olvidados.add(r.data.estudianteId);
        break;
      }
      case 'grupo.unido': {
        const r = parsear(e, 'grupo.unido');
        if (!r.success) invalido();
        else if (!out.grupos.some((g) => g.id === r.data.id)) out.grupos.push(r.data);
        break;
      }
      case 'respuesta.registrada': {
        const r = parsear(e, 'respuesta.registrada');
        if (!r.success) invalido();
        else out.respuestas.push({ dato: r.data, ...meta });
        break;
      }
      case 'medicion.registrada': {
        const r = parsear(e, 'medicion.registrada');
        if (!r.success) invalido();
        else out.mediciones.push({ dato: r.data, ...meta });
        break;
      }
      case 'medicion.anulada': {
        const r = parsear(e, 'medicion.anulada');
        if (!r.success) invalido();
        else anuladas.add(r.data.medicionId);
        break;
      }
      case 'evidencia.calculada': {
        const r = parsear(e, 'evidencia.calculada');
        if (!r.success) invalido();
        else out.evidencias.push({ dato: r.data, ...meta });
        break;
      }
      case 'evidencia.confirmada': {
        const r = parsear(e, 'evidencia.confirmada');
        if (!r.success) invalido();
        else out.confirmaciones.push({ evidenciaId: r.data.evidenciaId, nivel: r.data.nivel, hlc: e.hlc });
        break;
      }
      case 'senales.agregado': {
        const r = parsear(e, 'senales.agregado');
        if (!r.success || e.autor.estudianteIds?.length) invalido();
        else out.agregadosSenales.push(r.data);
        break;
      }
      default:
        break; // other event types are not needed by the teacher panel
    }
  }

  out.mediciones = out.mediciones.filter((m) => !anuladas.has(m.dato.id));
  out.estudiantes = out.estudiantes.filter((s) => !olvidados.has(s.id));
  return out;
}
