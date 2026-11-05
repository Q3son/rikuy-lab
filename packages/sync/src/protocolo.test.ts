import type { MensajeSync } from '@rikuy/contracts';
import { dispositivos, ids } from '@rikuy/contracts/fixtures';
import { describe, expect, it } from 'vitest';
import { ingest } from './ingesta.ts';
import { createMemoryRepository } from './memoria.ts';
import { attachSyncPeer } from './protocolo.ts';
import { createEventWriter } from './registro.ts';
import { fakeClassKeys, fakeCripto, manualClock, seededRandom } from './testing/index.ts';
import { createMemoryPair } from './transportes/memoria.ts';

const keys = fakeClassKeys();
const ctx = { claseId: ids.clase, claveMac: keys.claveMac, clavePub: keys.clavePub };

async function peer(dispositivo: string, n: number) {
  const repo = createMemoryRepository();
  const w = createEventWriter({ claseId: ids.clase, dispositivo, repo, cripto: fakeCripto, claveMac: keys.claveMac, clock: manualClock(), random: seededRandom(dispositivo) });
  for (let i = 0; i < n; i++) await w.append('pista.mostrada', { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 + (i % 4) });
  return { repo, accept: (evs: unknown[]) => ingest(repo, evs, ctx, fakeCripto) };
}

describe('sync protocol (HOLA -> DELTA both ways -> ACK)', () => {
  it('two peers converge to the union of their logs', async () => {
    const a = await peer(dispositivos.grupo1, 3);
    const b = await peer(dispositivos.grupo2, 5);
    const [sa, sb] = createMemoryPair();
    const pa = attachSyncPeer(sa, { claseId: ids.clase, ...a, batchSize: 2 });
    const pb = attachSyncPeer(sb, { claseId: ids.clase, ...b, batchSize: 2 });
    await pa.start();
    await Promise.all([pa.finished, pb.finished]);
    const vv = { [dispositivos.grupo1]: 3, [dispositivos.grupo2]: 5 };
    expect(await a.repo.vector(ids.clase)).toEqual(vv);
    expect(await b.repo.vector(ids.clase)).toEqual(vv);
  });

  it('sends DELTA batches of at most batchSize events and flags the last one', async () => {
    const a = await peer(dispositivos.grupo1, 5);
    const b = await peer(dispositivos.grupo2, 0);
    const [sa, sb] = createMemoryPair();
    const seen: MensajeSync[] = [];
    sb.recibir((m) => seen.push(m));
    attachSyncPeer(sa, { claseId: ids.clase, ...a, batchSize: 2 });
    const pb = attachSyncPeer(sb, { claseId: ids.clase, ...b });
    await pb.start();
    await pb.finished;
    const deltas = seen.filter((m) => m.t === 'delta');
    expect(deltas.map((d) => (d.t === 'delta' ? [d.eventos.length, !!d.ultimo] : null))).toEqual([[2, false], [2, false], [1, true]]);
  });

  it('remembers the peer vector from HOLA and ACK', async () => {
    const a = await peer(dispositivos.grupo1, 2);
    const b = await peer(dispositivos.grupo2, 1);
    const [sa, sb] = createMemoryPair();
    const vectors: unknown[] = [];
    const pa = attachSyncPeer(sa, { claseId: ids.clase, ...a, onPeerVector: (vv) => vectors.push(vv) });
    const pb = attachSyncPeer(sb, { claseId: ids.clase, ...b });
    await pa.start();
    await Promise.all([pa.finished, pb.finished]);
    expect(vectors.at(-1)).toEqual({ [dispositivos.grupo1]: 2, [dispositivos.grupo2]: 1 });
  });

  it('ignores messages of another class', async () => {
    const a = await peer(dispositivos.grupo1, 1);
    const [sa, sb] = createMemoryPair();
    attachSyncPeer(sa, { claseId: ids.clase, ...a });
    const got: MensajeSync[] = [];
    sb.recibir((m) => got.push(m));
    await sb.enviar({ t: 'hola', claseId: ids.aula, vv: {}, capacidades: [] });
    await new Promise((r) => setTimeout(r, 10));
    expect(got).toEqual([]);
  });
});
