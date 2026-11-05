import { describe, expect, it } from 'vitest';
import { pendulumPeriod } from './physics.ts';
import { PendulumModel } from './pendulumModel.ts';

const run = (m: PendulumModel, seconds: number, dt = 1 / 60) => {
  for (let t = 0; t < seconds; t += dt) m.step(dt);
};

describe('PendulumModel (hologram pendulum)', () => {
  it('measures a period close to T = 2π√(L/g) for small swings', () => {
    for (const L of [0.25, 0.5, 1, 2]) {
      const m = new PendulumModel({ length: L, theta0: 0.2 });
      run(m, 3 * pendulumPeriod(L) + 0.5);
      expect(m.measuredPeriod).not.toBeNull();
      // Small but finite amplitude: the real period is slightly longer than the ideal one.
      expect(m.measuredPeriod!).toBeGreaterThan(pendulumPeriod(L) * 0.995);
      expect(m.measuredPeriod!).toBeLessThan(pendulumPeriod(L) * 1.01);
    }
  });

  it('keeps its amplitude without damping and loses it with damping', () => {
    const free = new PendulumModel({ length: 0.5, theta0: 0.35 });
    const damped = new PendulumModel({ length: 0.5, theta0: 0.35 });
    damped.damping = true;
    run(free, 20);
    run(damped, 20);
    expect(free.amplitude).toBeGreaterThan(0.33);
    expect(damped.amplitude).toBeLessThan(0.2);
  });

  it('morphs the length smoothly toward the target instead of jumping', () => {
    const m = new PendulumModel({ length: 0.5 });
    m.setTargetLength(2);
    m.step(1 / 60);
    expect(m.length).toBeGreaterThan(0.5);
    expect(m.length).toBeLessThan(0.7);
    run(m, 3);
    expect(m.length).toBeCloseTo(2, 2);
  });

  it('forgets the measured period when the length changes, then measures again', () => {
    const m = new PendulumModel({ length: 0.25 });
    run(m, 3);
    expect(m.measuredPeriod).not.toBeNull();
    m.setTargetLength(1);
    expect(m.measuredPeriod).toBeNull();
    run(m, 8);
    expect(m.measuredPeriod!).toBeCloseTo(pendulumPeriod(1), 1);
  });

  it('clamps an untrusted length to the lab range', () => {
    const m = new PendulumModel({ length: 0.5 });
    m.setTargetLength(50);
    expect(m.targetLength).toBe(2.5);
    m.setTargetLength(-1);
    expect(m.targetLength).toBe(0.1);
    m.setTargetLength(Number.NaN);
    expect(m.targetLength).toBe(0.1);
  });

  it('release lifts the bob back to the starting angle at rest', () => {
    const m = new PendulumModel({ length: 0.5, theta0: 0.35 });
    m.damping = true;
    run(m, 30);
    m.release();
    expect(m.theta).toBeCloseTo(0.35, 5);
    expect(m.omega).toBe(0);
    expect(m.amplitude).toBeCloseTo(0.35, 5);
  });

  it('does not move while paused (dt = 0)', () => {
    const m = new PendulumModel({ length: 0.5 });
    const before = m.theta;
    m.step(0);
    expect(m.theta).toBe(before);
  });
});
