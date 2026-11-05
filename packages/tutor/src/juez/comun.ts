/** Helpers shared by the rule judge and the conclusion check. */
import { LEXICO_VARIABLES } from '../indicios.ts';
import { palabras, tokenizar } from '../texto.ts';
import type { ContextoJuez, DatoMedido, Nivel, VeredictoJuez } from './tipos.ts';

export const PALABRAS_VACIAS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en', 'y', 'o', 'que', 'se', 'su', 'sus',
  'lo', 'le', 'les', 'con', 'por', 'para', 'a', 'es', 'son', 'era', 'fue', 'muy', 'mas', 'mi', 'me', 'mis', 'si', 'no',
]);

/** Words that mean "I did not understand / say it again": the answer carries no evidence. */
const RUIDO = new Set(['que', 'como', 'eh', 'ah', 'mm', 'mmm', 'hm', 'otra', 'vez', 'cual', 'perdon', 'repite', 'entiendo', 'entendi', 'no', 'oye', 'ehh']);

/** Empty, or only noise such as "¿qué?", "¿otra vez?", "no entendí": not assessable (never a zero). */
export function noEvaluable(texto: string): boolean {
  const t = palabras(texto);
  if (t.length === 0) return true;
  return t.length <= 3 && t.every((p) => RUIDO.has(p));
}

/** Words the student may use for each variable of the practice (id, label words, defaults, extras). */
export function lexicoDeContexto(ctx: ContextoJuez): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const v of ctx.variables) {
    const deEtiqueta = palabras(v.etiqueta ?? '').filter((p) => p.length >= 4 && !PALABRAS_VACIAS.has(p));
    out[v.id] = [...new Set([...palabras(v.id), ...deEtiqueta, ...(v.sinonimos ?? []).flatMap(palabras), ...(LEXICO_VARIABLES[v.id] ?? [])])];
  }
  return out;
}

export function veredictoNoObservable(indicador: VeredictoJuez['indicador']): VeredictoJuez {
  return { indicador, nivel: 'NO', estado: 'no_observable', cita: '', fuente: 'reglas' };
}

export function veredicto(indicador: VeredictoJuez['indicador'], nivel: Nivel, cita: string): VeredictoJuez {
  return { indicador, nivel, estado: 'ok', cita, fuente: 'reglas' };
}

/** Does the number `n` (as written by the student) match the group's data? Returns the x-conditions it supports. */
export function condicionesQueRespaldan(n: number, datos: readonly DatoMedido[]): number[] {
  const cerca = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.02, 0.05 * Math.abs(b));
  const xs = new Set<number>();
  for (const d of datos) {
    if (cerca(n, d.x) || cerca(n, d.y)) xs.add(d.x);
  }
  return [...xs];
}

export function tieneAlgunaPalabra(texto: string, lista: readonly string[]): boolean {
  const t = new Set(tokenizar(texto).map((x) => x.t));
  return lista.some((p) => t.has(p));
}
