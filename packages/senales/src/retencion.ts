/** Short retention (ECOSISTEMA 2.14): signals 30 min at most, raw events until the week closes, derived 4-6 weeks. */
import type { EventoAprendizaje, SenalApoyo } from '@rikuy/contracts';
import { hlcMs } from './consentimiento.ts';
import { inicioDeSemana } from './sugerencias.ts';

const DIA_MS = 24 * 3600 * 1000;
export const RETENCION_DERIVADOS_DIAS = 28;
const MIN_DIAS = 28;
const MAX_DIAS = 42;

export function purgarSenales(senales: SenalApoyo[], ahora: number): SenalApoyo[] {
  return senales.filter((s) => s.expiraEn > ahora);
}

/** Raw events survive only inside their own week: at the Monday after, they are gone. */
export function purgarEventosCrudos(eventos: EventoAprendizaje[], ahora: number): EventoAprendizaje[] {
  const desde = inicioDeSemana(ahora);
  return eventos.filter((e) => hlcMs(e.hlc) >= desde);
}

/** Baseline summaries and shared check-ins: configurable window, clamped to 4-6 weeks. */
export function purgarDerivados<T extends { en: number }>(items: T[], ahora: number, dias: number = RETENCION_DERIVADOS_DIAS): T[] {
  const limite = Math.min(MAX_DIAS, Math.max(MIN_DIAS, dias)) * DIA_MS;
  return items.filter((i) => ahora - i.en <= limite);
}
