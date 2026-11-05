/**
 * Ephemeral room bus of the two-phone hologram (3.8), ported from the classic `net/bus.ts`:
 *  - BroadcastChannel: tabs of the same device, no server needed;
 *  - WebSocket to the F8 hub relay (`/ws`, HoloRelay) through @rikuy/presencia's ReconnectingSocket,
 *    when the page is served by the hub; otherwise (or while the hub is down) it keeps working locally.
 * Nothing here is persisted: BusMessage is not part of the event log.
 */
import type { BusMessage, Role } from '@rikuy/contracts';
import { ReconnectingSocket, type SocketLike as SocketPresencia } from '@rikuy/presencia';
import { hubDeEstaPagina } from '../../../platform/hub.ts';

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
  /**
   * Socket factory; `null` disables the relay (single device). Omitted: the hub relay, only when this
   * page is served by the hub.
   */
  socket?: (() => SocketLike) | null;
}

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
  private relay: ReconnectingSocket | null = null;
  private closed = false;

  constructor(
    readonly room: string,
    readonly role: Role,
    options: RoomChannelOptions = {},
  ) {
    this.bc = typeof BroadcastChannel === 'function' ? new BroadcastChannel(`rikuy-${room}`) : null;
    if (this.bc) this.bc.onmessage = (e) => this.dispatch(e.data as BusMessage);
    if (options.socket) this.connect(options.socket);
    else if (options.socket === undefined && typeof WebSocket === 'function')
      void hubDeEstaPagina().then((hub) => {
        if (hub) this.connect(() => new WebSocket(relayUrl()) as unknown as SocketLike);
      });
  }

  on(handler: (m: BusMessage) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  send(msg: BusMessage): void {
    this.bc?.postMessage(msg);
    this.relay?.send(msg);
  }

  /** Announces this phone on the local channel too (the relay does it on its own). */
  hello(): void {
    this.send({ type: 'hello', role: this.role, room: this.room, clientId: this.clientId });
  }

  close(): void {
    this.closed = true;
    this.bc?.close();
    this.relay?.close();
    this.relay = null;
  }

  private connect(abrir: () => SocketLike) {
    if (this.closed) return;
    this.relay = new ReconnectingSocket({
      open: () => abrir() as unknown as SocketPresencia,
      // The hub keeps no client state across connections: hello again on every (re)connection.
      onOpen: (send) => void send({ type: 'hello', role: this.role, room: this.room, clientId: this.clientId } satisfies BusMessage),
      onMessage: (m) => this.dispatch(m as BusMessage),
      onStatus: (conectado) => this.setStatus(conectado ? 'online' : 'local'),
      minDelayMs: 1000,
      maxDelayMs: 15_000,
    });
  }

  private setStatus(s: ChannelStatus) {
    if (s === this.status) return;
    this.status = s;
    this.onStatus(s);
  }

  private dispatch(msg: BusMessage) {
    if (!msg || typeof msg !== 'object') return;
    for (const h of this.handlers) h(msg);
  }
}
