/** Emission rules (ARQUITECTURA 3.11): pure and deterministic, evaluated on the teacher phone. */
import type { AsientoQuipu } from '@rikuy/contracts';
import { idDeterminista } from './ids.ts';

export interface GrupoEnClase {
  grupoId: string;
  predijoAntesDeMedir: boolean;
  /** e.g. 3 lengths x 10 oscillations. */
  medicionCompleta: boolean;
  concluyoConDato: boolean;
  /** Required for the "conclusion with data" knot: every entry is auditable. */
  evidenciaRef?: string;
}

export interface SnapshotClase {
  aulaId: string;
  claseId: string;
  grupos: GrupoEnClase[];
  retosCooperativosCompletados: string[];
}

export function emitirPorReglas(s: SnapshotClase): AsientoQuipu[] {
  const salida: AsientoQuipu[] = [];
  const base = { aulaId: s.aulaId, claseId: s.claseId, emitidoPor: 'reglas' as const };
  if (s.grupos.length > 0 && s.grupos.every((g) => g.predijoAntesDeMedir)) {
    salida.push({ ...base, id: idDeterminista('quipu', 'todos_predijeron', s.claseId), beneficiario: { tipo: 'aula' }, nudos: 1, motivo: 'todos_predijeron' });
  }
  for (const g of s.grupos) {
    if (g.medicionCompleta) {
      salida.push({ ...base, id: idDeterminista('quipu', 'medicion_completa', s.claseId, g.grupoId), beneficiario: { tipo: 'grupo', grupoId: g.grupoId }, nudos: 1, motivo: 'medicion_completa' });
    }
    if (g.concluyoConDato && g.evidenciaRef) {
      salida.push({
        ...base,
        id: idDeterminista('quipu', 'conclusion_con_dato', s.claseId, g.grupoId),
        beneficiario: { tipo: 'grupo', grupoId: g.grupoId },
        nudos: 1,
        motivo: 'conclusion_con_dato',
        evidenciaRef: g.evidenciaRef,
      });
    }
  }
  for (const reto of s.retosCooperativosCompletados) {
    salida.push({ ...base, id: idDeterminista('quipu', 'reto_cooperativo', s.claseId, reto), beneficiario: { tipo: 'aula' }, nudos: 1, motivo: 'reto_cooperativo' });
  }
  return salida;
}
