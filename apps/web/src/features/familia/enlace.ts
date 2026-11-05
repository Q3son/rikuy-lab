/**
 * Family link (ARQUITECTURA 3.6): `https://<origin>/#/p/<base64url(deflate(JSON))>.<crc36>`.
 * The content lives in the fragment, so no server ever sees it; once the PWA is installed it opens offline.
 */
import { deflateRaw, inflateRaw } from 'pako';
import { crc32 } from '@rikuy/sync';

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

function aBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): Uint8Array {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function codificarEnlace(valor: unknown): string {
  const comprimido = deflateRaw(new TextEncoder().encode(JSON.stringify(valor)));
  return `${aBase64Url(comprimido)}.${crc32(comprimido).toString(36)}`;
}

export function decodificarEnlace(carga: string): Resultado<unknown> {
  const punto = carga.lastIndexOf('.');
  if (punto < 1) return { ok: false, error: 'El enlace está incompleto.' };
  try {
    const comprimido = deBase64Url(carga.slice(0, punto));
    if (crc32(comprimido).toString(36) !== carga.slice(punto + 1)) return { ok: false, error: 'El enlace se cortó al copiarlo.' };
    return { ok: true, valor: JSON.parse(new TextDecoder().decode(inflateRaw(comprimido))) as unknown };
  } catch {
    return { ok: false, error: 'No se pudo abrir el enlace.' };
  }
}

/** Full URL for sharing. `base` is the page origin and path, without any hash. */
export function urlDeFamilia(base: string, valor: unknown): string {
  return `${base.split('#')[0]}#/p/${codificarEnlace(valor)}`;
}
