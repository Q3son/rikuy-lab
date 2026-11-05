import { describe, expect, it } from 'vitest';
import { mean, relativeError, sampleStdDev } from './statistics.ts';

describe('statistics', () => {
  it('computes the mean', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(Number.isNaN(mean([]))).toBe(true);
  });

  it('computes the sample standard deviation', () => {
    expect(sampleStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(sampleStdDev([3])).toBe(0);
  });

  it('computes the relative error against the model as a fraction', () => {
    expect(relativeError(2.09, 2.0)).toBeCloseTo(0.045, 10);
    expect(relativeError(1.9, 2.0)).toBeCloseTo(0.05, 10);
    expect(() => relativeError(1, 0)).toThrow(RangeError);
  });
});
