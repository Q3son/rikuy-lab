/**
 * Property tests of 3.5 / 5.4 F2 gate: convergence under any order, duplication and partition of
 * batches; idempotency; no group event can change authority state. >= 1,000 cases each.
 */
import type { Evento } from '@rikuy/contracts';
import { ejemplos, ids } from '@rikuy/contracts/fixtures';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sealEvent } from './firmas.ts';
import { ingest } from './ingesta.ts';
import { createMemoryRepository } from './memoria.ts';
import { project, type EstadoClase } from './proyeccion.ts';
import { attachSyncPeer } from './protocolo.ts';
import { createEventWriter, type EventWriter } from './registro.ts';
import { fakeClassKeys, fakeCripto, manualClock, seededRandom } from './testing/index.ts';
import { createMemoryPair } from './transportes/memoria.ts';
import { lacking } from './vector.ts';

const RUNS = 1000;
const keys = fakeClassKeys();
const impostor = fakeClassKeys('impostor');
const DEVICES = ['DOCENTE001', 'GRUPO00001', 'GRUPO00002', 'GRUPO00003'] as const;
const TEACHER = 0;
const ctx = { claseId: ids.clase, claveMac: keys.claveMac, clavePub: keys.clavePub, docenteDispositivo: DEVICES[TEACHER] };
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const fakeUlid = (prefix: string, n: number) => {
  let s = '';
  for (let x = n; s.length < 6; x = Math.floor(x / 32)) s = B32[x % 32] + s;
  return `01JC${prefix}`.padEnd(20, '0') + s;
};

type Action =
  | { k: 'act'; dev: number; kind: 'medicion' | 'anular' | 'pista' | 'config' | 'switch'; dt: number; pick: number; flag: boolean }
  | { k: 'sync'; from: number; to: number; keep: number[]; dup: number[]; cut: number[]; forge: boolean };

const actionArb: fc.Arbitrary<Action> = fc.oneof(
  { weight: 3, arbitrary: fc.record({
    k: fc.constant('act' as const),
    dev: fc.integer({ min: 0, max: 3 }),
    kind: fc.constantFrom('medicion', 'anular', 'pista', 'config', 'switch'),
    dt: fc.integer({ min: -4000, max: 4000 }),
    pick: fc.nat(),
    flag: fc.boolean(),
  }) },
  { weight: 2, arbitrary: fc.record({
    k: fc.constant('sync' as const),
    from: fc.integer({ min: 0, max: 3 }),
    to: fc.integer({ min: 0, max: 3 }),
    keep: fc.array(fc.nat(), { maxLength: 40 }), // permutation + partition source
    dup: fc.array(fc.nat(), { maxLength: 6 }),
    cut: fc.array(fc.integer({ min: 1, max: 6 }), { maxLength: 5 }),
    forge: fc.boolean(),
  }) },
);

interface Replica {
  repo: ReturnType<typeof createMemoryRepository>;
  writer: EventWriter;
  clock: ReturnType<typeof manualClock>;
}

function replicas(skews: number[]): Replica[] {
  return DEVICES.map((dispositivo, i) => {
    const repo = createMemoryRepository();
    const clock = manualClock(1762300800000 + skews[i]);
    const writer = createEventWriter({
      claseId: ids.clase, dispositivo, repo, cripto: fakeCripto, claveMac: keys.claveMac,
      clavePrivada: i === TEACHER ? keys.clavePrivada : undefined, clock, random: seededRandom(dispositivo),
    });
    return { repo, writer, clock };
  });
}

/** Deterministic permutation/selection driven by the generated integers. */
function arrange<T>(items: T[], keep: number[], dup: number[], dropSome: boolean): T[] {
  const pool = [...items];
  const out: T[] = [];
  for (const k of keep) {
    if (!pool.length) break;
    out.push(pool.splice(k % pool.length, 1)[0]);
  }
  if (!dropSome) out.push(...pool); // full sync keeps everything, partial leaves gaps
  for (const d of dup) if (out.length) out.splice(d % (out.length + 1), 0, out[d % out.length]);
  return out;
}

async function forgedEvents(dispositivo: string, n: number): Promise<Evento[]> {
  const base = { dispositivo, seq: 900 + n, hlc: '9999999999999-0000-zzzzzzzz', claseId: ids.clase, sv: 1 as const, autor: {} };
  return [
    // a group tries to close the class with the impostor key and a valid class MAC
    await sealEvent({ ...base, id: fakeUlid('F', n), tipo: 'clase.config', datos: { abierta: false } }, { cripto: fakeCripto, claveMac: keys.claveMac, clavePrivada: impostor.clavePrivada }),
    // an unsigned authority event
    await sealEvent({ ...base, id: fakeUlid('G', n), seq: 950 + n, tipo: 'tutor.interruptor', datos: { activo: false } }, { cripto: fakeCripto, claveMac: keys.claveMac, allowUnsignedForTests: true }),
    // a forged MAC
    { ...base, id: fakeUlid('H', n), seq: 990 + n, tipo: 'pista.mostrada', datos: { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 }, mac: 'AAAAAAAAAAA' },
  ];
}

async function run(actions: Action[], skews: number[]) {
  const rs = replicas(skews);
  const clase = { ...ejemplos.clase, docenteDispositivo: DEVICES[TEACHER], claveClasePub: keys.clavePub };
  await rs[TEACHER].writer.append('clase.creada', clase);
  const measured: string[] = [];
  let n = 0;
  let forgedIds: string[] = [];

  for (const a of actions) {
    if (a.k === 'act') {
      const r = rs[a.dev];
      r.clock.advance(a.dt);
      const grupoId = fakeUlid('G', a.dev);
      switch (a.kind) {
        case 'medicion': {
          const id = fakeUlid('M', ++n);
          measured.push(id);
          await r.writer.append('medicion.registrada', { ...ejemplos.medicion, id, grupoId, valor: a.pick % 100 });
          break;
        }
        case 'anular':
          if (measured.length) await r.writer.append('medicion.anulada', { medicionId: measured[a.pick % measured.length] });
          break;
        case 'pista':
          await r.writer.append('pista.mostrada', { grupoId, practicaId: ids.practica, nivel: 1 + (a.pick % 4) });
          break;
        case 'config':
          if (a.dev === TEACHER) await r.writer.append('clase.config', a.flag ? { abierta: a.pick % 2 === 0 } : { tutor: { activo: a.flag, iaLocal: false, iaNube: false } });
          break;
        case 'switch':
          if (a.dev === TEACHER) await r.writer.append('gestos.interruptor', { activo: a.flag, grupoId: a.pick % 2 ? grupoId : undefined });
          break;
      }
    } else {
      const from = rs[a.from];
      const to = rs[a.to];
      const partial = a.keep.length % 3 === 0; // sometimes drop events to leave gaps
      let batch: unknown[] = arrange(lacking(await from.repo.all(ids.clase), await to.repo.vector(ids.clase)), a.keep, a.dup, partial);
      if (a.forge) {
        const forged = await forgedEvents(DEVICES[a.from === TEACHER ? 1 : a.from], ++n);
        forgedIds = [...forgedIds, ...forged.map((f) => f.id)];
        batch = [...forged, ...batch];
      }
      let start = 0;
      for (const size of [...a.cut, Infinity]) {
        const chunk = batch.slice(start, start + size);
        start += size;
        if (chunk.length) {
          await ingest(to.repo, chunk, ctx, fakeCripto);
          const top = (chunk as Evento[]).map((e) => e.hlc).sort().at(-1);
          if (top && /^\d{13}-\d{4}-[0-9a-z]{8}$/.test(top) && !top.startsWith('9999')) to.writer.observe(top);
        }
      }
    }
  }

  // Final anti-entropy: everyone talks to everyone until nothing changes.
  for (let round = 0; round < 2; round++) {
    for (const from of rs) for (const to of rs) {
      if (from === to) continue;
      await ingest(to.repo, lacking(await from.repo.all(ids.clase), await to.repo.vector(ids.clase)), ctx, fakeCripto);
    }
  }
  return { rs, forgedIds };
}

const withoutCounters = ({ eventos: _e, porTipo: _p, ...rest }: EstadoClase) => rest;
const idsOf = async (r: Replica) => (await r.repo.all(ids.clase)).map((e) => e.id).sort();
const skewsArb = fc.array(fc.integer({ min: -60_000, max: 60_000 }), { minLength: 4, maxLength: 4 });

describe('convergence properties (fast-check)', () => {
  it(`every replica converges to the same log, vector and projection (${RUNS} cases)`, async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(actionArb, { maxLength: 30 }), skewsArb, fc.nat(), async (actions, skews, seed) => {
        const { rs, forgedIds } = await run(actions, skews);
        const reference = await idsOf(rs[0]);
        const vv = await rs[0].repo.vector(ids.clase);
        const state = project(ids.clase, await rs[0].repo.all(ids.clase));
        for (const r of rs.slice(1)) {
          expect(await idsOf(r)).toEqual(reference);
          expect(await r.repo.vector(ids.clase)).toEqual(vv);
          expect(project(ids.clase, await r.repo.all(ids.clase))).toEqual(state);
        }
        // order independence of the projection itself
        const shuffled = [...(await rs[0].repo.all(ids.clase))].sort((a, b) => ((a.id.charCodeAt(25) * (seed + 7)) % 31) - ((b.id.charCodeAt(25) * (seed + 7)) % 31));
        expect(project(ids.clase, shuffled)).toEqual(state);
        // forged events never get in
        for (const id of forgedIds) expect(reference).not.toContain(id);
      }),
      { numRuns: RUNS },
    );
  }, 600_000);

  it(`ingestion is idempotent (${RUNS} cases)`, async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(actionArb, { maxLength: 20 }), skewsArb, async (actions, skews) => {
        const { rs } = await run(actions, skews);
        const all = await rs[1].repo.all(ids.clase);
        const before = project(ids.clase, all);
        const report = await ingest(rs[1].repo, [...all, ...all], ctx, fakeCripto);
        expect(report.accepted).toBe(0);
        expect(report.duplicates).toBe(all.length * 2);
        expect(project(ids.clase, await rs[1].repo.all(ids.clase))).toEqual(before);
      }),
      { numRuns: RUNS },
    );
  }, 600_000);

  it(`no group event can change authority state, even if it bypasses ingestion (${RUNS} cases)`, async () => {
    const forgedArb = fc.array(
      fc.record({
        dev: fc.integer({ min: 1, max: 3 }),
        tipo: fc.constantFrom('clase.config', 'clase.cerrada', 'tutor.interruptor', 'gestos.interruptor', 'evidencia.confirmada', 'estudiante.olvidar'),
        flag: fc.boolean(),
        ms: fc.integer({ min: 1762300000000, max: 1862300800000 }),
      }),
      { minLength: 1, maxLength: 8 },
    );
    await fc.assert(
      fc.asyncProperty(fc.array(actionArb, { maxLength: 15 }), skewsArb, forgedArb, async (actions, skews, forged) => {
        const { rs } = await run(actions, skews);
        const all = await rs[0].repo.all(ids.clase);
        const forgedEvents: Evento[] = [];
        let i = 0;
        for (const f of forged) {
          const datos = {
            'clase.config': { abierta: f.flag },
            'clase.cerrada': {},
            'tutor.interruptor': { activo: f.flag },
            'gestos.interruptor': { activo: f.flag },
            'evidencia.confirmada': { evidenciaId: ids.evidencia, nivel: 3 },
            'estudiante.olvidar': { estudianteId: ids.estudiante1 },
          }[f.tipo];
          forgedEvents.push(await sealEvent(
            { id: fakeUlid('X', ++i), dispositivo: DEVICES[f.dev], seq: 5000 + i, hlc: `${f.ms}-0000-zzzzzzzz`, claseId: ids.clase, sv: 1, tipo: f.tipo, autor: {}, datos },
            { cripto: fakeCripto, claveMac: keys.claveMac, clavePrivada: keys.clavePrivada }, // even with a stolen key
          ));
        }
        expect(withoutCounters(project(ids.clase, [...all, ...forgedEvents]))).toEqual(withoutCounters(project(ids.clase, all)));
      }),
      { numRuns: RUNS },
    );
  }, 600_000);

  it('two peers converge through the real protocol over a session (200 cases)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(actionArb.filter((a) => a.k === 'act'), { maxLength: 20 }), skewsArb, fc.integer({ min: 1, max: 5 }), async (actions, skews, batchSize) => {
        const { rs } = await (async () => {
          const rs = replicas(skews);
          await rs[TEACHER].writer.append('clase.creada', { ...ejemplos.clase, docenteDispositivo: DEVICES[TEACHER], claveClasePub: keys.clavePub });
          for (const a of actions) if (a.k === 'act' && a.kind === 'pista') await rs[a.dev].writer.append('pista.mostrada', { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 + (a.pick % 4) });
          return { rs };
        })();
        const [x, y] = [rs[0], rs[1 + (actions.length % 3)]];
        const [sx, sy] = createMemoryPair();
        const mk = (r: Replica) => ({ claseId: ids.clase, repo: r.repo, batchSize, accept: (evs: unknown[]) => ingest(r.repo, evs, ctx, fakeCripto) });
        const px = attachSyncPeer(sx, mk(x));
        const py = attachSyncPeer(sy, mk(y));
        await Promise.all([px.start(), py.start()]);
        await Promise.all([px.finished, py.finished]);
        expect(await idsOf(x)).toEqual(await idsOf(y));
        expect(project(ids.clase, await x.repo.all(ids.clase))).toEqual(project(ids.clase, await y.repo.all(ids.clase)));
      }),
      { numRuns: 200 },
    );
  }, 600_000);
});
