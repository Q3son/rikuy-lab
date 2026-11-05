/** Lab records (3.2): immutable measurements and reasoning answers, plus the evidence computed from them. */
import { z } from 'zod';
import { DesempenoCorto, FuenteIA, Lengua, Ulid } from './comun.ts';

export const Medicion = z.object({
  id: Ulid,
  claseId: Ulid,
  grupoId: Ulid,
  practicaId: Ulid,
  variable: z.string(),
  valorIndependiente: z.number(), // e.g. length 0.5 m
  repeticion: z.number().int(),
  magnitud: z.string(),
  valor: z.number(),
  unidad: z.string(),
  fuente: z.enum(['cronometro', 'acelerometro', 'manual', 'foto-tabla']),
  anulada: z.boolean().default(false),
});
export type Medicion = z.infer<typeof Medicion>;

export const MomentoRespuesta = z.enum(['pregunta', 'prediccion', 'justificacion', 'conclusion', 'reflexion']);

export const RespuestaRazonamiento = z.object({
  id: Ulid,
  claseId: Ulid,
  grupoId: Ulid,
  momento: MomentoRespuesta,
  texto: z.string().max(500), // student's literal words; NEVER leaves the classroom without the switch and anonymization
  lengua: Lengua,
  entrada: z.enum(['teclado', 'voz-navegador']),
  pistasUsadasAntes: z.number().int(),
});
export type RespuestaRazonamiento = z.infer<typeof RespuestaRazonamiento>;

export const Indicador = z.enum(['variable', 'prediccion', 'justificacion', 'uso_del_dato', 'conclusion_coherente']);
export type Indicador = z.infer<typeof Indicador>;

/** 0-3 guides, 'NO' = not assessable and never penalizes. */
export const NivelEvidencia = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal('NO')]);
export type NivelEvidencia = z.infer<typeof NivelEvidencia>;

export const Evidencia = z.object({
  id: Ulid,
  respuestaId: Ulid,
  grupoId: Ulid,
  claseId: Ulid,
  indicador: Indicador,
  nivel: NivelEvidencia,
  estado: z.enum(['ok', 'dudoso', 'no_observable']),
  cita: z.string(), // verified literal substring of RespuestaRazonamiento.texto
  desempeno: DesempenoCorto,
  fuente: FuenteIA,
  corridas: z.array(z.string()).optional(),
  confirmadaPorDocente: z.boolean().default(false),
});
export type Evidencia = z.infer<typeof Evidencia>;
