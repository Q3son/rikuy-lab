/** Minimal Result type (local on purpose: `@rikuy/core` is being rewritten by F2). */
export type Result<T, E> = { ok: true; valor: T } | { ok: false; error: E };

export const ok = <T>(valor: T): Result<T, never> => ({ ok: true, valor });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
