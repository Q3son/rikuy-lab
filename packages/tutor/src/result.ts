/**
 * Minimal Result type. ARQUITECTURA 2.2 puts `Result<T,E>` in @rikuy/core; until it exists there,
 * the tutor keeps this local one (see PROPUESTAS_CONTRATOS.md, F4).
 */
export type Result<T, E = string> = { ok: true; valor: T } | { ok: false; error: E };

export const ok = <T>(valor: T): Result<T, never> => ({ ok: true, valor });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
