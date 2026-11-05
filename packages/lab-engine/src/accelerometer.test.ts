import { describe, expect, it } from 'vitest';
import { dominantAxis, estimatePeriodFromZeroCrossings, type AccelSample } from './accelerometer.ts';

/** Deterministic noise (LCG), so the gate is reproducible. */
function noise(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000 - 0.5;
  };
}

interface SyntheticOptions {
  seconds?: number;
  hz?: number;
  offset?: number;
  noiseAmp?: number;
  seed?: number;
}

function synthetic(periodS: number, opts: SyntheticOptions = {}): AccelSample[] {
  const { seconds = periodS * 10, hz = 50, offset = 0.4, noiseAmp = 0.6, seed = 7 } = opts;
  const rnd = noise(seed);
  const out: AccelSample[] = [];
  for (let i = 0; i / hz <= seconds; i++) {
    const t = i / hz;
    // Tangential acceleration of a pendulum (about -g·θ0·sin) plus sensor offset and noise.
    const a = -9.81 * 0.3 * Math.sin((2 * Math.PI * t) / periodS + 0.3) + offset + noiseAmp * rnd();
    out.push({ t: t * 1000, a });
  }
  return out;
}

describe('estimatePeriodFromZeroCrossings (gate: error < 3 % on a synthetic signal)', () => {
  it.each([0.9, 1.0, 1.42, 2.0, 2.84])('estimates T = %s s within 3 %%', (T) => {
    const est = estimatePeriodFromZeroCrossings(synthetic(T));
    expect(est).not.toBeNull();
    expect(Math.abs(est!.periodS - T) / T).toBeLessThan(0.03);
    expect(est!.cycles).toBeGreaterThanOrEqual(8);
  });

  it('stays under 3 % with heavier noise and a slower sensor (25 Hz)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const est = estimatePeriodFromZeroCrossings(synthetic(1.42, { hz: 25, noiseAmp: 1.5, seed }));
      expect(est).not.toBeNull();
      expect(Math.abs(est!.periodS - 1.42) / 1.42).toBeLessThan(0.03);
    }
  });

  it('returns null without enough oscillations or with a flat signal', () => {
    expect(estimatePeriodFromZeroCrossings(synthetic(2, { seconds: 2.5 }))).toBeNull();
    const flat: AccelSample[] = Array.from({ length: 200 }, (_, i) => ({ t: i * 20, a: 9.81 }));
    expect(estimatePeriodFromZeroCrossings(flat)).toBeNull();
    expect(estimatePeriodFromZeroCrossings([])).toBeNull();
  });
});

describe('dominantAxis', () => {
  it('picks the axis that oscillates the most', () => {
    const samples = synthetic(1.42).map((s, i) => ({ t: s.t, x: 0.01 * (i % 3), y: 9.81, z: s.a }));
    expect(dominantAxis(samples).map((s) => s.a)).toEqual(samples.map((s) => s.z));
  });
});
