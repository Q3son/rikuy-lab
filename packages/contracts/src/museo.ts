/**
 * Museo Rikuy: rooms are CNEB areas, exhibits are approved practices (1.3),
 * each exhibit carries typed multi-format resources (3.13).
 */
import { z } from 'zod';
import { DesempenoCorto, Lengua, Sha256, Ulid } from './comun.ts';

const recursoBase = {
  id: z.string(),
  lengua: Lengua.or(z.literal('neutro')),
  revisado: z.boolean(),
  licencia: z.string(),
  autoria: z.string(),
  sha256: Sha256,
  bytes: z.number().int().min(0),
  precache: z.enum(['clase', 'bajo_demanda']),
};

export const RecursoExhibicion = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('video'),
    ...recursoBase,
    archivo: z.string(),
    duracionS: z.number().max(180),
    subtitulos: z.array(z.object({ lengua: Lengua, vtt: z.string() })),
    poster: z.string(),
  }),
  z.object({ tipo: z.literal('audio'), ...recursoBase, clave: z.string() }), // key in the audio manifest (4.8)
  z.object({
    tipo: z.literal('diagrama'),
    ...recursoBase,
    svg: z.string(),
    etiquetas: z.partialRecord(Lengua, z.record(z.string(), z.string())),
  }),
  z.object({ tipo: z.literal('holograma'), ...recursoBase, escena: z.string(), modelo: z.string().optional() /* .glb */ }),
  z.object({
    tipo: z.literal('quiz'),
    ...recursoBase,
    preguntas: z
      .array(
        z.object({
          enunciado: z.string(),
          opciones: z.array(z.string()).min(2).max(4),
          correcta: z.number().int(),
          retro: z.array(z.string()),
          desempeno: DesempenoCorto,
        }),
      )
      .max(5),
  }),
]);
export type RecursoExhibicion = z.infer<typeof RecursoExhibicion>;

/** Room = CNEB area (optionally a competency sub-room). Spanish title is mandatory. */
export const Sala = z.object({
  id: z.string(),
  area: z.string(),
  competencia: z.number().int().optional(),
  plantilla: z.string(), // Tiled template id
  titulo: z.partialRecord(Lengua, z.string()).refine((t) => typeof t.es === 'string', { message: 'titulo.es is required' }),
});
export type Sala = z.infer<typeof Sala>;

export const Exhibicion = z.object({
  id: z.string(),
  salaId: z.string(),
  practicaId: Ulid,
  pedestal: z.string(),
  bloqueadaHasta: z.string().optional(), // unlock condition from the quipu
  recursos: z.array(RecursoExhibicion),
});
export type Exhibicion = z.infer<typeof Exhibicion>;
