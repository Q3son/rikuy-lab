/** Verdict -> contract `Evidencia`. Ids come from the caller (the clock and ULID live in the adapters). */
import { Evidencia, type DesempenoCorto } from '@rikuy/contracts';
import type { VeredictoJuez } from './tipos.ts';

export interface IdsEvidencia {
  id: string;
  respuestaId: string;
  grupoId: string;
  claseId: string;
  desempeno: DesempenoCorto;
}

export function construirEvidencia(v: VeredictoJuez, ids: IdsEvidencia): Evidencia {
  return Evidencia.parse({
    id: ids.id,
    respuestaId: ids.respuestaId,
    grupoId: ids.grupoId,
    claseId: ids.claseId,
    indicador: v.indicador,
    nivel: v.nivel,
    estado: v.estado,
    cita: v.cita,
    desempeno: ids.desempeno,
    fuente: v.fuente,
    ...(v.corridas ? { corridas: v.corridas } : {}),
    confirmadaPorDocente: false,
  });
}
