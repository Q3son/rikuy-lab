/**
 * Support policy (ARQUITECTURA 5.4 F4, 4.9): receives the coarse `EstadoApoyo` and may only OFFER a hint,
 * a slower pace or a pause. It never names an emotion, never changes a level of evidence and never
 * decides for the student. Without the state (flag off) nothing changes.
 */
import type { AccionApoyo, EstadoApoyo } from '@rikuy/contracts';

const CONFIANZA_MINIMA = 0.5;

export function politicaApoyo(estado: EstadoApoyo | undefined): AccionApoyo {
  if (!estado || estado.confianza < CONFIANZA_MINIMA) return 'nada';
  if (estado.frustracion === 'alto') return 'sugerirPausa';
  if (estado.confusion === 'alto') return 'ofrecerPista';
  if (estado.atencion === 'bajo') return 'irMasLento';
  return 'nada';
}

/** Offer phrases: about the task, never about how the student feels. */
export const FRASES_APOYO: Record<AccionApoyo, string> = {
  ofrecerPista: 'Si quieres, puedo darte una pista.',
  irMasLento: 'Podemos ir más despacio, sin apuro.',
  sugerirPausa: '¿Hacemos una pausa corta?',
  nada: '',
};
