/**
 * Shipped catalogs (4.8). Each entry is {texto, revisado, revisor, variedad}.
 * es is the reference: every key of every other catalog must exist in es.
 * quy and ayr are placeholders until a native speaker reviews them: no text is
 * invented here (texto stays empty and revisado false).
 */
import es from '../catalogos/es.json';
import quy from '../catalogos/quy.json';
import ayr from '../catalogos/ayr.json';
import type { Catalogo } from './resolver.ts';

export const CATALOGOS: Record<string, Catalogo> = { es, quy, ayr };

/**
 * Structural checks for one catalog. `claves` is the set of keys of the reference
 * catalog (es by default); keys outside it are errors.
 */
export function validarCatalogo(codigo: string, catalogo: Catalogo, claves: ReadonlySet<string> = new Set(Object.keys(CATALOGOS.es))): string[] {
  const errores: string[] = [];
  for (const [clave, entrada] of Object.entries(catalogo)) {
    const etiqueta = `${codigo}:${clave}`;
    if (!claves.has(clave)) errores.push(`${etiqueta}: la clave no existe en es`);
    if (typeof entrada.texto !== 'string') errores.push(`${etiqueta}: texto debe ser cadena`);
    if (typeof entrada.revisado !== 'boolean') errores.push(`${etiqueta}: revisado debe ser booleano`);
    if (entrada.revisor !== null && typeof entrada.revisor !== 'string') errores.push(`${etiqueta}: revisor debe ser cadena o null`);
    if (typeof entrada.variedad !== 'string' || entrada.variedad.trim() === '') errores.push(`${etiqueta}: variedad obligatoria`);
    if (entrada.revisado === true && (typeof entrada.revisor !== 'string' || entrada.revisor.trim() === '')) {
      errores.push(`${etiqueta}: un texto revisado necesita revisor`);
    }
    if (entrada.revisado === true && typeof entrada.texto === 'string' && entrada.texto.trim() === '') {
      errores.push(`${etiqueta}: un texto revisado no puede tener texto vacío`);
    }
  }
  return errores;
}
