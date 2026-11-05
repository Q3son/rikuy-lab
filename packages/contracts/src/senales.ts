/**
 * Learning signals (4.9). Behind a feature flag, off by default.
 * Only coarse states (3 dimensions x 3 levels) that feed the tutor support policy.
 * Nothing is persisted per student: the only thing that reaches the log is a per-group
 * count aggregate over 5-minute windows.
 */
import { z } from 'zod';
import { Ulid } from './comun.ts';

/** Build flag name and its default. The module is compiled out unless VITE_FLAG_SENALES=1. */
export const FLAG_SENALES = 'VITE_FLAG_SENALES';
export const SENALES_ACTIVAS_POR_DEFECTO = false;

export const NivelSenal = z.enum(['bajo', 'medio', 'alto']);
export type NivelSenal = z.infer<typeof NivelSenal>;

/** In-memory output of @rikuy/senales. Consumed ONLY by the tutor support policy. */
export const EstadoApoyo = z.strictObject({
  confusion: NivelSenal,
  frustracion: NivelSenal,
  atencion: NivelSenal,
  confianza: z.number().min(0).max(1),
});
export type EstadoApoyo = z.infer<typeof EstadoApoyo>;

/** What the support policy may offer (the student accepts or not). */
export const AccionApoyo = z.enum(['ofrecerPista', 'irMasLento', 'sugerirPausa', 'nada']);
export type AccionApoyo = z.infer<typeof AccionApoyo>;

/** Class-level runtime flag `clase.config.senales`, signed by the teacher. Both off by default. */
export const ConfigSenales = z.strictObject({ rostro: z.boolean(), voz: z.boolean() });
export type ConfigSenales = z.infer<typeof ConfigSenales>;

export const ConteoNiveles = z.strictObject({
  bajo: z.number().int().min(0),
  medio: z.number().int().min(0),
  alto: z.number().int().min(0),
});

/**
 * Payload of `senales.agregado`: counts per group and per 5-minute window.
 * Strict: no student ids and no fine timestamps (the window is an index since class start).
 */
export const AgregadoSenales = z.strictObject({
  grupoId: Ulid,
  ventana: z.number().int().min(0),
  confusion: ConteoNiveles,
  frustracion: ConteoNiveles,
  atencion: ConteoNiveles,
});
export type AgregadoSenales = z.infer<typeof AgregadoSenales>;
