/**
 * Competency report (T-13): groups with evidence per CNEB capacity. The remainder is
 * "sin evidencia aun", never "no logrado" and never a zero.
 */
import { CAPACIDADES_INDAGA, type CapacidadId } from './competencias.ts';
import type { VistaEvidencias } from './evidencias.ts';

export interface CoberturaCapacidad {
  id: CapacidadId;
  nombre: string;
  gruposConEvidencia: number;
  gruposSinEvidencia: number;
}

export function coberturaPorCapacidad(v: VistaEvidencias): CoberturaCapacidad[] {
  return CAPACIDADES_INDAGA.map((c) => {
    const con = v.grupos.filter((g) => g.indicadores.some((i) => i.capacidad === c.id && i.nivel !== 'NO' && i.cita !== null)).length;
    return { id: c.id, nombre: c.nombre, gruposConEvidencia: con, gruposSinEvidencia: v.grupos.length - con };
  });
}

export interface CitaRepresentativa {
  apodo: string;
  texto: string;
  indicador: string;
}

/** First group, in join order, with a verified quote for the capacity. Deliberately not "the best". */
export function citaRepresentativa(v: VistaEvidencias, capacidad: CapacidadId): CitaRepresentativa | null {
  for (const g of v.grupos) {
    const i = g.indicadores.find((x) => x.capacidad === capacidad && x.cita !== null && x.nivel !== 'NO');
    if (i?.cita) return { apodo: g.apodo, texto: i.cita, indicador: i.indicador };
  }
  return null;
}
