/**
 * The plan reader chain: files -> vision model (Gemini, structured JSON) -> student names removed -> deterministic
 * CNEB mapping. The AI reads, the rules map, the teacher approves (4.1). Fails closed: no partial plan on error.
 */
import type { FuenteModelo, PeticionCreador } from '../creador.ts';
import type { Enrutador } from '../enrutador.ts';
import type { FalloIA } from '../puertos.ts';
import type { ArchivoPlan } from './esquemas.ts';
import { mapearPlan, type CurriculoCneb, type PlanMapeado } from './mapeo.ts';
import { limpiarPlan } from './privacidad.ts';

export interface DepsPlan {
  enrutador: Enrutador;
  curriculo: CurriculoCneb;
}

export interface LecturaPlan {
  plan: PlanMapeado;
  /** How many names or personal data were removed before anything is returned or stored. */
  privacidad: { retirados: number };
  fuente: FuenteModelo;
}

export type SalidaLecturaPlan = { estado: 'extraido'; lectura: LecturaPlan } | { estado: 'fallo'; fallo: FalloIA };

export async function leerPlan(deps: DepsPlan, peticion: PeticionCreador, archivos: ArchivoPlan[]): Promise<SalidaLecturaPlan> {
  const r = await deps.enrutador.ejecutar('extraerPlan', { colegioId: peticion.colegioId, interruptores: peticion.interruptores ?? {} }, (impl, ctx) => impl.extraer(archivos, ctx));
  if (!r.resultado.ok) return { estado: 'fallo', fallo: r.resultado.error };
  const { plan, retirados } = limpiarPlan(r.resultado.valor);
  return {
    estado: 'extraido',
    lectura: {
      plan: mapearPlan(plan, deps.curriculo),
      privacidad: { retirados },
      fuente: { adaptador: r.adaptador!, fuente: r.fuente!, modelo: r.modelo!, simulado: r.simulado ?? false },
    },
  };
}
