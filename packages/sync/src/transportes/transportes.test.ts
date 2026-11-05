import type { MensajeSync } from '@rikuy/contracts';
import { dispositivos, ids } from '@rikuy/contracts/fixtures';
import { describe, expect, it } from 'vitest';
import { encodeFrames } from '../codec/rk1.ts';
import { ingest } from '../ingesta.ts';
import { createMemoryRepository } from '../memoria.ts';
import { attachSyncPeer } from '../protocolo.ts';
import { createEventWriter } from '../registro.ts';
import { fakeClassKeys, fakeCripto, manualClock, seededRandom } from '../testing/index.ts';
import { createBroadcastTransport } from './broadcast.ts';
import { createQrTransport, type QrDisplay, type QrReader } from './qr.ts';
import { createWebRtcTransport, type Signaling } from './webrtc.ts';

const keys = fakeClassKeys();
const ctx = { claseId: ids.clase, claveMac: keys.claveMac, clavePub: keys.clavePub };
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

async function peer(dispositivo: string, n: number) {
  const repo = createMemoryRepository();
  const w = createEventWriter({ claseId: ids.clase, dispositivo, repo, cripto: fakeCripto, claveMac: keys.claveMac, clock: manualClock(), random: seededRandom(dispositivo) });
  for (let i = 0; i < n; i++) await w.append('pista.mostrada', { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 + (i % 4) });
  return { claseId: ids.clase, repo, accept: (evs: unknown[]) => ingest(repo, evs, ctx, fakeCripto) };
}

describe('broadcast transport (same-device tabs)', () => {
  it('two tabs sync through BroadcastChannel', async () => {
    const a = await peer(dispositivos.grupo1, 2);
    const b = await peer(dispositivos.grupo2, 3);
    const t = createBroadcastTransport({ prefix: `test-${Math.random()}` });
    expect(t.id).toBe('broadcast');
    const [sa, sb] = await Promise.all([t.abrir(ids.clase), t.abrir(ids.clase)]);
    const pa = attachSyncPeer(sa, a);
    const pb = attachSyncPeer(sb, b);
    await pa.start();
    await Promise.all([pa.finished, pb.finished]);
    expect(await a.repo.vector(ids.clase)).toEqual(await b.repo.vector(ids.clase));
    sa.cerrar();
    sb.cerrar();
  });

  it('drops malformed messages', async () => {
    const name = `test-${Math.random()}`;
    const t = createBroadcastTransport({ prefix: name });
    const s = await t.abrir(ids.clase);
    const got: MensajeSync[] = [];
    s.recibir((m) => got.push(m));
    const raw = new BroadcastChannel(`${name}:${ids.clase}`);
    raw.postMessage({ t: 'delta', claseId: 'nope' });
    raw.postMessage('basura');
    await tick(20);
    expect(got).toEqual([]);
    raw.close();
    s.cerrar();
  });
});

/** Fake screen + camera: whatever one side shows, the other reads frame by frame (in a loop). */
function opticalLink() {
  const screens: Record<'A' | 'B', string[]> = { A: [], B: [] };
  const readers: Record<'A' | 'B', Set<(t: string) => void>> = { A: new Set(), B: new Set() };
  const display = (me: 'A' | 'B'): QrDisplay => ({ show: (frames) => void (screens[me] = frames), clear: () => void (screens[me] = []) });
  const reader = (me: 'A' | 'B'): QrReader => ({ subscribe: (h) => (readers[me].add(h), () => readers[me].delete(h)) });
  /** The camera of `me` looks at the other screen for one full loop (reversed + repeated, as a shaky hand would). */
  const look = (me: 'A' | 'B') => {
    const other = screens[me === 'A' ? 'B' : 'A'];
    for (const f of [...other].reverse().concat(other)) for (const h of readers[me]) h(f);
  };
  return { display, reader, look, screens };
}

describe('QR transport (T0, camera <-> screen)', () => {
  it('group shows E frames, teacher reads them and shows a single A frame back', async () => {
    const group = await peer(dispositivos.grupo1, 40);
    const teacher = await peer(dispositivos.docente, 0);
    const link = opticalLink();
    const g = await createQrTransport({ display: link.display('A'), reader: link.reader('A'), emisor: dispositivos.grupo1, now: () => '1762300805000-0001-grupo001' }).abrir(ids.clase);
    const t = await createQrTransport({ display: link.display('B'), reader: link.reader('B'), emisor: dispositivos.docente, now: () => '1762300805000-0001-docente1' }).abrir(ids.clase);

    const deltas: MensajeSync[] = [];
    t.recibir(async (m) => {
      deltas.push(m);
      if (m.t === 'delta') {
        await teacher.accept(m.eventos);
        await t.enviar({ t: 'ack', claseId: ids.clase, vv: await teacher.repo.vector(ids.clase) });
      }
    });
    const acks: MensajeSync[] = [];
    g.recibir((m) => acks.push(m));

    const evs = await group.repo.all(ids.clase);
    await g.enviar({ t: 'delta', claseId: ids.clase, eventos: evs.slice(0, 20), ultimo: false });
    await g.enviar({ t: 'delta', claseId: ids.clase, eventos: evs.slice(20), ultimo: true });
    expect(link.screens.A.length).toBeGreaterThan(1);
    expect(link.screens.A.every((f) => f.startsWith('RK1:E:'))).toBe(true);

    link.look('B');
    await tick();
    expect(deltas.filter((m) => m.t === 'delta')).toHaveLength(1);
    expect(await teacher.repo.vector(ids.clase)).toEqual({ [dispositivos.grupo1]: 40 });
    expect(link.screens.B).toHaveLength(1);
    expect(link.screens.B[0]).toMatch(/^RK1:A:/);

    link.look('A');
    await tick();
    expect(acks).toEqual([{ t: 'ack', claseId: ids.clase, vv: { [dispositivos.grupo1]: 40 } }]);
  });

  it('ignores frames of another class and keeps reading after them', async () => {
    const link = opticalLink();
    const t = await createQrTransport({ display: link.display('B'), reader: link.reader('B'), emisor: dispositivos.docente, now: () => '1762300805000-0001-docente1' }).abrir(ids.clase);
    const got: MensajeSync[] = [];
    t.recibir((m) => got.push(m));
    link.screens.A = encodeFrames({ v: 1, tipo: 'ack', claseId: ids.aula, emisor: 'X', creado: '1762300805000-0001-grupo001', cuerpo: { vv: {} } }).frames;
    link.look('B');
    await tick();
    expect(got).toEqual([]);
  });
});

/** Minimal in-memory fake of two RTCPeerConnections joined once both descriptions are set. */
function fakeRtc() {
  const peers: FakePeer[] = [];
  class FakeChannel {
    readyState = 'connecting';
    onopen: (() => void) | null = null;
    onmessage: ((e: { data: string }) => void) | null = null;
    other?: FakeChannel;
    constructor(readonly label: string) {}
    send(data: string) {
      setTimeout(() => this.other?.onmessage?.({ data }), 0);
    }
    close() {
      this.readyState = 'closed';
    }
    open() {
      this.readyState = 'open';
      this.onopen?.();
    }
  }
  class FakePeer {
    iceGatheringState = 'new';
    localDescription: { type: string; sdp: string } | null = null;
    remote: { type: string; sdp: string } | null = null;
    ondatachannel: ((e: { channel: FakeChannel }) => void) | null = null;
    onicegatheringstatechange: (() => void) | null = null;
    channel?: FakeChannel;
    constructor() {
      peers.push(this);
    }
    createDataChannel(label: string) {
      return (this.channel = new FakeChannel(label));
    }
    async createOffer() {
      return { type: 'offer', sdp: `v=0 offer ${peers.indexOf(this)}` };
    }
    async createAnswer() {
      return { type: 'answer', sdp: `v=0 answer ${peers.indexOf(this)}` };
    }
    async setLocalDescription(d: { type: string; sdp: string }) {
      this.localDescription = d;
      setTimeout(() => {
        this.iceGatheringState = 'complete';
        this.onicegatheringstatechange?.();
      }, 1);
      this.maybeConnect();
    }
    async setRemoteDescription(d: { type: string; sdp: string }) {
      this.remote = d;
      this.maybeConnect();
    }
    maybeConnect() {
      const [a, b] = peers;
      if (!a?.localDescription || !a.remote || !b?.localDescription || !b.remote || !a.channel || b.channel) return;
      const theirs = new FakeChannel(a.channel.label);
      b.channel = theirs;
      a.channel.other = theirs;
      theirs.other = a.channel;
      setTimeout(() => {
        b.ondatachannel?.({ channel: theirs });
        a.channel!.open();
        theirs.open();
      }, 2);
    }
    close() {}
  }
  return () => new FakePeer() as unknown as RTCPeerConnection;
}

describe('WebRTC transport (T1, experimental)', () => {
  it('exchanges SDP through a signaling port and syncs over the data channel', async () => {
    const create = fakeRtc();
    const toAnswerer: string[] = [];
    const toOfferer: string[] = [];
    const wait = async (q: string[]) => {
      while (!q.length) await tick(1);
      return q.shift()!;
    };
    const sigOfferer: Signaling = { send: async (s) => void toAnswerer.push(s), receive: () => wait(toOfferer) };
    const sigAnswerer: Signaling = { send: async (s) => void toOfferer.push(s), receive: () => wait(toAnswerer) };
    const offerer = createWebRtcTransport({ role: 'offerer', signaling: sigOfferer, createPeer: create });
    const answerer = createWebRtcTransport({ role: 'answerer', signaling: sigAnswerer, createPeer: create });
    expect(offerer.id).toBe('webrtc');
    const sent: string[] = [];
    const spy: Signaling = { send: async (s) => (sent.push(s), sigOfferer.send(s)), receive: sigOfferer.receive };
    const [so, sa] = await Promise.all([
      createWebRtcTransport({ role: 'offerer', signaling: spy, createPeer: create }).abrir(ids.clase),
      answerer.abrir(ids.clase),
    ]);
    expect(JSON.parse(sent[0])).toMatchObject({ type: 'offer', claseId: ids.clase });

    const a = await peer(dispositivos.grupo1, 3);
    const b = await peer(dispositivos.docente, 0);
    const pa = attachSyncPeer(so, a);
    const pb = attachSyncPeer(sa, b);
    await pa.start();
    await Promise.all([pa.finished, pb.finished]);
    expect(await b.repo.vector(ids.clase)).toEqual({ [dispositivos.grupo1]: 3 });
    so.cerrar();
    sa.cerrar();
  });
});
