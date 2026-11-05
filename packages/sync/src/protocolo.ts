/**
 * Sync session (3.5), identical over every transport:
 *   A -> B : HOLA { claseId, vv_A, capacidades }
 *   B -> A : DELTA { events A lacks per vv_A }   (batches of at most N, the last one flagged)
 *   A -> B : DELTA { events B lacks per vv_B }
 *   A <-> B: ACK { updated vv }
 * Each side answers a HOLA with its DELTA (and its own HOLA if it has not sent one yet), and
 * answers the last DELTA batch with an ACK. Incoming events go through `accept` (ingestion rules).
 */
import { MAX_EVENTOS_POR_LOTE, MensajeSync, type Capacidad, type Sesion, type VectorVersion } from '@rikuy/contracts';
import type { IngestReport } from './ingesta.ts';
import type { RepositorioEventos } from './puertos.ts';
import { lacking } from './vector.ts';

export interface SyncPeerOptions {
  claseId: string;
  repo: RepositorioEventos;
  /** Applies the acceptance rules and stores the valid events (see `ingest`). */
  accept(events: unknown[]): Promise<IngestReport>;
  capacidades?: Capacidad[];
  batchSize?: number;
  onPeerVector?(vv: VectorVersion): void;
  onReport?(r: IngestReport): void;
}

export interface SyncPeer {
  /** Sends HOLA. Either side may start; both may. */
  start(): Promise<void>;
  /** Resolves once the peer's last DELTA was ingested and the peer acknowledged ours. */
  finished: Promise<void>;
  stop(): void;
}

export function attachSyncPeer(sesion: Sesion, o: SyncPeerOptions): SyncPeer {
  const batchSize = Math.min(o.batchSize ?? MAX_EVENTOS_POR_LOTE, MAX_EVENTOS_POR_LOTE);
  let saidHello = false;
  let gotLastDelta = false;
  let gotAck = false;
  let resolveFinished!: () => void;
  const finished = new Promise<void>((r) => (resolveFinished = r));
  const check = () => gotLastDelta && gotAck && resolveFinished();

  const hello = async () => {
    saidHello = true;
    await sesion.enviar({ t: 'hola', claseId: o.claseId, vv: await o.repo.vector(o.claseId), capacidades: o.capacidades ?? [] });
  };

  const sendDelta = async (peer: VectorVersion) => {
    const missing = lacking(await o.repo.all(o.claseId), peer);
    const batches = Math.max(1, Math.ceil(missing.length / batchSize));
    for (let i = 0; i < batches; i++) {
      const eventos = missing.slice(i * batchSize, (i + 1) * batchSize);
      await sesion.enviar({ t: 'delta', claseId: o.claseId, eventos, ultimo: i === batches - 1 });
    }
  };

  const handle = async (m: MensajeSync) => {
    if (m.claseId !== o.claseId) return;
    switch (m.t) {
      case 'hola':
        o.onPeerVector?.(m.vv);
        await sendDelta(m.vv);
        if (!saidHello) await hello();
        break;
      case 'delta': {
        const report = await o.accept(m.eventos);
        o.onReport?.(report);
        if (m.ultimo) {
          await sesion.enviar({ t: 'ack', claseId: o.claseId, vv: await o.repo.vector(o.claseId) });
          gotLastDelta = true;
          check();
        }
        break;
      }
      case 'ack':
        o.onPeerVector?.(m.vv);
        gotAck = true;
        check();
        break;
    }
  };

  // Handlers run one at a time, in arrival order.
  let queue: Promise<void> = Promise.resolve();
  const unsubscribe = sesion.recibir((raw) => {
    const parsed = MensajeSync.safeParse(raw);
    if (!parsed.success) return;
    queue = queue.then(() => handle(parsed.data)).catch(() => undefined);
  });

  return {
    start: hello,
    finished,
    stop: unsubscribe,
  };
}
