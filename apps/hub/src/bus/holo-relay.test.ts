import { describe, expect, it } from 'vitest';
import { HoloRelay, normalizeRoom, type RelayOut } from './holo-relay.ts';

const hello = (role: 'display' | 'control' | 'panel', room: string, clientId: string) => ({ type: 'hello', role, room, clientId });
const state = { type: 'state', state: { scene: 'pendulo', running: true, variables: { longitud: 0.6 } } };
const gesture = { type: 'gesture', dx: 1, dy: 0, dz: 0, from: 'control' };
const to = (out: RelayOut[], conn: string) => out.filter((o) => o.kind === 'send' && o.to === conn).map((o) => (o.kind === 'send' ? o.msg : null));

describe('normalizeRoom', () => {
  it('matches the legacy client: lowercase, [a-z0-9-], max 24, default aula', () => {
    expect(normalizeRoom('  K7Q-2M! ')).toBe('k7q-2m');
    expect(normalizeRoom('')).toBe('aula');
    expect(normalizeRoom('x'.repeat(40))).toHaveLength(24);
  });
});

describe('HoloRelay', () => {
  it('creates short unambiguous room codes that are unique', () => {
    const relay = new HoloRelay();
    const codes = new Set(Array.from({ length: 200 }, () => relay.createRoom()));
    expect(codes.size).toBe(200);
    for (const c of codes) expect(c).toMatch(/^[a-hjkmnp-z2-9]{5}$/);
  });

  it('announces peers to the whole room on join and leave', () => {
    const relay = new HoloRelay();
    relay.receive('p', hello('display', 'abc', 'p1'));
    const out = relay.receive('c', hello('control', 'ABC', 'c1'));
    expect(to(out, 'p')).toEqual([{ type: 'peers', roles: ['display', 'control'] }]);
    expect(to(out, 'c')).toEqual([{ type: 'peers', roles: ['display', 'control'] }]);
    const gone = relay.leave('c');
    expect(to(gone, 'p')).toEqual([{ type: 'peers', roles: ['display'] }]);
  });

  it('forwards control gestures to the projector of the same room only', () => {
    const relay = new HoloRelay();
    relay.receive('p', hello('display', 'abc', 'p1'));
    relay.receive('c', hello('control', 'abc', 'c1'));
    relay.receive('x', hello('display', 'other', 'x1'));
    const out = relay.receive('c', gesture);
    expect(to(out, 'p')).toEqual([gesture]);
    expect(to(out, 'c')).toEqual([]);
    expect(to(out, 'x')).toEqual([]);
  });

  it('replays the last projector state to a control that (re)joins', () => {
    const relay = new HoloRelay();
    relay.receive('p', hello('display', 'abc', 'p1'));
    relay.receive('p', state);
    const out = relay.receive('c', hello('control', 'abc', 'c1'));
    expect(to(out, 'c')).toContainEqual(state);
  });

  it('replaces a ghost connection when the same client reconnects', () => {
    const relay = new HoloRelay();
    relay.receive('c-old', hello('control', 'abc', 'c1'));
    relay.receive('p', hello('display', 'abc', 'p1'));
    const out = relay.receive('c-new', hello('control', 'abc', 'c1'));
    expect(out).toContainEqual({ kind: 'close', to: 'c-old' });
    expect(to(out, 'p')).toEqual([{ type: 'peers', roles: ['display', 'control'] }]);
    expect(relay.room('abc')).toEqual({ room: 'abc', roles: ['display', 'control'] });
  });

  it('drops invalid messages, messages before hello and free-form junk', () => {
    const relay = new HoloRelay();
    expect(relay.receive('c', gesture)).toEqual([]);
    relay.receive('p', hello('display', 'abc', 'p1'));
    relay.receive('c', hello('control', 'abc', 'c1'));
    expect(relay.receive('c', { type: 'gesture', dx: 'a' })).toEqual([]);
    expect(relay.receive('c', 'garbage')).toEqual([]);
    expect(relay.stats().invalid).toBe(3);
  });

  it('still relays the legacy learning event without persisting it', () => {
    const relay = new HoloRelay();
    relay.receive('p', hello('display', 'abc', 'p1'));
    relay.receive('c', hello('control', 'abc', 'c1'));
    const legacy = { type: 'event', event: { t: 1 } };
    expect(to(relay.receive('c', legacy), 'p')).toEqual([legacy]);
  });

  it('forgets an empty room state after everyone leaves', () => {
    const relay = new HoloRelay();
    relay.receive('p', hello('display', 'abc', 'p1'));
    relay.receive('p', state);
    relay.leave('p');
    expect(relay.room('abc')).toEqual({ room: 'abc', roles: [] });
    expect(to(relay.receive('c', hello('control', 'abc', 'c1')), 'c')).not.toContainEqual(state);
  });
});
