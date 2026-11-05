/**
 * Builds the `@rikuy/mensajeria` outgoing message from an F6 rendered template. The idempotency key is
 * sha256(period | recipient key | template), so the same weekly message is never queued twice.
 */
import { sha256, type Renderizado } from '@rikuy/evidencia';
import type { MensajeSaliente, Plantilla } from '@rikuy/mensajeria';

export interface DatosMensaje {
  id: string;
  plantilla: Plantilla;
  /** e.g. "2026-W45" or "2026-10". */
  periodo: string;
  /** Opaque key of the recipient (never the address itself). */
  destinatarioClave: string;
  renderizado: Renderizado;
  adjuntos?: MensajeSaliente['adjuntos'];
  vigenteHasta: string;
  consentimientoRef: string;
  lengua?: 'es' | 'quy';
  version?: number;
}

export function construirMensajeSaliente(d: DatosMensaje): MensajeSaliente {
  return {
    id: d.id,
    claveIdempotencia: sha256(`${d.periodo}|${d.destinatarioClave}|${d.plantilla}`),
    plantilla: d.plantilla,
    version: d.version ?? 1,
    lengua: d.lengua ?? 'es',
    cuerpo: { asunto: d.renderizado.asunto, texto: d.renderizado.texto, html: d.renderizado.html },
    adjuntos: d.adjuntos ?? [],
    vigenteHasta: d.vigenteHasta,
    consentimientoRef: d.consentimientoRef,
  };
}
