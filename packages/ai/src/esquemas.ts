/**
 * Schemas of the AI layer (4.2). `BorradorPractica` is what the generator model returns:
 * validated by Zod before anything else sees it (4.4: parse JSON -> safeParse -> domain validators).
 */
import { DesempenoRef, Lengua, VariablePractica } from '@rikuy/contracts';
import { z } from 'zod';

export const SolicitudPractica = z.object({
  desempeno: DesempenoRef,
  tema: z.string().max(200).optional(),
  lengua: Lengua.default('es'),
  recursos: z
    .object({
      quiz: z.boolean().default(true),
      diagrama: z.boolean().default(true),
      guionVideo: z.boolean().default(false),
      pictogramas: z.boolean().default(false),
    })
    .default({ quiz: true, diagrama: true, guionVideo: false, pictogramas: false }),
});
export type SolicitudPractica = z.infer<typeof SolicitudPractica>;

/** Teacher-only: what the practice should find. Hints and quizzes must never reveal it (4.4). */
export const ResultadoEsperado = z.object({
  valores: z.array(z.number()).min(1),
  unidad: z.string(),
  conclusion: z.string().min(10),
  /** Phrases that no hint may contain (for example the inverted limitation). */
  frasesProhibidas: z.array(z.string()).optional(),
});
export type ResultadoEsperado = z.infer<typeof ResultadoEsperado>;

export const PreguntaBorrador = z.object({
  enunciado: z.string(),
  opciones: z.array(z.string()).min(2).max(4),
  correcta: z.number().int(),
  retro: z.array(z.string()),
});
export type PreguntaBorrador = z.infer<typeof PreguntaBorrador>;

export const BorradorPractica = z.object({
  titulo: z.string().max(90),
  preguntaGuia: z.string(),
  citaDesempeno: z.string().min(20),
  materiales: z.array(z.object({ nombre: z.string(), casero: z.boolean() })),
  variables: z.array(VariablePractica).min(1),
  protocolo: z.object({
    repeticiones: z.number().int().min(1),
    valoresIndependiente: z.array(z.number()).min(2),
    magnitud: z.string(),
    unidad: z.string(),
  }),
  modeloId: z.enum(['pendulo', 'lactasa', 'respiracion']).optional(),
  pistas: z.array(z.string()).min(2).max(4),
  limitaciones: z.array(z.string()).min(1),
  resultadoEsperado: ResultadoEsperado,
  quiz: z.array(PreguntaBorrador).max(5).optional(),
  diagrama: z.object({ svg: z.string(), etiquetas: z.record(z.string(), z.string()) }).optional(),
  guionVideo: z.array(z.string()).max(8).optional(),
  pictogramas: z.array(z.object({ id: z.string(), descripcion: z.string() })).max(4).optional(),
});
export type BorradorPractica = z.infer<typeof BorradorPractica>;

/** What the second reviewer (Muse) returns. */
export const SalidaRevision = z.object({
  veredicto: z.enum(['ok', 'observado']),
  observaciones: z.array(z.string()).max(8),
});
export const RevisionIA = SalidaRevision.extend({ modelo: z.string() });
export type RevisionIA = z.infer<typeof RevisionIA>;

export const FilaMedicion = z.object({ etiqueta: z.string(), valor: z.number(), unidad: z.string().optional() });
export type FilaMedicion = z.infer<typeof FilaMedicion>;
export const SalidaVisionTabla = z.object({ filas: z.array(FilaMedicion) });

export const PromptPictograma = z.object({ id: z.string(), descripcion: z.string().max(300) });
export type PromptPictograma = z.infer<typeof PromptPictograma>;

/** An unreviewed machine translation: never shown to students until a speaker approves it (4.6). */
export const TextoNoRevisado = z.object({ texto: z.string(), lengua: Lengua, revisado: z.literal(false) });
export type TextoNoRevisado = z.infer<typeof TextoNoRevisado>;
export const SalidaTraduccion = z.object({ texto: z.string() });
