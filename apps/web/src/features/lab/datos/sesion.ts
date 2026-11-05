/**
 * Local session of the lab: class, group and device ids are created once per device until the class
 * join (F1/F2) hands them over. ULIDs and HLCs come from @rikuy/core (F2); the HLC node is derived
 * from the device id with @rikuy/sync's `hlcNode`, like every other event writer.
 */
import { aleatorioSistema, createHlcClock, createUlidFactory, relojSistema, type HlcClock } from '@rikuy/core';
import { hlcNode } from '@rikuy/sync';

const KEY = 'rikuy.lab.sesion';
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Monotonic ULID factory of @rikuy/core. */
export const newUlid: () => string = createUlidFactory(relojSistema, aleatorioSistema);

function dispositivoNuevo(): string {
  return Array.from(aleatorioSistema.bytes(10), (b) => CROCKFORD[b % 32]).join('');
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
  const dispositivo = dispositivoNuevo();
  const s: SesionLab = { claseId: newUlid(), grupoId: newUlid(), dispositivo, nodo: hlcNode(dispositivo) };
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* in-memory session */
  }
  return s;
}

/** Hybrid logical clock of @rikuy/core: msUnix(13)-counter(4)-node(8). */
export class Hlc {
  private readonly reloj: HlcClock;
  constructor(node: string) {
    this.reloj = createHlcClock(node, relojSistema);
  }

  tick(): string {
    return this.reloj.now();
  }

  observe(hlc: string): void {
    this.reloj.receive(hlc);
  }
}

function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
