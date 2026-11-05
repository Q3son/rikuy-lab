/**
 * Test helpers exported as `@rikuy/sync/testing`: a fast deterministic `Cripto` fake (for
 * property tests with thousands of cases) and a seeded clock/random pair. Never use in production.
 */
import { cyrb53 } from '../codec/hash.ts';
import { b64urlEncode } from '../codec/base64url.ts';
import type { Cripto } from '../puertos.ts';
import type { Aleatorio, Reloj } from '@rikuy/core';

const decoder = new TextDecoder();

function digest(seed: string, data: Uint8Array): Uint8Array {
  const text = seed + '|' + decoder.decode(data);
  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    let h = cyrb53(text, i + 1);
    for (let j = 0; j < 8; j++) {
      out[i * 8 + j] = h & 0xff;
      h = Math.floor(h / 256);
    }
  }
  return out;
}

/** Fake private key: whoever holds it can sign for `pub`. Groups never get one. */
export interface FakePrivateKey {
  readonly pub: string;
}

export const fakeCripto: Cripto = {
  async hmac(claveMac, data) {
    return digest('mac:' + claveMac, data);
  },
  async sign(clavePrivada, data) {
    return b64urlEncode(digest('sig:' + (clavePrivada as FakePrivateKey).pub, data));
  },
  async verify(clavePub, data, firma) {
    return b64urlEncode(digest('sig:' + clavePub, data)) === firma;
  },
};

export const fakeClassKeys = (name = 'clase') => ({
  claveMac: `mac-${name}`,
  clavePub: `pub-${name}`,
  clavePrivada: { pub: `pub-${name}` } as FakePrivateKey,
});

/** Manually driven clock. */
export function manualClock(start = 1762300800000): Reloj & { advance(ms: number): void; set(ms: number): void } {
  let t = start;
  return { ahora: () => t, advance: (ms) => void (t += ms), set: (ms) => void (t = ms) };
}

/** Deterministic random bytes (xorshift32). */
export function seededRandom(seed: number | string = 1): Aleatorio {
  let s = (typeof seed === 'string' ? cyrb53(seed) : seed) >>> 0 || 1;
  return {
    bytes(n) {
      const out = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        s ^= s << 13;
        s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5;
        s >>>= 0;
        out[i] = s & 0xff;
      }
      return out;
    },
  };
}
