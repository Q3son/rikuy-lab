/**
 * Relevo (QR relay) application service: the offline class closing of 6.3, with no radio at all.
 *   teacher: createClass -> joinFrames (J, signed)          group: receive(J) -> joined
 *   group:   recordDemoMeasurements / eventFrames (E)       teacher: receive(E) -> ingest
 *   teacher: ackFrames (A, its version vector)              group: receive(A) -> peer vector saved
 * Everything goes through @rikuy/sync (seals, ingestion) and @rikuy/store-dexie (log + projections).
 */
import { CuerpoUnion, type Paquete, type VectorVersion } from '@rikuy/contracts';
import { aleatorioSistema, createUlidFactory, formatHlc, relojSistema } from '@rikuy/core';
import type { DexieStore } from '@rikuy/store-dexie';
import {
  createEventWriter,
  createWebCrypto,
  encodeFrames,
  generateClassKeys,
  hlcNode,
  ingest,
  lacking,
  signPackage,
  verifyPackage,
  type ClassContext,
} from '@rikuy/sync';

/** Demo practice (the pendulum) used until F9's catalogue is wired. */
export const DEMO_PRACTICA = { id: '01K0000000000000000000DEM1', version: 1, sha256: '0'.repeat(64) };
const APODOS = ['Condor', 'Vicuna', 'Vizcacha', 'Puma', 'Kantu', 'Queuna', 'Alpaca', 'Taruca'] as const;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type ReceiveResult =
  | { kind: 'joined'; claseId: string; codigo: string }
  | { kind: 'events'; accepted: number; duplicates: number; rejected: number }
  | { kind: 'ack'; vv: VectorVersion }
  | { kind: 'ignored' };

export interface Relevo {
  store: DexieStore;
  createClass(): Promise<{ id: string; codigo: string }>;
  joinFrames(claseId: string): Promise<string[]>;
  recordDemoMeasurements(claseId: string, n: number): Promise<void>;
  eventFrames(claseId: string): Promise<string[]>;
  ackFrames(claseId: string): Promise<string[]>;
  pendingCount(claseId: string): Promise<number>;
  receive(p: Paquete): Promise<ReceiveResult>;
}

export function createRelevo(store: DexieStore): Relevo {
  const cripto = createWebCrypto();
  const ulid = createUlidFactory(relojSistema, aleatorioSistema);
  const nowHlc = async () => formatHlc({ ms: relojSistema.ahora(), counter: 0, node: hlcNode(await store.deviceId()) });

  const keysOf = async (claseId: string) => {
    const k = await store.classKeys(claseId);
    if (!k) throw new Error('unknown class on this device');
    return k;
  };
  const ctxOf = async (claseId: string): Promise<ClassContext> => {
    const k = await keysOf(claseId);
    return { claseId, claveMac: k.claveMac, clavePub: k.clavePub, docenteDispositivo: k.docenteDispositivo };
  };
  const writer = async (claseId: string) => {
    const k = await keysOf(claseId);
    return createEventWriter({
      claseId, dispositivo: await store.deviceId(), repo: store.repo, cripto,
      claveMac: k.claveMac, clavePrivada: k.clavePrivada, clock: relojSistema, random: aleatorioSistema,
    });
  };
  const pending = async (claseId: string) => {
    const k = await keysOf(claseId);
    const peer = await store.peerVector(claseId, k.docenteDispositivo);
    return lacking(await store.repo.all(claseId), peer);
  };
  const frames = async (tipo: Paquete['tipo'], claseId: string, cuerpo: unknown, sign = false) => {
    let p: Paquete = { v: 1, tipo, claseId, emisor: await store.deviceId(), creado: await nowHlc(), cuerpo };
    if (sign) p = await signPackage(p, { cripto, clavePrivada: (await keysOf(claseId)).clavePrivada });
    return encodeFrames(p).frames;
  };

  return {
    store,

    async createClass() {
      const keys = await generateClassKeys();
      const dispositivo = await store.deviceId();
      const id = ulid();
      const codigo = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => CODE_ALPHABET[b & 31]).join('');
      await store.saveClassKeys({ claseId: id, claveMac: keys.claveMac, clavePub: keys.clavePub, clavePrivada: keys.clavePrivada, docenteDispositivo: dispositivo });
      if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined);
      await (await writer(id)).append('clase.creada', {
        id, codigo, practicaId: DEMO_PRACTICA.id, practicaVersion: DEMO_PRACTICA.version, grado: 2, seccion: 'A', lengua: 'es',
        docenteDispositivo: dispositivo, claveClasePub: keys.clavePub, tutor: { activo: true, iaLocal: false, iaNube: false },
        abierta: true, creada: await nowHlc(),
      });
      return { id, codigo };
    },

    async joinFrames(claseId) {
      const k = await keysOf(claseId);
      if (!k.clavePrivada) throw new Error('only the teacher device can show the join QR');
      const clase = (await store.classState(claseId))?.clase;
      if (!clase) throw new Error('class not projected yet');
      return frames('union', claseId, { claseId, codigo: clase.codigo, practica: DEMO_PRACTICA, claveClaseMac: k.claveMac, claveClasePub: k.clavePub }, true);
    },

    async recordDemoMeasurements(claseId, n) {
      const w = await writer(claseId);
      const mine = await store.deviceId();
      const grupoId = Object.values((await store.classState(claseId))?.grupos ?? {}).find((g) => g.dispositivo === mine)?.id;
      if (!grupoId) throw new Error('join the class first');
      const lengths = [0.3, 0.6, 0.9];
      for (let i = 0; i < n; i++) {
        const L = lengths[i % 3];
        const valor = Math.round(2 * Math.PI * Math.sqrt(L / 9.81) * (1 + ((i * 7) % 5 - 2) / 100) * 1000) / 1000;
        await w.append('medicion.registrada', {
          id: ulid(), claseId, grupoId, practicaId: DEMO_PRACTICA.id, variable: 'longitud', valorIndependiente: L,
          repeticion: Math.floor(i / 3) + 1, magnitud: 'periodo', valor, unidad: 's', fuente: 'manual',
        }, { grupoId });
      }
    },

    async eventFrames(claseId) {
      return frames('eventos', claseId, { eventos: await pending(claseId) });
    },

    async ackFrames(claseId) {
      return frames('ack', claseId, { vv: await store.repo.vector(claseId) });
    },

    async pendingCount(claseId) {
      return (await pending(claseId)).length;
    },

    async receive(p) {
      if (p.tipo === 'union') {
        const body = CuerpoUnion.parse(p.cuerpo);
        if (body.claseId !== p.claseId || !(await verifyPackage(p, { cripto, clavePub: body.claveClasePub }))) {
          throw new Error('join package with an invalid signature');
        }
        await store.saveClassKeys({ claseId: body.claseId, claveMac: body.claveClaseMac, clavePub: body.claveClasePub, docenteDispositivo: p.emisor });
        const state = await store.classState(body.claseId);
        const mine = await store.deviceId();
        if (!Object.values(state?.grupos ?? {}).some((g) => g.dispositivo === mine)) {
          await (await writer(body.claseId)).append('grupo.unido', {
            id: ulid(), claseId: body.claseId, apodo: APODOS[crypto.getRandomValues(new Uint8Array(1))[0] % APODOS.length], dispositivo: mine, integrantes: [ulid()],
          });
        }
        return { kind: 'joined', claseId: body.claseId, codigo: body.codigo };
      }
      if (!p.claseId || !(await store.classKeys(p.claseId))) throw new Error('package for a class unknown on this device');
      if (p.tipo === 'eventos') {
        const r = await ingest(store.repo, (p.cuerpo as { eventos: unknown[] }).eventos, await ctxOf(p.claseId), cripto);
        return { kind: 'events', accepted: r.accepted, duplicates: r.duplicates, rejected: Object.values(r.rejected).reduce((a, b) => a + b, 0) };
      }
      if (p.tipo === 'ack') {
        const vv = (p.cuerpo as { vv: VectorVersion }).vv;
        await store.savePeerVector(p.claseId, p.emisor, vv);
        return { kind: 'ack', vv };
      }
      return { kind: 'ignored' };
    },
  };
}
