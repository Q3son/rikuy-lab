/**
 * Ephemeral room bus of the two-phone hologram (3.8), ported from the classic `net/bus.ts`:
 *  - BroadcastChannel: tabs of the same device, no server needed;
 *  - WebSocket to the existing relay (`/ws`, apps/server today, apps/hub later) for two phones on
 *    the classroom network. If the relay is missing it keeps working locally and retries.
 * Nothing here is persisted: BusMessage is not part of the event log.
 */
import type { BusMessage, Role } from '@rikuy/contracts';

export interface SocketLike {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export type ChannelStatus = 'local' | 'online';

export interface RoomChannelOptions {
  /** Socket factory; `null` disables the relay (single device). */
  socket?: (() => SocketLike) | null;
}

const OPEN = 1;

export function relayUrl(href = location.href): string {
  const url = new URL('ws', href.split('#')[0]);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}

export class RoomChannel {
  readonly clientId = Math.random().toString(36).slice(2, 10);
  status: ChannelStatus = 'local';
  onStatus: (s: ChannelStatus) => void = () => {};

  private readonly bc: BroadcastChannel | null;
  private readonly handlers = new Set<(m: BusMessage) => void>();
  private socket: SocketLike | null = null;
  private retry = 1000;
  private closed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly makeSocket: (() => SocketLike) | null;

  constructor(
    readonly room: string,
    readonly role: Role,
    options: RoomChannelOptions = {},
  ) {
    this.bc = typeof BroadcastChannel === 'function' ? new BroadcastChannel(`rikuy-${room}`) : null;
    if (this.bc) this.bc.onmessage = (e) => this.dispatch(e.data as BusMessage);
    this.makeSocket = options.socket === undefined ? () => new WebSocket(relayUrl()) as unknown as SocketLike : options.socket;
    this.connect();
  }

  on(handler: (m: BusMessage) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  send(msg: BusMessage): void {
    this.bc?.postMessage(msg);
    if (this.socket?.readyState === OPEN) this.socket.send(JSON.stringify(msg));
  }

  /** Announces this phone on the local channel too (the relay does it on its own). */
  hello(): void {
    this.send({ type: 'hello', role: this.role, room: this.room, clientId: this.clientId });
  }

  close(): void {
    this.closed = true;
    clearTimeout(this.timer);
    this.bc?.close();
    const s = this.socket;
    this.socket = null;
    if (s) {
      s.onclose = null;
      s.close();
    }
  }

  private connect() {
    if (!this.makeSocket || this.closed) return;
    let s: SocketLike;
    try {
      s = this.makeSocket();
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = s;
    s.onopen = () => {
      this.retry = 1000;
      s.send(JSON.stringify({ type: 'hello', role: this.role, room: this.room, clientId: this.clientId } satisfies BusMessage));
      this.setStatus('online');
    };
    s.onmessage = (e) => {
      try {
        this.dispatch(JSON.parse(e.data) as BusMessage);
      } catch {
        /* invalid message from the network: ignored */
      }
    };
    s.onclose = () => {
      this.socket = null;
      this.setStatus('local');
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.closed) return;
    this.timer = setTimeout(() => this.connect(), this.retry);
    this.retry = Math.min(this.retry * 2, 15_000);
  }

  private setStatus(s: ChannelStatus) {
    if (s === this.status) return;
    this.status = s;
    this.onStatus(s);
  }

  private dispatch(msg: BusMessage) {
    for (const h of this.handlers) h(msg);
  }
}
