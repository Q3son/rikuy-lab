/**
 * Dexie adapter of the sync ports (3.4). `repo.add` is `appendLocal`/ingestion storage: it inserts
 * the new events and refreshes the projections of the affected classes in ONE transaction, so the
 * live queries never see a log and a projection out of step. `rebuild(claseId)` recomputes them
 * from the log alone.
 */
import type { Evento, VectorVersion } from '@rikuy/contracts';
import {
  contiguousVector,
  exportBackup,
  ingest,
  parseBackup,
  project,
  type ClassContext,
  type Cripto,
  type EstadoClase,
  type IngestReport,
  type RepositorioEventos,
} from '@rikuy/sync';
import type { FilaClaves, RikuyDb } from './db.ts';

const DEVICE_KEY = 'dispositivo';
const DEVICE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export interface DexieStore {
  db: RikuyDb;
  repo: RepositorioEventos;
  rebuild(claseId: string): Promise<void>;
  classState(claseId: string): Promise<EstadoClase | undefined>;
  peerVector(claseId: string, peer: string): Promise<VectorVersion>;
  savePeerVector(claseId: string, peer: string, vv: VectorVersion): Promise<void>;
  saveClassKeys(k: FilaClaves): Promise<void>;
  classKeys(claseId: string): Promise<FilaClaves | undefined>;
  deviceId(): Promise<string>;
  setPadron(estudianteId: string, nombre: string): Promise<void>;
  padron(estudianteId: string): Promise<string | undefined>;
  /** `.rikuy.json` text with the class log only (never the padron). */
  exportClass(claseId: string, exportado: string): Promise<string>;
  importClass(text: string, ctx: ClassContext, cripto: Cripto): Promise<IngestReport>;
}

const PROJECTION_TABLES = ['clases', 'grupos', 'mediciones', 'respuestas', 'evidencias', 'estudiantes', 'practicas', 'estados'] as const;

export function createDexieStore(db: RikuyDb): DexieStore {
  const eventsOf = (claseId: string) => db.eventos.where('claseId').equals(claseId).toArray();

  /** Must run inside a transaction that covers `eventos` and the projection tables. */
  const refresh = async (claseId: string) => {
    const s = project(claseId, await eventsOf(claseId));
    for (const t of ['grupos', 'mediciones', 'respuestas', 'evidencias'] as const) await db[t].where('claseId').equals(claseId).delete();
    if (s.clase) await db.clases.put(s.clase);
    await db.grupos.bulkPut(Object.values(s.grupos));
    await db.mediciones.bulkPut(Object.values(s.mediciones));
    await db.respuestas.bulkPut(Object.values(s.respuestas));
    await db.evidencias.bulkPut(Object.values(s.evidencias));
    await db.estudiantes.bulkDelete(s.olvidados);
    await db.estudiantes.bulkPut(Object.values(s.estudiantes));
    await db.practicas.bulkPut(Object.values(s.practicas));
    await db.estados.put({ claseId, estado: s });
  };

  const repo: RepositorioEventos = {
    add(events) {
      return db.transaction('rw', [db.eventos, ...PROJECTION_TABLES.map((t) => db[t])], async () => {
        const fresh: Evento[] = [];
        const seen = new Set<string>();
        for (const e of events) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          if (await db.eventos.get(e.id)) continue;
          if (await db.eventos.where('[claseId+dispositivo+seq]').equals([e.claseId, e.dispositivo, e.seq]).count()) continue;
          fresh.push(e);
        }
        if (!fresh.length) return 0;
        await db.eventos.bulkAdd(fresh);
        for (const claseId of new Set(fresh.map((e) => e.claseId))) await refresh(claseId);
        return fresh.length;
      });
    },
    async has(id) {
      return (await db.eventos.get(id)) !== undefined;
    },
    all: eventsOf,
    async vector(claseId) {
      return contiguousVector(await eventsOf(claseId));
    },
    async lastSeq(claseId, dispositivo) {
      const last = await db.eventos
        .where('[claseId+dispositivo+seq]')
        .between([claseId, dispositivo, 0], [claseId, dispositivo, Number.MAX_SAFE_INTEGER])
        .last();
      return last?.seq ?? 0;
    },
  };

  return {
    db,
    repo,
    rebuild: (claseId) => db.transaction('rw', [db.eventos, ...PROJECTION_TABLES.map((t) => db[t])], () => refresh(claseId)),
    async classState(claseId) {
      return (await db.estados.get(claseId))?.estado;
    },
    async peerVector(claseId, peer) {
      return (await db.vectores.get(`${claseId}|${peer}`))?.vv ?? {};
    },
    async savePeerVector(claseId, peer, vv) {
      await db.vectores.put({ peer: `${claseId}|${peer}`, claseId, vv });
    },
    async saveClassKeys(k) {
      await db.claves.put(k);
    },
    classKeys: (claseId) => db.claves.get(claseId),
    async deviceId() {
      return db.transaction('rw', db.ajustes, async () => {
        const row = await db.ajustes.get(DEVICE_KEY);
        if (typeof row?.valor === 'string') return row.valor;
        const bytes = globalThis.crypto.getRandomValues(new Uint8Array(10));
        const id = Array.from(bytes, (b) => DEVICE_ALPHABET[b & 31]).join('');
        await db.ajustes.put({ clave: DEVICE_KEY, valor: id });
        return id;
      });
    },
    async setPadron(estudianteId, nombre) {
      await db.padron.put({ estudianteId, nombre });
    },
    async padron(estudianteId) {
      return (await db.padron.get(estudianteId))?.nombre;
    },
    async exportClass(claseId, exportado) {
      return exportBackup({ claseId, exportado, eventos: await eventsOf(claseId) });
    },
    async importClass(text, ctx, cripto) {
      const b = parseBackup(text);
      if (!b.ok) throw new Error(`not a Rikuy backup: ${b.error}`);
      if (b.value.claseId !== ctx.claseId) throw new Error('backup belongs to another class');
      return ingest(repo, b.value.eventos, ctx, cripto);
    },
  };
}
