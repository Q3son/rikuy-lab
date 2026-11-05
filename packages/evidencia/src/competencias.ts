/**
 * Mapping from the five judge indicators to the CNEB capacities of competency 1
 * ("Indaga mediante metodos cientificos para construir sus conocimientos").
 *
 * The capacity names are the official CNEB wording for science and technology, competency 1.
 * They must be re-checked letter by letter against @rikuy/curriculum-cneb once F9 ships it
 * (wireframe notes, open question 10). The indicator -> capacity assignment is a proposal.
 */
import type { Indicador } from '@rikuy/contracts';

export type CapacidadId = 'problematiza' | 'disena' | 'genera' | 'analiza' | 'evalua';

export const CAPACIDADES_INDAGA: readonly { id: CapacidadId; nombre: string }[] = [
  { id: 'problematiza', nombre: 'Problematiza situaciones' },
  { id: 'disena', nombre: 'Diseña estrategias para hacer indagación' },
  { id: 'genera', nombre: 'Genera y registra datos o información' },
  { id: 'analiza', nombre: 'Analiza datos e información' },
  { id: 'evalua', nombre: 'Evalúa y comunica el proceso y resultados de su indagación' },
];

const MAPA: Record<Indicador, CapacidadId> = {
  prediccion: 'problematiza',
  variable: 'disena',
  uso_del_dato: 'genera',
  justificacion: 'analiza',
  conclusion_coherente: 'evalua',
};

export function capacidadDe(indicador: Indicador): CapacidadId {
  return MAPA[indicador];
}

export function nombreCapacidad(id: CapacidadId): string {
  return CAPACIDADES_INDAGA.find((c) => c.id === id)?.nombre ?? id;
}

export const ETIQUETA_INDICADOR: Record<Indicador, string> = {
  variable: 'Identifica la variable',
  prediccion: 'Predice antes de medir',
  justificacion: 'Justifica su idea',
  uso_del_dato: 'Usa su propio dato',
  conclusion_coherente: 'Concluye con coherencia',
};
