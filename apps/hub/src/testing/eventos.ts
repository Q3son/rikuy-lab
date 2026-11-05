/**
 * Test helpers: valid contract events built on top of the contract fixture ids.
 * `pista.mostrada` is used because its `datos` is small and strict.
 */
import type { Evento } from '@rikuy/contracts';
import { ids } from '@rikuy/contracts/fixtures';

export const CLASE = ids.clase;

/** Deterministic ULID (digits are valid Crockford base32). */
export function ulid(device: number, seq: number): string {
  return `01JC${String(device).padStart(2, '0')}${String(seq).padStart(20, '0')}`;
}

/** 10-character device id. */
export function device(n: number): string {
  return `DEV${String(n).padStart(7, '0')}`;
}

export function evento(dev: number, seq: number, overrides: Partial<Evento> = {}): Evento {
  const ms = 1762300800000 + seq * 1000 + dev;
  return {
    id: ulid(dev, seq),
    dispositivo: device(dev),
    seq,
    hlc: `${ms}-${String(seq % 10000).padStart(4, '0')}-${`dev${String(dev).padStart(5, '0')}`}`,
    claseId: CLASE,
    sv: 1,
    tipo: 'pista.mostrada',
    autor: { grupoId: ids.grupo1 },
    datos: { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 },
    ...overrides,
  };
}

export function eventos(dev: number, from: number, to: number): Evento[] {
  const out: Evento[] = [];
  for (let s = from; s <= to; s++) out.push(evento(dev, s));
  return out;
}
