/**
 * Museum real-time presence (3.9). Star topology with the hub as authority.
 * Nothing here is persisted. No free chat or voice between devices: only a closed list of reactions.
 * Every message is strict, so extra fields (e.g. `texto`) are rejected.
 */
import { z } from 'zod';
import { Dispositivo, Ulid } from './comun.ts';

export const RT_MAX_HZ = 8; // client movement rate cap
export const RT_TICK_MS = 125; // hub aggregation tick per room
export const RT_LATIDO_MS = 2000; // heartbeat without movement
export const RT_BAJA_MS = 8000; // peer dropped after this silence
export const RT_MAX_MENSAJES_POR_S = 20; // per connection, excess is discarded
export const RT_MAX_AVATARES = 8;

/** [x, y, dir]: position in tiles x 10, direction 0-7. */
export const Posicion = z.tuple([z.number().int(), z.number().int(), z.number().int().min(0).max(7)]);
export type Posicion = z.infer<typeof Posicion>;

export const Reaccion = z.enum(['saludar', 'senalar', 'aplaudir', 'ayuda']);
export type Reaccion = z.infer<typeof Reaccion>;

const posiciones = z.array(Posicion).min(1).max(RT_MAX_AVATARES);

// client -> hub
export const MensajeRtCliente = z.discriminatedUnion('t', [
  z.strictObject({
    t: z.literal('rt.hola'),
    claseId: Ulid,
    dispositivo: Dispositivo,
    grupoId: Ulid,
    avatares: z.array(Ulid).max(RT_MAX_AVATARES),
    mac: z.string().min(1), // HMAC(class key, hub nonce)
  }),
  z.strictObject({ t: z.literal('rt.mov'), s: z.number().int().min(0), sala: z.string().min(1), p: posiciones }),
  z.strictObject({ t: z.literal('rt.sala'), sala: z.string().min(1) }),
  z.strictObject({ t: z.literal('rt.gesto'), g: Reaccion }),
  z.strictObject({ t: z.literal('rt.latido') }),
]);
export type MensajeRtCliente = z.infer<typeof MensajeRtCliente>;

/** Presence of a peer device in a room: device, group and its avatars' positions. */
export const PresenciaPar = z.strictObject({ d: Dispositivo, g: Ulid, p: posiciones });
export type PresenciaPar = z.infer<typeof PresenciaPar>;

// hub -> client
export const MensajeRtHub = z.discriminatedUnion('t', [
  z.strictObject({
    t: z.literal('rt.bienvenida'),
    yo: Dispositivo,
    salas: z.record(z.string(), z.number().int().min(0)), // occupancy per room
    hora: z.number().int(),
  }),
  z.strictObject({ t: z.literal('rt.instantanea'), sala: z.string(), pares: z.array(PresenciaPar) }),
  z.strictObject({
    t: z.literal('rt.delta'),
    sala: z.string(),
    s: z.number().int().min(0),
    cambios: z.array(z.strictObject({ d: Dispositivo, p: posiciones.optional(), fuera: z.literal(true).optional() })),
  }),
  z.strictObject({
    t: z.literal('rt.orden'),
    o: z.enum(['reunir', 'pausar', 'reanudar']),
    sala: z.string().optional(),
    firma: z.string().min(1), // teacher only (ECDSA)
  }),
  z.strictObject({ t: z.literal('rt.interruptor'), recurso: z.enum(['tutor', 'gestos']), activo: z.boolean(), firma: z.string().min(1) }),
]);
export type MensajeRtHub = z.infer<typeof MensajeRtHub>;
