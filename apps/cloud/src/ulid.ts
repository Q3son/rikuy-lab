/** ULID (Crockford base32): 10 chars of time + 16 chars of randomness. F2's `@rikuy/core` will own the shared one. */
const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function nuevoUlid(ahora = Date.now()): string {
  let t = ahora;
  let tiempo = '';
  for (let i = 0; i < 10; i++) {
    tiempo = ALFABETO[t % 32]! + tiempo;
    t = Math.floor(t / 32);
  }
  const azar = crypto.getRandomValues(new Uint8Array(16));
  return tiempo + Array.from(azar, (b) => ALFABETO[b % 32]).join('');
}
