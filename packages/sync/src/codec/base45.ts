/**
 * Base45 (RFC 9285): fits the QR alphanumeric mode (5.5 bits per character).
 * Adapted from Yaku by agentards (agentards__yaku/src/codec.ts).
 */
export const BASE45_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

export function base45Encode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      let x = bytes[i] * 256 + bytes[i + 1];
      const c = x % 45;
      x = (x - c) / 45;
      const d = x % 45;
      const e = (x - d) / 45;
      out += BASE45_ALPHABET[c] + BASE45_ALPHABET[d] + BASE45_ALPHABET[e];
    } else {
      const x = bytes[i];
      out += BASE45_ALPHABET[x % 45] + BASE45_ALPHABET[Math.floor(x / 45)];
    }
  }
  return out;
}

export function base45Decode(text: string): Uint8Array {
  const values = Array.from(text, (ch) => {
    const v = BASE45_ALPHABET.indexOf(ch);
    if (v < 0) throw new Error('invalid Base45 character');
    return v;
  });
  if (values.length % 3 === 1) throw new Error('invalid Base45 length');
  const out: number[] = [];
  for (let i = 0; i < values.length; i += 3) {
    if (i + 2 < values.length) {
      const x = values[i] + values[i + 1] * 45 + values[i + 2] * 2025;
      if (x > 0xffff) throw new Error('Base45 value out of range');
      out.push(x >> 8, x & 0xff);
    } else {
      const x = values[i] + values[i + 1] * 45;
      if (x > 0xff) throw new Error('Base45 value out of range');
      out.push(x);
    }
  }
  return Uint8Array.from(out);
}
