/** Generic ports of the pure core (2.2). Adapters live in apps/web and apps/hub. */

/** Wall clock in Unix milliseconds. */
export interface Reloj {
  ahora(): number;
}

/** Source of random bytes (crypto.getRandomValues in browsers, a seeded fake in tests). */
export interface Aleatorio {
  bytes(n: number): Uint8Array;
}

interface WebRandom {
  getRandomValues<T extends Uint8Array>(a: T): T;
}

/** System adapters, usable in any runtime with WebCrypto (browsers, Node >= 19). */
export const relojSistema: Reloj = { ahora: () => Date.now() };
export const aleatorioSistema: Aleatorio = {
  bytes: (n) => (globalThis as unknown as { crypto: WebRandom }).crypto.getRandomValues(new Uint8Array(n)),
};
