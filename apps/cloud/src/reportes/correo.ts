/**
 * E-mail delivery: a provider port with a Resend-compatible HTTP adapter, an SMTP adapter (smtp.ts) and a mock,
 * wrapped by one `PuertoEntrega` adapter that adds the opt-out footer and headers. Keys come from the environment.
 */
import { ErrorHttp, conReintentos } from '@rikuy/ai';
import { err, ok, type AcuseEnvio, type Destino, type EstadoAdaptador, type FalloEntrega, type MensajeSaliente, type PuertoEntrega, type Result } from '@rikuy/mensajeria';

export interface CorreoSaliente {
  /** The sender is configured on each provider. */
  para: string;
  asunto: string;
  texto: string;
  html?: string;
  cabeceras?: Record<string, string>;
}
export interface ProveedorCorreo {
  readonly nombre: string;
  enviar(c: CorreoSaliente): Promise<Result<{ id: string }, FalloEntrega>>;
}

const RE_DIRECCION = /^[^\s<>"',;\r\n]+@[^\s<>"',;\r\n]+\.[^\s<>"',;\r\n]+$/;
export const direccionValida = (d: string): boolean => RE_DIRECCION.test(d) && d.length <= 254;
export const sinSaltos = (s: string): string => s.replace(/[\r\n]+/g, ' ').trim();

export interface OpcionesResend {
  apiKey: string;
  de: string;
  /** Any Resend-compatible API (POST {baseUrl}/emails). */
  baseUrl?: string;
  fetch?: typeof fetch;
  dormir?: (ms: number) => Promise<void>;
}

export class ProveedorCorreoResend implements ProveedorCorreo {
  readonly nombre = 'resend-compatible';
  constructor(private readonly o: OpcionesResend) {}

  async enviar(c: CorreoSaliente): Promise<Result<{ id: string }, FalloEntrega>> {
    if (!direccionValida(c.para)) return err({ tipo: 'rebote', detalle: 'La dirección de correo no es válida.' });
    const f = this.o.fetch ?? fetch;
    const url = `${(this.o.baseUrl ?? 'https://api.resend.com').replace(/\/+$/, '')}/emails`;
    try {
      const j = await conReintentos(
        async () => {
          const r = await f(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.o.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: this.o.de, to: [c.para], subject: sinSaltos(c.asunto), text: c.texto, ...(c.html ? { html: c.html } : {}), ...(c.cabeceras ? { headers: c.cabeceras } : {}) }),
          });
          if (r.status >= 400) throw new ErrorHttp(r.status, 'resend');
          return (await r.json().catch(() => ({}))) as { id?: string };
        },
        this.o.dormir ? { dormir: this.o.dormir } : {},
      );
      return j.id ? ok({ id: j.id }) : err({ tipo: 'proveedor', detalle: 'El proveedor no devolvió un identificador.' });
    } catch (e) {
      if (e instanceof ErrorHttp) {
        if (e.status === 429) return err({ tipo: 'cuota', detalle: 'El proveedor de correo devolvió 429.' });
        if (e.status === 422 || e.status === 400) return err({ tipo: 'rebote', detalle: 'El proveedor rechazó el mensaje o la dirección.' });
        return err({ tipo: 'proveedor', detalle: `El proveedor de correo devolvió HTTP ${e.status}.` });
      }
      return err({ tipo: 'sin_red', detalle: 'No se pudo conectar con el proveedor de correo.' });
    }
  }
}

/** Mock provider: an outbox, with optional deterministic failures. */
export class ProveedorCorreoSimulado implements ProveedorCorreo {
  readonly nombre = 'simulado';
  readonly bandeja: CorreoSaliente[] = [];
  constructor(private readonly o: { rebote?: boolean; sinRed?: boolean } = {}) {}
  async enviar(c: CorreoSaliente): Promise<Result<{ id: string }, FalloEntrega>> {
    if (this.o.sinRed) return err({ tipo: 'sin_red', detalle: 'Simulado: sin red.' });
    if (this.o.rebote || !direccionValida(c.para)) return err({ tipo: 'rebote', detalle: 'Simulado: la dirección rebotó.' });
    this.bandeja.push(c);
    return ok({ id: `sim-correo-${this.bandeja.length}` });
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface OpcionesAdaptadorCorreo {
  proveedor: ProveedorCorreo;
  /** Builds the one-click opt-out link for a guardian reference. */
  urlBaja(ref: string): Promise<string>;
}

/** `PuertoEntrega` for e-mail. Informative only: it never adds promotion; every message carries the opt-out link. */
export class AdaptadorCorreo implements PuertoEntrega {
  readonly canal = 'correo' as const;
  constructor(private readonly o: OpcionesAdaptadorCorreo) {}
  capacidades() {
    return { plantillasAprobadas: false, audioAdjunto: false, estadoEntrega: false };
  }
  async enviar(msg: MensajeSaliente, destino: Destino): Promise<Result<AcuseEnvio, FalloEntrega>> {
    const baja = await this.o.urlBaja(destino.ref);
    const texto = `${msg.cuerpo.texto}\n\n--\nSi no quieres recibir más informes de Rikuy, usa este enlace: ${baja}`;
    const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">${msg.cuerpo.texto.split('\n').map((l) => `<p>${esc(l)}</p>`).join('')}<hr><p style="font-size:12px;color:#555">Si no quieres recibir más informes de Rikuy, <a href="${esc(baja)}">toca aquí</a>.</p></div>`;
    const r = await this.o.proveedor.enviar({
      para: destino.direccion,
      asunto: msg.cuerpo.asunto ?? 'Informe de Rikuy',
      texto,
      html,
      cabeceras: { 'List-Unsubscribe': `<${baja}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
    return r.ok ? ok({ acuseId: r.valor.id, estado: 'enviado_proveedor', ts: new Date().toISOString() }) : r;
  }
  async estado(): Promise<EstadoAdaptador> {
    return 'enviado_proveedor'; // no delivery webhook for plain e-mail: stay honest
  }
}
