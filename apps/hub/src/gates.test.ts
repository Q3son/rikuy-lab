/**
 * F8 gates (5.4) that run in CI:
 *  - 8 simulated clients sync 1,000 events through the hub and converge;
 *  - a hub restart loses no events;
 *  - with Ollama down, the tutor answers by rules in under 1 s.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MAX_EVENTOS_POR_LOTE, type Evento, type MensajeSync, type VectorVersion } from '@rikuy/contracts';
import { OllamaModel } from './ia/ollama.ts';
import { createHub, type RunningHub } from './server.ts';
import { CLASE, eventos } from './testing/eventos.ts';
import { connect, is } from './testing/ws-client.ts';

/** A device with its own local log, speaking protocol 3.5 over the hub WebSocket. */
class SimPeer {
  readonly events = new Map<string, Evento>();

  constructor(own: Evento[] = []) {
    for (const e of own) this.events.set(e.id, e);
  }

  vv(): VectorVersion {
    const seqs = new Map<string, Set<number>>();
    for (const e of this.events.values()) {
      const s = seqs.get(e.dispositivo) ?? new Set<number>();
      s.add(e.seq);
      seqs.set(e.dispositivo, s);
    }
    const vv: VectorVersion = {};
    for (const [d, s] of seqs) {
      let n = 0;
      while (s.has(n + 1)) n++;
      vv[d] = n;
    }
    return vv;
  }

  async session(wsUrl: string): Promise<void> {
    const c = await connect(wsUrl);
    c.ws.addEventListener('message', (ev) => {
      const m = JSON.parse(String(ev.data)) as MensajeSync;
      if (m.t === 'delta') for (const e of m.eventos) this.events.set(e.id, e);
    });
    c.send({ t: 'hola', claseId: CLASE, vv: this.vv(), capacidades: ['ws'] });
    const ack = await c.next<Extract<MensajeSync, { t: 'ack' }>>(is('t', 'ack'), 10_000);
    const lacking = [...this.events.values()].filter((e) => e.seq > (ack.vv[e.dispositivo] ?? 0));
    for (let i = 0; i < lacking.length; i += MAX_EVENTOS_POR_LOTE) {
      const last = i + MAX_EVENTOS_POR_LOTE >= lacking.length;
      c.send({ t: 'delta', claseId: CLASE, eventos: lacking.slice(i, i + MAX_EVENTOS_POR_LOTE), ultimo: last });
      await c.next(is('t', 'ack'), 10_000);
    }
    c.close();
    await c.closed;
  }
}

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  for (const f of cleanups.splice(0).reverse()) await f();
});

async function startHub(dbPath: string, extra: Partial<Parameters<typeof createHub>[0]> = {}): Promise<RunningHub> {
  const hub = await createHub({ dbPath, ...extra }).listen(0, '127.0.0.1');
  let closed = false;
  cleanups.push(async () => {
    if (!closed) await hub.close();
  });
  const close = hub.close;
  hub.close = async () => {
    closed = true;
    await close();
  };
  return hub;
}

function tempDb(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rikuy-gate-'));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, 'hub.sqlite');
}

describe('F8 gates', () => {
  it('8 simulated clients sync 1,000 events and converge', async () => {
    const hub = await startHub(':memory:');
    const url = `ws://127.0.0.1:${hub.port}/ws`;
    const peers = Array.from({ length: 8 }, (_, i) => new SimPeer(eventos(i + 1, 1, 125)));
    await Promise.all(peers.map((p) => p.session(url))); // concurrent push (+ live pushes)
    await Promise.all(peers.map((p) => p.session(url))); // pull what is still missing

    const reference = [...peers[0]!.events.keys()].sort();
    expect(reference).toHaveLength(1000);
    for (const p of peers) expect([...p.events.keys()].sort()).toEqual(reference);
    const vv = peers[0]!.vv();
    expect(Object.values(vv)).toEqual(Array(8).fill(125));
    const res = await fetch(`http://127.0.0.1:${hub.port}/sync`, {
      method: 'POST',
      body: JSON.stringify({ t: 'hola', claseId: CLASE, vv, capacidades: ['http'] }),
    });
    expect(await res.json()).toEqual([
      { t: 'delta', claseId: CLASE, eventos: [], ultimo: true },
      { t: 'ack', claseId: CLASE, vv },
    ]);
  }, 30_000);

  it('a hub restart loses no events', async () => {
    const db = tempDb();
    const first = await startHub(db);
    const writers = Array.from({ length: 4 }, (_, i) => new SimPeer(eventos(i + 1, 1, 250)));
    await Promise.all(writers.map((p) => p.session(`ws://127.0.0.1:${first.port}/ws`)));
    await first.close();

    const second = await startHub(db);
    const newcomer = new SimPeer();
    await newcomer.session(`ws://127.0.0.1:${second.port}/ws`);
    expect(newcomer.events.size).toBe(1000);
    for (const w of writers) for (const id of w.events.keys()) expect(newcomer.events.has(id)).toBe(true);
  }, 30_000);

  it('with Ollama down (connection refused) the tutor answers by rules in under 1 s', async () => {
    const probe = createServer();
    const port: number = await new Promise((r) => probe.listen(0, '127.0.0.1', () => r((probe.address() as { port: number }).port)));
    await new Promise((r) => probe.close(r)); // free port: nothing listens there
    const hub = await startHub(':memory:', { model: new OllamaModel({ baseUrl: `http://127.0.0.1:${port}`, model: 'qwen2.5:3b' }) });
    const t0 = performance.now();
    const res = await fetch(`http://127.0.0.1:${hub.port}/api/tutor`, { method: 'POST', body: JSON.stringify({ texto: 'quiero ver el pendulo' }) });
    const elapsed = performance.now() - t0;
    expect(await res.json()).toMatchObject({ fuente: 'reglas' });
    expect(elapsed).toBeLessThan(1000);
  });

  it('with Ollama unreachable (host accepts but never answers) the tutor answers by rules in under 1 s', async () => {
    const sockets = new Set<Socket>();
    const silent: Server = createServer((s) => sockets.add(s)); // accepts TCP, never replies
    const port: number = await new Promise((r) => silent.listen(0, '127.0.0.1', () => r((silent.address() as { port: number }).port)));
    cleanups.push(
      () =>
        new Promise<void>((r) => {
          for (const s of sockets) s.destroy();
          silent.close(() => r());
        }),
    );
    const hub = await startHub(':memory:', { model: new OllamaModel({ baseUrl: `http://127.0.0.1:${port}`, model: 'qwen2.5:3b' }) });
    const t0 = performance.now();
    const res = await fetch(`http://127.0.0.1:${hub.port}/api/tutor`, { method: 'POST', body: JSON.stringify({ texto: 'dame una pista' }) });
    const elapsed = performance.now() - t0;
    expect(await res.json()).toMatchObject({ fuente: 'reglas' });
    expect(elapsed).toBeLessThan(1000);
    // the breaker is open now: the next answer skips the model entirely
    const t1 = performance.now();
    await fetch(`http://127.0.0.1:${hub.port}/api/tutor`, { method: 'POST', body: JSON.stringify({ texto: 'otra pista' }) });
    expect(performance.now() - t1).toBeLessThan(200);
  });
});
