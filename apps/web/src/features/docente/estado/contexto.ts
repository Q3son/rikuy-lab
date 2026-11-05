/**
 * "Contexto del aula" (FUNCIONES_EXTRA 3.2, function 4, from TeachFlow/RimAI): region, zone,
 * local festivities, crops and fauna. It stays on the teacher phone until the contract
 * `Clase.contexto` is accepted (PROPUESTAS_CONTRATOS.md). No personal data.
 */
import { z } from 'zod';

const Etiqueta = z.string().trim().min(1).max(60);

export const ContextoAula = z.strictObject({
  region: Etiqueta,
  zona: z.enum(['urbana', 'rural']),
  lenguaComunidad: z.enum(['es', 'quy', 'quz', 'ayr']),
  festividades: z.array(Etiqueta).max(8),
  floraFauna: z.array(Etiqueta).max(8),
  clima: Etiqueta.optional(),
  materialesCaseros: z.array(Etiqueta).max(8),
});
export type ContextoAula = z.infer<typeof ContextoAula>;

/** "a, b, c" -> ['a','b','c'] with the same limits as the schema. */
export function listaDeTexto(texto: string): string[] {
  return texto
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * One local sentence for reports ("Falta poco para Yaku Raymi"), or null. Only the first
 * festivity is used and the text is never invented: it repeats what the teacher typed.
 */
export function fraseLocal(c: ContextoAula | null): string | null {
  const fiesta = c?.festividades[0];
  return fiesta ? `Falta poco para ${fiesta}.` : null;
}
