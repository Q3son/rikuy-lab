import type { AcuseEnvio, Canal, Destino, EstadoAdaptador, FalloEntrega, MensajeSaliente, PuertoEntrega } from '../puertos.ts';
import { err, ok, type Result } from '../result.ts';
import { escaparHtml } from './pdf-local.ts';

export interface OpcionesEntregaSimulada {
  /** Fails with a transient provider error this many times before succeeding. */
  fallarNVeces?: number;
  /** Every send bounces. */
  rebote?: boolean;
  /** Every send fails as offline. */
  sinRed?: boolean;
  /** The provider reports "leido" (to test that the teacher never sees it). */
  leer?: boolean;
  canal?: Canal;
}

export interface ItemBandeja {
  acuseId: string;
  mensajeId: string;
  destino: Destino;
  vistaPreviaHtml: string;
}

/** Demo, tests and development: writes to a local tray with an HTML preview. Deterministic fault injection. */
export class AdaptadorEntregaSimulado implements PuertoEntrega {
  readonly canal: Canal;
  private fallosPendientes: number;
  private readonly acuses = new Map<string, AcuseEnvio>();
  private readonly items: ItemBandeja[] = [];
  private readonly consultados = new Set<string>();

  constructor(private readonly o: OpcionesEntregaSimulada = {}) {
    this.canal = o.canal ?? 'whatsapp';
    this.fallosPendientes = o.fallarNVeces ?? 0;
  }

  capacidades() {
    return { plantillasAprobadas: true, audioAdjunto: true, estadoEntrega: true };
  }

  async enviar(msg: MensajeSaliente, destino: Destino): Promise<Result<AcuseEnvio, FalloEntrega>> {
    const previo = this.acuses.get(msg.claveIdempotencia);
    if (previo) return ok(previo);
    if (this.o.sinRed) return err({ tipo: 'sin_red', detalle: 'Simulado: sin red.' });
    if (this.o.rebote) return err({ tipo: 'rebote', detalle: 'Simulado: el destino rebotó el mensaje.' });
    if (this.fallosPendientes > 0) {
      this.fallosPendientes--;
      return err({ tipo: 'proveedor', detalle: 'Simulado: error transitorio del proveedor.' });
    }
    const acuse: AcuseEnvio = { acuseId: `sim-${this.items.length + 1}`, estado: 'enviado_proveedor', ts: new Date(0).toISOString() };
    this.acuses.set(msg.claveIdempotencia, acuse);
    this.items.push({
      acuseId: acuse.acuseId,
      mensajeId: msg.id,
      destino,
      vistaPreviaHtml: `<div style="font-family:system-ui"><p><strong>Datos simulados</strong></p><h2>${escaparHtml(msg.cuerpo.asunto ?? '')}</h2><p>${escaparHtml(msg.cuerpo.texto)}</p></div>`,
    });
    return ok(acuse);
  }

  async estado(acuseId: string): Promise<EstadoAdaptador> {
    if (!this.items.some((i) => i.acuseId === acuseId)) return 'fallido';
    this.consultados.add(acuseId);
    return this.o.leer ? 'leido' : 'entregado';
  }

  bandeja(): readonly ItemBandeja[] {
    return this.items;
  }
}
