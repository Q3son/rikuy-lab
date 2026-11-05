/* eslint-disable @typescript-eslint/no-explicit-any */
import { exportarClavePublica, firmarObjeto, generarParClaves } from '@rikuy/ai';
import { AdaptadorEnlaceWame, AdaptadorEntregaSimulado, AdaptadorPdfLocal, type Destino, type MensajeSaliente } from '@rikuy/mensajeria';
import { createHmac } from 'node:crypto';
import net from 'node:net';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../app.ts';
import { crearDepsSimuladas } from '../deps.ts';
import { AdaptadorCorreo, ProveedorCorreoResend, ProveedorCorreoSimulado } from './correo.ts';
import { RepositorioBajasMemoria, tokenBaja, type DepsReportes } from './deps.ts';
import { ProveedorCorreoSmtp } from './smtp.ts';
import { AdaptadorWhatsAppNube, aplicarEstadosWebhook, parametroPlantilla } from './whatsapp-nube.ts';

declare global {
  interface Response {
    json(): Promise<any>;
  }
}

const SECRETO = 'secreto-de-prueba';
const URL_PUBLICA = 'https://nube.example';
const sinEspera = async () => {};

function mensaje(p: Partial<MensajeSaliente> = {}): MensajeSaliente {
  return {
    id: '01JC0000000000000000000M01',
    claveIdempotencia: 'clave-1',
    plantilla: 'familia_semanal_a',
    version: 1,
    lengua: 'es',
    cuerpo: { asunto: 'Resumen de la semana', texto: 'Esta semana su grupo midió un péndulo.' },
    adjuntos: [],
    vigenteHasta: '2999-01-01T00:00:00Z',
    consentimientoRef: 'cons-1',
    ...p,
  };
}
const dest = (p: Partial<Destino> = {}): Destino => ({ canal: 'correo', direccion: 'familia@example.com', ref: 'apoderado-1', ...p });

async function montar(opciones: { correo?: ConstructorParameters<typeof ProveedorCorreoSimulado>[0]; whatsapp?: ConstructorParameters<typeof AdaptadorEntregaSimulado>[0] } = {}) {
  const proveedor = new ProveedorCorreoSimulado(opciones.correo);
  const whatsapp = new AdaptadorEntregaSimulado({ canal: 'whatsapp', ...opciones.whatsapp });
  const estados = new Map();
  const reportes: DepsReportes = {
    adaptadores: {
      correo: new AdaptadorCorreo({ proveedor, urlBaja: async (ref) => `${URL_PUBLICA}/reportes/baja/${await tokenBaja(SECRETO, ref)}` }),
      whatsapp,
      enlace_wame: new AdaptadorEnlaceWame(),
      pdf: new AdaptadorPdfLocal(),
    },
    bajas: new RepositorioBajasMemoria(),
    secreto: SECRETO,
    urlPublica: URL_PUBLICA,
    idempotencia: new Map(),
    bitacora: [],
    whatsapp: { verifyToken: 'vt', appSecret: 'app-secret', estados },
  };
  const app = crearApp(crearDepsSimuladas({ reportes }));
  const par = await generarParClaves();
  const clavePublica = await exportarClavePublica(par.publica);
  const enviar = async (m: MensajeSaliente, d: Destino, over: Record<string, unknown> = {}) =>
    app.request('/reportes/enviar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mensaje: m, destino: d, firma: await firmarObjeto({ mensaje: m, destino: d }, par.privada), clavePublica, ...over }),
    });
  return { app, reportes, proveedor, whatsapp, par, clavePublica, enviar, estados };
}

describe('POST /reportes/enviar', () => {
  it('sends a teacher-approved report by e-mail with the opt-out link and headers', async () => {
    const { enviar, proveedor } = await montar();
    const r = await enviar(mensaje(), dest());
    expect(r.status).toBe(200);
    expect((await r.json()).estado).toBe('enviado_proveedor');
    const c = proveedor.bandeja[0]!;
    expect(c.para).toBe('familia@example.com');
    expect(c.texto).toContain(`${URL_PUBLICA}/reportes/baja/`);
    expect(c.cabeceras?.['List-Unsubscribe']).toContain('/reportes/baja/');
    expect(c.cabeceras?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('rejects a report without the teacher approval (missing, foreign or tampered signature)', async () => {
    const { app, enviar, par, clavePublica, proveedor } = await montar();
    expect((await enviar(mensaje(), dest(), { firma: 'AAAA' })).status).toBe(403);
    const otra = await generarParClaves();
    const m = mensaje();
    const d = dest();
    const firmaAjena = await firmarObjeto({ mensaje: m, destino: d }, otra.privada);
    expect((await enviar(m, d, { firma: firmaAjena })).status).toBe(403);
    // signed one message, sent another
    const firmaOtro = await firmarObjeto({ mensaje: mensaje({ cuerpo: { texto: 'otro texto' } }), destino: d }, par.privada);
    expect((await enviar(m, d, { firma: firmaOtro })).status).toBe(403);
    // signed recipient swapped
    const firmaDestino = await firmarObjeto({ mensaje: m, destino: dest({ direccion: 'otra@example.com' }) }, par.privada);
    expect((await enviar(m, d, { firma: firmaDestino })).status).toBe(403);
    expect((await app.request('/reportes/enviar', { method: 'POST', body: JSON.stringify({ mensaje: m, destino: d, clavePublica }) })).status).toBe(400);
    expect(proveedor.bandeja).toHaveLength(0);
  });

  it('rejects unknown fields (allow-list) and expired messages', async () => {
    const { enviar } = await montar();
    expect((await enviar({ ...mensaje(), notas: 'x' } as never, dest())).status).toBe(400);
    expect((await enviar(mensaje({ cuerpo: { texto: 'x', puntaje: 3 } as never }), dest())).status).toBe(400);
    const r = await enviar(mensaje({ vigenteHasta: '2000-01-01T00:00:00Z' }), dest());
    expect(r.status).toBe(409);
  });

  it('is idempotent: a second sync does not send twice', async () => {
    const { enviar, proveedor } = await montar();
    await enviar(mensaje(), dest());
    const r = await enviar(mensaje(), dest());
    expect((await r.json()).repetido).toBe(true);
    expect(proveedor.bandeja).toHaveLength(1);
  });

  it('never sends to a guardian who opted out (by reference, by contact, or by the e-mail link)', async () => {
    const { enviar, proveedor, reportes, app } = await montar();
    await app.request('/reportes/baja', { method: 'POST', body: JSON.stringify({ ref: 'apoderado-1' }), headers: { 'content-type': 'application/json' } });
    const r = await enviar(mensaje(), dest());
    expect((await r.json()).estado).toBe('baja');
    expect(proveedor.bandeja).toHaveLength(0);

    const m2 = await montar();
    await m2.app.request('/reportes/baja', { method: 'POST', body: JSON.stringify({ direccion: 'Familia@Example.com' }), headers: { 'content-type': 'application/json' } });
    expect((await (await m2.enviar(mensaje(), dest({ ref: 'otro' }))).json()).estado).toBe('baja');

    const m3 = await montar();
    const token = await tokenBaja(SECRETO, 'apoderado-1');
    const pagina = await m3.app.request(`/reportes/baja/${token}`);
    expect(pagina.status).toBe(200);
    expect(await pagina.text()).toContain('no recibirás más informes');
    expect((await (await m3.enviar(mensaje({ claveIdempotencia: 'k2' }), dest())).json()).estado).toBe('baja');
    expect(m3.reportes.bitacora.at(-1)?.estado).toBe('baja');
    expect(reportes.bitacora).toBeDefined();
  });

  it('rejects a forged opt-out token', async () => {
    const { app } = await montar();
    const bueno = await tokenBaja(SECRETO, 'apoderado-1');
    expect((await app.request(`/reportes/baja/${bueno.slice(0, -2)}xx`)).status).toBe(400);
    expect((await app.request('/reportes/baja/basura')).status).toBe(400);
  });

  it('reports a bounce honestly and a network failure as retriable', async () => {
    const a = await montar({ correo: { rebote: true } });
    expect((await (await a.enviar(mensaje(), dest())).json()).estado).toBe('rebotado');
    const b = await montar({ correo: { sinRed: true } });
    const r = await b.enviar(mensaje(), dest());
    expect(r.status).toBe(502);
    expect((await r.json()).estado).toBe('fallido');
  });

  it('never exposes the read receipt to the teacher', async () => {
    const { enviar, whatsapp } = await montar({ whatsapp: { leer: true } });
    const r = await enviar(mensaje(), dest({ canal: 'whatsapp', direccion: '51987654321' }));
    expect((await r.json()).estado).toBe('enviado_proveedor');
    expect(await whatsapp.estado('sim-1')).toBe('leido'); // the adapter knows; the endpoint never returns it
    expect(JSON.stringify(await (await enviar(mensaje({ claveIdempotencia: 'k9' }), dest({ canal: 'whatsapp', direccion: '51987654322' }))).json())).not.toContain('leido');
  });

  it('returns a wa.me click-to-send link and a printable page without claiming delivery', async () => {
    const { enviar } = await montar();
    const wa = await (await enviar(mensaje(), dest({ canal: 'enlace_wame', direccion: '987654321' }))).json();
    expect(wa).toMatchObject({ estado: 'en_cola', manual: true });
    expect(wa.enlace).toMatch(/^https:\/\/wa\.me\/51987654321\?text=/);
    const pdf = await (await enviar(mensaje({ claveIdempotencia: 'k3' }), dest({ canal: 'pdf' }))).json();
    expect(pdf.html).toContain('@media print');
  });

  it('keeps only metadata in the log: no contact and no text', async () => {
    const { enviar, reportes } = await montar();
    await enviar(mensaje(), dest());
    const log = JSON.stringify(reportes.bitacora);
    expect(log).toContain('familia_semanal_a');
    expect(log).not.toMatch(/familia@example|péndulo|apoderado-1/);
    expect(JSON.stringify([...reportes.idempotencia.values()])).not.toContain('familia@example');
  });

  it('answers 501 when the channel is not configured', async () => {
    const m = await montar();
    delete m.reportes.adaptadores.whatsapp;
    expect((await m.enviar(mensaje(), dest({ canal: 'whatsapp', direccion: '51987654321' }))).status).toBe(501);
  });

  it('limits sends per IP', async () => {
    const reportes: DepsReportes = { adaptadores: {}, bajas: new RepositorioBajasMemoria(), secreto: SECRETO, urlPublica: URL_PUBLICA, idempotencia: new Map(), bitacora: [] };
    const app = crearApp(crearDepsSimuladas({ reportes, confiarProxy: true, limites: { ia: { max: 9, ventanaMs: 1000 }, escritura: { max: 9, ventanaMs: 1000 }, envio: { max: 2, ventanaMs: 60_000 } } }));
    const llamar = () => app.request('/reportes/enviar', { method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body: '{}' });
    expect((await llamar()).status).toBe(400);
    expect((await llamar()).status).toBe(400);
    expect((await llamar()).status).toBe(429);
  });
});

describe('WhatsApp Cloud adapter and webhook', () => {
  const resp = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });

  it('sends an approved template with one sanitized body parameter', async () => {
    let url = '';
    let body: any;
    let auth = '';
    const f = (async (u: string, init: RequestInit) => {
      url = u;
      body = JSON.parse(init.body as string);
      auth = (init.headers as Record<string, string>).Authorization!;
      return resp({ messages: [{ id: 'wamid.1' }] });
    }) as unknown as typeof fetch;
    const a = new AdaptadorWhatsAppNube({ token: 'tok-secreto', phoneNumberId: '123', fetch: f, dormir: sinEspera });
    const r = await a.enviar(mensaje({ cuerpo: { texto: 'Línea 1\nLínea 2' } }), dest({ canal: 'whatsapp', direccion: '987654321' }));
    expect(r).toMatchObject({ ok: true, valor: { acuseId: 'wamid.1', estado: 'enviado_proveedor' } });
    expect(url).toBe('https://graph.facebook.com/v21.0/123/messages');
    expect(auth).toBe('Bearer tok-secreto');
    expect(body).toMatchObject({ messaging_product: 'whatsapp', to: '51987654321', type: 'template', template: { name: 'informe_semanal' } });
    expect(body.template.components[0].parameters[0].text).toBe('Línea 1 · Línea 2');
    expect(parametroPlantilla('a\n\nb')).toBe('a · b');
  });

  it('maps provider failures and never leaks the token', async () => {
    const mk = (status: number, code?: number) => new AdaptadorWhatsAppNube({ token: 'tok-secreto', phoneNumberId: '1', dormir: sinEspera, fetch: (async () => resp({ error: { code, message: 'tok-secreto' } }, status)) as unknown as typeof fetch });
    const d = dest({ canal: 'whatsapp', direccion: '51987654321' });
    expect(await mk(429).enviar(mensaje(), d)).toMatchObject({ ok: false, error: { tipo: 'cuota' } });
    expect(await mk(400, 132001).enviar(mensaje(), d)).toMatchObject({ ok: false, error: { tipo: 'plantilla_rechazada' } });
    expect(await mk(400, 131026).enviar(mensaje(), d)).toMatchObject({ ok: false, error: { tipo: 'rebote' } });
    const r = await mk(500).enviar(mensaje(), d);
    expect(r).toMatchObject({ ok: false, error: { tipo: 'proveedor' } });
    expect(JSON.stringify(r)).not.toContain('tok-secreto');
    const sinRed = new AdaptadorWhatsAppNube({ token: 't', phoneNumberId: '1', dormir: sinEspera, fetch: (async () => { throw new TypeError('x'); }) as unknown as typeof fetch });
    expect(await sinRed.enviar(mensaje(), d)).toMatchObject({ ok: false, error: { tipo: 'sin_red' } });
  });

  it('verifies the webhook, applies states forward-only and registers BAJA', async () => {
    const { app, estados, reportes } = await montar();
    expect((await app.request('/reportes/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=vt&hub.challenge=42')).status).toBe(200);
    expect((await app.request('/reportes/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=mal&hub.challenge=42')).status).toBe(403);

    const payload = (statuses: unknown[], messages: unknown[] = []) => ({ entry: [{ changes: [{ value: { statuses, messages } }] }] });
    const post = (p: unknown, firmaValida = true) => {
      const crudo = JSON.stringify(p);
      const firma = `sha256=${createHmac('sha256', firmaValida ? 'app-secret' : 'otro').update(crudo).digest('hex')}`;
      return app.request('/reportes/whatsapp/webhook', { method: 'POST', headers: { 'x-hub-signature-256': firma }, body: crudo });
    };
    expect((await post(payload([{ id: 'w1', status: 'delivered' }]), false)).status).toBe(403);
    expect((await post(payload([{ id: 'w1', status: 'delivered' }]))).status).toBe(200);
    expect(estados.get('w1')).toBe('entregado');
    await post(payload([{ id: 'w1', status: 'sent' }])); // late "sent" must not go backwards
    expect(estados.get('w1')).toBe('entregado');
    await post(payload([{ id: 'w2', status: 'failed' }]));
    expect(estados.get('w2')).toBe('fallido');

    await post(payload([], [{ from: '51987654321', text: { body: ' baja ' } }]));
    const r = await app.request('/reportes/enviar', { method: 'POST', body: '{}' });
    expect(r.status).toBe(400);
    expect(reportes.bajas).toBeDefined();
    expect(aplicarEstadosWebhook({}, new Map())).toBe(0);
  });
});

describe('Resend-compatible e-mail provider', () => {
  const corto = { para: 'a@example.com', asunto: 'Hola\r\nBcc: x@y.z', texto: 'Texto' };
  it('posts to {baseUrl}/emails with a bearer key and strips header injection', async () => {
    let url = '';
    let body: any;
    const f = (async (u: string, init: RequestInit) => {
      url = u;
      body = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ id: 'em_1' }), { status: 200 });
    }) as unknown as typeof fetch;
    const p = new ProveedorCorreoResend({ apiKey: 'k', de: 'Rikuy <no-responder@example.com>', baseUrl: 'https://mail.example/', fetch: f });
    expect(await p.enviar(corto)).toEqual({ ok: true, valor: { id: 'em_1' } });
    expect(url).toBe('https://mail.example/emails');
    expect(body).toMatchObject({ from: 'Rikuy <no-responder@example.com>', to: ['a@example.com'] });
    expect(body.subject).not.toMatch(/[\r\n]/);
  });

  it('retries 503 and maps 429 to cuota, 422 to rebote, bad addresses to rebote', async () => {
    let n = 0;
    const f503 = (async () => (++n < 3 ? new Response('{}', { status: 503 }) : new Response('{"id":"x"}', { status: 200 }))) as unknown as typeof fetch;
    expect((await new ProveedorCorreoResend({ apiKey: 'k', de: 'a@b.co', fetch: f503, dormir: sinEspera }).enviar(corto)).ok).toBe(true);
    const mk = (s: number) => new ProveedorCorreoResend({ apiKey: 'k', de: 'a@b.co', fetch: (async () => new Response('{}', { status: s })) as unknown as typeof fetch, dormir: sinEspera });
    expect(await mk(429).enviar(corto)).toMatchObject({ ok: false, error: { tipo: 'cuota' } });
    expect(await mk(422).enviar(corto)).toMatchObject({ ok: false, error: { tipo: 'rebote' } });
    expect(await mk(200).enviar({ ...corto, para: 'no es correo' })).toMatchObject({ ok: false, error: { tipo: 'rebote' } });
  });
});

/** A tiny scripted SMTP server (no TLS) to exercise the client. */
function servidorSmtp(opciones: { rechazarRcpt?: boolean } = {}) {
  const comandos: string[] = [];
  let datos = '';
  const servidor = net.createServer((s) => {
    let enDatos = false;
    s.on('error', () => {}); // the client may destroy the socket right after QUIT
    s.write('220 fake ESMTP\r\n');
    s.on('data', (d) => {
      const texto = d.toString();
      if (enDatos) {
        datos += texto;
        if (datos.endsWith('\r\n.\r\n')) {
          enDatos = false;
          s.write('250 queued\r\n');
        }
        return;
      }
      for (const linea of texto.split('\r\n').filter(Boolean)) {
        comandos.push(linea);
        if (linea.startsWith('EHLO')) s.write('250-fake\r\n250 AUTH PLAIN\r\n');
        else if (linea.startsWith('AUTH PLAIN')) s.write('235 ok\r\n');
        else if (linea.startsWith('MAIL FROM')) s.write('250 ok\r\n');
        else if (linea.startsWith('RCPT TO')) s.write(opciones.rechazarRcpt ? '550 no such user\r\n' : '250 ok\r\n');
        else if (linea === 'DATA') {
          enDatos = true;
          s.write('354 go\r\n');
        } else if (linea === 'QUIT') s.end('221 bye\r\n');
      }
    });
  });
  return new Promise<{ port: number; comandos: string[]; datos: () => string; cerrar: () => void }>((res) =>
    servidor.listen(0, '127.0.0.1', () => res({ port: (servidor.address() as net.AddressInfo).port, comandos, datos: () => datos, cerrar: () => servidor.close() })),
  );
}

describe('SMTP e-mail provider', () => {
  const correo = { para: 'familia@example.com', asunto: 'Informe de la semana: ñandú', texto: 'Texto con tildes: péndulo', html: '<p>Hola</p>', cabeceras: { 'List-Unsubscribe': '<https://x/baja>' } };

  it('speaks SMTP with AUTH PLAIN and sends an encoded multipart message (test server, no TLS allowed explicitly)', async () => {
    const s = await servidorSmtp();
    const p = new ProveedorCorreoSmtp({ host: '127.0.0.1', port: s.port, de: 'Rikuy <no-responder@example.com>', usuario: 'u', clave: 'c', permitirSinTls: true, timeoutMs: 3000 });
    const r = await p.enviar(correo);
    s.cerrar();
    expect(r.ok).toBe(true);
    expect(s.comandos).toContain('MAIL FROM:<no-responder@example.com>');
    expect(s.comandos).toContain('RCPT TO:<familia@example.com>');
    expect(s.comandos.some((c) => c === `AUTH PLAIN ${Buffer.from('\0u\0c').toString('base64')}`)).toBe(true);
    const d = s.datos();
    expect(d).toContain('multipart/alternative');
    expect(d).toContain('List-Unsubscribe: <https://x/baja>');
    expect(d).toMatch(/Subject: =\?UTF-8\?B\?/);
    expect(d).not.toContain('péndulo'); // body is base64
    expect(Buffer.from(d.split('\r\n\r\n')[2]!.split('\r\n--')[0]!.replace(/\r\n/g, ''), 'base64').toString()).toContain('péndulo');
  });

  it('refuses to send credentials or mail without TLS by default', async () => {
    const s = await servidorSmtp();
    const p = new ProveedorCorreoSmtp({ host: '127.0.0.1', port: s.port, de: 'a@example.com', usuario: 'u', clave: 'c', timeoutMs: 3000 });
    const r = await p.enviar(correo);
    s.cerrar();
    expect(r).toMatchObject({ ok: false, error: { tipo: 'proveedor' } });
    expect(s.comandos.some((c) => c.startsWith('AUTH'))).toBe(false);
    expect(s.comandos.some((c) => c.startsWith('MAIL'))).toBe(false);
  });

  it('maps a rejected recipient to rebote and a refused connection to sin_red', async () => {
    const s = await servidorSmtp({ rechazarRcpt: true });
    const p = new ProveedorCorreoSmtp({ host: '127.0.0.1', port: s.port, de: 'a@example.com', permitirSinTls: true, timeoutMs: 3000 });
    expect(await p.enviar(correo)).toMatchObject({ ok: false, error: { tipo: 'rebote' } });
    s.cerrar();
    const cerrado = new ProveedorCorreoSmtp({ host: '127.0.0.1', port: 1, de: 'a@example.com', permitirSinTls: true, timeoutMs: 1000 });
    expect(await cerrado.enviar(correo)).toMatchObject({ ok: false, error: { tipo: 'sin_red' } });
  });

  it('blocks header injection in the recipient', async () => {
    const p = new ProveedorCorreoSmtp({ host: '127.0.0.1', port: 1, de: 'a@example.com', permitirSinTls: true });
    expect(await p.enviar({ ...correo, para: 'x@example.com\r\nBcc: y@example.com' })).toMatchObject({ ok: false, error: { tipo: 'rebote' } });
  });
});
