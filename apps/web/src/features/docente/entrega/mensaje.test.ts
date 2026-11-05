import { sha256, type Renderizado } from '@rikuy/evidencia';
import { describe, expect, it } from 'vitest';
import { construirMensajeSaliente } from './mensaje.ts';

const r: Renderizado = { asunto: 'Resumen semanal', texto: 'Texto del resumen', whatsapp: 'Resumen', html: '<p>Texto del resumen</p>' };

describe('outgoing message', () => {
  it('derives a stable idempotency key from period, recipient and template', () => {
    const base = { id: '01JC00000000000000000MSG01', plantilla: 'tutora_semanal' as const, periodo: '2026-W45', destinatarioClave: 'docente', renderizado: r, vigenteHasta: '2026-11-11T23:59:00.000Z', consentimientoRef: 'alta-2026-03' };
    const a = construirMensajeSaliente(base);
    const b = construirMensajeSaliente({ ...base, id: '01JC00000000000000000MSG02' });
    expect(a.claveIdempotencia).toBe(b.claveIdempotencia);
    expect(a.claveIdempotencia).toBe(sha256('2026-W45|docente|tutora_semanal'));
    expect(construirMensajeSaliente({ ...base, periodo: '2026-W46' }).claveIdempotencia).not.toBe(a.claveIdempotencia);
  });

  it('keeps the rendered body and attaches the PDF by hash when there is one', () => {
    const m = construirMensajeSaliente({ id: '01JC00000000000000000MSG01', plantilla: 'director_mensual', periodo: '2026-10', destinatarioClave: 'director', renderizado: r, adjuntos: [{ tipo: 'pdf', hash: 'a'.repeat(64) }], vigenteHasta: '2026-11-30T00:00:00.000Z', consentimientoRef: 'x' });
    expect(m.cuerpo.texto).toBe(r.texto);
    expect(m.cuerpo.html).toBe(r.html);
    expect(m.adjuntos).toEqual([{ tipo: 'pdf', hash: 'a'.repeat(64) }]);
  });
});
