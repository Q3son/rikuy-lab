/** Deterministic ULID-shaped ids (Crockford base32, 26 chars) so that derived objects are reproducible. */
const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function cyrb53(texto: string, semilla: number): number {
  let h1 = 0xdeadbeef ^ semilla;
  let h2 = 0x41c6ce57 ^ semilla;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function idDeterminista(...partes: string[]): string {
  const texto = partes.join('\u001f');
  let salida = '';
  for (let ronda = 0; salida.length < 26; ronda++) {
    let h = cyrb53(texto, ronda + 1);
    for (let i = 0; i < 10 && salida.length < 26; i++) {
      salida += ALFABETO[h % 32];
      h = Math.floor(h / 32);
    }
  }
  return salida;
}
