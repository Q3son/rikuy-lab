/**
 * Schemas of the teacher's own plan ("programación curricular anual", "unidad de aprendizaje", "malla").
 * `PlanExtraido` is what the vision model returns from the PDF or the photos: validated by Zod before
 * anything else sees it (4.4). Every item keeps the literal source snippet and its page (traceability).
 */
import { z } from 'zod';

export const TIPOS_ITEM_PLAN = ['competencia', 'capacidad', 'desempeno', 'contenido', 'evidencia', 'instrumento'] as const;
export const TipoItemPlan = z.enum(TIPOS_ITEM_PLAN);
export type TipoItemPlan = z.infer<typeof TipoItemPlan>;

export const FuenteItem = z.object({
  /** 1-based page (or photo) number where the snippet was read. */
  pagina: z.number().int().min(1).max(500),
  /** Literal text as it appears in the document. */
  fragmento: z.string().min(1).max(600),
});
export type FuenteItem = z.infer<typeof FuenteItem>;

export const ItemExtraido = z.object({
  tipo: TipoItemPlan,
  texto: z.string().min(2).max(800),
  /** How sure the reader is that it read this item correctly (0 to 1). */
  confianza: z.number().min(0).max(1),
  fuente: FuenteItem,
});
export type ItemExtraido = z.infer<typeof ItemExtraido>;

export const PeriodoUnidad = z.object({
  bimestre: z.number().int().min(1).max(4).optional(),
  trimestre: z.number().int().min(1).max(3).optional(),
  /** ISO dates (YYYY-MM-DD) when the document gives them. */
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** The period as written ("Marzo - abril", "I bimestre"). */
  texto: z.string().max(120).optional(),
});
export type PeriodoUnidad = z.infer<typeof PeriodoUnidad>;

export const UnidadExtraida = z.object({
  titulo: z.string().min(2).max(300),
  situacionSignificativa: z.string().max(1500).optional(),
  periodo: PeriodoUnidad.optional(),
  items: z.array(ItemExtraido).max(120),
  fuente: FuenteItem.optional(),
});
export type UnidadExtraida = z.infer<typeof UnidadExtraida>;

export const PlanExtraido = z.object({
  tipoDocumento: z.enum(['programacion_anual', 'unidad', 'malla', 'otro']),
  nivel: z.enum(['primaria', 'secundaria']).optional(),
  grado: z.number().int().min(1).max(6).optional(),
  area: z.string().max(120).optional(),
  institucion: z.string().max(200).optional(),
  region: z.string().max(80).optional(),
  anio: z.number().int().min(2000).max(2100).optional(),
  unidades: z.array(UnidadExtraida).min(1).max(12),
});
export type PlanExtraido = z.infer<typeof PlanExtraido>;

/** One uploaded file, already validated by `validarArchivosPlan`. Never stored by the gateway. */
export interface ArchivoPlan {
  mime: string;
  base64: string;
}
