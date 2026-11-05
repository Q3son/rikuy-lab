/**
 * Shared primitives (3.2). Field names stay in Spanish on purpose: they are the
 * wire/storage format and match the normative excerpt of the architecture doc.
 */
import { z } from 'zod';

export const SCHEMA_VERSION = 1;

/** ULID, Crockford base32 (no I, L, O, U). */
export const Ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
export type Ulid = z.infer<typeof Ulid>;

/** Hybrid logical clock: msUnix(13)-counter(4)-node(8). Lexicographic order = causal order. */
export const Hlc = z.string().regex(/^\d{13}-\d{4}-[0-9a-z]{8}$/);
export type Hlc = z.infer<typeof Hlc>;

/** Device id: exactly 10 characters, unique per device. */
export const Dispositivo = z.string().length(10);
export type Dispositivo = z.infer<typeof Dispositivo>;

/** es: Spanish; quy: Quechua Ayacucho-Chanka; quz: Quechua Cusco-Collao; ayr: Central Aymara. */
export const Lengua = z.enum(['es', 'quy', 'quz', 'ayr']);
export type Lengua = z.infer<typeof Lengua>;

/** Group nicknames come from a closed list of Andean animals and plants (no free text). */
export const Apodo = z.enum(['Condor', 'Vicuna', 'Vizcacha', 'Puma', 'Kantu', 'Queuna', 'Alpaca', 'Taruca']);
export type Apodo = z.infer<typeof Apodo>;

/** Lowercase hex SHA-256. */
export const Sha256 = z.string().regex(/^[0-9a-f]{64}$/);

/** Who produced an output: deterministic rules, a local model or a cloud model. */
export const FuenteIA = z.enum(['reglas', 'ia-local', 'ia-nube']);
export type FuenteIA = z.infer<typeof FuenteIA>;

/** CNEB performance reference: positional identity, as in the source curriculum. */
export const DesempenoRef = z.object({
  nivel: z.enum(['primaria', 'secundaria']),
  grado: z.number().int().min(1).max(6),
  area: z.literal('ciencia-y-tecnologia'),
  competencia: z.number().int().min(1), // 1-based
  desempeno: z.number().int().min(1), // 1-based
  cita: z.string().min(20), // literal substring of the official performance text
});
export type DesempenoRef = z.infer<typeof DesempenoRef>;

/** Short reference used inside evidences and quizzes. */
export const DesempenoCorto = DesempenoRef.pick({ competencia: true, desempeno: true });
export type DesempenoCorto = z.infer<typeof DesempenoCorto>;

export const Competencia = z.object({
  id: z.string(), // `${nivel}-${grado}:cyt:c${n}`
  nombre: z.string(), // name of the competency (curriculum text, not a person)
  capacidades: z.array(z.string()),
  estandar: z.string(),
  desempenos: z.array(z.string()),
  fuente: z.object({ titulo: z.string(), url: z.url() }),
});
export type Competencia = z.infer<typeof Competencia>;
