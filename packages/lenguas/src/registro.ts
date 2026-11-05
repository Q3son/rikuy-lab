/**
 * Registry of languages (4.8). Adding a language means adding a catalog and its
 * entry here; no other code changes. Spanish is the root of every fallback chain.
 */

export type Direccion = 'ltr' | 'rtl';

export interface MetaLengua {
  /** BCP-47 tag used by the browser and the audio manifest. */
  etiquetaBcp47: string;
  nombre: string;
  /** Variety the catalog text is written in. Always declared (4.8). */
  variedad: string;
  direccion: Direccion;
  /** Language to fall back to, or null for the root (Spanish). */
  respaldo: string | null;
  /** Browser speech synthesis is used for Spanish only (4.8). */
  sintesisVoz: boolean;
}

export type RegistroLenguas = Record<string, MetaLengua>;

export const REGISTRO_LENGUAS: RegistroLenguas = {
  es: { etiquetaBcp47: 'es-PE', nombre: 'Castellano', variedad: 'castellano del Perú', direccion: 'ltr', respaldo: null, sintesisVoz: true },
  quy: { etiquetaBcp47: 'quy', nombre: 'Quechua', variedad: 'Ayacucho-Chanka', direccion: 'ltr', respaldo: 'es', sintesisVoz: false },
  ayr: { etiquetaBcp47: 'ayr', nombre: 'Aimara', variedad: 'Aimara central', direccion: 'ltr', respaldo: 'es', sintesisVoz: false },
};

/** Fallback chain from `codigo` to its root. Stops on a cycle or an unknown code. */
export function cadenaRespaldo(codigo: string, registro: RegistroLenguas = REGISTRO_LENGUAS): string[] {
  const cadena: string[] = [];
  let actual: string | null = codigo;
  while (actual !== null && registro[actual] !== undefined && !cadena.includes(actual)) {
    cadena.push(actual);
    actual = registro[actual]?.respaldo ?? null;
  }
  return cadena;
}

/** Only Spanish has speech synthesis. Quechua and Aymara audio are native recordings (4.8). */
export function sintesisDeVozDisponible(codigo: string, registro: RegistroLenguas = REGISTRO_LENGUAS): boolean {
  return registro[codigo]?.sintesisVoz === true;
}
