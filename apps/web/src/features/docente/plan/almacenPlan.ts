/**
 * The approved class plan and the offline upload queue, on this device (IndexedDB via Dexie).
 * The queue keeps the files only until the gateway reads them, then they are deleted.
 */
import Dexie, { type Table } from 'dexie';
import type { PlanClase } from './revision.ts';

export interface EnvioPendiente {
  id?: number;
  archivos: Blob[];
  creado: string;
}

export interface AlmacenPlan {
  leer(): Promise<PlanClase | undefined>;
  guardar(p: PlanClase): Promise<void>;
  borrar(): Promise<void>;
  encolar(archivos: Blob[], ahora: Date): Promise<void>;
  pendientes(): Promise<EnvioPendiente[]>;
  quitar(id: number): Promise<void>;
}

class DbPlan extends Dexie {
  planes!: Table<PlanClase, string>;
  cola!: Table<EnvioPendiente, number>;
  constructor(nombre: string) {
    super(nombre);
    this.version(1).stores({ planes: 'id', cola: '++id, creado' });
  }
}

export function crearAlmacenPlanDexie(nombre = 'rikuy-plan'): AlmacenPlan {
  const db = new DbPlan(nombre);
  return {
    leer: () => db.planes.get('actual'),
    guardar: async (p) => void (await db.planes.put(p)),
    borrar: () => db.planes.delete('actual'),
    encolar: async (archivos, ahora) => void (await db.cola.add({ archivos, creado: ahora.toISOString() })),
    pendientes: () => db.cola.orderBy('creado').toArray(),
    quitar: (id) => db.cola.delete(id),
  };
}

let unico: AlmacenPlan | undefined;
/** One store per app. */
export function almacenPlan(): AlmacenPlan {
  unico ??= crearAlmacenPlanDexie();
  return unico;
}

/** In-memory store for tests and blocked IndexedDB. */
export function crearAlmacenPlanMemoria(): AlmacenPlan & {
  cola: EnvioPendiente[];
  plan?: PlanClase;
} {
  let n = 0;
  const m: AlmacenPlan & { cola: EnvioPendiente[]; plan?: PlanClase } = {
    cola: [],
    leer: async () => m.plan,
    guardar: async (p) => void (m.plan = p),
    borrar: async () => void delete m.plan,
    encolar: async (archivos, ahora) => void m.cola.push({ id: ++n, archivos, creado: ahora.toISOString() }),
    pendientes: async () => [...m.cola],
    quitar: async (id) => void (m.cola = m.cola.filter((e) => e.id !== id)),
  };
  return m;
}
