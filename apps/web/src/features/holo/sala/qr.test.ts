import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { encodeQr } from './qr.ts';

/** Renders the matrix with a quiet zone and decodes it with jsQR (the reader the app already ships). */
function decode(modules: boolean[][], scale = 4): string | null {
  const quiet = 4;
  const n = modules.length + quiet * 2;
  const size = n * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < modules.length; y++)
    for (let x = 0; x < modules.length; x++)
      if (modules[y][x])
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            const i = (((y + quiet) * scale + dy) * size + (x + quiet) * scale + dx) * 4;
            data[i] = data[i + 1] = data[i + 2] = 0;
          }
  return jsQR(data, size, size)?.data ?? null;
}

describe('encodeQr (byte mode, level M, versions 1-6)', () => {
  it.each([
    'ABCD',
    'https://192.168.1.10:5173/#/holo/control/k7m2',
    'https://q3son.github.io/rikuy-lab/#/holo/control/k7m2?rol=control',
    'x'.repeat(100),
  ])('round-trips %s', (text) => {
    expect(decode(encodeQr(text))).toBe(text);
  });

  it('chooses the smallest version that fits', () => {
    expect(encodeQr('ABCD')).toHaveLength(21);
    expect(encodeQr('x'.repeat(42))).toHaveLength(29); // version 3-M holds 42 bytes
    expect(encodeQr('x'.repeat(43))).toHaveLength(33);
  });

  it('refuses text that does not fit version 6', () => {
    expect(() => encodeQr('x'.repeat(200))).toThrow(RangeError);
  });
});
