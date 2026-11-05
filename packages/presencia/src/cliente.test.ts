import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReconnectingSocket, type SocketLike } from './cliente.ts';

class FakeSocket implements SocketLike {
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
    this.onclose?.();
  }
  open() {
    this.onopen?.();
  }
  drop() {
    this.onclose?.();
  }
  message(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

describe('ReconnectingSocket', () => {
  let sockets: FakeSocket[];
  const open = () => {
    const s = new FakeSocket();
    sockets.push(s);
    return s;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
  });
  afterEach(() => vi.useRealTimers());

  it('says hello again on every (re)connection', () => {
    const client = new ReconnectingSocket({ open, onOpen: (send) => send({ type: 'hello', room: 'abc123' }), random: () => 1 });
    sockets[0]!.open();
    expect(sockets[0]!.sent).toEqual(['{"type":"hello","room":"abc123"}']);
    expect(client.connected).toBe(true);
    sockets[0]!.drop();
    expect(client.connected).toBe(false);
    vi.advanceTimersByTime(500);
    sockets[1]!.open();
    expect(sockets[1]!.sent).toEqual(['{"type":"hello","room":"abc123"}']);
  });

  it('backs off exponentially up to the maximum and resets after a successful open', () => {
    new ReconnectingSocket({ open, onOpen: () => {}, minDelayMs: 500, maxDelayMs: 2000, random: () => 1 });
    sockets[0]!.drop();
    vi.advanceTimersByTime(499);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);
    sockets[1]!.drop();
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(3);
    sockets[2]!.drop();
    vi.advanceTimersByTime(2000);
    expect(sockets).toHaveLength(4);
    sockets[3]!.drop();
    vi.advanceTimersByTime(2000); // capped
    expect(sockets).toHaveLength(5);
    sockets[4]!.open();
    sockets[4]!.drop();
    vi.advanceTimersByTime(500); // reset
    expect(sockets).toHaveLength(6);
  });

  it('decodes JSON messages and ignores garbage', () => {
    const got: unknown[] = [];
    new ReconnectingSocket({ open, onOpen: () => {}, onMessage: (m) => got.push(m) });
    sockets[0]!.open();
    sockets[0]!.message({ type: 'peers', roles: [] });
    sockets[0]!.onmessage?.({ data: 'not json' });
    expect(got).toEqual([{ type: 'peers', roles: [] }]);
  });

  it('reconnects when the link goes silent longer than staleMs', () => {
    new ReconnectingSocket({ open, onOpen: () => {}, staleMs: 5000, minDelayMs: 100, random: () => 1 });
    sockets[0]!.open();
    vi.advanceTimersByTime(4000);
    sockets[0]!.message({ type: 'peers', roles: [] });
    vi.advanceTimersByTime(4000);
    expect(sockets[0]!.closed).toBe(false);
    vi.advanceTimersByTime(1500);
    expect(sockets[0]!.closed).toBe(true);
    vi.advanceTimersByTime(100);
    expect(sockets).toHaveLength(2);
  });

  it('does not send while disconnected and stops for good on close()', () => {
    const client = new ReconnectingSocket({ open, onOpen: () => {} });
    expect(client.send({ type: 'x' })).toBe(false);
    sockets[0]!.open();
    expect(client.send({ type: 'x' })).toBe(true);
    client.close();
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);
  });

  it('retries when opening the socket throws', () => {
    let fail = true;
    new ReconnectingSocket({
      open: () => {
        if (fail) {
          fail = false;
          throw new Error('bad url');
        }
        return open();
      },
      onOpen: () => {},
      minDelayMs: 100,
      random: () => 1,
    });
    expect(sockets).toHaveLength(0);
    vi.advanceTimersByTime(100);
    expect(sockets).toHaveLength(1);
  });
});
