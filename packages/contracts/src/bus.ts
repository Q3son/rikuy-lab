/**
 * Ephemeral bus for remote control of the exhibit viewer (3.8). Not synced.
 * Travels over BroadcastChannel, WebRTC (T1) or WS (T2). Learning events no longer travel here:
 * they go through the event log and sync.
 * Wire format kept identical to the legacy `packages/core/src/protocol.ts` (minus `event`).
 */
import { z } from 'zod';
import { Comando } from './tutor/comandos.ts';

export const Role = z.enum(['display', 'control', 'panel']);
export type Role = z.infer<typeof Role>;

export const DisplayState = z.object({
  scene: z.string(),
  running: z.boolean(),
  variables: z.record(z.string(), z.number()),
  readout: z.object({ label: z.string(), value: z.string() }).optional(), // main metric of the scene
});
export type DisplayState = z.infer<typeof DisplayState>;

export const BusMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), role: Role, room: z.string(), clientId: z.string() }),
  z.object({ type: z.literal('command'), commands: z.array(Comando), from: Role }),
  z.object({ type: z.literal('gesture'), dx: z.number(), dy: z.number(), dz: z.number(), from: Role }),
  z.object({ type: z.literal('say'), text: z.string(), speaker: z.enum(['agente', 'alumno']) }),
  z.object({ type: z.literal('state'), state: DisplayState }),
  z.object({ type: z.literal('peers'), roles: z.array(Role) }),
]);
export type BusMessage = z.infer<typeof BusMessage>;
