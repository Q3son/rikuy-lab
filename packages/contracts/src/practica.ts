/** Practice: content approved by the teacher. In the museum it is an exhibit (3.2). */
import { z } from 'zod';
import { DesempenoRef, Lengua, Sha256, Ulid } from './comun.ts';

export const TextosLengua = z.object({
  preguntaGuia: z.string(),
  pistas: z.array(z.string()),
  revisado: z.boolean(), // unreviewed text is never shown to students
  variedad: z.string().optional(),
  revisor: z.string().optional(),
});

export const VariablePractica = z.object({
  id: z.string(),
  etiqueta: z.string(),
  unidad: z.string(),
  min: z.number(),
  max: z.number(),
  paso: z.number(),
  porDefecto: z.number(),
});

export const EstadoPractica = z.enum(['borrador', 'aprobada', 'retirada']);

export const Practica = z.object({
  id: Ulid,
  version: z.number().int(),
  titulo: z.string().max(90),
  desempeno: DesempenoRef,
  preguntaGuia: z.string(),
  prediccionRequerida: z.literal(true),
  materiales: z.array(z.object({ nombre: z.string(), casero: z.boolean() })),
  variables: z.array(VariablePractica),
  protocolo: z.object({
    repeticiones: z.number().int().min(1),
    valoresIndependiente: z.array(z.number()).min(2),
    magnitud: z.string(),
    unidad: z.string(),
  }),
  modelo: z.object({ id: z.enum(['pendulo', 'lactasa', 'respiracion']), version: z.number() }).optional(),
  pistas: z.array(z.string()).min(2).max(4), // ladder, from general to concrete
  limitaciones: z.array(z.string()).min(1), // honesty about the model
  escenaHolo: z.string().optional(),
  textos: z.partialRecord(Lengua, TextosLengua).optional(),
  audio: z.array(z.object({ clave: z.string(), lengua: Lengua, sha256: Sha256, bytes: z.number().int().min(0) })).optional(),
  procedencia: z.object({
    generadoPor: z.enum(['docente', 'ia+docente', 'catalogo']),
    modelos: z.array(z.string()),
    revisiones: z.array(z.object({ por: z.string(), veredicto: z.enum(['ok', 'observado']), notas: z.array(z.string()) })),
  }),
  estado: EstadoPractica,
});
export type Practica = z.infer<typeof Practica>;
