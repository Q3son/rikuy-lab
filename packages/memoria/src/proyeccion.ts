/**
 * `MemoriaEntrada` as a DETERMINISTIC projection of events (ARQUITECTURA 3.10):
 * `evidencia.calculada/confirmada`, `respuesta.registrada`, `pista.mostrada` and `estudiante.olvidar`.
 *
 * - Same events in any order give the same entries and the same ids (no clock, no randomness).
 * - The summary comes from templates; the student's words stay in the linked `Evidencia`.
 * - An answer without avatars belongs to the group and produces no individual entry.
 * - It never reads signals (`senales.*`): memory and signals do not touch (ARQUITECTURA 2.3).
 * Per-student memory idea: AtomicMemory use in paoloose/aulaquipu (backend/agents/aulaquipu-tutor/src/memory.ts).
 */
import type { DesempenoRef, Evidencia, EventoTipado, MemoriaEntrada, RespuestaRazonamiento } from '@rikuy/contracts';
import { idDeterminista } from './id.ts';

export interface PracticaDeClase {
  desempeno: Pick<DesempenoRef, 'nivel' | 'grado' | 'area' | 'competencia' | 'desempeno'>;
  /** Concept ids of the practice (curriculum-cneb graph). */
  conceptos: string[];
}

export interface ContextoProyeccion {
  aulaId: string;
  /** Which practice a class ran. Entries of unknown classes are skipped. */
  practicaDeClase(claseId: string): PracticaDeClase | undefined;
  /**
   * Does the group's own data confirm the prediction? Injected by the composition root (the judge in
   * @rikuy/tutor compares text and measurements). Absent, the memory claims neither confirmation nor refutation.
   */
  contraste?:
    | ((p: { evidencia: Evidencia; respuesta: RespuestaRazonamiento | undefined; claseId: string; grupoId: string }) => 'confirma' | 'contradice' | 'indeterminado')
    | undefined;
}

const MAX_RESUMEN = 200;

function plantilla(tipo: MemoriaEntrada['tipo'], conceptos: string[], n = 0): string {
  const sobre = conceptos.length ? ` (${conceptos.slice(0, 4).join(', ')})` : '';
  const texto: Record<MemoriaEntrada['tipo'], string> = {
    prediccion_confirmada: `Predijo un resultado y su dato propio lo confirmó${sobre}`,
    prediccion_refutada: `Predijo un resultado y su dato propio lo contradijo${sobre}; sirve para volver a preguntar`,
    pista_necesaria: `Necesitó la pista 3 en este desempeño${sobre}`,
    logro: `La docente confirmó un logro de nivel 3 en este desempeño${sobre}`,
    dificultad: `Tuvo nivel bajo en ${n} evidencias de este desempeño${sobre}`,
    pregunta_abierta: `Dejó una pregunta abierta${sobre}`,
  };
  return texto[tipo].slice(0, MAX_RESUMEN);
}

export function proyectarMemoria(eventos: readonly EventoTipado[], ctx: ContextoProyeccion): MemoriaEntrada[] {
  const olvidados = new Set<string>();
  const respuestas = new Map<string, { ev: EventoTipado; datos: RespuestaRazonamiento }>();
  const evidencias = new Map<string, { ev: EventoTipado; datos: Evidencia }>();
  const confirmaciones = new Map<string, { hlc: string; nivel: Evidencia['nivel'] | undefined }>();

  for (const e of eventos) {
    switch (e.tipo) {
      case 'estudiante.olvidar':
        olvidados.add(e.datos.estudianteId);
        break;
      case 'respuesta.registrada':
        respuestas.set(e.datos.id, { ev: e, datos: e.datos });
        break;
      case 'evidencia.calculada':
        evidencias.set(e.datos.id, { ev: e, datos: e.datos });
        break;
      case 'evidencia.confirmada': {
        const previa = confirmaciones.get(e.datos.evidenciaId);
        if (!previa || previa.hlc < e.hlc) confirmaciones.set(e.datos.evidenciaId, { hlc: e.hlc, nivel: e.datos.nivel });
        break;
      }
      default:
        break;
    }
  }

  const salida = new Map<string, MemoriaEntrada>();
  const guardar = (e: MemoriaEntrada) => {
    const previa = salida.get(e.id);
    if (!previa || previa.hlc < e.hlc) salida.set(e.id, e);
  };

  const atribuidos = (...evs: Array<EventoTipado | undefined>): string[] => {
    for (const ev of evs) {
      const ids = ev?.autor.estudianteIds;
      if (ids && ids.length > 0) return ids.filter((id) => !olvidados.has(id));
    }
    return [];
  };

  const crear = (
    tipo: MemoriaEntrada['tipo'],
    estudianteId: string,
    claseId: string,
    semilla: string,
    desempeno: { competencia: number; desempeno: number } | undefined,
    evidenciaIds: string[],
    hlc: string,
    n = 0,
  ): void => {
    const practica = ctx.practicaDeClase(claseId);
    if (!practica) return;
    const d = practica.desempeno;
    guardar({
      id: idDeterminista(`${tipo}|${estudianteId}|${semilla}`),
      estudianteId,
      aulaId: ctx.aulaId,
      competencia: {
        nivel: d.nivel,
        grado: d.grado,
        area: d.area,
        competencia: desempeno?.competencia ?? d.competencia,
        desempeno: desempeno?.desempeno ?? d.desempeno,
      },
      conceptos: practica.conceptos,
      tipo,
      resumen: plantilla(tipo, practica.conceptos, n),
      evidenciaIds: [...evidenciaIds].sort(),
      hlc,
    });
  };

  const bajas = new Map<string, { claseId: string; competencia: number; desempeno: number; estudianteId: string; ids: string[]; hlc: string }>();

  for (const [id, { ev, datos }] of evidencias) {
    const r = respuestas.get(datos.respuestaId);
    const estudiantes = atribuidos(r?.ev, ev);
    if (estudiantes.length === 0) continue;
    const conf = confirmaciones.get(id);
    const nivel = conf?.nivel ?? datos.nivel;
    if (nivel === 'NO') continue; // not assessable: never a zero, never memory

    for (const s of estudiantes) {
      if (datos.indicador === 'prediccion' && ctx.contraste && nivel >= 1) {
        const v = ctx.contraste({ evidencia: datos, respuesta: r?.datos, claseId: ev.claseId, grupoId: datos.grupoId });
        if (v === 'confirma' && nivel >= 2) crear('prediccion_confirmada', s, ev.claseId, id, datos.desempeno, [id], ev.hlc);
        if (v === 'contradice') crear('prediccion_refutada', s, ev.claseId, id, datos.desempeno, [id], ev.hlc);
      }
      if (conf && nivel === 3) crear('logro', s, ev.claseId, id, datos.desempeno, [id], conf.hlc > ev.hlc ? conf.hlc : ev.hlc);
      if (nivel <= 1) {
        const clave = `${s}|${datos.desempeno.competencia}|${datos.desempeno.desempeno}`;
        const acumulado = bajas.get(clave) ?? {
          claseId: ev.claseId,
          competencia: datos.desempeno.competencia,
          desempeno: datos.desempeno.desempeno,
          estudianteId: s,
          ids: [],
          hlc: ev.hlc,
        };
        acumulado.ids.push(id);
        if (ev.hlc > acumulado.hlc) acumulado.hlc = ev.hlc;
        bajas.set(clave, acumulado);
      }
    }
  }

  for (const b of bajas.values()) {
    if (b.ids.length >= 2) {
      crear('dificultad', b.estudianteId, b.claseId, `c${b.competencia}d${b.desempeno}`, { competencia: b.competencia, desempeno: b.desempeno }, b.ids, b.hlc, b.ids.length);
    }
  }

  for (const e of eventos) {
    if (e.tipo !== 'pista.mostrada' || e.datos.nivel < 3) continue;
    for (const s of atribuidos(e)) crear('pista_necesaria', s, e.claseId, e.datos.practicaId, undefined, [], e.hlc);
  }

  return [...salida.values()].sort((a, b) => (a.hlc < b.hlc ? -1 : a.hlc > b.hlc ? 1 : a.id < b.id ? -1 : 1));
}
