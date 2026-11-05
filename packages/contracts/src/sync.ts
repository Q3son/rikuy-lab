/**
 * Sync protocol (3.5): HOLA -> DELTA (both ways) -> ACK, identical over every transport
 * (QR, WebRTC, WebSocket, HTTP).
 */
import { z } from 'zod';
import { Ulid } from './comun.ts';
import { Evento } from './evento.ts';
import { VectorVersion } from './vector.ts';

export { VectorVersion } from './vector.ts';

export const Capacidad = z.enum(['qr', 'webrtc', 'ws', 'http']);
export type Capacidad = z.infer<typeof Capacidad>;

/** Max events per DELTA batch. */
export const MAX_EVENTOS_POR_LOTE = 200;

export const MensajeSync = z.discriminatedUnion('t', [
  z.object({ t: z.literal('hola'), claseId: Ulid, vv: VectorVersion, capacidades: z.array(Capacidad) }),
  z.object({
    t: z.literal('delta'),
    claseId: Ulid,
    eventos: z.array(Evento).max(MAX_EVENTOS_POR_LOTE), // envelope only; each event is re-validated with EventoValidado on ingestion
    ultimo: z.boolean().optional(),
  }),
  z.object({ t: z.literal('ack'), claseId: Ulid, vv: VectorVersion }),
]);
export type MensajeSync = z.infer<typeof MensajeSync>;

/** A transport is just an implementation of this port (3.7). */
export interface Transporte {
  readonly id: Capacidad;
  abrir(claseId: string): Promise<Sesion>;
}

export interface Sesion {
  enviar(m: MensajeSync): Promise<void>;
  recibir(h: (m: MensajeSync) => void): () => void;
  cerrar(): void;
}
