/**
 * Positional JSON of a `Paquete` (3.6): arrays instead of objects so every QR byte counts.
 *   package: [v, typeIndex, claseId|0, emisor, creado, body, firma|0]
 *   event  : [id, dispositivo, seq, hlc, claseId|0, typeIndex, grupoId|0, estudianteIds|0, datos, mac|0, firma|0]
 * An event `claseId` of 0 means "same as the package". `0` marks an absent value (no string is 0).
 * Type indexes come from the contract enums: new types are appended there, never reordered.
 */
import { SCHEMA_VERSION, TIPOS_EVENTO, TipoPaquete, type Evento, type Paquete } from '@rikuy/contracts';

const PACKAGE_TYPES = TipoPaquete.options;
const ABSENT = 0;

type Opt<T> = T | typeof ABSENT;
const opt = <T>(v: T | undefined): Opt<T> => (v === undefined ? ABSENT : v);
const val = <T>(v: Opt<T>): T | undefined => (v === ABSENT ? undefined : v);

type EventRow = [string, string, number, string, Opt<string>, number, Opt<string>, Opt<string[]>, unknown, Opt<string>, Opt<string>];
export type PackageRow = [1, number, Opt<string>, string, string, unknown, Opt<string>];

function index<T>(list: readonly T[], value: T, what: string): number {
  const i = list.indexOf(value);
  if (i < 0) throw new Error(`unknown ${what}: ${String(value)}`);
  return i;
}

function eventRow(e: Evento, claseId: string | undefined): EventRow {
  if (e.sv !== SCHEMA_VERSION) throw new Error(`cannot encode schema version ${e.sv}`);
  return [
    e.id, e.dispositivo, e.seq, e.hlc,
    e.claseId === claseId ? ABSENT : e.claseId,
    index(TIPOS_EVENTO, e.tipo, 'event type'),
    opt(e.autor.grupoId), opt(e.autor.estudianteIds),
    e.datos, opt(e.mac), opt(e.firma),
  ];
}

function eventFrom(r: EventRow, claseId: string | undefined): Evento {
  const [id, dispositivo, seq, hlc, ownClase, tipo, grupoId, estudianteIds, datos, mac, firma] = r;
  const autor: Evento['autor'] = {};
  if (val(grupoId) !== undefined) autor.grupoId = val(grupoId);
  if (val(estudianteIds) !== undefined) autor.estudianteIds = val(estudianteIds);
  const tipoEvento = TIPOS_EVENTO[tipo];
  const clase = val(ownClase) ?? claseId;
  if (!tipoEvento || clase === undefined) throw new Error('invalid positional event');
  const e: Evento = { id, dispositivo, seq, hlc, claseId: clase, sv: SCHEMA_VERSION, tipo: tipoEvento, autor, datos };
  if (val(mac) !== undefined) e.mac = val(mac);
  if (val(firma) !== undefined) e.firma = val(firma);
  return e;
}

export function toPositional(p: Paquete): PackageRow {
  const body = p.tipo === 'eventos' ? (p.cuerpo as { eventos: Evento[] }).eventos.map((e) => eventRow(e, p.claseId)) : p.cuerpo;
  return [1, index(PACKAGE_TYPES, p.tipo, 'package type'), opt(p.claseId), p.emisor, p.creado, body, opt(p.firma)];
}

export function fromPositional(row: unknown): Paquete {
  if (!Array.isArray(row) || row.length !== 7 || row[0] !== 1) throw new Error('unknown positional format');
  const [, tipoIdx, claseId, emisor, creado, body, firma] = row as PackageRow;
  const tipo = PACKAGE_TYPES[tipoIdx];
  if (!tipo) throw new Error('unknown package type');
  const clase = val(claseId);
  const cuerpo = tipo === 'eventos' ? { eventos: (body as EventRow[]).map((r) => eventFrom(r, clase)) } : body;
  const p: Paquete = { v: 1, tipo, emisor, creado, cuerpo };
  if (clase !== undefined) p.claseId = clase;
  if (val(firma) !== undefined) p.firma = val(firma);
  return p;
}
