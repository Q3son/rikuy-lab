/**
 * In-memory pair of connected sessions (tests and same-process hubs). Messages are deep-copied
 * through JSON, as a real wire would, and delivered asynchronously in order.
 */
import type { MensajeSync, Sesion } from '@rikuy/contracts';

export function createMemoryPair(): [Sesion, Sesion] {
  const handlers: [Set<(m: MensajeSync) => void>, Set<(m: MensajeSync) => void>] = [new Set(), new Set()];
  let closed = false;
  const side = (me: 0 | 1): Sesion => ({
    async enviar(m) {
      if (closed) throw new Error('session closed');
      const wire = JSON.stringify(m);
      setTimeout(() => {
        for (const h of handlers[me === 0 ? 1 : 0]) h(JSON.parse(wire) as MensajeSync);
      }, 0);
    },
    recibir(h) {
      handlers[me].add(h);
      return () => handlers[me].delete(h);
    },
    cerrar() {
      closed = true;
      handlers[0].clear();
      handlers[1].clear();
    },
  });
  return [side(0), side(1)];
}
