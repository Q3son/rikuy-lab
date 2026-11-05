/**
 * Allow-list input schemas of the report templates (FUNCIONES_EXTRA 1.5). Every schema is strict:
 * a field that is not listed here (a student name, a Guardian state, a score) is a validation
 * error at runtime and a type error at compile time. Proposed to @rikuy/contracts (PROPUESTAS_CONTRATOS.md).
 */
import { z } from 'zod';
import { PICTOGRAMAS, type PictoId } from '../pictogramas.ts';
import { contarPalabras, FECHA_ISO } from './texto.ts';

export const FechaIso = z.string().regex(FECHA_ISO);
const Url = z.url();
const Palabras = (max: number) => z.string().trim().min(1).refine((s) => contarPalabras(s) <= max, { message: `at most ${max} words` });

const PictoIdSchema = z.enum(Object.keys(PICTOGRAMAS) as [PictoId, ...PictoId[]]);

// ---- Family weekly message (variants A and B) ------------------------------------------------

const BaseFamilia = {
  fechaIni: FechaIso,
  fechaFin: FechaIso,
  verbo: Palabras(2),
  exhibicionCorta: Palabras(8),
  preguntaCasa: Palabras(18),
  lengua: z.enum(['es', 'quy']),
  /** Recorded by a speaker. Never synthetic Quechua. */
  audioUrl: Url.optional(),
  enlaceLigero: Url,
  pictogramas: z.array(PictoIdSchema).max(3).default([]),
  fraseLocal: Palabras(12).optional(),
  /** Quechua text is allowed only when a speaker reviewed it. */
  parrafoQuechua: z.strictObject({ texto: z.string().min(1).max(280), revisado: z.literal(true) }).optional(),
};

export const NombrePila = z.string().trim().min(1).max(20).regex(/^\p{L}+$/u, 'first name only: letters, no spaces');

export const LineaPositiva = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('ayudo') }),
  z.strictObject({ tipo: z.literal('frase'), texto: Palabras(14) }),
]);

export const EntradaFamilia = z.discriminatedUnion('variante', [
  z.strictObject({ ...BaseFamilia, variante: z.literal('A') }),
  z.strictObject({ ...BaseFamilia, variante: z.literal('B'), nombre: NombrePila, linea: LineaPositiva }),
]);
export type EntradaFamilia = z.input<typeof EntradaFamilia>;
export type EntradaFamiliaValida = z.output<typeof EntradaFamilia>;
