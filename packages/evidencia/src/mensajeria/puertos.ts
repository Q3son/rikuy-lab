/**
 * Delivery port (FUNCIONES_EXTRA 1.6). F6 composes and queues the messages; F7 implements the
 * real adapters (WhatsApp Business, e-mail) in apps/cloud; the `wa.me` adapter lives in apps/web.
 * Names follow the spec; the package is proposed as `@rikuy/mensajeria` and lives here until then.
 */
export type Canal = 'whatsapp' | 'correo' | 'enlace_wame' | 'pdf';

export type EstadoEntrega = 'en_cola' | 'enviado_proveedor' | 'entregado' | 'fallido' | 'rebotado' | 'baja';
// 'leido' exists in adapters but is not shown to the teacher by default.

export type Plantilla = 'tutora_semanal' | 'familia_semanal_a' | 'familia_semanal_b' | 'director_mensual' | 'ugel_mensual';

export interface CuerpoRenderizado {
  asunto?: string;
  texto: string;
  html?: string;
}

export interface MensajeSaliente {
  id: string; // ULID
  claveIdempotencia: string; // sha256(periodo | destinatario | plantilla)
  plantilla: Plantilla;
  version: number;
  lengua: 'es' | 'quy';
  cuerpo: CuerpoRenderizado;
  adjuntos: { tipo: 'audio' | 'imagen' | 'pdf'; hash: string }[];
  vigenteHasta: string; // ISO; past that moment it is dropped or merged
  consentimientoRef: string;
}

/** The address (phone or e-mail) travels only in the envelope and never leaves the teacher phone otherwise. */
export interface Destino {
  canal: Canal;
  direccion: string;
}

export interface AcuseEnvio {
  acuseId: string;
  /** True when the teacher still has to tap "send" (wa.me): honest state, not "delivered". */
  manual?: boolean;
}

export type FalloEntrega = {
  tipo: 'sin_red' | 'cuota' | 'plantilla_rechazada' | 'sin_consentimiento' | 'rebote' | 'proveedor';
  detalle: string;
};

export type Resultado<T, E> = { ok: true; valor: T } | { ok: false; error: E };

export interface PuertoEntrega {
  readonly canal: Canal;
  capacidades(): { plantillasAprobadas: boolean; audioAdjunto: boolean; estadoEntrega: boolean };
  enviar(msg: MensajeSaliente, destino: Destino): Promise<Resultado<AcuseEnvio, FalloEntrega>>;
  estado(acuseId: string): Promise<EstadoEntrega>;
}
