/**
 * Inquiry rehearsal quiz for an exhibition (FUNCIONES_EXTRA 3.2 #10, ECOSISTEMA 3.13 "quiz").
 * The student copy has prompts, options and performance references only. The answer key
 * and the feedback live in a separate file (content/claves/) that the packager never ships.
 * Correction runs on the hub or the teacher device, never on the student device.
 */
import type { DesempenoCorto } from '@rikuy/contracts';
import { desempenoTexto } from './cita.ts';

/** Grade of the performances the pendulum rehearsal points at (secundaria 1). */
const NIVEL = 'secundaria' as const;
const GRADO = 1;

export interface PreguntaEnsayo {
  enunciado: string;
  opciones: string[];
  desempeno: DesempenoCorto;
}

export interface Ensayo {
  id: string;
  practicaId: string;
  titulo: string;
  tiempoMinutos: number;
  sinNota: true;
  preguntas: PreguntaEnsayo[];
}

/** Lives only under content/claves/. `correctas[i]` is the index of the right option of item i. */
export interface ClavesEnsayo {
  recursoId: string;
  correctas: number[];
  /** One feedback text per item, shown after answering. */
  retro: string[];
}

export interface ResultadoEnsayo {
  aciertos: number;
  total: number;
  /** Performances of the missed items, so the student knows what to review. */
  porRevisar: DesempenoCorto[];
}

export function validarEnsayo(ensayo: Ensayo): string[] {
  const errores: string[] = [];
  if (ensayo.sinNota !== true) errores.push('el ensayo debe ser sin nota');
  if (ensayo.preguntas.length < 3 || ensayo.preguntas.length > 5) errores.push('el ensayo tiene entre 3 y 5 preguntas');
  ensayo.preguntas.forEach((p, i) => {
    const etiqueta = `pregunta ${i + 1}`;
    if (p.enunciado.trim() === '') errores.push(`${etiqueta}: enunciado vacío`);
    if (p.opciones.length < 2 || p.opciones.length > 4) errores.push(`${etiqueta}: entre 2 y 4 opciones`);
    if (desempenoTexto(NIVEL, GRADO, p.desempeno.competencia, p.desempeno.desempeno) === undefined) {
      errores.push(`${etiqueta}: desempeño inexistente C${p.desempeno.competencia} D${p.desempeno.desempeno}`);
    }
  });
  return errores;
}

export function validarClaves(ensayo: Ensayo, claves: ClavesEnsayo): string[] {
  const errores: string[] = [];
  if (claves.recursoId !== ensayo.id) errores.push('la clave apunta a otro ensayo');
  if (claves.correctas.length !== ensayo.preguntas.length) errores.push('debe haber una clave por pregunta');
  if (claves.retro.length !== ensayo.preguntas.length) errores.push('debe haber una retroalimentación por pregunta');
  ensayo.preguntas.forEach((p, i) => {
    const c = claves.correctas[i];
    if (c === undefined || !Number.isInteger(c) || c < 0 || c >= p.opciones.length) errores.push(`pregunta ${i + 1}: clave fuera de rango`);
  });
  return errores;
}

/** Scores answers against the key. `respuestas[i]` is the option index chosen for item i. */
export function corregirEnsayo(ensayo: Ensayo, claves: ClavesEnsayo, respuestas: number[]): ResultadoEnsayo {
  const porRevisar: DesempenoCorto[] = [];
  let aciertos = 0;
  ensayo.preguntas.forEach((p, i) => {
    if (respuestas[i] === claves.correctas[i]) aciertos += 1;
    else porRevisar.push(p.desempeno);
  });
  return { aciertos, total: ensayo.preguntas.length, porRevisar };
}
