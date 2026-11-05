/**
 * Rules floor (4.1, 4.3): the deterministic verifier exposed as a reviewer. It never needs a network.
 * The catalog floor of the generator lives in the Creador chain (`creador.ts`).
 */
import type { Adaptador } from '../enrutador.ts';
import { ok } from '../result.ts';
import { verificarBorrador, type ContextoVerificacion } from '../verificador.ts';

export function crearAdaptadorReglas(contexto: ContextoVerificacion): Adaptador {
  return {
    nombre: 'reglas',
    fuente: 'reglas',
    modelo: 'reglas-verificador',
    disponible: () => true,
    capacidades: {
      revisarPractica: {
        revisar: async (b) => {
          const r = verificarBorrador(b, contexto);
          return ok({ veredicto: r.ok ? ('ok' as const) : ('observado' as const), observaciones: r.hallazgos.map((h) => h.mensaje).slice(0, 8), modelo: 'reglas-verificador' });
        },
      },
    },
  };
}
