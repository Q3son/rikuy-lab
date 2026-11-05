import { describe, expect, it } from 'vitest';
import { hand } from './handFixtures.ts';
import { GestureInterpreter } from './interpreter.ts';

const ALL = ['index', 'middle', 'ring', 'pinky'] as const;
const palm = (dx = 0, dy = 0) => hand({ extended: [...ALL], thumb: 'side', dx, dy });

describe('GestureInterpreter (pose stream → viewer actions)', () => {
  it('palm move = rotate, mirrored for the front camera', () => {
    const g = new GestureInterpreter();
    expect(g.feed(palm(0, 0), 0)).toEqual([]);
    const actions = g.feed(palm(0.05, 0.02), 33);
    expect(actions).toHaveLength(1);
    const [a] = actions;
    if (a.type !== 'rotate') throw new Error(a.type);
    expect(a.dx).toBeLessThan(0); // hand moves right on the image = left for the user
    expect(a.dy).toBeGreaterThan(0);
  });

  it('ignores tiny jitter of a still palm', () => {
    const g = new GestureInterpreter();
    g.feed(palm(), 0);
    expect(g.feed(palm(0.001, 0.001), 33)).toEqual([]);
  });

  it('pinch = zoom with the change of hand size', () => {
    const g = new GestureInterpreter();
    g.feed(hand({ extended: ['middle', 'ring', 'pinky'], pinch: true, scale: 1 }), 0);
    const [a] = g.feed(hand({ extended: ['middle', 'ring', 'pinky'], pinch: true, scale: 1.1 }), 33);
    expect(a.type).toBe('zoom');
    if (a.type === 'zoom') expect(a.factor).toBeGreaterThan(1);
  });

  it('fist held = pause, once, then a cooldown', () => {
    const g = new GestureInterpreter({ holdMs: 200, cooldownMs: 1500 });
    const fist = hand({ extended: [] });
    expect(g.feed(fist, 0)).toEqual([]);
    expect(g.feed(fist, 100)).toEqual([]);
    expect(g.feed(fist, 220)).toEqual([{ type: 'pause' }]);
    expect(g.feed(fist, 400)).toEqual([]);
    expect(g.feed(fist, 1000)).toEqual([]);
  });

  it('thumbs up held = release the pendulum', () => {
    const g = new GestureInterpreter({ holdMs: 200 });
    const up = hand({ thumb: 'up' });
    g.feed(up, 0);
    expect(g.feed(up, 250)).toEqual([{ type: 'release' }]);
  });

  it('a lost hand resets the motion tracking', () => {
    const g = new GestureInterpreter();
    g.feed(palm(), 0);
    g.feed(null, 33);
    expect(g.feed(palm(0.2, 0), 66)).toEqual([]);
  });

  it('reports the current pose for the "mano detectada" chip', () => {
    const g = new GestureInterpreter();
    g.feed(palm(), 0);
    expect(g.pose).toBe('palm');
    g.feed(null, 10);
    expect(g.pose).toBeNull();
  });
});
