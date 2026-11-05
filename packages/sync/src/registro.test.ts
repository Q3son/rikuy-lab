import { EventoValidado } from '@rikuy/contracts';
import { dispositivos, ejemplos, ids } from '@rikuy/contracts/fixtures';
import { describe, expect, it } from 'vitest';
import { sealEvent } from './firmas.ts';
import { ingest } from './ingesta.ts';
import { createMemoryRepository } from './memoria.ts';
import { createEventWriter } from './registro.ts';
import { fakeClassKeys, fakeCripto, manualClock, seededRandom } from './testing/index.ts';

const keys = fakeClassKeys();
const ctx = { claseId: ids.clase, claveMac: keys.claveMac, clavePub: keys.clavePub, docenteDispositivo: dispositivos.docente };

function writer(dispositivo: string, opts: { teacher?: boolean } = {}) {
  const repo = createMemoryRepository();
  const w = createEventWriter({
    claseId: ids.clase,
    dispositivo,
    repo,
    cripto: fakeCripto,
    claveMac: keys.claveMac,
    clavePrivada: opts.teacher ? keys.clavePrivada : undefined,
    clock: manualClock(),
    random: seededRandom(dispositivo),
  });
  return { repo, w };
}

const pista = { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 };

describe('event writer (appendLocal)', () => {
  it('assigns contiguous seq, increasing HLC, ULID id, schema version and MAC', async () => {
    const { repo, w } = writer(dispositivos.grupo1);
    const a = await w.append('pista.mostrada', pista, { grupoId: ids.grupo1 });
    const b = await w.append('pista.mostrada', { ...pista, nivel: 2 }, { grupoId: ids.grupo1 });
    expect([a.seq, b.seq]).toEqual([1, 2]);
    expect(a.hlc < b.hlc).toBe(true);
    expect(a.id < b.id).toBe(true);
    expect(a.mac).toBeTruthy();
    expect(EventoValidado.safeParse(a).success).toBe(true);
    expect(await repo.vector(ids.clase)).toEqual({ [dispositivos.grupo1]: 2 });
  });

  it('serializes concurrent appends without duplicating seq', async () => {
    const { repo, w } = writer(dispositivos.grupo1);
    await Promise.all(Array.from({ length: 10 }, (_, i) => w.append('pista.mostrada', { ...pista, nivel: (i % 4) + 1 }, {})));
    expect(await repo.vector(ids.clase)).toEqual({ [dispositivos.grupo1]: 10 });
  });

  it('refuses invalid data before writing', async () => {
    const { repo, w } = writer(dispositivos.grupo1);
    await expect(w.append('pista.mostrada', { nivel: 9 }, {})).rejects.toThrow();
    expect(await repo.all(ids.clase)).toEqual([]);
  });

  it('a group device cannot write teacher-authority events', async () => {
    const { w } = writer(dispositivos.grupo1);
    await expect(w.append('tutor.interruptor', { activo: false }, {})).rejects.toThrow(/private key/);
  });

  it('the teacher signs authority events', async () => {
    const { w } = writer(dispositivos.docente, { teacher: true });
    const e = await w.append('clase.creada', { ...ejemplos.clase, claveClasePub: keys.clavePub }, {});
    expect(e.firma).toBeTruthy();
  });
});

describe('ingestion (acceptance rules of 3.5)', () => {
  it('accepts valid events, is idempotent by id and reports duplicates', async () => {
    const { w } = writer(dispositivos.grupo1);
    const e = await w.append('pista.mostrada', pista, {});
    const target = createMemoryRepository();
    expect(await ingest(target, [e, e], ctx, fakeCripto)).toMatchObject({ accepted: 1, duplicates: 1 });
    expect(await ingest(target, [e], ctx, fakeCripto)).toMatchObject({ accepted: 0, duplicates: 1 });
  });

  it('silently drops invalid, foreign, forged and unsigned-authority events, counting each reason', async () => {
    const { w } = writer(dispositivos.grupo1);
    const good = await w.append('pista.mostrada', pista, {});
    const foreign = await sealEvent({ ...good, id: ids.evento2, claseId: ids.aula }, { cripto: fakeCripto, claveMac: keys.claveMac });
    const forged = { ...good, id: ids.evento2, datos: { ...pista, nivel: 3 } };
    const unsigned = await sealEvent(
      { ...good, id: ids.medicion, seq: 2, tipo: 'tutor.interruptor', datos: { activo: false } },
      { cripto: fakeCripto, claveMac: keys.claveMac, allowUnsignedForTests: true },
    );
    const target = createMemoryRepository();
    const r = await ingest(target, [{ nope: true }, foreign, forged, unsigned], ctx, fakeCripto);
    expect(r.accepted).toBe(0);
    expect(r.rejected).toMatchObject({ esquema: 2, 'otra-clase': 1, mac: 1 });
    expect(await target.all(ids.clase)).toEqual([]);
  });

  it('rejects a validly signed authority event that does not come from the teacher device', async () => {
    const e = await sealEvent(
      { id: ids.evento1, dispositivo: dispositivos.grupo1, seq: 1, hlc: '1762300800000-0000-aaaaaaaa', claseId: ids.clase, sv: 1, tipo: 'tutor.interruptor', autor: {}, datos: { activo: true } },
      { cripto: fakeCripto, claveMac: keys.claveMac, clavePrivada: keys.clavePrivada },
    );
    const r = await ingest(createMemoryRepository(), [e], ctx, fakeCripto);
    expect(r.rejected.autoridad).toBe(1);
  });

  it('stores events after a gap but the vector only advances to the gap', async () => {
    const { w } = writer(dispositivos.grupo1);
    const evs = [];
    for (let i = 0; i < 4; i++) evs.push(await w.append('pista.mostrada', pista, {}));
    const target = createMemoryRepository();
    await ingest(target, [evs[0], evs[2], evs[3]], ctx, fakeCripto);
    expect(await target.all(ids.clase)).toHaveLength(3);
    expect(await target.vector(ids.clase)).toEqual({ [dispositivos.grupo1]: 1 });
    await ingest(target, [evs[1]], ctx, fakeCripto);
    expect(await target.vector(ids.clase)).toEqual({ [dispositivos.grupo1]: 4 });
  });
});
