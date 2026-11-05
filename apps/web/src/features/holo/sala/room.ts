/**
 * Pure helpers of the two-phone hologram room: short codes, the control link, coalescing of
 * continuous gestures, and the confirmation of each command on the control phone.
 */
import { actionLabel, type ViewerAction } from '@rikuy/holo';

/** Lowercase so the existing relay (which lowercases and strips room names) keeps them intact. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function newRoomCode(random: () => number = Math.random): string {
  return Array.from({ length: 4 }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join('');
}

export function normalizeRoomCode(input: string): string | null {
  const code = input.toLowerCase().replace(/[^a-z0-9]/g, '');
  return code.length === 4 && [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

/** Link of the control page for `code`, on the same origin and path as `here`. */
export function controlUrl(code: string, here: string): string {
  const u = new URL(here);
  u.hash = `#/holo/control/${code}`;
  return u.href;
}

/**
 * Continuous gestures (rotate, zoom) arrive at camera rate; they are merged and flushed once per
 * animation frame. Discrete actions (pause, release, center) go out immediately.
 */
export class ActionCoalescer {
  private dx = 0;
  private dy = 0;
  private zoom = 1;

  constructor(private readonly send: (a: ViewerAction) => void) {}

  push(a: ViewerAction): void {
    if (a.type === 'rotate') {
      this.dx += a.dx;
      this.dy += a.dy;
    } else if (a.type === 'zoom') {
      this.zoom *= a.factor;
    } else {
      this.send(a);
    }
  }

  flush(): void {
    if (this.dx !== 0 || this.dy !== 0) this.send({ type: 'rotate', dx: this.dx, dy: this.dy });
    if (this.zoom !== 1) this.send({ type: 'zoom', factor: this.zoom });
    this.dx = 0;
    this.dy = 0;
    this.zoom = 1;
  }
}

/** The projector acknowledges every remote action with this prefix in a `say` message. */
export const ACK_PREFIX = '✓ ';

export interface Confirmation {
  label: string;
  latencyMs: number;
}

/** Pairs the projector's acknowledgements with the actions this phone sent. */
export class ConfirmationTracker {
  private pending: Array<{ label: string; t: number }> = [];

  constructor(private readonly ttlMs = 3000) {}

  sent(action: ViewerAction, t: number): void {
    this.pending.push({ label: actionLabel(action), t });
    if (this.pending.length > 20) this.pending.shift();
  }

  confirm(label: string, t: number): Confirmation | null {
    this.pending = this.pending.filter((p) => t - p.t <= this.ttlMs);
    const i = this.pending.findIndex((p) => p.label === label);
    if (i < 0) return null;
    const [p] = this.pending.splice(0, i + 1).slice(-1);
    return { label, latencyMs: Math.round(t - p.t) };
  }
}

/**
 * Debounce of discrete orders on the control phone: a double tap, or a gesture and a button at the
 * same time, sends the order once. Continuous gestures always pass (they are coalesced instead).
 */
export class DiscreteGate {
  private last = new Map<string, number>();

  constructor(private readonly windowMs = 600) {}

  allow(action: ViewerAction, t: number): boolean {
    if (action.type === 'rotate' || action.type === 'zoom') return true;
    const key = actionLabel(action);
    const prev = this.last.get(key);
    if (prev !== undefined && t - prev < this.windowMs) return false;
    this.last.set(key, t);
    return true;
  }
}

/**
 * On a device that reaches the projector both over BroadcastChannel and over the hub relay, every
 * message arrives twice. A copy from one transport cancels one equal message seen on the other
 * transport within the window; equal messages on the same transport are all kept.
 */
export class EchoFilter {
  private seen: Array<{ key: string; src: string; t: number }> = [];

  constructor(private readonly windowMs = 500) {}

  accept(msg: unknown, src: string, t: number): boolean {
    this.seen = this.seen.filter((s) => t - s.t <= this.windowMs);
    const key = JSON.stringify(msg);
    const i = this.seen.findIndex((s) => s.key === key && s.src !== src);
    if (i >= 0) {
      this.seen.splice(i, 1);
      return false;
    }
    this.seen.push({ key, src, t });
    if (this.seen.length > 200) this.seen.shift();
    return true;
  }
}
