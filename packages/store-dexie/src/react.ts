/**
 * React live hooks over the Dexie store (`@rikuy/store-dexie/react`). Containers in
 * apps/web/src/features/* use them; presentational components only get props.
 */
import type { VectorVersion } from '@rikuy/contracts';
import { contiguousVector, type EstadoClase } from '@rikuy/sync';
import { useLiveQuery } from 'dexie-react-hooks';
import type { RikuyDb } from './db.ts';

/** Projected state of a class; `undefined` until it has events. */
export function useClassState(db: RikuyDb, claseId: string | undefined): EstadoClase | undefined {
  return useLiveQuery(async () => (claseId ? (await db.estados.get(claseId))?.estado : undefined), [db, claseId]);
}

/** Number of events stored for a class; `undefined` while loading. */
export function useClassEventCount(db: RikuyDb, claseId: string | undefined): number | undefined {
  return useLiveQuery(() => (claseId ? db.eventos.where('claseId').equals(claseId).count() : 0), [db, claseId]);
}

/** Contiguous version vector of a class; `undefined` while loading. */
export function useClassVector(db: RikuyDb, claseId: string | undefined): VectorVersion | undefined {
  return useLiveQuery(
    async () => (claseId ? contiguousVector(await db.eventos.where('claseId').equals(claseId).toArray()) : {}),
    [db, claseId],
  );
}
