/** Per-group progress for "Mi clase de hoy". Shown in join order; never used to sort or rank groups. */
import type { ProyeccionClase } from './proyeccion.ts';

export interface AvanceGrupo {
  grupoId: string;
  apodo: string;
  predijo: boolean;
  prediccionAntesDeMedir: boolean;
  medicionesHechas: number;
  medicionesEsperadas: number;
  concluyo: boolean;
}

export function medicionesEsperadas(protocolo: { repeticiones: number; valoresIndependiente: readonly number[] }): number {
  return protocolo.repeticiones * protocolo.valoresIndependiente.length;
}

export function avancePorGrupo(p: ProyeccionClase, esperadas: number): AvanceGrupo[] {
  return p.grupos.map((g) => {
    const resp = p.respuestas.filter((r) => r.dato.grupoId === g.id);
    const meds = p.mediciones.filter((m) => m.dato.grupoId === g.id);
    const pred = resp.find((r) => r.dato.momento === 'prediccion');
    const primeraMedicion = meds[0];
    return {
      grupoId: g.id,
      apodo: g.apodo,
      predijo: pred !== undefined,
      prediccionAntesDeMedir: pred !== undefined && (!primeraMedicion || pred.hlc < primeraMedicion.hlc),
      medicionesHechas: meds.length,
      medicionesEsperadas: esperadas,
      concluyo: resp.some((r) => r.dato.momento === 'conclusion'),
    };
  });
}
