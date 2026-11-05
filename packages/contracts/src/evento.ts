/**
 * Event envelope (3.3). The truth is an append-only per-device log; entities are projections.
 *
 * - `Evento`: the envelope exactly as in the doc (`datos: unknown`). Use it to store/forward.
 * - `EventoValidado`: discriminated by `tipo`, validates `datos` and requires `firma` on
 *   teacher-authority events. Use it on ingestion (acceptance rule 1 of 3.5).
 */
import { z } from 'zod';
import { Clase, Consentimientos, Estudiante, Grupo } from './aula.ts';
import { Dispositivo, FuenteIA, Hlc, Lengua, SCHEMA_VERSION, Ulid } from './comun.ts';
import { Evidencia, Medicion, NivelEvidencia, RespuestaRazonamiento } from './laboratorio.ts';
import { Practica } from './practica.ts';
import { AsientoQuipu } from './quipu.ts';
import { AgregadoSenales, ConfigSenales } from './senales.ts';
import { Comando } from './tutor/comandos.ts';

export const TIPOS_EVENTO = [
  'clase.creada', 'clase.config', 'clase.cerrada', 'tutor.interruptor', 'gestos.interruptor', 'senales.interruptor',
  'estudiante.consentimiento',
  'senales.agregado', // ONLY per-group counts over 5-minute windows; never per student
  'practica.publicada', 'practica.retirada',
  'aula.estudiante_alta', 'estudiante.olvidar',
  'grupo.unido', 'medicion.registrada', 'medicion.anulada',
  'respuesta.registrada', 'pista.mostrada', 'tutor.turno',
  'evidencia.calculada', 'evidencia.confirmada',
  'quipu.asiento', // emitted by rules on the teacher phone or by the teacher
  'reto.progreso', 'museo.visita',
] as const;
export const TipoEvento = z.enum(TIPOS_EVENTO);
export type TipoEvento = z.infer<typeof TipoEvento>;

/** Event types that require a valid ECDSA signature from the class teacher device. */
export const TIPOS_AUTORIDAD_DOCENTE = [
  'clase.creada', 'clase.config', 'clase.cerrada',
  'tutor.interruptor', 'gestos.interruptor', 'senales.interruptor',
  'estudiante.consentimiento',
  'practica.publicada', 'practica.retirada',
  'aula.estudiante_alta', 'estudiante.olvidar',
  'evidencia.confirmada',
] as const satisfies readonly TipoEvento[];

export const AutorEvento = z.object({
  grupoId: Ulid.optional(),
  estudianteIds: z.array(Ulid).max(8).optional(), // who answered, if the group says so
});

export const Evento = z.object({
  id: Ulid, // globally unique
  dispositivo: Dispositivo,
  seq: z.number().int().positive(), // (dispositivo, seq) unique and contiguous
  hlc: Hlc,
  claseId: Ulid,
  sv: z.literal(SCHEMA_VERSION),
  tipo: TipoEvento,
  autor: AutorEvento,
  datos: z.unknown(),
  mac: z.string().optional(), // HMAC-SHA256 truncated to 8 bytes with the class key
  firma: z.string().optional(), // ECDSA P-256 for teacher-authority events
});
export type Evento = z.infer<typeof Evento>;

// ---- datos per type -------------------------------------------------------

export const DatosInterruptor = z.strictObject({ activo: z.boolean(), grupoId: Ulid.optional() });

export const DatosClaseConfig = z
  .strictObject({
    tutor: Clase.shape.tutor.optional(),
    lengua: Lengua.optional(),
    abierta: z.boolean().optional(),
    gestos: z.boolean().optional(),
    senales: ConfigSenales.optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: 'clase.config needs at least one field' });

export const DatosTutorTurno = z.strictObject({
  grupoId: Ulid,
  fuente: FuenteIA, // shown as a badge (honesty)
  texto: z.string().max(500),
  comandos: z.array(Comando),
});

export const DatosRetoProgreso = z.strictObject({
  retoId: z.string(),
  grupoId: Ulid,
  paso: z.number().int().min(0),
  completado: z.boolean(),
}); // strict: no per-person scores

export const DatosMuseoVisita = z.strictObject({
  salaId: z.string(),
  exhibicionId: z.string().optional(),
  grupoId: Ulid,
}); // strict: no positions

export const DATOS_POR_TIPO = {
  'clase.creada': Clase,
  'clase.config': DatosClaseConfig,
  'clase.cerrada': z.strictObject({}),
  'tutor.interruptor': DatosInterruptor,
  'gestos.interruptor': DatosInterruptor,
  'senales.interruptor': DatosInterruptor,
  'estudiante.consentimiento': z.strictObject({ estudianteId: Ulid, consentimientos: Consentimientos }),
  'senales.agregado': AgregadoSenales,
  'practica.publicada': Practica.refine((p) => p.estado === 'aprobada', { message: 'only approved practices are published' }),
  'practica.retirada': z.strictObject({ practicaId: Ulid, version: z.number().int() }),
  'aula.estudiante_alta': Estudiante,
  'estudiante.olvidar': z.strictObject({ estudianteId: Ulid }),
  'grupo.unido': Grupo,
  'medicion.registrada': Medicion,
  'medicion.anulada': z.strictObject({ medicionId: Ulid, motivo: z.string().max(200).optional() }),
  'respuesta.registrada': RespuestaRazonamiento,
  'pista.mostrada': z.strictObject({ grupoId: Ulid, practicaId: Ulid, nivel: z.number().int().min(1).max(4) }),
  'tutor.turno': DatosTutorTurno,
  'evidencia.calculada': Evidencia,
  'evidencia.confirmada': z.strictObject({ evidenciaId: Ulid, nivel: NivelEvidencia.optional() }), // nivel = teacher correction
  'quipu.asiento': AsientoQuipu,
  'reto.progreso': DatosRetoProgreso,
  'museo.visita': DatosMuseoVisita,
} as const satisfies Record<TipoEvento, z.ZodType>;

const autoridad = new Set<string>(TIPOS_AUTORIDAD_DOCENTE);
const sobre = Evento.omit({ tipo: true, datos: true });

function variante<T extends TipoEvento>(tipo: T) {
  const base = sobre.extend({ tipo: z.literal(tipo), datos: DATOS_POR_TIPO[tipo] as (typeof DATOS_POR_TIPO)[T] });
  return autoridad.has(tipo) ? base.extend({ firma: z.string().min(1) }) : base;
}

const variantes = TIPOS_EVENTO.map((t) => variante(t));

/** Strict ingestion schema: datos validated by tipo; authority events must be signed. */
export const EventoValidado = z
  .discriminatedUnion('tipo', variantes as unknown as [ReturnType<typeof variante>, ...ReturnType<typeof variante>[]])
  .superRefine((e, ctx) => {
    // Signal aggregates are group-level only: they cannot be attributed to students.
    if (e.tipo === 'senales.agregado' && e.autor.estudianteIds?.length) {
      ctx.addIssue({ code: 'custom', path: ['autor', 'estudianteIds'], message: 'senales.agregado cannot name students' });
    }
  });

/** Typed view of a validated event, narrowed by `tipo`. */
export type EventoDe<T extends TipoEvento> = Omit<Evento, 'tipo' | 'datos'> & {
  tipo: T;
  datos: z.output<(typeof DATOS_POR_TIPO)[T]>;
};
export type EventoTipado = { [T in TipoEvento]: EventoDe<T> }[TipoEvento];
