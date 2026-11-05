import { describe, expect, it } from 'vitest';
import { MAX_EVENTOS_POR_LOTE, MensajeSync } from '@rikuy/contracts';
import { SqliteEventLog } from '../log/sqlite-log.ts';
import { CLASE, device, evento, eventos } from '../testing/eventos.ts';
import { SyncHub, type SyncOut } from './sync-hub.ts';

const hola = (vv = {}) => ({ t: 'hola', claseId: CLASE, vv, capacidades: ['ws'] });
const delta = (evs: unknown[], ultimo = true) => ({ t: 'delta', claseId: CLASE, eventos: evs, ultimo });
const msgs = (out: SyncOut[], to: string) => out.filter((o) => o.to === to).map((o) => MensajeSync.parse(o.msg));

function setup(verify?: (e: unknown) => boolean) {
  const log = new SqliteEventLog(':memory:');
  return { log, hub: new SyncHub(log, verify ? { verify } : {}) };
}

describe('SyncHub (protocol 3.5, hub side)', () => {
  it('answers HOLA with the DELTA the peer lacks, in batches, then ACK with the hub vector', () => {
    const { log, hub } = setup();
    log.append(eventos(1, 1, MAX_EVENTOS_POR_LOTE + 10));
    const out = msgs(hub.receive('a', hola({ [device(1)]: 5 })), 'a');
    expect(out.map((m) => m.t)).toEqual(['delta', 'delta', 'ack']);
    const [d1, d2, ack] = out;
    expect(d1!.t === 'delta' && d1!.eventos.length).toBe(MAX_EVENTOS_POR_LOTE);
    expect(d2!.t === 'delta' && [d2!.eventos.length, d2!.ultimo]).toEqual([5, true]);
    expect(ack).toEqual({ t: 'ack', claseId: CLASE, vv: { [device(1)]: MAX_EVENTOS_POR_LOTE + 10 } });
  });

  it('sends an empty last DELTA when the peer is up to date', () => {
    const { hub } = setup();
    expect(msgs(hub.receive('a', hola()), 'a')).toEqual([
      { t: 'delta', claseId: CLASE, eventos: [], ultimo: true },
      { t: 'ack', claseId: CLASE, vv: {} },
    ]);
  });

  it('ingests a DELTA, ACKs the new vector and pushes the new events to other peers of the class', () => {
    const { log, hub } = setup();
    hub.receive('a', hola());
    hub.receive('b', hola());
    const out = hub.receive('a', delta(eventos(1, 1, 3)));
    expect(msgs(out, 'a')).toEqual([{ t: 'ack', claseId: CLASE, vv: { [device(1)]: 3 } }]);
    const toB = msgs(out, 'b');
    expect(toB).toHaveLength(1);
    expect(toB[0]!.t === 'delta' && toB[0]!.eventos.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(log.count(CLASE)).toBe(3);
  });

  it('is idempotent: re-sending a DELTA stores nothing new and pushes nothing', () => {
    const { log, hub } = setup();
    hub.receive('a', hola());
    hub.receive('b', hola());
    hub.receive('a', delta(eventos(1, 1, 3)));
    const out = hub.receive('a', delta(eventos(1, 1, 3)));
    expect(msgs(out, 'b')).toEqual([]);
    expect(log.count(CLASE)).toBe(3);
    expect(hub.stats().duplicates).toBe(3);
  });

  it('drops (and counts) invalid events, events of another class, unsigned authority events and failed MACs', () => {
    const { log, hub } = setup((e) => (e as { mac?: string }).mac !== 'bad');
    hub.receive('a', hola());
    hub.receive('a', delta([
      evento(1, 1),
      evento(1, 2, { datos: { grupoId: 'x' } }), // datos invalid for its tipo
      evento(1, 3, { claseId: '01JC0000000000000000000C02' }),
      evento(1, 4, { tipo: 'practica.retirada', datos: { practicaId: CLASE, version: 1 } }), // authority, no firma
      evento(1, 5, { mac: 'bad' }),
    ]));
    expect(log.count(CLASE)).toBe(1);
    expect(hub.stats().rejected).toBe(4);
  });

  it('ignores a DELTA before HOLA and malformed messages', () => {
    const { log, hub } = setup();
    expect(hub.receive('a', delta(eventos(1, 1, 2)))).toEqual([]);
    expect(hub.receive('a', { t: 'hola' })).toEqual([]);
    expect(log.count(CLASE)).toBe(0);
    expect(hub.stats().invalid).toBe(2);
  });

  it('notifies listeners of accepted events (live panel)', () => {
    const { hub } = setup();
    const seen: string[] = [];
    hub.onAccepted((claseId, evs) => seen.push(`${claseId}:${evs.length}`));
    hub.receive('a', hola());
    hub.receive('a', delta(eventos(1, 1, 2)));
    expect(seen).toEqual([`${CLASE}:2`]);
  });
});
