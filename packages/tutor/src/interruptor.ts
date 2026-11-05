/**
 * Kill switch of the tutor: event `tutor.interruptor` (signed by the teacher, 4.6). When off, groups go
 * to "modo cuaderno" (guiding question, measurement, conclusion) and the tutor is silent.
 * Pure fold over events: the latest event that applies to the group wins, in HLC order.
 */
export interface EventoInterruptor {
  hlc: string;
  datos: { activo: boolean; grupoId?: string | undefined };
}

export interface EstadoInterruptor {
  global: boolean;
  porGrupo: Record<string, boolean>;
}

export function calcularInterruptor(eventos: readonly EventoInterruptor[], opciones: { base?: boolean } = {}): EstadoInterruptor {
  const estado: EstadoInterruptor = { global: opciones.base ?? true, porGrupo: {} };
  for (const e of [...eventos].sort((a, b) => (a.hlc < b.hlc ? -1 : a.hlc > b.hlc ? 1 : 0))) {
    if (e.datos.grupoId) estado.porGrupo[e.datos.grupoId] = e.datos.activo;
    else {
      estado.global = e.datos.activo;
      estado.porGrupo = {};
    }
  }
  return estado;
}

/** Is the tutor allowed to speak to this group? `base` is the class configuration (`Clase.tutor.activo`). */
export function tutorActivo(eventos: readonly EventoInterruptor[], grupoId: string, base = true): boolean {
  const e = calcularInterruptor(eventos, { base });
  return e.porGrupo[grupoId] ?? e.global;
}
