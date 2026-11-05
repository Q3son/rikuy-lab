/**
 * Museum presence server (3.9), pure and transport-agnostic.
 *
 * The hub feeds it raw client messages and clock ticks; it answers with a list of outbound
 * actions (send a message to a connection, or close it). No sockets, timers or I/O here, so the
 * same state machine runs on the Node hub and can be ported to the Android hub with the same tests.
 *
 * Rules implemented: room interest, aggregation per room per tick, heartbeat and drop after
 * RT_BAJA_MS of silence, per-connection rate limit, closed-list reactions, teacher orders.
 * Nothing here is persisted and nothing reaches the event log.
 */
import {
  MensajeRtCliente,
  RT_BAJA_MS,
  RT_MAX_MENSAJES_POR_S,
  type MensajeRtHub,
  type Posicion,
  type PresenciaPar,
} from '@rikuy/contracts';
import type { MensajeRtSalida } from './propuestas.ts';

export type RtHello = Extract<MensajeRtCliente, { t: 'rt.hola' }>;
export type RtOrder = Extract<MensajeRtHub, { t: 'rt.orden' }>;
export type RtSwitch = Extract<MensajeRtHub, { t: 'rt.interruptor' }>;

export type Outbound =
  | { kind: 'send'; to: string; msg: MensajeRtSalida }
  | { kind: 'close'; to: string; reason: 'mac' | 'replaced' | 'silence' };

export interface PresenceServerOptions {
  /** Verifies the class MAC of `rt.hola` (HMAC of the class key over the hub nonce). */
  authorize(hello: RtHello): boolean;
}

export interface RosterEntry {
  dispositivo: string;
  grupoId: string;
  sala: string | null;
}

export interface PresenceStats {
  invalid: number;
  throttled: number;
  connections: number;
}

interface Peer {
  conn: string;
  claseId: string;
  dispositivo: string;
  grupoId: string;
  sala: string | null;
  positions: Posicion[] | null;
  lastSeq: number;
}

interface Connection {
  id: string;
  lastSeen: number;
  windowStart: number;
  windowCount: number;
  peer: Peer | null;
}

interface RoomChanges {
  seq: number;
  moved: Set<string>; // dispositivo
  left: Set<string>;
}

const roomKey = (claseId: string, sala: string) => `${claseId}\u0000${sala}`;

export class PresenceServer {
  private readonly connections = new Map<string, Connection>();
  private readonly byDevice = new Map<string, Peer>(); // key: claseId + dispositivo
  private readonly rooms = new Map<string, RoomChanges>();
  private invalid = 0;
  private throttled = 0;

  constructor(private readonly options: PresenceServerOptions) {}

  connect(conn: string, now: number): void {
    this.connections.set(conn, { id: conn, lastSeen: now, windowStart: now, windowCount: 0, peer: null });
  }

  /** Handles one raw client message. Invalid, unauthenticated or throttled input yields nothing. */
  receive(conn: string, raw: unknown, now: number): Outbound[] {
    const c = this.connections.get(conn);
    if (!c) return [];
    if (!this.admit(c, now)) return [];
    const parsed = MensajeRtCliente.safeParse(raw);
    if (!parsed.success) {
      this.invalid++;
      return [];
    }
    c.lastSeen = now;
    const msg = parsed.data;
    if (msg.t === 'rt.hola') return this.hello(c, msg, now);
    const peer = c.peer;
    if (!peer) return [];
    switch (msg.t) {
      case 'rt.sala':
        return this.enterRoom(peer, msg.sala);
      case 'rt.mov': {
        const out = peer.sala === msg.sala ? [] : this.enterRoom(peer, msg.sala);
        if (msg.s < peer.lastSeq) return out;
        peer.lastSeq = msg.s;
        peer.positions = msg.p;
        this.changes(peer.claseId, msg.sala).moved.add(peer.dispositivo);
        return out;
      }
      case 'rt.gesto':
        if (!peer.sala) return [];
        return this.membersOf(peer.claseId, peer.sala)
          .filter((p) => p !== peer)
          .map((p) => send(p.conn, { t: 'rt.reaccion', sala: peer.sala!, d: peer.dispositivo, g: msg.g }));
      case 'rt.latido':
        return [];
    }
  }

  disconnect(conn: string): void {
    const c = this.connections.get(conn);
    if (!c) return;
    this.connections.delete(conn);
    if (c.peer) this.removePeer(c.peer);
  }

  /** One aggregation tick: emits one `rt.delta` per changed room and drops silent peers. */
  tick(now: number): Outbound[] {
    const out: Outbound[] = [];
    for (const c of [...this.connections.values()]) {
      if (now - c.lastSeen > RT_BAJA_MS) {
        out.push({ kind: 'close', to: c.id, reason: 'silence' });
        this.disconnect(c.id);
      }
    }
    for (const [key, room] of this.rooms) {
      if (room.moved.size === 0 && room.left.size === 0) continue;
      const [claseId, sala] = key.split('\u0000') as [string, string];
      const members = this.membersOf(claseId, sala);
      const cambios: Extract<MensajeRtHub, { t: 'rt.delta' }>['cambios'] = [];
      for (const d of room.left) cambios.push({ d, fuera: true });
      for (const d of room.moved) {
        const p = this.byDevice.get(claseId + d);
        if (p && p.sala === sala && p.positions) cambios.push({ d, p: p.positions });
      }
      room.moved.clear();
      room.left.clear();
      if (cambios.length === 0) continue;
      room.seq++;
      for (const m of members) {
        const mine = cambios.filter((ch) => ch.d !== m.dispositivo);
        if (mine.length) out.push(send(m.conn, { t: 'rt.delta', sala, s: room.seq, cambios: mine }));
      }
    }
    return out;
  }

  /** Teacher order (already signed by the teacher device), to the whole class or one room. */
  order(claseId: string, msg: RtOrder | RtSwitch): Outbound[] {
    const sala = msg.t === 'rt.orden' ? msg.sala : undefined;
    return this.peersOf(claseId)
      .filter((p) => sala === undefined || p.sala === sala)
      .map((p) => send(p.conn, msg));
  }

  occupancy(claseId: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const p of this.peersOf(claseId)) if (p.sala) counts[p.sala] = (counts[p.sala] ?? 0) + 1;
    return counts;
  }

  roster(claseId: string): RosterEntry[] {
    return this.peersOf(claseId).map((p) => ({ dispositivo: p.dispositivo, grupoId: p.grupoId, sala: p.sala }));
  }

  stats(): PresenceStats {
    return { invalid: this.invalid, throttled: this.throttled, connections: this.connections.size };
  }

  // ---- internals ----------------------------------------------------------

  private admit(c: Connection, now: number): boolean {
    if (now - c.windowStart >= 1000) {
      c.windowStart = now;
      c.windowCount = 0;
    }
    c.windowCount++;
    if (c.windowCount > RT_MAX_MENSAJES_POR_S) {
      this.throttled++;
      return false;
    }
    return true;
  }

  private hello(c: Connection, msg: RtHello, now: number): Outbound[] {
    if (!this.options.authorize(msg)) {
      this.connections.delete(c.id);
      return [{ kind: 'close', to: c.id, reason: 'mac' }];
    }
    const out: Outbound[] = [];
    const previous = this.byDevice.get(msg.claseId + msg.dispositivo);
    if (previous && previous.conn !== c.id) {
      out.push({ kind: 'close', to: previous.conn, reason: 'replaced' });
      this.disconnect(previous.conn);
    }
    if (c.peer) this.removePeer(c.peer);
    const peer: Peer = {
      conn: c.id,
      claseId: msg.claseId,
      dispositivo: msg.dispositivo,
      grupoId: msg.grupoId,
      sala: null,
      positions: null,
      lastSeq: -1,
    };
    c.peer = peer;
    this.byDevice.set(msg.claseId + msg.dispositivo, peer);
    out.push(send(c.id, { t: 'rt.bienvenida', yo: msg.dispositivo, salas: this.occupancy(msg.claseId), hora: now }));
    return out;
  }

  private enterRoom(peer: Peer, sala: string): Outbound[] {
    if (peer.sala === sala) return [];
    this.leaveRoom(peer);
    peer.sala = sala;
    peer.positions = null;
    const pares: PresenciaPar[] = this.membersOf(peer.claseId, sala)
      .filter((p) => p !== peer && p.positions)
      .map((p) => ({ d: p.dispositivo, g: p.grupoId, p: p.positions! }));
    return [send(peer.conn, { t: 'rt.instantanea', sala, pares })];
  }

  private leaveRoom(peer: Peer): void {
    if (!peer.sala) return;
    const room = this.changes(peer.claseId, peer.sala);
    room.moved.delete(peer.dispositivo);
    if (peer.positions) room.left.add(peer.dispositivo);
    peer.sala = null;
  }

  private removePeer(peer: Peer): void {
    this.leaveRoom(peer);
    if (this.byDevice.get(peer.claseId + peer.dispositivo) === peer) this.byDevice.delete(peer.claseId + peer.dispositivo);
  }

  private changes(claseId: string, sala: string): RoomChanges {
    const key = roomKey(claseId, sala);
    let room = this.rooms.get(key);
    if (!room) {
      room = { seq: 0, moved: new Set(), left: new Set() };
      this.rooms.set(key, room);
    }
    return room;
  }

  private peersOf(claseId: string): Peer[] {
    return [...this.byDevice.values()].filter((p) => p.claseId === claseId);
  }

  private membersOf(claseId: string, sala: string): Peer[] {
    return this.peersOf(claseId).filter((p) => p.sala === sala);
  }
}

function send(to: string, msg: MensajeRtSalida): Outbound {
  return { kind: 'send', to, msg };
}
