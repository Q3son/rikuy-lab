import { describe, expect, it } from 'vitest';
import { ActionCoalescer, ConfirmationTracker, controlUrl, DiscreteGate, EchoFilter, newRoomCode, normalizeRoomCode } from './room.ts';

describe('room codes', () => {
  it('are 4 characters without look-alikes (0/o, 1/l/i)', () => {
    for (let i = 0; i < 200; i++) expect(newRoomCode()).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{4}$/);
  });

  it('normalize what a student types, and reject the rest', () => {
    expect(normalizeRoomCode(' K7M2 ')).toBe('k7m2');
    expect(normalizeRoomCode('k7-m2')).toBe('k7m2');
    expect(normalizeRoomCode('k7')).toBeNull();
    expect(normalizeRoomCode('k7m2x')).toBeNull();
  });

  it('builds the control link that the projector QR encodes', () => {
    expect(controlUrl('k7m2', 'https://192.168.1.10:5173/index.html#/holo/proyector/k7m2')).toBe('https://192.168.1.10:5173/index.html#/holo/control/k7m2');
  });
});

describe('ActionCoalescer (low latency without flooding the relay)', () => {
  it('merges rotations and zooms between flushes, sends discrete actions at once', () => {
    const sent: unknown[] = [];
    const c = new ActionCoalescer((a) => sent.push(a));
    c.push({ type: 'rotate', dx: 0.1, dy: 0 });
    c.push({ type: 'rotate', dx: 0.2, dy: -0.1 });
    c.push({ type: 'zoom', factor: 1.1 });
    c.push({ type: 'zoom', factor: 1.1 });
    c.push({ type: 'pause' });
    expect(sent).toEqual([{ type: 'pause' }]);
    c.flush();
    expect(sent).toHaveLength(3);
    expect(sent[1]).toMatchObject({ type: 'rotate' });
    expect((sent[1] as { dx: number }).dx).toBeCloseTo(0.3, 10);
    expect((sent[2] as { factor: number }).factor).toBeCloseTo(1.21, 10);
    c.flush();
    expect(sent).toHaveLength(3);
  });
});

describe('ConfirmationTracker (visible confirmation on the control phone)', () => {
  it('confirms the oldest pending action with its round-trip latency', () => {
    const t = new ConfirmationTracker();
    t.sent({ type: 'pause' }, 1000);
    expect(t.confirm('Pausa', 1042)).toEqual({ label: 'Pausa', latencyMs: 42 });
    expect(t.confirm('Pausa', 1100)).toBeNull();
  });

  it('matches by label and forgets stale actions', () => {
    const t = new ConfirmationTracker(2000);
    t.sent({ type: 'rotate', dx: 1, dy: 0 }, 0);
    t.sent({ type: 'release' }, 10);
    expect(t.confirm('Soltar el péndulo', 60)).toEqual({ label: 'Soltar el péndulo', latencyMs: 50 });
    expect(t.confirm('Girar', 5000)).toBeNull();
  });
});

describe('DiscreteGate (no double-fired orders)', () => {
  it('lets the same discrete order through once per window', () => {
    const g = new DiscreteGate(600);
    expect(g.allow({ type: 'release' }, 0)).toBe(true);
    expect(g.allow({ type: 'release' }, 300)).toBe(false);
    expect(g.allow({ type: 'release' }, 700)).toBe(true);
  });

  it('does not hold back a different order or the continuous gestures', () => {
    const g = new DiscreteGate(600);
    expect(g.allow({ type: 'pause' }, 0)).toBe(true);
    expect(g.allow({ type: 'release' }, 10)).toBe(true);
    expect(g.allow({ type: 'rotate', dx: 0.1, dy: 0 }, 20)).toBe(true);
    expect(g.allow({ type: 'rotate', dx: 0.1, dy: 0 }, 21)).toBe(true);
    expect(g.allow({ type: 'variable', variable: 'longitud', value: 1 }, 30)).toBe(true);
    expect(g.allow({ type: 'variable', variable: 'longitud', value: 2 }, 40)).toBe(true);
    expect(g.allow({ type: 'variable', variable: 'longitud', value: 2 }, 50)).toBe(false);
  });
});

describe('EchoFilter (same message over BroadcastChannel and the relay)', () => {
  const rot = { type: 'gesture', dx: 0.1, dy: 0, dz: 1, from: 'control' } as const;

  it('drops the copy that arrives over the second transport', () => {
    const f = new EchoFilter(500);
    expect(f.accept(rot, 'bc', 0)).toBe(true);
    expect(f.accept(rot, 'ws', 40)).toBe(false);
  });

  it('keeps repeated messages from the same transport (two equal rotation steps are two steps)', () => {
    const f = new EchoFilter(500);
    expect(f.accept(rot, 'bc', 0)).toBe(true);
    expect(f.accept(rot, 'bc', 16)).toBe(true);
    // Each relay copy cancels one local copy, no more.
    expect(f.accept(rot, 'ws', 30)).toBe(false);
    expect(f.accept(rot, 'ws', 46)).toBe(false);
    expect(f.accept(rot, 'ws', 60)).toBe(true);
  });

  it('forgets after the window, so a late identical order still counts', () => {
    const f = new EchoFilter(500);
    expect(f.accept(rot, 'bc', 0)).toBe(true);
    expect(f.accept(rot, 'ws', 900)).toBe(true);
  });
});
