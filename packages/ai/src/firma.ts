/**
 * Teacher signature of a practice package (ECDSA P-256 / SHA-256 over canonical JSON), with WebCrypto only.
 * F2 owns the real `Cripto` port; this keeps the Creador chain closed end to end until it lands.
 * The signature is base64url of the raw (IEEE P1363) 64-byte value that WebCrypto produces.
 */
import type { Paquete, Practica } from '@rikuy/contracts';

type Clave = Parameters<typeof crypto.subtle.sign>[1];
type ClavePublica = Parameters<typeof crypto.subtle.verify>[1];
type Bytes = Parameters<typeof crypto.subtle.digest>[1];

const ALGORITMO = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const FIRMA = { name: 'ECDSA', hash: 'SHA-256' } as const;
const enc = new TextEncoder();

/** JSON with sorted keys, so signer and verifier agree on the bytes. */
export function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

export function aBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function deBase64Url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export async function sha256Hex(texto: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(texto)));
  return [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generarParClaves(): Promise<{ privada: Clave; publica: ClavePublica }> {
  const par = (await crypto.subtle.generateKey(ALGORITMO, true, ['sign', 'verify'])) as { privateKey: Clave; publicKey: ClavePublica };
  return { privada: par.privateKey, publica: par.publicKey };
}

export async function exportarClavePublica(k: ClavePublica): Promise<string> {
  return aBase64Url(new Uint8Array(await crypto.subtle.exportKey('spki', k)));
}
export async function importarClavePublica(b64: string): Promise<ClavePublica> {
  return crypto.subtle.importKey('spki', deBase64Url(b64) as Bytes, ALGORITMO, true, ['verify']);
}

/** Hybrid logical clock stamp: msUnix(13)-counter(4)-node(8). The real HLC lives in @rikuy/core (F2). */
export function hlcAhora(nodo = 'creador1', ahora = Date.now()): string {
  return `${String(ahora).padStart(13, '0')}-0000-${nodo.toLowerCase().replace(/[^0-9a-z]/g, '0').padEnd(8, '0').slice(0, 8)}`;
}

export function paquetePractica(practica: Practica, emisor: string, creado = hlcAhora()): Omit<Paquete, 'firma'> {
  return { v: 1, tipo: 'practica', emisor, creado, cuerpo: practica };
}

function bytesAFirmar(p: Omit<Paquete, 'firma'>): Uint8Array {
  return enc.encode(canonico({ ...p, firma: undefined }));
}

export async function firmarPaquete(sobre: Omit<Paquete, 'firma'>, privada: Clave): Promise<Paquete> {
  const firma = new Uint8Array(await crypto.subtle.sign(FIRMA, privada, bytesAFirmar(sobre) as Bytes));
  return { ...sobre, firma: aBase64Url(firma) };
}

export async function verificarPaquete(p: Paquete, clavePublicaB64: string): Promise<boolean> {
  if (!p.firma) return false;
  try {
    const clave = await importarClavePublica(clavePublicaB64);
    const { firma, ...sobre } = p;
    return await crypto.subtle.verify(FIRMA, clave, deBase64Url(firma) as Bytes, bytesAFirmar(sobre) as Bytes);
  } catch {
    return false;
  }
}
