/** Class session, groups and pseudonymous students (3.2). No personal data in syncable schemas. */
import { z } from 'zod';
import { Apodo, Dispositivo, Hlc, Lengua, Ulid } from './comun.ts';

export const Clase = z.object({
  id: Ulid,
  codigo: z.string().regex(/^[A-Z0-9]{6}$/), // projected and carried in the join QR
  practicaId: Ulid,
  practicaVersion: z.number(),
  grado: z.number(),
  seccion: z.string().max(4),
  lengua: Lengua,
  docenteDispositivo: Dispositivo, // device holding teacher authority
  claveClasePub: z.string(), // ECDSA P-256 public key (teacher signature)
  tutor: z.object({ activo: z.boolean(), iaLocal: z.boolean(), iaNube: z.boolean() }), // iaNube starts false
  abierta: z.boolean(),
  creada: Hlc,
});
export type Clase = z.infer<typeof Clase>;

export const Grupo = z.object({
  id: Ulid,
  claseId: Ulid,
  apodo: Apodo,
  dispositivo: Dispositivo,
  integrantes: z.array(Ulid).min(1).max(8),
});
export type Grupo = z.infer<typeof Grupo>;

/**
 * Per-student consents. The teacher records them with the guardian's authorization.
 * Everything defaults to false. Strict: no extra flags can sneak in.
 */
export const Consentimientos = z.strictObject({
  senalesRostro: z.boolean().default(false),
  senalesVoz: z.boolean().default(false),
  gestosCamara: z.boolean().default(false),
  registradoPor: z.literal('docente'),
  hlc: Hlc,
});
export type Consentimientos = z.infer<typeof Consentimientos>;

/**
 * Student: stable pseudonym inside the classroom. Strict on purpose, so that a
 * real name, photo or audio field is rejected instead of silently stripped.
 * The alias -> name mapping (`padron`) lives only on the teacher phone and never syncs.
 */
export const Estudiante = z.strictObject({
  id: Ulid,
  aulaId: Ulid, // aula = grade + section of the year; several class sessions per aula
  alias: z.string().regex(/^E\d{2}$/),
  avatar: z.string(), // from a closed list of in-house sprites
  lenguaPreferida: Lengua,
  consentimientos: Consentimientos,
});
export type Estudiante = z.infer<typeof Estudiante>;
