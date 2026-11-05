/**
 * cyrb53: fast non-cryptographic 53-bit string hash. Adapted from Yaku by agentards
 * (agentards__yaku/src/codec.ts), reused with the authors' permission.
 */
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Stable 8-char [0-9a-z] HLC node derived from a 10-char device id. */
export function hlcNode(dispositivo: string): string {
  return cyrb53(dispositivo).toString(36).padStart(8, '0').slice(-8);
}
