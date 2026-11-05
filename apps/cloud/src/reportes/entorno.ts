/** Builds the report delivery from environment variables. A missing key means the stand-in (mock) for that channel. */
import { AdaptadorEnlaceWame, AdaptadorEntregaSimulado, AdaptadorPdfLocal } from '@rikuy/mensajeria';
import { randomBytes } from 'node:crypto';
import { AdaptadorCorreo, ProveedorCorreoResend, ProveedorCorreoSimulado, type ProveedorCorreo } from './correo.ts';
import { RepositorioBajasMemoria, tokenBaja, type DepsReportes } from './deps.ts';
import { ProveedorCorreoSmtp } from './smtp.ts';
import { AdaptadorWhatsAppNube, type EstadosWhatsApp } from './whatsapp-nube.ts';

type Env = Record<string, string | undefined>;

export function crearProveedorCorreo(env: Env): { proveedor: ProveedorCorreo; simulado: boolean } {
  const de = env.EMAIL_FROM ?? 'Rikuy <no-responder@localhost>';
  const modo = (env.EMAIL_PROVIDER ?? (env.RESEND_API_KEY ? 'resend' : env.SMTP_HOST ? 'smtp' : 'mock')).toLowerCase();
  if (modo === 'resend' && env.RESEND_API_KEY) {
    return { proveedor: new ProveedorCorreoResend({ apiKey: env.RESEND_API_KEY, de, ...(env.RESEND_BASE_URL ? { baseUrl: env.RESEND_BASE_URL } : {}) }), simulado: false };
  }
  if (modo === 'smtp' && env.SMTP_HOST) {
    return {
      proveedor: new ProveedorCorreoSmtp({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT ?? (env.SMTP_SECURE === '1' ? 465 : 587)),
        secure: env.SMTP_SECURE === '1',
        de,
        ...(env.SMTP_USER ? { usuario: env.SMTP_USER, clave: env.SMTP_PASS ?? '' } : {}),
      }),
      simulado: false,
    };
  }
  return { proveedor: new ProveedorCorreoSimulado(), simulado: true };
}

export function crearReportesDesdeEntorno(env: Env): DepsReportes {
  const secreto = env.REPORTES_SECRETO ?? randomBytes(32).toString('hex'); // without it, opt-out links die with the process
  const urlPublica = (env.PUBLIC_URL ?? `http://localhost:${env.PORT ?? 8788}`).replace(/\/+$/, '');
  const estados: EstadosWhatsApp = new Map();
  const { proveedor } = crearProveedorCorreo(env);
  const whatsapp =
    env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID
      ? new AdaptadorWhatsAppNube({
          token: env.WHATSAPP_TOKEN,
          phoneNumberId: env.WHATSAPP_PHONE_ID,
          ...(env.WHATSAPP_TEMPLATE ? { plantilla: env.WHATSAPP_TEMPLATE } : {}),
          ...(env.WHATSAPP_API_VERSION ? { version: env.WHATSAPP_API_VERSION } : {}),
          estados,
        })
      : new AdaptadorEntregaSimulado({ canal: 'whatsapp' });
  return {
    adaptadores: {
      correo: new AdaptadorCorreo({ proveedor, urlBaja: async (ref) => `${urlPublica}/reportes/baja/${await tokenBaja(secreto, ref)}` }),
      whatsapp,
      enlace_wame: new AdaptadorEnlaceWame(),
      pdf: new AdaptadorPdfLocal(),
    },
    bajas: new RepositorioBajasMemoria(),
    secreto,
    urlPublica,
    idempotencia: new Map(),
    bitacora: [],
    ...(env.WHATSAPP_VERIFY_TOKEN ? { whatsapp: { verifyToken: env.WHATSAPP_VERIFY_TOKEN, ...(env.WHATSAPP_APP_SECRET ? { appSecret: env.WHATSAPP_APP_SECRET } : {}), estados } } : {}),
  };
}
