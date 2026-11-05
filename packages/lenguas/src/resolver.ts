/**
 * Text resolution with the display rule of 4.8:
 *  - the alumno role only ever receives text with revisado:true; anything else is skipped;
 *  - the docente role sees drafts, flagged with borrador:true;
 *  - when the requested language has nothing usable, the fallback chain is followed
 *    (quy -> es). Empty texts are never returned.
 */
import { REGISTRO_LENGUAS, cadenaRespaldo, type RegistroLenguas } from './registro.ts';

export type Rol = 'alumno' | 'docente';

export interface EntradaCatalogo {
  texto: string;
  revisado: boolean;
  revisor: string | null;
  variedad: string;
}

export type Catalogo = Record<string, EntradaCatalogo>;

export interface TextoResuelto {
  clave: string;
  /** Language the text was taken from (may be the fallback, not the requested one). */
  lengua: string;
  texto: string;
  variedad: string;
  revisado: boolean;
  /** True only for the docente role when the text is an unreviewed draft. */
  borrador: boolean;
}

export type Resolutor = (clave: string, lengua: string, rol: Rol) => TextoResuelto | null;

export function crearResolutor(catalogos: Record<string, Catalogo>, registro: RegistroLenguas = REGISTRO_LENGUAS): Resolutor {
  return (clave, lengua, rol) => {
    for (const codigo of cadenaRespaldo(lengua, registro)) {
      const entrada = catalogos[codigo]?.[clave];
      if (entrada === undefined || entrada.texto.trim() === '') continue;
      if (rol === 'alumno') {
        if (entrada.revisado !== true) continue;
        return { clave, lengua: codigo, texto: entrada.texto, variedad: entrada.variedad, revisado: true, borrador: false };
      }
      return { clave, lengua: codigo, texto: entrada.texto, variedad: entrada.variedad, revisado: entrada.revisado, borrador: !entrada.revisado };
    }
    return null;
  };
}

/** One-off form of `crearResolutor` for callers that resolve a single key. */
export function resolverTexto(clave: string, lengua: string, rol: Rol, catalogos: Record<string, Catalogo>, registro?: RegistroLenguas): TextoResuelto | null {
  return crearResolutor(catalogos, registro)(clave, lengua, rol);
}
