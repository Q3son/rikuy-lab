/**
 * Local session of the lab while the class join flow (F1/F2) is not wired: class, group and device
 * ids are created once per device. Also a ULID and HLC generator for the event envelopes (3.3).
 * F2's @rikuy/core/@rikuy/sync replace these when they land.
 */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const KEY = 'rikuy.lab.sesion';

function randomChars(n: number, alphabet: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function newUlid(now = Date.now()): string {
  let t = now;
  let time = '';
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[t % 32] + time;
    t = Math.floor(t / 32);
  }
  return time + randomChars(16, CROCKFORD);
}

export interface SesionLab {
  claseId: string;
  grupoId: string;
  dispositivo: string;
  nodo: string; // 8 chars, HLC node
}

type Store = Pick<Storage, 'getItem' | 'setItem'> | null;

export function crearSesion(storage: Store = safeStorage()): SesionLab {
  try {
    const saved = storage?.getItem(KEY);
    if (saved) return JSON.parse(saved) as SesionLab;
  } catch {
    /* corrupted or blocked: new session */
  }
  const s: SesionLab = {
    claseId: newUlid(),
    grupoId: newUlid(),
    dispositivo: randomChars(10, '0123456789ABCDEFGHJKMNPQRSTVWXYZ'),
    nodo: randomChars(8, 'abcdefghijklmnopqrstuvwxyz0123456789'),
  };
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* in-memory session */
  }
  return s;
}

/** Hybrid logical clock: msUnix(13)-counter(4)-node(8). */
export class Hlc {
  private last = 0;
  private counter = 0;
  constructor(private readonly node: string) {}

  tick(now = Date.now()): string {
    if (now > this.last) {
      this.last = now;
      this.counter = 0;
    } else {
      this.counter++;
    }
    return `${String(this.last).padStart(13, '0')}-${String(this.counter).padStart(4, '0')}-${this.node}`;
  }

  observe(hlc: string): void {
    const ms = Number(hlc.slice(0, 13));
    if (ms > this.last) {
      this.last = ms;
      this.counter = Number(hlc.slice(14, 18));
    }
  }
}

function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
