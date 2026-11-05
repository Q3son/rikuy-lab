/** Test WebSocket client over Node's global WebSocket, with an awaitable message inbox. */
export interface TestClient {
  ws: WebSocket;
  inbox: unknown[];
  send(msg: unknown): void;
  next<T = unknown>(match: (m: unknown) => boolean, timeoutMs?: number): Promise<T>;
  closed: Promise<void>;
  close(): void;
}

export async function connect(url: string): Promise<TestClient> {
  const ws = new WebSocket(url);
  const inbox: unknown[] = [];
  const waiters: Array<{ match: (m: unknown) => boolean; resolve: (m: unknown) => void }> = [];
  ws.onmessage = (ev) => {
    const msg: unknown = JSON.parse(String(ev.data));
    const i = waiters.findIndex((w) => w.match(msg));
    if (i >= 0) waiters.splice(i, 1)[0]!.resolve(msg);
    else inbox.push(msg);
  };
  const closed = new Promise<void>((resolve) => ws.addEventListener('close', () => resolve()));
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error(`cannot connect ${url}`));
  });
  return {
    ws,
    inbox,
    closed,
    send: (msg) => ws.send(JSON.stringify(msg)),
    next<T>(match: (m: unknown) => boolean, timeoutMs = 3000) {
      const i = inbox.findIndex(match);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0] as T);
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout waiting for message')), timeoutMs);
        waiters.push({
          match,
          resolve: (m) => {
            clearTimeout(timer);
            resolve(m as T);
          },
        });
      });
    },
    close: () => ws.close(),
  };
}

export const is = (key: string, value: string) => (m: unknown) =>
  typeof m === 'object' && m !== null && (m as Record<string, unknown>)[key] === value;
