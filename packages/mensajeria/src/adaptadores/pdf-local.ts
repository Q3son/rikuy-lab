import type { AcuseEnvio, Destino, EstadoAdaptador, FalloEntrega, MensajeSaliente, PuertoEntrega } from '../puertos.ts';
import { ok, type Result } from '../result.ts';

export function escaparHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Printable A4 HTML (the browser turns it into PDF with "Save as PDF", no network). */
export function htmlImprimible(msg: MensajeSaliente): string {
  const c = msg.cuerpo;
  const parrafos = c.texto.split('\n').map((l) => `<p>${escaparHtml(l)}</p>`).join('');
  return `<!doctype html><html lang="${msg.lengua}"><head><meta charset="utf-8"><title>${escaparHtml(c.asunto ?? 'Rikuy')}</title><style>@page{size:A4;margin:18mm}body{font:14px/1.5 system-ui,sans-serif;color:#222}h1{font-size:20px}@media print{body{color:#000}}</style></head><body><h1>${escaparHtml(c.asunto ?? 'Rikuy')}</h1>${parrafos}</body></html>`;
}

/** Local PDF: produced offline; nothing is sent, so the state stays manual until the teacher prints and hands it over. */
export class AdaptadorPdfLocal implements PuertoEntrega {
  readonly canal = 'pdf' as const;
  capacidades() {
    return { plantillasAprobadas: false, audioAdjunto: false, estadoEntrega: false };
  }
  async enviar(msg: MensajeSaliente, _destino: Destino): Promise<Result<AcuseEnvio, FalloEntrega>> {
    return ok({ acuseId: `pdf-${msg.id}`, estado: 'en_cola', ts: new Date().toISOString(), manual: true, html: htmlImprimible(msg) });
  }
  async estado(): Promise<EstadoAdaptador> {
    return 'en_cola';
  }
}
