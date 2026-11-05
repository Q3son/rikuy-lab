import type { AcuseEnvio, Destino, EstadoAdaptador, FalloEntrega, MensajeSaliente, PuertoEntrega } from '../puertos.ts';
import { err, ok, type Result } from '../result.ts';

/** `https://wa.me/<digits>?text=...`. Peruvian mobile numbers (9 digits starting with 9) get the 51 prefix. */
export function enlaceWame(telefono: string, texto: string): string | undefined {
  let digitos = telefono.replace(/\D/g, '');
  if (/^9\d{8}$/.test(digitos)) digitos = `51${digitos}`;
  if (digitos.length < 10 || digitos.length > 15) return undefined;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto.slice(0, 1500))}`;
}

/**
 * No gateway: opens WhatsApp with the text prefilled and the teacher taps send. It never claims delivery:
 * the state stays "en_cola" (manual) until the teacher marks it done.
 */
export class AdaptadorEnlaceWame implements PuertoEntrega {
  readonly canal = 'enlace_wame' as const;
  capacidades() {
    return { plantillasAprobadas: false, audioAdjunto: false, estadoEntrega: false };
  }
  async enviar(msg: MensajeSaliente, destino: Destino): Promise<Result<AcuseEnvio, FalloEntrega>> {
    const enlace = enlaceWame(destino.direccion, msg.cuerpo.texto);
    if (!enlace) return err({ tipo: 'proveedor', detalle: 'El número de teléfono no es válido para WhatsApp.' });
    return ok({ acuseId: `wame-${msg.id}`, estado: 'en_cola', ts: new Date().toISOString(), manual: true, enlace });
  }
  async estado(): Promise<EstadoAdaptador> {
    return 'en_cola'; // unknowable
  }
}
