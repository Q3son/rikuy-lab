/**
 * Level of support (Milo-style, FUNCIONES_EXTRA function 3): "how do we want to work today".
 * It is NOT a diagnosis and NOT a label of any student: it belongs to the session of the group
 * device, never enters the Brain nor any report, and can be changed at any time.
 */
export type NivelAcompanamiento = 'apoyo' | 'normal' | 'desafio';
export const NIVELES: readonly NivelAcompanamiento[] = ['apoyo', 'normal', 'desafio'];

export interface EfectosDeNivel {
  /** Show the pictogram sentence builder prominently. */
  pictogramas: boolean;
  /** Start with the audio mode on. */
  modoAudio: boolean;
  /** Density of the hints the tutor offers (F4 reads this). */
  densidadPistas: 'cortas' | 'normal' | 'menos';
  /** More open questions, fewer closed ones (F4 reads this). */
  preguntasAbiertas?: boolean;
}

export function efectosDeNivel(nivel: NivelAcompanamiento): EfectosDeNivel {
  switch (nivel) {
    case 'apoyo':
      return { pictogramas: true, modoAudio: true, densidadPistas: 'cortas' };
    case 'desafio':
      return { pictogramas: false, modoAudio: false, densidadPistas: 'menos', preguntasAbiertas: true };
    default:
      return { pictogramas: false, modoAudio: false, densidadPistas: 'normal' };
  }
}
