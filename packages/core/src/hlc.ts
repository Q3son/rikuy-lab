/**
 * Hybrid logical clock (3.5): `msUnix(13)-counter(4)-node(8)`. Lexicographic order equals causal
 * order, so HLC strings can be compared with `<`. Tolerates the skewed clocks of offline phones:
 * `max(local clock, received hlc)` plus a counter.
 */
import type { Reloj } from './puertos.ts';

export interface HlcParts {
  ms: number;
  counter: number;
  node: string;
}

const HLC_RE = /^(\d{13})-(\d{4})-([0-9a-z]{8})$/;
const NODE_RE = /^[0-9a-z]{8}$/;
const MAX_COUNTER = 9999;

export function formatHlc({ ms, counter, node }: HlcParts): string {
  return `${String(ms).padStart(13, '0')}-${String(counter).padStart(4, '0')}-${node}`;
}

export function parseHlc(hlc: string): HlcParts {
  const m = HLC_RE.exec(hlc);
  if (!m) throw new Error(`invalid HLC: ${hlc}`);
  return { ms: Number(m[1]), counter: Number(m[2]), node: m[3] };
}

/** Total order: by ms, then counter, then node. Equivalent to string comparison. */
export function compareHlc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export interface HlcClock {
  /** Timestamp for a local (or send) event. Strictly increasing. */
  now(): string;
  /** Merges a timestamp received from another device. */
  receive(remote: string): void;
}

export function createHlcClock(node: string, clock: Reloj): HlcClock {
  if (!NODE_RE.test(node)) throw new Error(`HLC node must be 8 chars [0-9a-z]: ${node}`);
  let ms = 0;
  let counter = 0;

  const bump = (candidateMs: number, candidateCounter: number) => {
    if (candidateCounter > MAX_COUNTER) {
      ms = candidateMs + 1;
      counter = 0;
    } else {
      ms = candidateMs;
      counter = candidateCounter;
    }
  };

  return {
    now() {
      const wall = clock.ahora();
      if (wall > ms) bump(wall, 0);
      else bump(ms, counter + 1);
      return formatHlc({ ms, counter, node });
    },
    receive(remote) {
      const r = parseHlc(remote);
      const wall = clock.ahora();
      const top = Math.max(wall, ms, r.ms);
      if (top === ms && top === r.ms) bump(top, Math.max(counter, r.counter) + 1);
      else if (top === ms) bump(top, counter + 1);
      else if (top === r.ms) bump(top, r.counter + 1);
      else bump(top, 0);
    },
  };
}
