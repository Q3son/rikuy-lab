import { describe, expect, it } from 'vitest';
import { Stopwatch } from './stopwatch.ts';

function fakeClock(start = 1000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

describe('Stopwatch (performance.now() clock port)', () => {
  it('counts oscillations and stops by itself at the target', () => {
    const clock = fakeClock();
    const sw = new Stopwatch(clock, 10);
    sw.start();
    for (let i = 0; i < 10; i++) {
      clock.advance(1420);
      sw.countOscillation();
    }
    expect(sw.count).toBe(10);
    expect(sw.completed).toBe(true);
    expect(sw.running).toBe(false);
    expect(sw.elapsedMs()).toBe(14_200);
    expect(sw.periodS()).toBeCloseTo(1.42, 10);
    clock.advance(5000);
    expect(sw.elapsedMs()).toBe(14_200);
  });

  it('reports live elapsed time while running', () => {
    const clock = fakeClock();
    const sw = new Stopwatch(clock);
    sw.start();
    clock.advance(2500);
    expect(sw.running).toBe(true);
    expect(sw.elapsedMs()).toBe(2500);
    expect(sw.periodS()).toBeNull();
  });

  it('ignores taps before start and after completion', () => {
    const clock = fakeClock();
    const sw = new Stopwatch(clock, 2);
    sw.countOscillation();
    expect(sw.count).toBe(0);
    sw.start();
    sw.countOscillation();
    sw.countOscillation();
    sw.countOscillation();
    expect(sw.count).toBe(2);
  });

  it('can be stopped early (no period) and reset', () => {
    const clock = fakeClock();
    const sw = new Stopwatch(clock);
    sw.start();
    clock.advance(3000);
    sw.countOscillation();
    sw.stop();
    expect(sw.running).toBe(false);
    expect(sw.completed).toBe(false);
    expect(sw.periodS()).toBeNull();
    sw.reset();
    expect(sw.count).toBe(0);
    expect(sw.elapsedMs()).toBe(0);
  });
});
