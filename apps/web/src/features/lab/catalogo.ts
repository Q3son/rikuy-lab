/**
 * Lab catalog: the practices of content/practicas (F9) through @rikuy/curriculum-cneb, no local copies.
 * `/lab/pendulo` and `/lab/<practice id>` both resolve.
 */
import type { Practica } from '@rikuy/contracts';
import { practicaPorClave, PRACTICAS as PRACTICAS_CNEB } from '@rikuy/curriculum-cneb';
import { protocolFromPractice, type PendulumProtocol } from '@rikuy/lab-engine';

export const PRACTICA_PENDULO: Practica = PRACTICAS_CNEB.pendulo!;

/** Slug or id -> practice. */
export function practicaDelLab(clave: string | undefined): Practica {
  return (clave ? practicaPorClave(clave) : undefined) ?? PRACTICA_PENDULO;
}

/**
 * Each length is timed over 10 full oscillations (the hints say so). `protocolo.repeticiones` of the
 * F9 practice counts repetitions per length, not oscillations (proposal in PROPUESTAS_CONTRATOS.md),
 * so the lab keeps the oscillation count fixed.
 */
export const OSCILACIONES_POR_MEDIDA = 10;

export function protocoloPendulo(p: Practica = PRACTICA_PENDULO): PendulumProtocol {
  return { ...protocolFromPractice(p), oscillations: OSCILACIONES_POR_MEDIDA };
}
