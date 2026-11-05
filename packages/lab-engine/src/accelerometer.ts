/**
 * Optional measurement mode: estimate the pendulum period from the phone accelerometer
 * (the phone hangs as the bob). Labelled in the UI as an estimate from the sensor; the
 * stopwatch stays the default (5.4, E-09).
 *
 * Method: pick the axis that oscillates the most, remove the offset (gravity + bias),
 * smooth with a moving average, then detect upward zero crossings with hysteresis and
 * linear interpolation. One upward crossing per oscillation, so the period is the mean
 * spacing between the first and the last crossing.
 */
import type { AccelReading } from './ports.ts';

export interface AccelSample {
  /** Milliseconds (monotonic). */
  t: number;
  /** Acceleration along one axis, m/s². */
  a: number;
}

export interface PeriodEstimate {
  periodS: number;
  /** Full oscillations between the first and the last crossing. */
  cycles: number;
  crossings: number;
}

export interface EstimatorOptions {
  /** Moving-average window, in samples. */
  smoothing?: number;
  /** Hysteresis band as a fraction of the signal standard deviation. */
  hysteresis?: number;
  /** Fewer full oscillations than this give no estimate. */
  minCycles?: number;
}

export function dominantAxis(readings: readonly Pick<AccelReading, 't' | 'x' | 'y' | 'z'>[]): AccelSample[] {
  const axes = ['x', 'y', 'z'] as const;
  let best: (typeof axes)[number] = 'x';
  let bestVar = -1;
  for (const axis of axes) {
    const v = variance(readings.map((r) => r[axis]));
    if (v > bestVar) {
      bestVar = v;
      best = axis;
    }
  }
  return readings.map((r) => ({ t: r.t, a: r[best] }));
}

export function estimatePeriodFromZeroCrossings(samples: readonly AccelSample[], options: EstimatorOptions = {}): PeriodEstimate | null {
  const { smoothing = 5, hysteresis = 0.3, minCycles = 3 } = options;
  if (samples.length < smoothing * 2) return null;

  const m = samples.reduce((s, x) => s + x.a, 0) / samples.length;
  const centered = movingAverage(
    samples.map((x) => x.a - m),
    smoothing,
  );
  const sd = Math.sqrt(variance(centered));
  if (sd < 1e-3) return null;
  const band = sd * hysteresis;

  const crossings: number[] = [];
  let armed = false; // true once the signal went below -band
  for (let i = 1; i < centered.length; i++) {
    const prev = centered[i - 1];
    const cur = centered[i];
    if (cur < -band) armed = true;
    if (armed && prev < 0 && cur >= 0) {
      const frac = -prev / (cur - prev);
      crossings.push(samples[i - 1].t + frac * (samples[i].t - samples[i - 1].t));
      armed = false;
    }
  }

  const cycles = crossings.length - 1;
  if (cycles < minCycles) return null;
  const periodS = (crossings[crossings.length - 1] - crossings[0]) / cycles / 1000;
  return { periodS, cycles, crossings: crossings.length };
}

/** Centered moving average; edges use the available neighbours. */
function movingAverage(values: readonly number[], window: number): number[] {
  if (window <= 1) return [...values];
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(values.length, i + half + 1);
    let s = 0;
    for (let k = from; k < to; k++) s += values[k];
    return s / (to - from);
  });
}

function variance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
}
