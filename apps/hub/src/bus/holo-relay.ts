/**
 * Hologram room relay (3.8): the two-phone demo (projector `display` + `control` with camera
 * gestures) and the teacher `panel`. Wire-compatible with the legacy `apps/server` relay and the
 * legacy/F3 client (`hello` with role, room and clientId; room names lowercased).
 *
 * Pure: the WebSocket glue feeds raw messages and applies the outbound actions. Robustness for
 * the demo: short room codes for QR/manual join, ghost-connection takeover by clientId on
 * reconnect, and the last projector state replayed to whoever (re)joins the room.
 */
import { BusMessage, type Role } from '@rikuy/contracts';

export type RelayOut = { kind: 'send'; to: string; msg: unknown } | { kind: 'close'; to: string };

interface Member {
  conn: string;
  room: string;
  role: Role;
  clientId: string;
}

/** No 0/o, 1/l/i: easy to read aloud and to type on a phone. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function normalizeRoom(room: string): string {
  return String(room ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'aula';
}

export class HoloRelay {
  private readonly members = new Map<string, Member>();
  private readonly lastState = new Map<string, unknown>();
  private readonly created = new Set<string>();
  private invalid = 0;

  constructor(private readonly random: () => number = Math.random) {}

  /** A fresh 5-character room code not in use. */
  createRoom(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < 5; i++) code += ALPHABET[Math.floor(this.random() * ALPHABET.length)];
      if (!this.created.has(code) && this.membersOf(code).length === 0) {
        this.created.add(code);
        return code;
      }
    }
  }

  receive(conn: string, raw: unknown): RelayOut[] {
    const legacyEvent = isLegacyEvent(raw);
    const parsed = legacyEvent ? null : BusMessage.safeParse(raw);
    if (parsed && !parsed.success) {
      this.invalid++;
      return [];
    }
    const msg = parsed ? parsed.data : (raw as { type: 'event' });
    if (msg.type === 'hello') return this.hello(conn, msg);
    const me = this.members.get(conn);
    if (!me) {
      this.invalid++;
      return [];
    }
    if (msg.type === 'peers') return []; // only the hub announces peers
    if (msg.type === 'state') this.lastState.set(me.room, raw);
    return this.membersOf(me.room)
      .filter((m) => m.conn !== conn)
      .map((m) => ({ kind: 'send', to: m.conn, msg: raw }));
  }

  leave(conn: string): RelayOut[] {
    const me = this.members.get(conn);
    if (!me) return [];
    this.members.delete(conn);
    if (this.membersOf(me.room).length === 0) this.lastState.delete(me.room);
    return this.announce(me.room);
  }

  room(code: string): { room: string; roles: Role[] } {
    const room = normalizeRoom(code);
    return { room, roles: this.membersOf(room).map((m) => m.role) };
  }

  rooms(): Array<{ room: string; roles: Role[] }> {
    const names = new Set([...this.members.values()].map((m) => m.room));
    return [...names].sort().map((r) => this.room(r));
  }

  stats(): { invalid: number; connections: number } {
    return { invalid: this.invalid, connections: this.members.size };
  }

  private hello(conn: string, msg: Extract<BusMessage, { type: 'hello' }>): RelayOut[] {
    const out: RelayOut[] = [];
    const room = normalizeRoom(msg.room);
    for (const m of [...this.members.values()]) {
      if (m.clientId === msg.clientId && m.conn !== conn) {
        this.members.delete(m.conn);
        out.push({ kind: 'close', to: m.conn });
      }
    }
    const previous = this.members.get(conn);
    this.members.set(conn, { conn, room, role: msg.role, clientId: msg.clientId });
    if (previous && previous.room !== room) out.push(...this.announce(previous.room));
    out.push(...this.announce(room));
    const state = this.lastState.get(room);
    if (state && msg.role !== 'display') out.push({ kind: 'send', to: conn, msg: state });
    return out;
  }

  private announce(room: string): RelayOut[] {
    const members = this.membersOf(room);
    const roles = members.map((m) => m.role);
    return members.map((m) => ({ kind: 'send', to: m.conn, msg: { type: 'peers', roles } }));
  }

  private membersOf(room: string): Member[] {
    return [...this.members.values()].filter((m) => m.room === room);
  }
}

/** The legacy client still emits `{ type: 'event' }`; relayed for compatibility, never persisted (3.8). */
function isLegacyEvent(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && (raw as { type?: unknown }).type === 'event' && 'event' in raw;
}
