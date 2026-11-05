/**
 * Language catalogs with review metadata (ARQUITECTURA 4.8, DESIGN.md 13).
 * A string is either plain text (reviewed by definition: Spanish is authored by the team) or an
 * object with an explicit `revisado` flag. Only reviewed strings become i18next resources, so a
 * language with unreviewed strings falls back key by key to Spanish and nothing machine-made or
 * provisional ever reaches a student. Adding a language is registering a catalog: no code changes.
 */
import type { Lengua } from '@rikuy/contracts';

export type CadenaRevisable = string | { texto: string; revisado: boolean };

export interface CatalogoLengua {
  lengua: Lengua;
  /** Name of the language in its own variety, for the selector. */
  nombre: string;
  variedad?: string;
  cadenas: Record<string, CadenaRevisable>;
}

export function textoRevisado(cadena: CadenaRevisable): string | null {
  if (typeof cadena === 'string') return cadena;
  return cadena.revisado ? cadena.texto : null;
}

/** The resources i18next may load: reviewed strings only. */
export function recursosRevisados(catalogo: CatalogoLengua): Record<string, string> {
  const recursos: Record<string, string> = {};
  for (const [clave, cadena] of Object.entries(catalogo.cadenas)) {
    const texto = textoRevisado(cadena);
    if (texto !== null) recursos[clave] = texto;
  }
  return recursos;
}

export function estadoRevision(catalogo: CatalogoLengua): { revisadas: number; total: number } {
  const total = Object.keys(catalogo.cadenas).length;
  return { revisadas: Object.keys(recursosRevisados(catalogo)).length, total };
}
