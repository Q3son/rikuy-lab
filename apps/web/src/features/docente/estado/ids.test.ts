import { Hlc, Ulid } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { crearGeneradorHlc, crearUlid, codigoDeClase } from './ids.ts';

describe('id helpers', () => {
  it('makes valid, unique ULIDs that sort by time', () => {
    const a = crearUlid(1_762_300_800_000, () => 0.1);
    const b = crearUlid(1_762_300_801_000, () => 0.9);
    expect(Ulid.safeParse(a).success).toBe(true);
    expect(Ulid.safeParse(b).success).toBe(true);
    expect(a < b).toBe(true);
  });

  it('makes HLCs that grow even if the clock does not move or goes back', () => {
    const t = [1_762_300_800_000, 1_762_300_800_000, 1_762_300_700_000];
    let i = 0;
    const siguiente = crearGeneradorHlc('docente1', () => t[i++]);
    const h = [siguiente(), siguiente(), siguiente()];
    for (const x of h) expect(Hlc.safeParse(x).success).toBe(true);
    expect(h[0] < h[1] && h[1] < h[2]).toBe(true);
  });

  it('makes join codes of 6 allowed characters', () => {
    expect(codigoDeClase(() => 0.5)).toMatch(/^[A-Z0-9]{6}$/);
  });
});
