import { describe, expect, it } from 'vitest';
import { ActionCoalescer, ConfirmationTracker, controlUrl, newRoomCode, normalizeRoomCode } from './room.ts';

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
