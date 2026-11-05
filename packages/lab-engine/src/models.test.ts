import { describe, expect, it } from 'vitest';
import { STANDARD_GRAVITY, pendulumPeriod } from './models.ts';

/**
 * Gate (5.4): the models match theory within ±0.5 %.
 * Reference periods computed independently (T = 2π·√(L/g), g = 9.80665 m/s²), rounded to 4 decimals.
 */
const REFERENCE: Array<[lengthM: number, periodS: number]> = [
  [0.25, 1.003],
  [0.5, 1.4185],
  [1.0, 2.0064],
  [1.5, 2.4573],
  [2.0, 2.8375],
];

describe('pendulumPeriod', () => {
  it.each(REFERENCE)('L = %s m gives T within ±0.5 %% of %s s', (lengthM, expected) => {
    const T = pendulumPeriod(lengthM);
    expect(Math.abs(T - expected) / expected).toBeLessThan(0.005);
  });

  it('uses standard gravity by default and accepts another g', () => {
    expect(STANDARD_GRAVITY).toBeCloseTo(9.80665, 5);
    expect(pendulumPeriod(1, 9.78)).toBeGreaterThan(pendulumPeriod(1));
  });

  it('quadruples the length to double the period', () => {
    expect(pendulumPeriod(1) / pendulumPeriod(0.25)).toBeCloseTo(2, 10);
  });

  it('rejects non-positive lengths or gravity', () => {
    expect(() => pendulumPeriod(0)).toThrow(RangeError);
    expect(() => pendulumPeriod(1, -1)).toThrow(RangeError);
  });
});
