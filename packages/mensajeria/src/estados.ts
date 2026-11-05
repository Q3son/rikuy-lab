import type { EstadoAdaptador, EstadoEntrega } from './puertos.ts';

/** The read receipt is collapsed to "entregado": pressuring families over "did not read" breaks trust. */
export function estadoParaDocente(e: EstadoAdaptador): EstadoEntrega {
  return e === 'leido' ? 'entregado' : e;
}

export const ESTADOS_TERMINALES: readonly EstadoEntrega[] = ['entregado', 'fallido', 'rebotado', 'baja'];
