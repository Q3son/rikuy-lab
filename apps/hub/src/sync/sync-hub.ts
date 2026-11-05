/**
 * Hub side of the sync session (3.5), transport-agnostic (WS and HTTP use it).
 *
 *   peer -> hub : HOLA { claseId, vv }        hub -> peer : DELTA* (last one `ultimo`) + ACK { vv_hub }
 *   peer -> hub : DELTA { eventos }           hub -> peer : ACK { vv_hub }; new events pushed to the
 *                                                           other peers of the class as DELTA
 *
 * Acceptance rules on ingestion: envelope + `datos` per type (`EventoValidado`, which also
 * requires `firma` on teacher-authority events), same class as the session, MAC/signature through
 * the injected verifier (F2 owns the crypto), idempotent by id. Rejections are counted, never echoed.
 */
import { EventoValidado, MAX_EVENTOS_POR_LOTE, MensajeSync, type Evento } from '@rikuy/contracts';
import type { SqliteEventLog } from '../log/sqlite-log.ts';

export interface SyncOut {
  to: string;
  msg: MensajeSync;
}

export interface SyncHubOptions {
  /** MAC (class key) and ECDSA (teacher) verification. Defaults to schema-only acceptance. */
  verify?(e: Evento): boolean;
}

export interface SyncStats {
  invalid: number;
  rejected: number;
  accepted: number;
  duplicates: number;
}

type Listener = (claseId: string, events: Evento[]) => void;

export class SyncHub {
  private readonly sessions = new Map<string, string>(); // conn -> claseId
  private readonly listeners = new Set<Listener>();
  private readonly counters: SyncStats = { invalid: 0, rejected: 0, accepted: 0, duplicates: 0 };

  constructor(
    private readonly log: SqliteEventLog,
    private readonly options: SyncHubOptions = {},
  ) {}

  receive(conn: string, raw: unknown): SyncOut[] {
    const parsed = MensajeSync.safeParse(raw);
    if (!parsed.success) {
      this.counters.invalid++;
      return [];
    }
    const msg = parsed.data;
    if (msg.t === 'hola') {
      this.sessions.set(conn, msg.claseId);
      return [...this.deltas(conn, msg.claseId, this.log.missingFor(msg.claseId, msg.vv)), this.ack(conn, msg.claseId)];
    }
    if (this.sessions.get(conn) !== msg.claseId) {
      this.counters.invalid++;
      return [];
    }
    if (msg.t === 'ack') return []; // the peer's vector is informative only: the hub answers HOLA
    const accepted = this.ingest(msg.claseId, msg.eventos);
    const out: SyncOut[] = [this.ack(conn, msg.claseId)];
    if (accepted.length) {
      for (const [other, claseId] of this.sessions) {
        if (other !== conn && claseId === msg.claseId) out.push(...this.deltas(other, claseId, accepted, false));
      }
      for (const l of this.listeners) l(msg.claseId, accepted);
    }
    return out;
  }

  /** Ingests events from any transport (also used by HTTP `/sync`). Returns the newly stored ones. */
  ingest(claseId: string, events: readonly unknown[]): Evento[] {
    const valid: Evento[] = [];
    for (const raw of events) {
      const r = EventoValidado.safeParse(raw);
      if (!r.success || r.data.claseId !== claseId || (this.options.verify && !this.options.verify(raw as Evento))) {
        this.counters.rejected++;
        continue;
      }
      valid.push(raw as Evento); // store the original JSON, not the parsed (possibly transformed) copy
    }
    const result = this.log.append(valid);
    this.counters.accepted += result.accepted.length;
    this.counters.duplicates += result.duplicates;
    this.counters.rejected += result.conflicts;
    return result.accepted;
  }

  leave(conn: string): void {
    this.sessions.delete(conn);
  }

  onAccepted(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  stats(): SyncStats {
    return { ...this.counters };
  }

  private ack(to: string, claseId: string): SyncOut {
    return { to, msg: { t: 'ack', claseId, vv: this.log.versionVector(claseId) } };
  }

  private deltas(to: string, claseId: string, events: Evento[], closing = true): SyncOut[] {
    const out: SyncOut[] = [];
    for (let i = 0; i < events.length; i += MAX_EVENTOS_POR_LOTE) {
      const eventos = events.slice(i, i + MAX_EVENTOS_POR_LOTE);
      const last = i + MAX_EVENTOS_POR_LOTE >= events.length;
      out.push({ to, msg: closing ? { t: 'delta', claseId, eventos, ultimo: last } : { t: 'delta', claseId, eventos } });
    }
    if (closing && out.length === 0) out.push({ to, msg: { t: 'delta', claseId, eventos: [], ultimo: true } });
    return out;
  }
}
