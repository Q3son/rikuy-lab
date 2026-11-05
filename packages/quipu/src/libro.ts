/**
 * Quipu de logros (ARQUITECTURA 3.11): append-only cooperative ledger.
 * The balance is a projection (sum), so it does not depend on arrival order. No purchases, no losses,
 * no ranking: nothing here orders groups or spends knots.
 */
import { AsientoQuipu, type MotivoQuipu } from '@rikuy/contracts';

export interface LibroQuipu {
  readonly asientos: readonly AsientoQuipu[];
}

export const crearLibro = (): LibroQuipu => ({ asientos: [] });

function estable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(estable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, x]) => `${JSON.stringify(k)}:${estable(x)}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

/** Appends a validated entry. Idempotent for an identical duplicate; an edit of an existing id is refused. */
export function agregarAsiento(libro: LibroQuipu, asiento: AsientoQuipu): LibroQuipu {
  const a = AsientoQuipu.parse(asiento);
  const previo = libro.asientos.find((x) => x.id === a.id);
  if (previo) {
    if (estable(previo) !== estable(a)) throw new Error(`append-only: entry ${a.id} already exists with different content`);
    return libro;
  }
  return { asientos: [...libro.asientos, a] };
}

export type RolEmisor = 'docente' | 'grupo';

/** Ingestion guard: a group device can never issue knots to itself (or to anyone). */
export function ingerir(libro: LibroQuipu, asiento: AsientoQuipu, origen: { rol: RolEmisor }): { ok: true; libro: LibroQuipu } | { ok: false; motivo: string } {
  if (origen.rol !== 'docente') return { ok: false, motivo: 'solo_el_celular_de_la_docente_emite' };
  try {
    return { ok: true, libro: agregarAsiento(libro, asiento) };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : 'asiento_invalido' };
  }
}

/** Entries not yet in the ledger (rules are re-evaluated on every ingestion). */
export function nuevosAsientos(libro: LibroQuipu, candidatos: AsientoQuipu[]): AsientoQuipu[] {
  const ya = new Set(libro.asientos.map((a) => a.id));
  return candidatos.filter((c) => !ya.has(c.id));
}

const suma = (xs: readonly AsientoQuipu[]) => Math.max(0, xs.reduce((s, a) => s + a.nudos, 0));

/** Knots on the classroom cord. Never negative (no loss states). */
export const saldoAula = (libro: LibroQuipu, aulaId: string): number =>
  suma(libro.asientos.filter((a) => a.aulaId === aulaId && a.beneficiario.tipo === 'aula'));

export const saldoGrupo = (libro: LibroQuipu, grupoId: string): number =>
  suma(libro.asientos.filter((a) => a.beneficiario.tipo === 'grupo' && a.beneficiario.grupoId === grupoId));

/** The classroom quipu: its own cord plus every group cord. This is what unlocks things for everyone. */
export const saldoTotalAula = (libro: LibroQuipu, aulaId: string): number => suma(libro.asientos.filter((a) => a.aulaId === aulaId));

export function nudosPorMotivo(libro: LibroQuipu, aulaId: string): Partial<Record<MotivoQuipu, number>> {
  const r: Partial<Record<MotivoQuipu, number>> = {};
  for (const a of libro.asientos) if (a.aulaId === aulaId) r[a.motivo] = (r[a.motivo] ?? 0) + a.nudos;
  return r;
}

export interface ProblemaLibro {
  codigo: 'correccion_sin_objetivo' | 'correccion_excede' | 'correccion_otro_beneficiario';
  asientoId: string;
}

export function auditarLibro(libro: LibroQuipu): ProblemaLibro[] {
  const problemas: ProblemaLibro[] = [];
  const porId = new Map(libro.asientos.map((a) => [a.id, a]));
  const corregido = new Map<string, number>();
  for (const a of libro.asientos) {
    if (!a.corrigeA) continue;
    const objetivo = porId.get(a.corrigeA);
    if (!objetivo) {
      problemas.push({ codigo: 'correccion_sin_objetivo', asientoId: a.id });
      continue;
    }
    if (estable(objetivo.beneficiario) !== estable(a.beneficiario)) problemas.push({ codigo: 'correccion_otro_beneficiario', asientoId: a.id });
    corregido.set(objetivo.id, (corregido.get(objetivo.id) ?? 0) + -a.nudos);
  }
  for (const [id, total] of corregido) {
    const objetivo = porId.get(id);
    if (objetivo && total > objetivo.nudos) problemas.push({ codigo: 'correccion_excede', asientoId: id });
  }
  return problemas;
}

/** Unlocks are collective: ids of catalog items whose threshold the classroom has reached. */
export function desbloqueosDe(saldoTotal: number, catalogo: { id: string; nudos: number }[]): string[] {
  return catalogo.filter((c) => saldoTotal >= c.nudos).map((c) => c.id);
}
