/**
 * Append-only event log of the lab on this device (IndexedDB via Dexie). Every lab record is
 * wrapped in the contract envelope (3.3) with a contiguous `seq` per device. Works offline.
 * This is the F3 adapter of the lab records until F2's store-dexie/sync expose the shared log;
 * the envelope is the same, so the events can be migrated as-is.
 */
import Dexie, { type Table } from 'dexie';
import { SCHEMA_VERSION, type Evento } from '@rikuy/contracts';
import type { LabEvent } from '@rikuy/lab-engine';
import { Hlc, newUlid, type SesionLab } from './sesion.ts';

interface FilaEvento extends Evento {
  practicaId: string | null;
}

class DbLab extends Dexie {
  eventos!: Table<FilaEvento, number>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ eventos: 'seq, id, practicaId, tipo' });
  }
}

export class RegistroLab {
  private readonly db: DbLab;
  private readonly hlc: Hlc;

  constructor(
    private readonly sesion: SesionLab,
    nombre = 'rikuy-lab',
  ) {
    this.db = new DbLab(nombre);
    this.hlc = new Hlc(sesion.nodo);
  }

  async agregar(e: LabEvent): Promise<Evento> {
    return this.db.transaction('rw', this.db.eventos, async () => {
      const last = await this.db.eventos.orderBy('seq').last();
      if (last) this.hlc.observe(last.hlc);
      const sobre: Evento = {
        id: newUlid(),
        dispositivo: this.sesion.dispositivo,
        seq: (last?.seq ?? 0) + 1,
        hlc: this.hlc.tick(),
        claseId: this.sesion.claseId,
        sv: SCHEMA_VERSION,
        tipo: e.tipo,
        autor: { grupoId: this.sesion.grupoId },
        datos: e.datos,
      };
      const practicaId = e.tipo === 'medicion.registrada' ? e.datos.practicaId : null;
      await this.db.eventos.add({ ...sobre, practicaId });
      return sobre;
    });
  }

  /** Every envelope, in log order (for sync and for tests). */
  async todos(): Promise<Evento[]> {
    const filas = await this.db.eventos.orderBy('seq').toArray();
    return filas.map(({ practicaId: _p, ...e }) => e);
  }

  /**
   * Lab records of one practice in log order. Answers carry no practice id in the contract, so
   * they are attributed to the practice the group was doing (this device runs one at a time).
   */
  async eventosDe(practicaId: string): Promise<LabEvent[]> {
    const filas = await this.db.eventos.orderBy('seq').toArray();
    const mediciones = new Set(filas.filter((f) => f.practicaId === practicaId).map((f) => (f.datos as { id: string }).id));
    return filas
      .filter((f) => f.practicaId === practicaId || f.tipo === 'respuesta.registrada' || (f.tipo === 'medicion.anulada' && mediciones.has((f.datos as { medicionId: string }).medicionId)))
      .map((f) => ({ tipo: f.tipo, datos: f.datos }) as LabEvent);
  }

  close(): void {
    this.db.close();
  }
}
