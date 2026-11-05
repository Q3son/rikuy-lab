/**
 * Exact literal lookup of CNEB performance texts (4.4 validators, 3.12 "cita literal").
 * A quote is valid only when it is a verbatim substring of the official text: no
 * normalization, no case folding, no whitespace folding.
 */
import type { DesempenoRef } from '@rikuy/contracts';
import { subconjunto } from './datos.ts';
import { AREA_CYT, type Nivel } from './extraccion.ts';

/** Shorter quotes match too many performances to prove anything. */
export const LONGITUD_MINIMA_CITA = 20;

export interface UbicacionCita {
  nivel: Nivel;
  grado: number;
  competencia: number;
  desempeno: number;
  texto: string;
  /** Offset of the quote inside the official performance text. */
  inicio: number;
}

/** Every performance whose official text contains `cita` exactly. */
export function ubicarCita(cita: string): UbicacionCita[] {
  if (cita.length < LONGITUD_MINIMA_CITA) return [];
  const hallazgos: UbicacionCita[] = [];
  for (const grado of subconjunto.grados) {
    for (const competencia of grado.competencias) {
      competencia.desempenos.forEach((texto, indice) => {
        const inicio = texto.indexOf(cita);
        if (inicio !== -1) {
          hallazgos.push({ nivel: grado.nivel, grado: grado.grado, competencia: competencia.numero, desempeno: indice + 1, texto, inicio });
        }
      });
    }
  }
  return hallazgos;
}

/** Official text of one numbered performance, or undefined when it does not exist. */
export function desempenoTexto(nivel: Nivel, grado: number, competencia: number, desempeno: number): string | undefined {
  const g = subconjunto.grados.find((x) => x.nivel === nivel && x.grado === grado);
  const c = g?.competencias.find((x) => x.numero === competencia);
  return c?.desempenos[desempeno - 1];
}

/**
 * True when the reference points at a real science and technology performance and its
 * quote is a verbatim substring of that performance's text (competency number included).
 */
export function citaLiteral(ref: DesempenoRef): boolean {
  if (ref.area !== AREA_CYT) return false;
  if (ref.cita.length < LONGITUD_MINIMA_CITA) return false;
  const texto = desempenoTexto(ref.nivel, ref.grado, ref.competencia, ref.desempeno);
  return texto !== undefined && texto.includes(ref.cita);
}
