/** Deterministic ULID-shaped id (Crockford base32, 26 chars) from a seed: same events, same ids. */
const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function hash32(texto: string, semilla: number): number {
  let h = (0x811c9dc5 ^ semilla) >>> 0;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return h >>> 0;
}

export function idDeterminista(semilla: string): string {
  let out = '';
  for (let i = 0; i < 26; i++) out += ALFABETO[hash32(semilla, i + 1) % 32];
  return out;
}
