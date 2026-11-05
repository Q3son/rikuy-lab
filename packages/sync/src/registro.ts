/**
 * Local event writer (`appendLocal` of 3.4/6.3): assigns `seq` (contiguous per class and device),
 * HLC, ULID and schema version, validates the event against the strict contract, seals it (MAC,
 * plus ECDSA for teacher-authority types) and appends it to the repository.
 */
import { EventoValidado, SCHEMA_VERSION, type Evento, type TipoEvento } from '@rikuy/contracts';
import { createHlcClock, createUlidFactory, type Aleatorio, type Reloj } from '@rikuy/core';
import { hlcNode } from './codec/hash.ts';
import { sealEvent } from './firmas.ts';
import type { ClavePrivada, Cripto, RepositorioEventos } from './puertos.ts';

export interface EventWriterOptions {
  claseId: string;
  dispositivo: string;
  repo: RepositorioEventos;
  cripto: Cripto;
  claveMac: string;
  /** Only on the teacher device. */
  clavePrivada?: ClavePrivada;
  clock: Reloj;
  random: Aleatorio;
}

export interface EventWriter {
  append(tipo: TipoEvento, datos: unknown, autor?: Evento['autor']): Promise<Evento>;
  /** Merges a remote HLC so later local events sort after what this device has seen. */
  observe(hlc: string): void;
}

export function createEventWriter(o: EventWriterOptions): EventWriter {
  const hlc = createHlcClock(hlcNode(o.dispositivo), o.clock);
  const ulid = createUlidFactory(o.clock, o.random);
  let queue: Promise<unknown> = Promise.resolve();

  const write = async (tipo: TipoEvento, datos: unknown, autor: Evento['autor']): Promise<Evento> => {
    const seq = (await o.repo.lastSeq(o.claseId, o.dispositivo)) + 1;
    const draft: Evento = { id: ulid(), dispositivo: o.dispositivo, seq, hlc: hlc.now(), claseId: o.claseId, sv: SCHEMA_VERSION, tipo, autor, datos };
    const sealed = await sealEvent(draft, { cripto: o.cripto, claveMac: o.claveMac, clavePrivada: o.clavePrivada });
    const check = EventoValidado.safeParse(sealed);
    if (!check.success) throw new Error(`invalid "${tipo}" event: ${check.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    await o.repo.add([sealed]);
    return sealed;
  };

  return {
    append(tipo, datos, autor = {}) {
      const next = queue.then(() => write(tipo, datos, autor));
      queue = next.catch(() => undefined);
      return next;
    },
    observe: (remote) => hlc.receive(remote),
  };
}
