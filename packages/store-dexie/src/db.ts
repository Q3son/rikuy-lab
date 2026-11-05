/**
 * Browser database (3.4). Differences from the doc excerpt, on purpose:
 * - `eventos` is unique on `[claseId+dispositivo+seq]`: sequences are contiguous per class and
 *   device (see PROPUESTAS_CONTRATOS.md), so the same device can take part in several classes.
 * - `vectores` is keyed by `peer` = `<claseId>|<dispositivo>`.
 * `padron` (alias -> real name) lives only on the teacher phone and is excluded from sync and
 * export: nothing in @rikuy/sync reads it.
 */
import Dexie, { type DexieOptions, type EntityTable } from 'dexie';
import type { Clase, Estudiante, Evento, Evidencia, Grupo, Medicion, Practica, RespuestaRazonamiento, VectorVersion } from '@rikuy/contracts';
import type { EstadoClase } from '@rikuy/sync';

export interface FilaVector {
  peer: string;
  claseId: string;
  vv: VectorVersion;
}
export interface FilaPadron {
  estudianteId: string;
  nombre: string;
}
export interface FilaAjuste {
  clave: string;
  valor: unknown;
}
export interface FilaClaves {
  claseId: string;
  claveMac: string;
  clavePub: string;
  /** Only on the teacher device: a non-extractable CryptoKey. */
  clavePrivada?: CryptoKey;
  docenteDispositivo: string;
}
export interface FilaEstado {
  claseId: string;
  estado: EstadoClase;
}
export type FilaPractica = Practica;
export interface FilaGenerica {
  id: string;
  [k: string]: unknown;
}

export type RikuyDb = Dexie & {
  eventos: EntityTable<Evento, 'id'>;
  vectores: EntityTable<FilaVector, 'peer'>;
  clases: EntityTable<Clase, 'id'>;
  practicas: Dexie.Table<FilaPractica, [string, number]>;
  grupos: EntityTable<Grupo, 'id'>;
  mediciones: EntityTable<Medicion, 'id'>;
  respuestas: EntityTable<RespuestaRazonamiento, 'id'>;
  evidencias: EntityTable<Evidencia, 'id'>;
  competencias: EntityTable<FilaGenerica, 'id'>;
  estudiantes: EntityTable<Estudiante, 'id'>;
  padron: EntityTable<FilaPadron, 'estudianteId'>;
  memoria: EntityTable<FilaGenerica, 'id'>;
  quipu: EntityTable<FilaGenerica, 'id'>;
  reportes: EntityTable<FilaGenerica, 'id'>;
  paquetes: EntityTable<FilaGenerica, 'id'>;
  ajustes: EntityTable<FilaAjuste, 'clave'>;
  claves: EntityTable<FilaClaves, 'claseId'>;
  estados: EntityTable<FilaEstado, 'claseId'>;
};

export const SCHEMA_V1 = {
  eventos: '&id, &[claseId+dispositivo+seq], claseId, tipo, hlc',
  vectores: '&peer, claseId',
  clases: '&id, codigo, abierta',
  practicas: '&[id+version], estado, [desempeno.competencia+desempeno.desempeno]',
  grupos: '&id, claseId',
  mediciones: '&id, claseId, [claseId+grupoId], practicaId',
  respuestas: '&id, claseId, [claseId+grupoId], momento',
  evidencias: '&id, claseId, [claseId+grupoId], respuestaId, indicador',
  competencias: '&id',
  estudiantes: '&id, aulaId, alias',
  padron: '&estudianteId',
  memoria: '&id, estudianteId, [estudianteId+competencia.competencia], tipo, hlc',
  quipu: '&id, aulaId, [aulaId+beneficiario.tipo]',
  reportes: '&id, tipo, alcance, generado',
  paquetes: '&id, tipo, creado',
  ajustes: '&clave',
  claves: '&claseId',
  estados: '&claseId', // full projected state per class (what the live hooks read)
} as const;

export const TABLES = Object.keys(SCHEMA_V1) as (keyof typeof SCHEMA_V1)[];

export function createRikuyDb(name = 'rikuy', options?: DexieOptions): RikuyDb {
  const db = new Dexie(name, options) as RikuyDb;
  db.version(1).stores(SCHEMA_V1);
  return db;
}
