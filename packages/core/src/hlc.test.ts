import { Hlc } from '@rikuy/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareHlc, createHlcClock, formatHlc, parseHlc } from './hlc.ts';

describe('HLC', () => {
  it('formats msUnix-counter-node as the contract expects', () => {
    const h = formatHlc({ ms: 1762300800000, counter: 7, node: 'docente1' });
    expect(h).toBe('1762300800000-0007-docente1');
    expect(Hlc.safeParse(h).success).toBe(true);
    expect(parseHlc(h)).toEqual({ ms: 1762300800000, counter: 7, node: 'docente1' });
  });

  it('rejects malformed values and invalid nodes', () => {
    expect(() => parseHlc('nope')).toThrow();
    expect(() => createHlcClock('BAD', { ahora: () => 0 })).toThrow();
  });

  it('local events are strictly increasing even with a frozen clock', () => {
    const clock = createHlcClock('grupo001', { ahora: () => 1762300800000 });
    const a = clock.now();
    const b = clock.now();
    expect(compareHlc(a, b)).toBeLessThan(0);
    expect(parseHlc(b).counter).toBe(1);
  });

  it('a clock running backwards never produces an older timestamp', () => {
    let t = 1762300800000;
    const clock = createHlcClock('grupo001', { ahora: () => t });
    const a = clock.now();
    t -= 60_000;
    expect(compareHlc(clock.now(), a)).toBeGreaterThan(0);
  });

  it('receiving a remote timestamp from the future moves the clock past it', () => {
    const clock = createHlcClock('grupo001', { ahora: () => 1000 });
    const remote = '0000000005000-0003-docente1';
    clock.receive(remote);
    expect(compareHlc(clock.now(), remote)).toBeGreaterThan(0);
  });

  it('counter overflow advances the millisecond instead of breaking the format', () => {
    const clock = createHlcClock('grupo001', { ahora: () => 1000 });
    clock.receive('0000000001000-9999-docente1');
    const next = clock.now();
    expect(Hlc.safeParse(next).success).toBe(true);
    expect(compareHlc(next, '0000000001000-9999-docente1')).toBeGreaterThan(0);
  });

  it('send/receive preserves causality between any interleaving of two devices', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ who: fc.boolean(), drift: fc.integer({ min: -5000, max: 5000 }), send: fc.boolean() }), { maxLength: 60 }),
        (steps) => {
          let base = 1762300800000;
          const ta = { now: base };
          const tb = { now: base };
          const a = createHlcClock('aaaaaaaa', { ahora: () => ta.now });
          const b = createHlcClock('bbbbbbbb', { ahora: () => tb.now });
          for (const s of steps) {
            base += 10;
            ta.now = base + (s.who ? s.drift : 0);
            tb.now = base + (s.who ? 0 : s.drift);
            const [from, to] = s.who ? [a, b] : [b, a];
            const sent = from.now();
            if (s.send) {
              to.receive(sent);
              expect(compareHlc(to.now(), sent)).toBeGreaterThan(0);
            }
          }
        },
      ),
    );
  });
});
