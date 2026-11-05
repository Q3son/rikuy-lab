/**
 * Hub event log on SQLite (`node:sqlite`, built into Node >= 22.13; no native build step).
 *
 * The log is the truth (3.1): append-only, idempotent by `id`, one row per event with the
 * original JSON. Projections for the live panel are updated in the same transaction and can be
 * rebuilt from the log. WAL + synchronous=FULL: a committed append survives a crash or restart.
 *
 * Note: (dispositivo, seq) uniqueness and the version vector are scoped per class, because the
 * sync session (3.5) exchanges vectors per `claseId`.
 */
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { Evento, VectorVersion } from '@rikuy/contracts';

export interface AppendResult {
  accepted: Evento[];
  duplicates: number;
  conflicts: number;
}

export interface GroupSummary {
  grupoId: string;
  apodo: string | null;
  eventos: number;
  porTipo: Record<string, number>;
  ultimoHlc: string;
}

export interface ClassSummary {
  claseId: string;
  eventos: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  claseId TEXT NOT NULL,
  dispositivo TEXT NOT NULL,
  seq INTEGER NOT NULL,
  hlc TEXT NOT NULL,
  tipo TEXT NOT NULL,
  json TEXT NOT NULL,
  UNIQUE (claseId, dispositivo, seq)
);
CREATE INDEX IF NOT EXISTS eventos_clase_hlc ON eventos (claseId, hlc, id);
CREATE TABLE IF NOT EXISTS vv (
  claseId TEXT NOT NULL,
  dispositivo TEXT NOT NULL,
  seq INTEGER NOT NULL,
  PRIMARY KEY (claseId, dispositivo)
);
CREATE TABLE IF NOT EXISTS proy_grupos (
  claseId TEXT NOT NULL,
  grupoId TEXT NOT NULL,
  apodo TEXT,
  eventos INTEGER NOT NULL DEFAULT 0,
  ultimoHlc TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (claseId, grupoId)
);
CREATE TABLE IF NOT EXISTS proy_tipos (
  claseId TEXT NOT NULL,
  grupoId TEXT NOT NULL,
  tipo TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (claseId, grupoId, tipo)
);
`;

/** The group an event belongs to, if any: author first, then the payload. */
export function groupOf(e: Evento): string | null {
  if (e.autor.grupoId) return e.autor.grupoId;
  const d = e.datos as Record<string, unknown> | null;
  if (d && typeof d === 'object') {
    if (e.tipo === 'grupo.unido' && typeof d.id === 'string') return d.id;
    if (typeof d.grupoId === 'string') return d.grupoId;
  }
  return null;
}

export class SqliteEventLog {
  private readonly db: DatabaseSync;
  private readonly st: Record<string, StatementSync>;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 2000;');
    this.db.exec(SCHEMA);
    const p = (sql: string) => this.db.prepare(sql);
    this.st = {
      byId: p('SELECT 1 FROM eventos WHERE id = ?'),
      bySlot: p('SELECT 1 FROM eventos WHERE claseId = ? AND dispositivo = ? AND seq = ?'),
      insert: p('INSERT INTO eventos (id, claseId, dispositivo, seq, hlc, tipo, json) VALUES (?, ?, ?, ?, ?, ?, ?)'),
      vvGet: p('SELECT seq FROM vv WHERE claseId = ? AND dispositivo = ?'),
      vvSet: p('INSERT INTO vv (claseId, dispositivo, seq) VALUES (?, ?, ?) ON CONFLICT (claseId, dispositivo) DO UPDATE SET seq = excluded.seq'),
      vvAll: p('SELECT dispositivo, seq FROM vv WHERE claseId = ? ORDER BY dispositivo'),
      devices: p('SELECT DISTINCT dispositivo FROM eventos WHERE claseId = ? ORDER BY dispositivo'),
      after: p('SELECT json FROM eventos WHERE claseId = ? AND dispositivo = ? AND seq > ? ORDER BY seq'),
      count: p('SELECT COUNT(*) AS n FROM eventos WHERE claseId = ?'),
      ordered: p('SELECT json FROM eventos WHERE claseId = ? ORDER BY hlc, id'),
      classes: p('SELECT claseId, COUNT(*) AS eventos FROM eventos GROUP BY claseId ORDER BY claseId'),
      groupUpsert: p(`INSERT INTO proy_grupos (claseId, grupoId, apodo, eventos, ultimoHlc) VALUES (?, ?, ?, 1, ?)
        ON CONFLICT (claseId, grupoId) DO UPDATE SET
          eventos = eventos + 1,
          apodo = COALESCE(excluded.apodo, apodo),
          ultimoHlc = MAX(ultimoHlc, excluded.ultimoHlc)`),
      typeUpsert: p(`INSERT INTO proy_tipos (claseId, grupoId, tipo, n) VALUES (?, ?, ?, 1)
        ON CONFLICT (claseId, grupoId, tipo) DO UPDATE SET n = n + 1`),
      groups: p('SELECT grupoId, apodo, eventos, ultimoHlc FROM proy_grupos WHERE claseId = ? ORDER BY grupoId'),
      types: p('SELECT grupoId, tipo, n FROM proy_tipos WHERE claseId = ? ORDER BY tipo'),
    };
  }

  /** Appends a batch atomically. Duplicates (same id) and slot conflicts are skipped and counted. */
  append(events: readonly Evento[]): AppendResult {
    const result: AppendResult = { accepted: [], duplicates: 0, conflicts: 0 };
    const touched = new Set<string>();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const e of events) {
        if (this.st.byId!.get(e.id)) {
          result.duplicates++;
          continue;
        }
        if (this.st.bySlot!.get(e.claseId, e.dispositivo, e.seq)) {
          result.conflicts++;
          continue;
        }
        this.st.insert!.run(e.id, e.claseId, e.dispositivo, e.seq, e.hlc, e.tipo, JSON.stringify(e));
        this.project(e);
        touched.add(`${e.claseId}\u0000${e.dispositivo}`);
        result.accepted.push(e);
      }
      for (const key of touched) {
        const [claseId, dispositivo] = key.split('\u0000') as [string, string];
        this.advance(claseId, dispositivo);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return result;
  }

  versionVector(claseId: string): VectorVersion {
    const vv: VectorVersion = {};
    for (const row of this.st.vvAll!.all(claseId) as Array<{ dispositivo: string; seq: number }>) vv[row.dispositivo] = row.seq;
    return vv;
  }

  /** Events of the class the peer does not have according to its version vector. */
  missingFor(claseId: string, vv: VectorVersion): Evento[] {
    const out: Evento[] = [];
    for (const { dispositivo } of this.st.devices!.all(claseId) as Array<{ dispositivo: string }>) {
      for (const row of this.st.after!.all(claseId, dispositivo, vv[dispositivo] ?? 0) as Array<{ json: string }>) {
        out.push(JSON.parse(row.json) as Evento);
      }
    }
    return out;
  }

  count(claseId: string): number {
    return (this.st.count!.get(claseId) as { n: number }).n;
  }

  /** Every event of the class in causal (HLC) order, streamed. */
  *inOrder(claseId: string): Generator<Evento> {
    for (const row of this.st.ordered!.iterate(claseId) as Iterable<{ json: string }>) yield JSON.parse(row.json) as Evento;
  }

  classes(): ClassSummary[] {
    return (this.st.classes!.all() as Array<{ claseId: string; eventos: number }>).map((r) => ({ claseId: r.claseId, eventos: r.eventos }));
  }

  groups(claseId: string): GroupSummary[] {
    const byType = new Map<string, Record<string, number>>();
    for (const r of this.st.types!.all(claseId) as Array<{ grupoId: string; tipo: string; n: number }>) {
      const m = byType.get(r.grupoId) ?? {};
      m[r.tipo] = r.n;
      byType.set(r.grupoId, m);
    }
    return (this.st.groups!.all(claseId) as Array<{ grupoId: string; apodo: string | null; eventos: number; ultimoHlc: string }>).map((r) => ({
      grupoId: r.grupoId,
      apodo: r.apodo,
      eventos: r.eventos,
      porTipo: byType.get(r.grupoId) ?? {},
      ultimoHlc: r.ultimoHlc,
    }));
  }

  close(): void {
    this.db.close();
  }

  private project(e: Evento): void {
    const grupoId = groupOf(e);
    if (!grupoId) return;
    const d = e.datos as Record<string, unknown> | null;
    const apodo = e.tipo === 'grupo.unido' && d && typeof d.apodo === 'string' ? d.apodo : null;
    this.st.groupUpsert!.run(e.claseId, grupoId, apodo, e.hlc);
    this.st.typeUpsert!.run(e.claseId, grupoId, e.tipo);
  }

  private advance(claseId: string, dispositivo: string): void {
    const row = this.st.vvGet!.get(claseId, dispositivo) as { seq: number } | undefined;
    let seq = row?.seq ?? 0;
    while (this.st.bySlot!.get(claseId, dispositivo, seq + 1)) seq++;
    if (seq !== (row?.seq ?? 0) || !row) this.st.vvSet!.run(claseId, dispositivo, seq);
  }
}
