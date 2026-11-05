/**
 * Hub -> client messages that `@rikuy/contracts/tiempo-real` does not define yet.
 * They are proposed in docs/ecosistema/PROPUESTAS_CONTRATOS.md (F8) and live here until the
 * sprint 0 owner moves them into contracts. Same rules: strict objects, closed lists, no text.
 */
import { z } from 'zod';
import { Dispositivo, MensajeRtHub, Reaccion } from '@rikuy/contracts';

/** A closed-list reaction of a peer, relayed to the others in the same room. */
export const MensajeRtReaccion = z.strictObject({
  t: z.literal('rt.reaccion'),
  sala: z.string(),
  d: Dispositivo,
  g: Reaccion,
});
export type MensajeRtReaccion = z.infer<typeof MensajeRtReaccion>;

/** Every message the hub may send on the `rt` channel, contract plus proposals. */
export const MensajeRtSalida = z.union([MensajeRtHub, MensajeRtReaccion]);
export type MensajeRtSalida = z.infer<typeof MensajeRtSalida>;
