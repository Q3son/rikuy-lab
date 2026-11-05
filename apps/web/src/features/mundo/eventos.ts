/**
 * Learning events produced by the museum. Only `museo.visita` (hall and exhibit, never positions) and the
 * proposed `ayuda.*` / `quipu.nudo.*` events (PROPUESTAS_CONTRATOS.md, F5) are recorded; presence is not.
 * Port with an in-memory adapter until F2's event log (`@rikuy/sync`) is wired by the integrator.
 */
import { DatosMuseoVisita } from '@rikuy/contracts';

export interface EventoMuseo {
  tipo: string;
  datos: unknown;
}

export interface RegistroEventos {
  registrar(evento: EventoMuseo): void;
}

export class RegistroEnMemoria implements RegistroEventos {
  readonly eventos: EventoMuseo[] = [];
  private oyentes = new Set<(e: EventoMuseo) => void>();
  registrar(evento: EventoMuseo): void {
    this.eventos.push(evento);
    for (const o of this.oyentes) o(evento);
  }
  suscribir(cb: (e: EventoMuseo) => void): () => void {
    this.oyentes.add(cb);
    return () => this.oyentes.delete(cb);
  }
}

export function visita(salaId: string, grupoId: string, exhibicionId?: string): EventoMuseo {
  return { tipo: 'museo.visita', datos: DatosMuseoVisita.parse({ salaId, grupoId, ...(exhibicionId ? { exhibicionId } : {}) }) };
}

/** Shared in-memory log of this device (demo). */
export const registroMuseo = new RegistroEnMemoria();
