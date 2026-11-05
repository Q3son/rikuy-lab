import { Ulid } from '@rikuy/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Aleatorio, Reloj } from './puertos.ts';
import { createUlidFactory, ulidTime } from './ulid.ts';

const fixedClock = (ms: number): Reloj => ({ ahora: () => ms });
const zeroRandom: Aleatorio = { bytes: (n) => new Uint8Array(n) };
const counterRandom = (): Aleatorio => {
  let k = 0;
  return { bytes: (n) => Uint8Array.from({ length: n }, () => (k++ * 37) & 0xff) };
};

describe('ULID', () => {
  it('produces 26 Crockford base32 chars accepted by the contract', () => {
    const ulid = createUlidFactory(fixedClock(1762300800000), counterRandom());
    const id = ulid();
    expect(id).toHaveLength(26);
    expect(Ulid.safeParse(id).success).toBe(true);
  });

  it('encodes the timestamp in the first 10 chars', () => {
    const ulid = createUlidFactory(fixedClock(1762300800000), zeroRandom);
    expect(ulidTime(ulid())).toBe(1762300800000);
  });

  it('is strictly monotonic within the same millisecond', () => {
    const ulid = createUlidFactory(fixedClock(1762300800000), zeroRandom);
    const ids = Array.from({ length: 500 }, () => ulid());
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sorts lexicographically by time across milliseconds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 47 }), fc.integer({ min: 1, max: 2 ** 20 }), (t, dt) => {
        const a = createUlidFactory(fixedClock(t), counterRandom())();
        const b = createUlidFactory(fixedClock(t + dt), zeroRandom)();
        expect(a < b).toBe(true);
      }),
    );
  });

  it('never goes backwards when the clock does', () => {
    let now = 1762300800000;
    const ulid = createUlidFactory({ ahora: () => now }, counterRandom());
    const a = ulid();
    now -= 5000;
    const b = ulid();
    expect(b > a).toBe(true);
  });

  it('rejects timestamps outside the 48-bit range', () => {
    expect(() => createUlidFactory(fixedClock(-1), zeroRandom)()).toThrow();
    expect(() => createUlidFactory(fixedClock(2 ** 48), zeroRandom)()).toThrow();
  });
});
