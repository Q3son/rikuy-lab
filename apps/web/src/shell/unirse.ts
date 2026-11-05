/**
 * Join by class code plus a group nickname (E-00). The code format and the closed nickname list are
 * mirrored from @rikuy/contracts (Clase.codigo, Apodo) instead of importing zod into the shell
 * bundle; a test keeps both in lockstep.
 */
export const APODOS = ['Condor', 'Vicuna', 'Vizcacha', 'Puma', 'Kantu', 'Queuna', 'Alpaca', 'Taruca'] as const;
export type ApodoGrupo = (typeof APODOS)[number];

/** Drops spaces and hyphens and upper-cases, so "cyt-2b4" and "CYT 2B4" are the same code. */
export function normalizarCodigo(entrada: string): string {
  return entrada.replace(/[\s-]+/g, '').toUpperCase();
}

export type ResultadoUnirse =
  | { ok: true; codigo: string; apodo: ApodoGrupo }
  | { ok: false; errores: { codigo?: 'unirse.errorCodigo'; apodo?: 'unirse.errorApodo' } };

export function validarUnirse(codigoEntrada: string, apodoEntrada: string): ResultadoUnirse {
  const codigo = normalizarCodigo(codigoEntrada);
  const errores: { codigo?: 'unirse.errorCodigo'; apodo?: 'unirse.errorApodo' } = {};
  if (!/^[A-Z0-9]{6}$/.test(codigo)) errores.codigo = 'unirse.errorCodigo';
  const apodo = (APODOS as readonly string[]).includes(apodoEntrada) ? (apodoEntrada as ApodoGrupo) : null;
  if (!apodo) errores.apodo = 'unirse.errorApodo';
  if (errores.codigo || errores.apodo || !apodo) return { ok: false, errores };
  return { ok: true, codigo, apodo };
}
