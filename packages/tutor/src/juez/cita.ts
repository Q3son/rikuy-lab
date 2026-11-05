/**
 * Literal quotes. Whatever the judge (rules or model) proposes, the stored quote is a SUBSTRING of
 * the student's answer; "no literal quote, the criterion does not count" (ECOSISTEMA 2.5).
 *
 * `sanitizarCita` never returns the model's version of the quote (which may differ in case or
 * accents): the returned text is always the slice of the student's own words.
 */
import { tokenizar } from '../texto.ts';

/** Where in `respuesta` the words of `cita` appear (case, accents and punctuation ignored). */
export function ubicarCita(cita: string, respuesta: string): { ini: number; fin: number } | null {
  const buscados = tokenizar(cita).map((t) => t.t);
  if (buscados.length === 0) return null;
  const tokens = tokenizar(respuesta);
  for (let i = 0; i + buscados.length <= tokens.length; i++) {
    if (buscados.every((b, j) => tokens[i + j]!.t === b)) {
      return { ini: tokens[i]!.ini, fin: tokens[i + buscados.length - 1]!.fin };
    }
  }
  return null;
}

/** The quote to store: the student's own slice, or the whole (trimmed) answer if the quote is invented. */
export function sanitizarCita(cita: string, respuesta: string): string {
  const q = cita.trim();
  if (q && respuesta.includes(q)) return q;
  const sitio = q ? ubicarCita(q, respuesta) : null;
  return sitio ? respuesta.slice(sitio.ini, sitio.fin) : respuesta.trim();
}

/** True if the model's quote really comes from the answer (used to discard invented runs). */
export function citaEsLiteral(cita: string, respuesta: string): boolean {
  const q = cita.trim();
  return q === '' || respuesta.includes(q) || ubicarCita(q, respuesta) !== null;
}

/** Clause or sentence of `respuesta` that contains `span`, for a readable literal quote. */
export function fragmento(respuesta: string, span: { ini: number; fin: number }, modo: 'clausula' | 'oracion' = 'clausula'): string {
  const corte = modo === 'oracion' ? /[.;!?¡¿\n]/ : /[.,;:!?¡¿\n]/;
  let ini = span.ini;
  while (ini > 0 && !corte.test(respuesta[ini - 1]!)) ini--;
  let fin = span.fin;
  while (fin < respuesta.length && !corte.test(respuesta[fin]!)) fin++;
  const trozo = respuesta.slice(ini, fin).trim();
  return trozo || respuesta.slice(span.ini, span.fin);
}
