/**
 * Evidence view for the teacher (T-09): one row per group and indicator with the literal quote,
 * "no evaluable" and the confirmation state.
 *
 * Honesty rules enforced here, not in the UI (5.4 gates):
 *  - a quote counts only if it is an exact substring of the response it points to;
 *  - "NO" (not assessable) is never turned into a zero;
 *  - groups keep join order and nothing is sorted, ranked or totalled by level;
 *  - when an indicator has several evidences, the latest wins, never the highest.
 */
import type { Evidencia, Indicador, NivelEvidencia } from '@rikuy/contracts';
import { capacidadDe, type CapacidadId } from './competencias.ts';
import { esCitaLiteral } from './cita.ts';
import type { ProyeccionClase } from './proyeccion.ts';

export const INDICADORES = ['variable', 'prediccion', 'justificacion', 'uso_del_dato', 'conclusion_coherente'] as const satisfies readonly Indicador[];

export interface IndicadorVista {
  indicador: Indicador;
  capacidad: CapacidadId;
  nivel: NivelEvidencia;
  estado: 'ok' | 'dudoso' | 'no_observable';
  /** Verified literal quote, or null. */
  cita: string | null;
  /** Full text the quote comes from (to show it in context). */
  textoOriginal: string | null;
  evidenciaId: string | null;
  /** No evidence at all yet ("sin evidencia aun"), different from "not achieved". */
  sinEvidencia: boolean;
  confirmada: boolean;
  corregidaPorDocente: boolean;
  fuente: Evidencia['fuente'] | null;
  /** Aliases (E07) of the students the group said answered, never names. */
  autores: string[];
}

export interface GrupoVista {
  grupoId: string;
  apodo: string;
  indicadores: IndicadorVista[];
  /** Quoted indicators waiting for the teacher to confirm or correct. */
  porConfirmar: number;
}

export interface VistaEvidencias {
  grupos: GrupoVista[];
  porConfirmar: number;
  /** Quotes that were not exact substrings and were therefore dropped. */
  citasRechazadas: number;
}

export function construirVistaEvidencias(p: ProyeccionClase): VistaEvidencias {
  const respuestas = new Map(p.respuestas.map((r) => [r.dato.id, r]));
  const alias = new Map(p.estudiantes.map((s) => [s.id, s.alias]));
  let citasRechazadas = 0;

  // Latest confirmation per evidence.
  const confirmacion = new Map<string, { nivel?: NivelEvidencia; hlc: string }>();
  for (const c of p.confirmaciones) {
    const previa = confirmacion.get(c.evidenciaId);
    if (!previa || previa.hlc <= c.hlc) confirmacion.set(c.evidenciaId, { nivel: c.nivel, hlc: c.hlc });
  }

  const grupos: GrupoVista[] = p.grupos.map((g) => {
    const propias = p.evidencias.filter((e) => e.dato.grupoId === g.id); // already in HLC order
    const indicadores = INDICADORES.map((indicador): IndicadorVista => {
      const candidatas = propias.filter((e) => e.dato.indicador === indicador);
      const ultima = candidatas[candidatas.length - 1];
      const base = { indicador, capacidad: capacidadDe(indicador) };
      if (!ultima) {
        return { ...base, nivel: 'NO', estado: 'no_observable', cita: null, textoOriginal: null, evidenciaId: null, sinEvidencia: true, confirmada: false, corregidaPorDocente: false, fuente: null, autores: [] };
      }
      const ev = ultima.dato;
      const respuesta = respuestas.get(ev.respuestaId);
      const pretendeCita = ev.cita.trim().length > 0;
      const citaValida = pretendeCita && respuesta !== undefined && respuesta.dato.grupoId === ev.grupoId && esCitaLiteral(ev.cita, respuesta.dato.texto);
      if (pretendeCita && !citaValida) citasRechazadas += 1;

      const conf = confirmacion.get(ev.id);
      const corregida = conf?.nivel !== undefined && conf.nivel !== ev.nivel;
      const autores = (respuesta?.estudianteIds ?? []).map((id) => alias.get(id)).filter((a): a is string => a !== undefined);

      // Without a verified quote the criterion does not count (T-09, point 1).
      if (!citaValida && pretendeCita) {
        return { ...base, nivel: 'NO', estado: 'no_observable', cita: null, textoOriginal: null, evidenciaId: ev.id, sinEvidencia: false, confirmada: false, corregidaPorDocente: false, fuente: ev.fuente, autores };
      }
      return {
        ...base,
        nivel: conf?.nivel ?? ev.nivel,
        estado: ev.estado,
        cita: citaValida ? ev.cita : null,
        textoOriginal: citaValida ? (respuesta?.dato.texto ?? null) : null,
        evidenciaId: ev.id,
        sinEvidencia: false,
        confirmada: conf !== undefined || ev.confirmadaPorDocente,
        corregidaPorDocente: corregida,
        fuente: ev.fuente,
        autores,
      };
    });
    const porConfirmar = indicadores.filter((i) => i.cita !== null && !i.confirmada).length;
    return { grupoId: g.id, apodo: g.apodo, indicadores, porConfirmar };
  });

  return { grupos, porConfirmar: grupos.reduce((n, g) => n + g.porConfirmar, 0), citasRechazadas };
}
