/** In-memory `RepositorioEventos` (tests, the hub core and the property suite). */
import type { Evento } from '@rikuy/contracts';
import type { RepositorioEventos } from './puertos.ts';
import { contiguousVector } from './vector.ts';

export function createMemoryRepository(): RepositorioEventos & { size(): number } {
  const byId = new Map<string, Evento>();
  const slots = new Set<string>();
  const slot = (e: Evento) => `${e.claseId}|${e.dispositivo}|${e.seq}`;
  const ofClass = (claseId: string) => [...byId.values()].filter((e) => e.claseId === claseId);

  return {
    async add(events) {
      let added = 0;
      for (const e of events) {
        if (byId.has(e.id) || slots.has(slot(e))) continue;
        byId.set(e.id, structuredClone(e));
        slots.add(slot(e));
        added++;
      }
      return added;
    },
    async has(id) {
      return byId.has(id);
    },
    async all(claseId) {
      return ofClass(claseId).map((e) => structuredClone(e));
    },
    async vector(claseId) {
      return contiguousVector(ofClass(claseId));
    },
    async lastSeq(claseId, dispositivo) {
      return ofClass(claseId).reduce((m, e) => (e.dispositivo === dispositivo ? Math.max(m, e.seq) : m), 0);
    },
    size: () => byId.size,
  };
}
