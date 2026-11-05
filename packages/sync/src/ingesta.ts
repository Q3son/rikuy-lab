/**
 * Ingestion of remote events: acceptance rules 1-4 of 3.5.
 *  1. strict schema (`EventoValidado`); invalid input is dropped silently but counted;
 *  2. same class and a valid class MAC;
 *  3. teacher-authority types need a valid ECDSA signature with `claveClasePub` (and, when known,
 *     must come from the teacher device);
 *  4. idempotent by id; gaps are stored, the vector stops at the first gap (repository).
 * The original object is stored (not the parsed copy) so the seals stay verifiable downstream.
 */
import { EventoValidado, type Evento } from '@rikuy/contracts';
import { isAuthorityType, verifyEventSeal } from './firmas.ts';
import type { Cripto, RepositorioEventos } from './puertos.ts';

export interface ClassContext {
  claseId: string;
  claveMac: string;
  clavePub: string;
  docenteDispositivo?: string;
}

export type RejectReason = 'esquema' | 'otra-clase' | 'mac' | 'firma' | 'autoridad';

export interface IngestReport {
  accepted: number;
  duplicates: number;
  rejected: Record<RejectReason, number>;
}

export const emptyReport = (): IngestReport => ({
  accepted: 0,
  duplicates: 0,
  rejected: { esquema: 0, 'otra-clase': 0, mac: 0, firma: 0, autoridad: 0 },
});

export async function checkEvent(raw: unknown, ctx: ClassContext, cripto: Cripto): Promise<RejectReason | null> {
  if (!EventoValidado.safeParse(raw).success) return 'esquema';
  const e = raw as Evento;
  if (e.claseId !== ctx.claseId) return 'otra-clase';
  const seal = await verifyEventSeal(e, { cripto, claveMac: ctx.claveMac, clavePub: ctx.clavePub });
  if (!seal.ok) return seal.error;
  if (isAuthorityType(e.tipo) && ctx.docenteDispositivo && e.dispositivo !== ctx.docenteDispositivo) return 'autoridad';
  return null;
}

export async function ingest(repo: RepositorioEventos, incoming: readonly unknown[], ctx: ClassContext, cripto: Cripto): Promise<IngestReport> {
  const report = emptyReport();
  const valid: Evento[] = [];
  const seen = new Set<string>();
  for (const raw of incoming) {
    const reason = await checkEvent(raw, ctx, cripto);
    if (reason) {
      report.rejected[reason]++;
      continue;
    }
    const e = raw as Evento;
    if (seen.has(e.id)) {
      report.duplicates++;
      continue;
    }
    seen.add(e.id);
    valid.push(e);
  }
  const added = await repo.add(valid);
  report.accepted = added;
  report.duplicates += valid.length - added;
  return report;
}
