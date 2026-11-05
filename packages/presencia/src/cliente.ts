/**
 * Reconnecting client socket for the hub channels (`rt`, `bus`, `sync`).
 *
 * Transport-agnostic: the caller injects how to open a socket (browser `WebSocket`, Node,
 * Capacitor). It reconnects with exponential backoff plus jitter, re-sends its hello on every
 * open (the hub keeps no client state across connections), and treats a silent link as dead
 * (wifi hotspots often drop without a close frame).
 */

/** Minimal surface shared by the browser WebSocket, Node's global WebSocket and test fakes. */
export interface SocketLike {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
}

/** Timer port (the domain lib has no DOM or Node typings). Defaults to the global timers. */
export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const globalTimers = globalThis as unknown as Timers;

export interface ReconnectingSocketOptions {
  open(): SocketLike;
  /** Called on every successful (re)connection; send the hello here. */
  onOpen(send: (msg: unknown) => boolean): void;
  onMessage?(msg: unknown): void;
  onStatus?(connected: boolean): void;
  minDelayMs?: number;
  maxDelayMs?: number;
  /** Close and reconnect when nothing arrives for this long. Disabled when omitted. */
  staleMs?: number;
  /** 0..1, used for jitter (delay x [0.5, 1]). */
  random?(): number;
  timers?: Timers;
}

export class ReconnectingSocket {
  private socket: SocketLike | null = null;
  private attempt = 0;
  private stopped = false;
  private retryTimer: unknown = null;
  private staleTimer: unknown = null;
  private readonly timers: Timers;
  connected = false;

  constructor(private readonly options: ReconnectingSocketOptions) {
    const t = options.timers ?? globalTimers;
    // Bound calls: browsers throw "Illegal invocation" on unbound global timers.
    this.timers = { setTimeout: (fn, ms) => t.setTimeout(fn, ms), clearTimeout: (h) => t.clearTimeout(h) };
    this.connect();
  }

  send(msg: unknown): boolean {
    if (!this.connected || !this.socket) return false;
    this.socket.send(JSON.stringify(msg));
    return true;
  }

  close(): void {
    this.stopped = true;
    if (this.retryTimer) this.timers.clearTimeout(this.retryTimer);
    this.clearStale();
    const s = this.socket;
    this.socket = null;
    if (s) {
      s.onclose = null;
      s.close();
    }
    this.setConnected(false);
  }

  private connect(): void {
    if (this.stopped) return;
    let s: SocketLike;
    try {
      s = this.options.open();
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = s;
    s.onopen = () => {
      this.attempt = 0;
      this.setConnected(true);
      this.touch();
      this.options.onOpen((m) => this.send(m));
    };
    s.onmessage = (ev) => {
      this.touch();
      let msg: unknown;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      this.options.onMessage?.(msg);
    };
    s.onclose = () => {
      if (this.socket !== s) return;
      this.socket = null;
      this.clearStale();
      this.setConnected(false);
      this.scheduleRetry();
    };
  }

  private scheduleRetry(): void {
    if (this.stopped) return;
    const min = this.options.minDelayMs ?? 500;
    const max = this.options.maxDelayMs ?? 8000;
    const base = Math.min(max, min * 2 ** this.attempt);
    const jitter = 0.5 + 0.5 * (this.options.random ?? Math.random)();
    this.attempt++;
    this.retryTimer = this.timers.setTimeout(() => this.connect(), Math.round(base * jitter));
  }

  private touch(): void {
    const staleMs = this.options.staleMs;
    if (!staleMs) return;
    this.clearStale();
    this.staleTimer = this.timers.setTimeout(() => this.socket?.close(), staleMs);
  }

  private clearStale(): void {
    if (this.staleTimer) this.timers.clearTimeout(this.staleTimer);
    this.staleTimer = null;
  }

  private setConnected(v: boolean): void {
    if (this.connected === v) return;
    this.connected = v;
    this.options.onStatus?.(v);
  }
}
