/**
 * How the tutor uses what the memory returns (at most 5 entries, ~600 characters, ARQUITECTURA 3.10):
 * to pick the starting rung of the ladder and to resume an earlier prediction. Never to label the student.
 */
import type { MemoriaEntrada } from '@rikuy/contracts';

const MAX_ENTRADAS = 5;

/** Rung 2 if the student needed hints or struggled in this performance before; never 3. */
export function peldanoInicial(recuerdos: readonly MemoriaEntrada[]): 1 | 2 {
  return recuerdos.slice(0, MAX_ENTRADAS).some((r) => r.tipo === 'pista_necesaria' || r.tipo === 'dificultad') ? 2 : 1;
}

/** "La clase pasada: Predijo que ... ¿Qué crees ahora?" from the most recent prediction entry. */
export function frasePrevia(recuerdos: readonly MemoriaEntrada[]): string {
  const prediccion = recuerdos
    .slice(0, MAX_ENTRADAS)
    .filter((r) => r.tipo === 'prediccion_confirmada' || r.tipo === 'prediccion_refutada' || r.tipo === 'pregunta_abierta')
    .sort((a, b) => (a.hlc < b.hlc ? 1 : a.hlc > b.hlc ? -1 : 0))[0];
  if (!prediccion) return '';
  return `La clase pasada: ${prediccion.resumen.replace(/[.\s]+$/, '')}. ¿Qué crees ahora?`;
}
