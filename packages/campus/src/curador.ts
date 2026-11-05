/**
 * Room curator (FUNCIONES_EXTRA §3.2, function 9; credit: PixelMAI, UT Nezahualcóyotl, and the AulaQuipu
 * director pattern). The curator asks the room question and opens the back gallery when the group answers.
 * It is not a second tutor: the question is a prediction with no answer key, any honest answer (including
 * "No sé todavía") opens the gate, and the reply is always a question (the same anti-answer rule as Rikuy).
 */
import curadores from '../../../content/museo/curadores.json';

export interface PreguntaCurador {
  salaId: string;
  pregunta: string;
  opciones: { texto: string; retro: string }[];
}

export const CURADORES: PreguntaCurador[] = curadores;

export function preguntaDeSala(salaId: string): PreguntaCurador | undefined {
  return CURADORES.find((c) => c.salaId === salaId);
}

export function responderCurador(salaId: string, opcion: number): { abre: true; mensaje: string } | null {
  const o = preguntaDeSala(salaId)?.opciones[opcion];
  return o ? { abre: true, mensaje: o.retro } : null;
}
