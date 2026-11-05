/**
 * Dependencies of the report delivery (FUNCIONES_EXTRA 1.6). The cloud is a transport, not the owner of the data:
 * contacts travel in the request and are never stored; only an opaque opt-out key and an idempotency record
 * (no contact) are kept.
 */
import { aBase64Url, deBase64Url } from '@rikuy/ai';
import type { AcuseEnvio, Canal, PuertoEntrega } from '@rikuy/mensajeria';
import type { EstadosWhatsApp } from './whatsapp-nube.ts';

export interface RepositorioBajas {
  agregar(clave: string): void;
  tiene(clave: string): boolean;
}
export class RepositorioBajasMemoria implements RepositorioBajas {
  private readonly s = new Set<string>();
  agregar(clave: string) {
    this.s.add(clave);
  }
  tiene(clave: string) {
    return this.s.has(clave);
  }
}

export interface RegistroEnvio {
  ts: string;
  canal: Canal;
  plantilla: string;
  estado: string;
}

export interface DepsReportes {
  adaptadores: Partial<Record<Canal, PuertoEntrega>>;
  bajas: RepositorioBajas;
  /** HMAC secret for opt-out links and contact hashing. From the environment. */
  secreto: string;
  /** Public base URL of this gateway, for the unsubscribe link. */
  urlPublica: string;
  idempotencia: Map<string, { acuse: AcuseEnvio; expira: number }>;
  /** Metadata only: no contact, no text. */
  bitacora: RegistroEnvio[];
  whatsapp?: { verifyToken: string; appSecret?: string; estados: EstadosWhatsApp };
}

export const TTL_IDEMPOTENCIA_MS = 48 * 60 * 60 * 1000;

const enc = new TextEncoder();
async function hmac(secreto: string, texto: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(texto)));
}

export const claveBajaRef = (ref: string): string => `ref:${ref}`;

/** Opt-out key for a phone or e-mail: a keyed hash, so the contact itself is not stored. */
export async function claveBajaContacto(secreto: string, direccion: string): Promise<string> {
  let normal = direccion.trim().toLowerCase();
  if (!normal.includes('@')) {
    normal = normal.replace(/\D/g, '');
    if (/^9\d{8}$/.test(normal)) normal = `51${normal}`; // same key for 987654321 and 51987654321
  }
  return `c:${aBase64Url(await hmac(secreto, `contacto|${normal}`))}`;
}

/** One-click opt-out token for the footer link: `<base64url(ref)>.<hmac>`. */
export async function tokenBaja(secreto: string, ref: string): Promise<string> {
  const r = aBase64Url(enc.encode(ref));
  return `${r}.${aBase64Url(await hmac(secreto, `baja|${r}`))}`;
}

export async function refDeTokenBaja(secreto: string, token: string): Promise<string | undefined> {
  const [r, firma] = token.split('.');
  if (!r || !firma) return undefined;
  const esperado = aBase64Url(await hmac(secreto, `baja|${r}`));
  if (esperado.length !== firma.length) return undefined;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ firma.charCodeAt(i);
  return dif === 0 ? new TextDecoder().decode(deBase64Url(r)) : undefined;
}
