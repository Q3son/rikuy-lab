/**
 * Delivery port (FUNCIONES_EXTRA 1.6). The domain is pure: queue rules, honest states and retry policy.
 * Adapters that touch the network live in `apps/cloud`; the manual ones (wa.me, local PDF) are pure and live here.
 */
import type { Result } from './result.ts';

export type Canal = 'whatsapp' | 'correo' | 'enlace_wame' | 'pdf';

/** Honest states: registering is not delivering. */
export type EstadoEntrega = 'en_cola' | 'enviado_proveedor' | 'entregado' | 'fallido' | 'rebotado' | 'baja';
/** What an adapter may report. "leido" exists in the adapter but is NEVER shown to the teacher (1.2, lesson 8). */
export type EstadoAdaptador = EstadoEntrega | 'leido';

export type Plantilla = 'tutora_semanal' | 'familia_semanal_a' | 'familia_semanal_b' | 'director_mensual' | 'ugel_mensual';
export const PLANTILLAS_SEMANALES: readonly Plantilla[] = ['tutora_semanal', 'familia_semanal_a', 'familia_semanal_b'];

export interface CuerpoRenderizado {
  asunto?: string;
  texto: string;
  html?: string;
  /** One line per achievement, used to merge expired weeklies. */
  lineas?: string[];
  periodo?: { desde: string; hasta: string };
}

export interface MensajeSaliente {
  id: string; // ULID
  claveIdempotencia: string; // hash(period, recipient, template)
  plantilla: Plantilla;
  version: number;
  lengua: 'es' | 'quy';
  cuerpo: CuerpoRenderizado; // already composed in the hub
  adjuntos: Array<{ tipo: 'audio' | 'imagen' | 'pdf'; hash: string }>;
  vigenteHasta: string; // ISO; after it the message is dropped or merged
  consentimientoRef: string;
}

export interface Destino {
  canal: Canal;
  /** E-mail address or phone number. Never persisted by the cloud after the acknowledgement. */
  direccion: string;
  /** Opaque guardian reference (used for opt-out and idempotency). Not a name. */
  ref: string;
}

export interface AcuseEnvio {
  acuseId: string;
  estado: EstadoAdaptador;
  ts: string;
  /** Manual channels: the teacher still has to act (tap send, print). */
  manual?: boolean;
  enlace?: string;
  html?: string;
}

export type FalloEntrega = {
  tipo: 'sin_red' | 'cuota' | 'plantilla_rechazada' | 'sin_consentimiento' | 'rebote' | 'proveedor';
  detalle: string;
};

export interface PuertoEntrega {
  readonly canal: Canal;
  capacidades(): { plantillasAprobadas: boolean; audioAdjunto: boolean; estadoEntrega: boolean };
  enviar(msg: MensajeSaliente, destino: Destino): Promise<Result<AcuseEnvio, FalloEntrega>>;
  estado(acuseId: string): Promise<EstadoAdaptador>;
}
