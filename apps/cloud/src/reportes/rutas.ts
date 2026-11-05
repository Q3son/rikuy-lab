/**
 * /reportes/*: delivery of teacher-approved reports through `PuertoEntrega` adapters (email, WhatsApp Cloud,
 * wa.me link, local PDF). Only reports the teacher approved with their signature are sent; every guardian can opt out.
 */
import { verificarObjeto } from '@rikuy/ai';
import { DestinoSchema, MensajeSalienteSchema, estadoParaDocente, type Destino } from '@rikuy/mensajeria';
import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { TTL_IDEMPOTENCIA_MS, claveBajaContacto, claveBajaRef, refDeTokenBaja, type DepsReportes } from './deps.ts';
import { aplicarEstadosWebhook, mensajesEntrantes } from './whatsapp-nube.ts';

const SobreEnvio = z.strictObject({
  mensaje: MensajeSalienteSchema,
  destino: DestinoSchema,
  /** ECDSA P-256 signature of the teacher over canonical({ mensaje, destino }). */
  firma: z.string().min(1),
  clavePublica: z.string().min(1),
});

const PAGINA_BAJA = (texto: string) =>
  `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rikuy</title><body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem"><h1>Rikuy</h1><p>${texto}</p></body></html>`;

async function estaDeBaja(r: DepsReportes, d: Destino): Promise<boolean> {
  return r.bajas.tiene(claveBajaRef(d.ref)) || r.bajas.tiene(await claveBajaContacto(r.secreto, d.direccion));
}

export function rutasReportes(r: DepsReportes, reloj: () => Date): Hono {
  const app = new Hono();

  async function enviar(c: import('hono').Context) {
    const cuerpo = await c.req.json().catch(() => undefined);
    const p = SobreEnvio.safeParse(cuerpo);
    if (!p.success) return c.json({ error: 'sobre_invalido', detalle: p.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`) }, 400);
    const { mensaje, destino, firma, clavePublica } = p.data;

    // Only teacher-approved reports leave: the teacher signs the exact message and recipient.
    if (!(await verificarObjeto({ mensaje, destino }, firma, clavePublica))) {
      return c.json({ error: 'no_aprobado', detalle: 'El informe no lleva la firma de aprobación de la docente.' }, 403);
    }
    if (new Date(mensaje.vigenteHasta) < reloj()) return c.json({ error: 'vencido', estado: 'fallido', detalle: 'El mensaje venció; la bandeja debe fusionarlo.' }, 409);
    const registrar = (estado: string) => r.bitacora.push({ ts: reloj().toISOString(), canal: destino.canal, plantilla: mensaje.plantilla, estado });

    if (await estaDeBaja(r, destino)) {
      registrar('baja');
      return c.json({ estado: 'baja' });
    }
    const previo = r.idempotencia.get(mensaje.claveIdempotencia);
    if (previo && previo.expira > reloj().getTime()) return c.json({ estado: estadoParaDocente(previo.acuse.estado), acuseId: previo.acuse.acuseId, repetido: true });

    const adaptador = r.adaptadores[destino.canal];
    if (!adaptador) return c.json({ error: 'canal_no_configurado', estado: 'fallido', detalle: `El canal ${destino.canal} no está configurado.` }, 501);

    const res = await adaptador.enviar(mensaje, destino);
    if (!res.ok) {
      const f = res.error;
      if (f.tipo === 'rebote') {
        registrar('rebotado');
        return c.json({ estado: 'rebotado', fallo: f });
      }
      if (f.tipo === 'sin_consentimiento') {
        registrar('baja');
        return c.json({ estado: 'baja', fallo: f });
      }
      registrar('fallido');
      const status = f.tipo === 'cuota' ? 429 : f.tipo === 'plantilla_rechazada' ? 422 : 502;
      return c.json({ estado: 'fallido', fallo: f }, status);
    }
    const acuse = res.valor;
    r.idempotencia.set(mensaje.claveIdempotencia, { acuse, expira: reloj().getTime() + TTL_IDEMPOTENCIA_MS });
    registrar(estadoParaDocente(acuse.estado));
    return c.json({ estado: estadoParaDocente(acuse.estado), acuseId: acuse.acuseId, ...(acuse.manual ? { manual: true } : {}), ...(acuse.enlace ? { enlace: acuse.enlace } : {}), ...(acuse.html ? { html: acuse.html } : {}) });
  }
  app.post('/enviar', enviar);

  // Opt-out: the teacher registers it for a guardian reference or contact...
  app.post('/baja', async (c) => {
    const p = z.strictObject({ ref: z.string().min(1).max(80).optional(), direccion: z.string().min(3).max(200).optional() }).safeParse(await c.req.json().catch(() => undefined));
    if (!p.success || (!p.data.ref && !p.data.direccion)) return c.json({ error: 'baja_invalida' }, 400);
    if (p.data.ref) r.bajas.agregar(claveBajaRef(p.data.ref));
    if (p.data.direccion) r.bajas.agregar(await claveBajaContacto(r.secreto, p.data.direccion));
    return c.json({ estado: 'baja' });
  });

  // ...or the guardian with one click from the e-mail footer (GET page or the one-click POST of RFC 8058).
  const bajaPorToken = async (c: import('hono').Context) => {
    const ref = await refDeTokenBaja(r.secreto, c.req.param('token') ?? '');
    if (!ref) return c.html(PAGINA_BAJA('El enlace no es válido o venció.'), 400);
    r.bajas.agregar(claveBajaRef(ref));
    return c.html(PAGINA_BAJA('Listo: no recibirás más informes de Rikuy. Tu familia sigue en la clase y puede seguir usando "Para llevar".'));
  };
  app.get('/baja/:token', bajaPorToken);
  app.post('/baja/:token', bajaPorToken);

  // WhatsApp Cloud webhook: delivery states and the word BAJA.
  app.get('/whatsapp/webhook', (c) => {
    const w = r.whatsapp;
    if (w && c.req.query('hub.mode') === 'subscribe' && c.req.query('hub.verify_token') === w.verifyToken) return c.text(c.req.query('hub.challenge') ?? '');
    return c.text('forbidden', 403);
  });
  app.post('/whatsapp/webhook', async (c) => {
    const w = r.whatsapp;
    if (!w) return c.json({ error: 'canal_no_configurado' }, 501);
    const crudo = await c.req.text();
    if (w.appSecret) {
      const esperado = `sha256=${createHmac('sha256', w.appSecret).update(crudo).digest('hex')}`;
      const recibido = c.req.header('x-hub-signature-256') ?? '';
      if (esperado.length !== recibido.length || !timingSafeEqual(Buffer.from(esperado), Buffer.from(recibido))) return c.text('forbidden', 403);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(crudo);
    } catch {
      return c.json({ error: 'json_invalido' }, 400);
    }
    aplicarEstadosWebhook(payload, w.estados);
    for (const m of mensajesEntrantes(payload)) {
      if (/^\s*baja\s*$/i.test(m.texto)) r.bajas.agregar(await claveBajaContacto(r.secreto, m.de));
    }
    return c.json({ ok: true });
  });

  return app;
}
