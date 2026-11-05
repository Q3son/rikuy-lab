import { dispositivos, ejemplos, ids } from '@rikuy/contracts/fixtures';
import { createEventWriter, ingest } from '@rikuy/sync';
import { fakeClassKeys, fakeCripto, manualClock, repositoryContract, seededRandom } from '@rikuy/sync/testing';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createRikuyDb, TABLES } from './db.ts';
import { createDexieStore } from './store.ts';

let n = 0;
const freshDb = () => createRikuyDb(`rikuy-test-${++n}`, { indexedDB, IDBKeyRange });
const keys = fakeClassKeys();
const ctx = { claseId: ids.clase, claveMac: keys.claveMac, clavePub: keys.clavePub, docenteDispositivo: dispositivos.docente };

repositoryContract('dexie', async () => createDexieStore(freshDb()).repo);

async function seeded() {
  const store = createDexieStore(freshDb());
  const teacher = createEventWriter({ claseId: ids.clase, dispositivo: dispositivos.docente, repo: store.repo, cripto: fakeCripto, claveMac: keys.claveMac, clavePrivada: keys.clavePrivada, clock: manualClock(), random: seededRandom('t') });
  await teacher.append('clase.creada', { ...ejemplos.clase, claveClasePub: keys.clavePub });
  await teacher.append('aula.estudiante_alta', ejemplos.estudiante);
  const group = createEventWriter({ claseId: ids.clase, dispositivo: dispositivos.grupo1, repo: store.repo, cripto: fakeCripto, claveMac: keys.claveMac, clock: manualClock(1762300900000), random: seededRandom('g') });
  await group.append('grupo.unido', ejemplos.grupo);
  await group.append('medicion.registrada', ejemplos.medicion);
  return store;
}

describe('Dexie schema (3.4)', () => {
  it('declares every table of the architecture', () => {
    const db = freshDb();
    expect(db.tables.map((t) => t.name).sort()).toEqual([...TABLES].sort());
  });
});

describe('Dexie store', () => {
  it('appendLocal writes the event and refreshes the projections in the same transaction', async () => {
    const store = await seeded();
    expect(await store.db.clases.get(ids.clase)).toMatchObject({ codigo: 'PEND42', abierta: true });
    expect(await store.db.grupos.where('claseId').equals(ids.clase).count()).toBe(1);
    expect(await store.db.mediciones.get(ids.medicion)).toMatchObject({ valor: 1.42, anulada: false });
    expect(await store.db.estudiantes.get(ids.estudiante1)).toMatchObject({ alias: 'E07' });
    expect(await store.classState(ids.clase)).toMatchObject({ eventos: 4 });
  });

  it('rebuild(claseId) reconstructs the projections from the log alone', async () => {
    const store = await seeded();
    await store.db.mediciones.clear();
    await store.db.clases.clear();
    await store.rebuild(ids.clase);
    expect(await store.db.mediciones.count()).toBe(1);
    expect(await store.db.clases.count()).toBe(1);
  });

  it('forgetting a student removes it from the projected table', async () => {
    const store = await seeded();
    const teacher = createEventWriter({ claseId: ids.clase, dispositivo: dispositivos.docente, repo: store.repo, cripto: fakeCripto, claveMac: keys.claveMac, clavePrivada: keys.clavePrivada, clock: manualClock(1762301000000), random: seededRandom('t2') });
    await teacher.append('estudiante.olvidar', { estudianteId: ids.estudiante1 });
    expect(await store.db.estudiantes.get(ids.estudiante1)).toBeUndefined();
  });

  it('remembers the last version vector seen per peer (for smaller deltas)', async () => {
    const store = createDexieStore(freshDb());
    expect(await store.peerVector(ids.clase, dispositivos.docente)).toEqual({});
    await store.savePeerVector(ids.clase, dispositivos.docente, { [dispositivos.grupo1]: 3 });
    expect(await store.peerVector(ids.clase, dispositivos.docente)).toEqual({ [dispositivos.grupo1]: 3 });
  });

  it('keeps class keys, including a non-extractable CryptoKey', async () => {
    const store = createDexieStore(freshDb());
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])) as CryptoKeyPair;
    await store.saveClassKeys({ claseId: ids.clase, claveMac: 'm', clavePub: 'p', clavePrivada: pair.privateKey, docenteDispositivo: dispositivos.docente });
    const k = await store.classKeys(ids.clase);
    expect(k?.clavePrivada).toBeInstanceOf(CryptoKey);
    expect(k?.clavePrivada?.extractable).toBe(false);
  });

  it('gives the device a stable 10-char id', async () => {
    const store = createDexieStore(freshDb());
    const a = await store.deviceId();
    expect(a).toMatch(/^[0-9A-Z]{10}$/);
    expect(await store.deviceId()).toBe(a);
  });
});

describe('padron, export and import', () => {
  it('the padron never appears in a .rikuy.json export', async () => {
    const store = await seeded();
    await store.setPadron(ids.estudiante1, 'María Quispe Mamani');
    expect(await store.padron(ids.estudiante1)).toBe('María Quispe Mamani');
    const text = await store.exportClass(ids.clase, '1762301000000-0000-docente1');
    expect(text).not.toContain('María');
    expect(text).not.toContain('Quispe');
    expect(JSON.parse(text).eventos).toHaveLength(4);
  });

  it('import goes through ingestion: valid events in, forged ones out', async () => {
    const source = await seeded();
    const text = await source.exportClass(ids.clase, '1762301000000-0000-docente1');
    const target = createDexieStore(freshDb());
    const report = await target.importClass(text, ctx, fakeCripto);
    expect(report.accepted).toBe(4);
    expect(await target.db.mediciones.count()).toBe(1);

    const tampered = JSON.parse(text);
    tampered.eventos[3].datos.valor = 99;
    const other = createDexieStore(freshDb());
    const r2 = await other.importClass(JSON.stringify(tampered), ctx, fakeCripto);
    expect(r2.accepted).toBe(3);
    expect(r2.rejected.mac).toBe(1);
  });

  it('a non-backup file is refused', async () => {
    const store = createDexieStore(freshDb());
    await expect(store.importClass('{"hola":1}', ctx, fakeCripto)).rejects.toThrow(/backup/);
  });

  it('remote ingestion into Dexie also refreshes projections', async () => {
    const source = await seeded();
    const target = createDexieStore(freshDb());
    await ingest(target.repo, await source.repo.all(ids.clase), ctx, fakeCripto);
    expect(await target.db.mediciones.get(ids.medicion)).toBeDefined();
  });
});
