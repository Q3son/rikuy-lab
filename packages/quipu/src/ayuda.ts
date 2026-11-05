/**
 * "Ayudante del museo" (FUNCIONES_EXTRA 2.5): a knot for the helper group plus one for the classroom.
 * The group that asked loses nothing and is not marked. Anti-collusion limits and teacher revocation.
 * Source events come from F5 (mocked here over this type until F5 merges).
 */
import type { AsientoQuipu } from '@rikuy/contracts';
import { idDeterminista } from './ids.ts';

export interface AyudaCerrada {
  /** Id of the close event emitted by F5 (becomes part of the deterministic entry ids). */
  id: string;
  aulaId: string;
  claseId: string;
  ayudanteGrupoId: string;
  pideGrupoId: string;
  conceptoId: string;
  resultado: 'nos_ayudo' | 'casi' | 'aun_no';
  /** The judge could evaluate the asking group's sentence ("evaluable") or not. */
  juez: 'evaluable' | 'no_evaluable';
  confirmacion: 'docente' | 'pendiente' | 'automatica';
  ts: number;
  evidenciaRef?: string;
}

export interface ReglaAyuda {
  /** Class rule "docente confirma". */
  requiereDocente: boolean;
}

export type ResultadoAyuda =
  | { asientos: AsientoQuipu[] }
  | { pendiente: true }
  | { rechazada: 'mismo_grupo' | 'sin_ayuda' | 'requiere_docente' | 'tope_diario' | 'repetida_semana' };

export const MAX_AYUDAS_DIA_POR_GRUPO = 3;
const DIA = 24 * 3600 * 1000;
const LIMA = 5 * 3600 * 1000;

const dia = (ms: number) => Math.floor((ms - LIMA) / DIA);
/** Lima week, Monday start (1970-01-01 was a Thursday). */
const semana = (ms: number) => Math.floor((dia(ms) + 3) / 7);

export function asientosDeAyuda(a: AyudaCerrada, historial: AyudaCerrada[], regla: ReglaAyuda): ResultadoAyuda {
  if (a.ayudanteGrupoId === a.pideGrupoId) return { rechazada: 'mismo_grupo' };
  if (a.resultado !== 'nos_ayudo') return { rechazada: 'sin_ayuda' };
  if (a.confirmacion === 'pendiente') return { pendiente: true };
  if ((regla.requiereDocente || a.juez === 'no_evaluable') && a.confirmacion !== 'docente') return { rechazada: 'requiere_docente' };

  const previas = historial.filter((h) => h.id !== a.id && h.ayudanteGrupoId === a.ayudanteGrupoId && h.resultado === 'nos_ayudo');
  if (previas.filter((h) => dia(h.ts) === dia(a.ts)).length >= MAX_AYUDAS_DIA_POR_GRUPO) return { rechazada: 'tope_diario' };
  if (previas.some((h) => h.pideGrupoId === a.pideGrupoId && h.conceptoId === a.conceptoId && semana(h.ts) === semana(a.ts))) {
    return { rechazada: 'repetida_semana' };
  }

  const emitidoPor = a.confirmacion === 'docente' ? ('docente' as const) : ('reglas' as const);
  const base = { aulaId: a.aulaId, claseId: a.claseId, nudos: 1, motivo: 'ayudo_a_otro_grupo' as const, emitidoPor, ...(a.evidenciaRef ? { evidenciaRef: a.evidenciaRef } : {}) };
  return {
    asientos: [
      { ...base, id: ayudaIdGrupo(a), beneficiario: { tipo: 'grupo', grupoId: a.ayudanteGrupoId } },
      { ...base, id: ayudaIdAula(a), beneficiario: { tipo: 'aula' } },
    ],
  };
}

const ayudaIdGrupo = (a: AyudaCerrada) => idDeterminista('quipu', 'ayuda', 'grupo', a.id);
const ayudaIdAula = (a: AyudaCerrada) => idDeterminista('quipu', 'ayuda', 'aula', a.id);

/** Teacher revocation: a negative correction per entry of that help. The ledger keeps both. */
export function revocarAyuda(a: AyudaCerrada): AsientoQuipu[] {
  const corregir = (id: string, beneficiario: AsientoQuipu['beneficiario']): AsientoQuipu => ({
    id: idDeterminista('quipu', 'revoca', id),
    aulaId: a.aulaId,
    claseId: a.claseId,
    beneficiario,
    nudos: -1,
    motivo: 'correccion_docente',
    emitidoPor: 'docente',
    corrigeA: id,
  });
  return [corregir(ayudaIdGrupo(a), { tipo: 'grupo', grupoId: a.ayudanteGrupoId }), corregir(ayudaIdAula(a), { tipo: 'aula' })];
}
