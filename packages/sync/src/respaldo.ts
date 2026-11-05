/**
 * Manual backup of a class log as a `.rikuy.json` file (3.4). It holds ONLY the event log: the
 * `padron` (alias -> real name) and every projection are left out by construction. Importing goes
 * back through `ingest`, so the seals are verified again.
 */
import { Evento, Hlc, Ulid } from '@rikuy/contracts';
import { err, ok, type Result } from '@rikuy/core';

const KEYS = ['claseId', 'eventos', 'exportado', 'formato', 'v'];
const EventList = Evento.array();

export interface Backup {
  claseId: string;
  exportado: string;
  eventos: Evento[];
}

export function exportBackup(b: Backup): string {
  if (b.eventos.some((e) => e.claseId !== b.claseId)) throw new Error('backup contains events of another class');
  return JSON.stringify({ formato: 'rikuy-respaldo', v: 1, claseId: b.claseId, exportado: b.exportado, eventos: b.eventos });
}

export function parseBackup(text: string): Result<Backup, string> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return err('not JSON');
  }
  const r = raw as Record<string, unknown> & Backup;
  const valid =
    !!r && typeof r === 'object' && Object.keys(r).sort().join() === KEYS.join() &&
    r.formato === 'rikuy-respaldo' && r.v === 1 &&
    Ulid.safeParse(r.claseId).success && Hlc.safeParse(r.exportado).success && EventList.safeParse(r.eventos).success;
  if (!valid) return err('not a Rikuy backup');
  // Keep the original event objects (seals are computed over them).
  return ok({ claseId: r.claseId, exportado: r.exportado, eventos: r.eventos });
}

export function backupFileName(codigo: string, date: Date): string {
  return `${codigo}-${date.toISOString().slice(0, 10)}.rikuy.json`;
}
