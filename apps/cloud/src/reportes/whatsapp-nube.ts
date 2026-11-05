/**
 * WhatsApp Business Cloud adapter (FUNCIONES_EXTRA 1.6): utility templates only (outside the 24 h window only approved
 * templates are allowed). The token comes from the environment and never appears in a failure detail.
 * Roadmap item: verify the provider and Meta pricing before budgeting. Delivery states arrive by webhook.
 */
import { ErrorHttp, conReintentos } from '@rikuy/ai';
import { err, ok, type AcuseEnvio, type Destino, type EstadoAdaptador, type FalloEntrega, type MensajeSaliente, type PuertoEntrega, type Result } from '@rikuy/mensajeria';

export type EstadosWhatsApp = Map<string, EstadoAdaptador>;

export interface OpcionesWhatsAppNube {
  token: string;
  phoneNumberId: string;
  plantilla?: string; // approved utility template with ONE body parameter
  codigoLengua?: string;
  version?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  dormir?: (ms: number) => Promise<void>;
  estados?: EstadosWhatsApp;
}

/** Template parameters cannot hold newlines, tabs or long runs of spaces. */
export function parametroPlantilla(texto: string): string {
  return texto.replace(/[\r\n\t]+/g, ' · ').replace(/ {4,}/g, '   ').slice(0, 1000);
}

const CODIGOS_PLANTILLA = new Set([132000, 132001, 132005, 132007, 132012, 132015, 132016]);

export class AdaptadorWhatsAppNube implements PuertoEntrega {
  readonly canal = 'whatsapp' as const;
  readonly estados: EstadosWhatsApp;
  constructor(private readonly o: OpcionesWhatsAppNube) {
    this.estados = o.estados ?? new Map();
  }
  capacidades() {
    return { plantillasAprobadas: true, audioAdjunto: false, estadoEntrega: true };
  }

  async enviar(msg: MensajeSaliente, destino: Destino): Promise<Result<AcuseEnvio, FalloEntrega>> {
    const f = this.o.fetch ?? fetch;
    const url = `${(this.o.baseUrl ?? 'https://graph.facebook.com').replace(/\/+$/, '')}/${this.o.version ?? 'v21.0'}/${this.o.phoneNumberId}/messages`;
    const para = destino.direccion.replace(/\D/g, '');
    const cuerpo = {
      messaging_product: 'whatsapp',
      to: /^9\d{8}$/.test(para) ? `51${para}` : para,
      type: 'template',
      template: {
        name: this.o.plantilla ?? 'informe_semanal',
        language: { code: this.o.codigoLengua ?? (msg.lengua === 'quy' ? 'es' : msg.lengua) },
        components: [{ type: 'body', parameters: [{ type: 'text', text: parametroPlantilla(msg.cuerpo.texto) }] }],
      },
    };
    try {
      const j = await conReintentos(
        async () => {
          const r = await f(url, { method: 'POST', headers: { Authorization: `Bearer ${this.o.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
          const datos = (await r.json().catch(() => ({}))) as { messages?: Array<{ id?: string }>; error?: { code?: number } };
          if (r.status >= 400) {
            const e = new ErrorHttp(r.status, `whatsapp ${datos.error?.code ?? ''}`);
            (e as ErrorHttp & { codigo?: number }).codigo = datos.error?.code;
            throw e;
          }
          return datos;
        },
        this.o.dormir ? { dormir: this.o.dormir } : {},
      );
      const id = j.messages?.[0]?.id;
      if (!id) return err({ tipo: 'proveedor', detalle: 'WhatsApp no devolvió un identificador de mensaje.' });
      this.estados.set(id, 'enviado_proveedor');
      return ok({ acuseId: id, estado: 'enviado_proveedor', ts: new Date().toISOString() });
    } catch (e) {
      if (e instanceof ErrorHttp) {
        const codigo = (e as ErrorHttp & { codigo?: number }).codigo;
        if (e.status === 429) return err({ tipo: 'cuota', detalle: 'WhatsApp devolvió 429 (límite).' });
        if (codigo !== undefined && CODIGOS_PLANTILLA.has(codigo)) return err({ tipo: 'plantilla_rechazada', detalle: `WhatsApp rechazó la plantilla (código ${codigo}).` });
        if (codigo === 131026 || codigo === 131021) return err({ tipo: 'rebote', detalle: 'El número no puede recibir mensajes de WhatsApp.' });
        return err({ tipo: 'proveedor', detalle: `WhatsApp devolvió HTTP ${e.status}.` });
      }
      return err({ tipo: 'sin_red', detalle: 'No se pudo conectar con WhatsApp.' });
    }
  }

  async estado(acuseId: string): Promise<EstadoAdaptador> {
    return this.estados.get(acuseId) ?? 'enviado_proveedor';
  }
}

const ORDEN: EstadoAdaptador[] = ['en_cola', 'enviado_proveedor', 'entregado', 'leido'];

/** Applies the `statuses` of a webhook payload to the state map (never goes backwards, "failed" always wins). */
export function aplicarEstadosWebhook(payload: unknown, estados: EstadosWhatsApp): number {
  let n = 0;
  const entradas = (payload as { entry?: Array<{ changes?: Array<{ value?: { statuses?: Array<{ id?: string; status?: string }> } }> }> }).entry ?? [];
  for (const e of entradas)
    for (const c of e.changes ?? [])
      for (const s of c.value?.statuses ?? []) {
        if (!s.id) continue;
        const nuevo: EstadoAdaptador | undefined = s.status === 'sent' ? 'enviado_proveedor' : s.status === 'delivered' ? 'entregado' : s.status === 'read' ? 'leido' : s.status === 'failed' ? 'fallido' : undefined;
        if (!nuevo) continue;
        const actual = estados.get(s.id) ?? 'en_cola';
        if (nuevo === 'fallido' || ORDEN.indexOf(nuevo) > ORDEN.indexOf(actual)) {
          estados.set(s.id, nuevo);
          n++;
        }
      }
  return n;
}

/** Texts a guardian sends back; used to detect the word BAJA (opt-out). */
export function mensajesEntrantes(payload: unknown): Array<{ de: string; texto: string }> {
  const out: Array<{ de: string; texto: string }> = [];
  const entradas = (payload as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ from?: string; text?: { body?: string } }> } }> }> }).entry ?? [];
  for (const e of entradas) for (const c of e.changes ?? []) for (const m of c.value?.messages ?? []) if (m.from && m.text?.body) out.push({ de: m.from, texto: m.text.body });
  return out;
}
