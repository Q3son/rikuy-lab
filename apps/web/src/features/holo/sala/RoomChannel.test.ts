import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoomChannel, type SocketLike } from './RoomChannel.ts';

class FakeSocket implements SocketLike {
  static OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  send(s: string) {
    this.sent.push(s);
  }
  close() {
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
}

afterEach(() => vi.useRealTimers());

describe('RoomChannel (BroadcastChannel locally + the WebSocket relay if available)', () => {
  it('delivers between two pages of the same device through BroadcastChannel', async () => {
    const a = new RoomChannel('k7m2', 'display', { socket: null });
    const b = new RoomChannel('k7m2', 'control', { socket: null });
    const got = new Promise((r) => a.on(r));
    b.send({ type: 'command', commands: [{ tool: 'pausar', args: {} }], from: 'control' });
    expect(await got).toEqual({ type: 'command', commands: [{ tool: 'pausar', args: {} }], from: 'control' });
    a.close();
    b.close();
  });

  it('says hello to the relay and mirrors every message to it', () => {
    const socket = new FakeSocket();
    const statuses: string[] = [];
    const ch = new RoomChannel('k7m2', 'control', { socket: () => socket });
    ch.onStatus = (s) => statuses.push(s);
    socket.open();
    expect(JSON.parse(socket.sent[0])).toMatchObject({ type: 'hello', role: 'control', room: 'k7m2' });
    ch.send({ type: 'gesture', dx: 0.1, dy: 0, dz: 1, from: 'control' });
    expect(JSON.parse(socket.sent[1])).toMatchObject({ type: 'gesture' });
    expect(statuses).toEqual(['online']);
    ch.close();
  });

  it('dispatches relay messages and ignores garbage', () => {
    const socket = new FakeSocket();
    const ch = new RoomChannel('k7m2', 'display', { socket: () => socket });
    const got: unknown[] = [];
    ch.on((m) => got.push(m));
    socket.open();
    socket.onmessage?.({ data: '{"type":"peers","roles":["display","control"]}' });
    socket.onmessage?.({ data: 'not json' });
    expect(got).toEqual([{ type: 'peers', roles: ['display', 'control'] }]);
    ch.close();
  });

  it('keeps working locally and retries when the relay is down', () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const ch = new RoomChannel('k7m2', 'display', { socket: () => (sockets.push(new FakeSocket()), sockets.at(-1)!) });
    sockets[0].close();
    expect(ch.status).toBe('local');
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
    ch.close();
  });
});
