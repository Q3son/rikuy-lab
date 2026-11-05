/**
 * `broadcast` transport: tabs of the same browser (e.g. the teacher's panel and the projector
 * tab) talk through a BroadcastChannel named `<prefix>:<claseId>`. Incoming messages are
 * validated with `MensajeSync`; anything else is dropped.
 */
import { MensajeSync, type Sesion } from '@rikuy/contracts';
import type { TransporteSync } from '../puertos.ts';

interface ChannelLike {
  postMessage(m: unknown): void;
  close(): void;
  onmessage: ((e: MessageEvent) => void) | null;
}

export interface BroadcastOptions {
  prefix?: string;
  create?: (name: string) => ChannelLike;
}

export function createBroadcastTransport(o: BroadcastOptions = {}): TransporteSync {
  const prefix = o.prefix ?? 'rikuy-sync';
  const create = o.create ?? ((name: string) => new BroadcastChannel(name) as unknown as ChannelLike);
  return {
    id: 'broadcast',
    async abrir(claseId): Promise<Sesion> {
      const channel = create(`${prefix}:${claseId}`);
      const handlers = new Set<(m: MensajeSync) => void>();
      channel.onmessage = (e) => {
        const parsed = MensajeSync.safeParse(e.data);
        if (parsed.success && parsed.data.claseId === claseId) for (const h of handlers) h(parsed.data);
      };
      return {
        async enviar(m) {
          channel.postMessage(m);
        },
        recibir(h) {
          handlers.add(h);
          return () => handlers.delete(h);
        },
        cerrar() {
          handlers.clear();
          channel.close();
        },
      };
    },
  };
}
