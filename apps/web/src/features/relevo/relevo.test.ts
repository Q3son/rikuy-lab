import { createDexieStore, createRikuyDb } from '@rikuy/store-dexie';
import { dominates, encodeFrames, Reassembler, type ClassKeys } from '@rikuy/sync';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createRelevo } from './relevo.ts';

let n = 0;
const device = () => createRelevo(createDexieStore(createRikuyDb(`relevo-${++n}`, { indexedDB, IDBKeyRange })));

/** Passes every frame of `frames` (shuffled, with a repeat) to a fresh reassembler; returns the package. */
function scan(frames: string[]) {
  const r = new Reassembler();
  const stream = [...frames].reverse().concat(frames[0]);
  for (const f of stream) {
    const res = r.add(f);
    if (res.status === 'complete') return res.paquete;
  }
  throw new Error('incomplete');
}

describe('relevo service (closing a class by QR, 6.3)', () => {
  it('teacher creates a class, group joins by J, sends 50 events by E, teacher answers A; both converge', async () => {
    const teacher = device();
    const group = device();

    const clase = await teacher.createClass();
    expect(clase.codigo).toMatch(/^[A-Z0-9]{6}$/);
    const join = await teacher.joinFrames(clase.id);
    expect(join[0]).toMatch(/^RK1:J:/);

    const joined = await group.receive(scan(join));
    expect(joined).toMatchObject({ kind: 'joined', claseId: clase.id, codigo: clase.codigo });

    await group.recordDemoMeasurements(clase.id, 50);
    const eFrames = await group.eventFrames(clase.id);
    expect(eFrames.every((f) => f.startsWith('RK1:E:'))).toBe(true);

    const got = await teacher.receive(scan(eFrames));
    expect(got).toMatchObject({ kind: 'events', accepted: 51, rejected: 0 }); // grupo.unido + 50
    const state = await teacher.store.classState(clase.id);
    expect(Object.keys(state!.mediciones)).toHaveLength(50);
    expect(Object.keys(state!.grupos)).toHaveLength(1);

    const ack = await teacher.ackFrames(clase.id);
    expect(ack).toHaveLength(1);
    expect(await group.receive(scan(ack))).toMatchObject({ kind: 'ack' });
    // after the ACK the group has nothing pending for the teacher
    expect(await group.pendingCount(clase.id)).toBe(0);
    // the teacher now holds every event the group has (the closing direction of 6.3)
    expect(dominates(await teacher.store.repo.vector(clase.id), await group.store.repo.vector(clase.id))).toBe(true);
  });

  it('a join package with a broken signature is refused', async () => {
    const teacher = device();
    const clase = await teacher.createClass();
    const p = scan(await teacher.joinFrames(clase.id));
    const forged = { ...p, cuerpo: { ...(p.cuerpo as object), codigo: 'XXXXXX' } };
    await expect(device().receive(forged)).rejects.toThrow(/signature/);
  });

  it('events from a group of another class are not accepted', async () => {
    const t1 = device();
    const t2 = device();
    const g = device();
    const c1 = await t1.createClass();
    const c2 = await t2.createClass();
    await g.receive(scan(await t1.joinFrames(c1.id)));
    await g.recordDemoMeasurements(c1.id, 3);
    const frames = await g.eventFrames(c1.id);
    await expect(t2.receive(scan(frames))).rejects.toThrow(/class/);
    expect(await t2.store.repo.all(c2.id)).toHaveLength(1);
  });

  it('only the teacher can show the join QR', async () => {
    const teacher = device();
    const group = device();
    const clase = await teacher.createClass();
    await group.receive(scan(await teacher.joinFrames(clase.id)));
    await expect(group.joinFrames(clase.id)).rejects.toThrow(/teacher/);
  });

  it('keys are generated with WebCrypto and the private key stays non-extractable', async () => {
    const teacher = device();
    const clase = await teacher.createClass();
    const k = (await teacher.store.classKeys(clase.id)) as unknown as ClassKeys;
    expect(k.clavePrivada.extractable).toBe(false);
    expect(encodeFrames).toBeTypeOf('function');
  });
});
