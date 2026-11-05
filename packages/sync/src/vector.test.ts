import { describe, expect, it } from 'vitest';
import { contiguousVector, dominates, lacking, mergeVectors } from './vector.ts';

const ev = (dispositivo: string, seq: number) => ({ dispositivo, seq });

describe('version vectors', () => {
  it('advances each device only up to its first gap', () => {
    const vv = contiguousVector([ev('A', 1), ev('A', 2), ev('A', 4), ev('B', 2), ev('C', 1)]);
    expect(vv).toEqual({ A: 2, C: 1 });
  });

  it('ignores duplicates and order', () => {
    expect(contiguousVector([ev('A', 3), ev('A', 1), ev('A', 2), ev('A', 1)])).toEqual({ A: 3 });
  });

  it('lists the events a peer lacks, sorted by device and seq', () => {
    const events = [ev('A', 2), ev('A', 1), ev('B', 1), ev('A', 3)];
    expect(lacking(events, { A: 1 })).toEqual([ev('A', 2), ev('A', 3), ev('B', 1)]);
  });

  it('merges by taking the maximum per device', () => {
    expect(mergeVectors({ A: 2, B: 5 }, { A: 3, C: 1 })).toEqual({ A: 3, B: 5, C: 1 });
  });

  it('dominates when every entry is >=', () => {
    expect(dominates({ A: 2, B: 1 }, { A: 2 })).toBe(true);
    expect(dominates({ A: 2 }, { A: 2, B: 1 })).toBe(false);
  });
});
