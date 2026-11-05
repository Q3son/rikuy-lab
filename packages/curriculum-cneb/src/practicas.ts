/**
 * The practices of `content/practicas/` (F9), bundled and validated against the `Practica` contract.
 * One source for the lab, the museum and the Creador floor: no local copies in the apps.
 */
import { Practica } from '@rikuy/contracts';
import lactasa from '../../../content/practicas/lactasa.json';
import pendulo from '../../../content/practicas/pendulo.json';
import respiratorio from '../../../content/practicas/respiratorio.json';

/** Slug (file name) -> practice. Parsed once; an invalid file fails loudly at import time. */
export const PRACTICAS: Readonly<Record<string, Practica>> = Object.freeze({
  pendulo: Practica.parse(pendulo),
  lactasa: Practica.parse(lactasa),
  respiratorio: Practica.parse(respiratorio),
});

export const SLUGS_PRACTICAS = Object.keys(PRACTICAS);

/** By slug (`pendulo`) or by id. */
export function practicaPorClave(clave: string): Practica | undefined {
  return PRACTICAS[clave] ?? Object.values(PRACTICAS).find((p) => p.id === clave);
}

export function slugDePractica(id: string): string | undefined {
  return Object.entries(PRACTICAS).find(([, p]) => p.id === id)?.[0];
}

/**
 * The Spanish texts students may see: only when the reviewed Spanish block exists
 * (`textos.es.revisado`), else `undefined` (rule of TextosLengua: unreviewed text never reaches students).
 */
export function textosParaEstudiantes(p: Practica): { preguntaGuia: string; pistas: string[] } | undefined {
  const es = p.textos?.es;
  return es?.revisado ? { preguntaGuia: es.preguntaGuia, pistas: es.pistas } : undefined;
}
