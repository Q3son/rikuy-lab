/**
 * Simulated delivery adapter (FUNCIONES_EXTRA 1.6): demo, tests and development.
 * Writes to a local outbox and injects deterministic failures to exercise retries and states.
 * Anything shown from it must carry the "Datos simulados" label.
 */
import type { AcuseEnvio, Canal, Destino, EstadoEntrega, FalloEntrega, MensajeSaliente, PuertoEntrega, Resultado } from './puertos.ts';

export interface OpcionesSimulado {
  fallarNVeces?: number;
  rebote?: boolean;
  sinRed?: boolean;
  /** Addresses that withdrew consent (they replied BAJA). */
  bajas?: string[];
  /** `wa.me`-like: the teacher still taps "send", so it is never reported as delivered. */
  manual?: boolean;
}

export interface EntradaBandeja {
  mensaje: MensajeSaliente;
  destino: Destino;
  acuseId: string;
}

export interface AdaptadorSimulado extends PuertoEntrega {
  readonly bandeja: EntradaBandeja[];
}

export function crearAdaptadorSimulado(canal: Canal, o: OpcionesSimulado = {}): AdaptadorSimulado {
  const bandeja: EntradaBandeja[] = [];
  let fallos = 0;
  return {
    canal,
    bandeja,
    capacidades: () => ({ plantillasAprobadas: false, audioAdjunto: false, estadoEntrega: !o.manual }),
    async enviar(mensaje, destino): Promise<Resultado<AcuseEnvio, FalloEntrega>> {
      const fallo = (error: FalloEntrega) => ({ ok: false, error }) as const;
      if (o.sinRed) return fallo({ tipo: 'sin_red', detalle: 'Sin red simulada.' });
      if (o.bajas?.includes(destino.direccion)) return fallo({ tipo: 'sin_consentimiento', detalle: 'La familia respondió BAJA.' });
      if (o.rebote) return fallo({ tipo: 'rebote', detalle: 'Dirección no válida (simulado).' });
      if (fallos < (o.fallarNVeces ?? 0)) {
        fallos += 1;
        return fallo({ tipo: 'proveedor', detalle: 'Fallo simulado del proveedor.' });
      }
      const previo = bandeja.find((b) => b.mensaje.claveIdempotencia === mensaje.claveIdempotencia && b.destino.direccion === destino.direccion);
      if (previo) return { ok: true, valor: { acuseId: previo.acuseId, manual: o.manual } };
      const acuseId = `sim-${bandeja.length + 1}`;
      bandeja.push({ mensaje, destino, acuseId });
      return { ok: true, valor: { acuseId, manual: o.manual } };
    },
    async estado(acuseId): Promise<EstadoEntrega> {
      if (!bandeja.some((b) => b.acuseId === acuseId)) return 'fallido';
      return o.manual ? 'enviado_proveedor' : 'entregado';
    },
  };
}
