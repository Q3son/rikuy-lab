/**
 * Family link (3.6): `https://<origin>/#/p/<base64url(deflate)>.<crc36>`, Yaku's link format
 * (adapted from Yaku by agentards). The payload lives in the fragment, so no server ever sees it.
 */
import type { Paquete } from '@rikuy/contracts';
import { b64urlDecode, b64urlEncode } from './base64url.ts';
import { crc32 } from './crc32.ts';
import { packBytes, unpackBytes } from './rk1.ts';

export function encodeLink(p: Paquete, origin: string): string {
  const z = packBytes(p);
  const base = origin.split('#')[0];
  return `${base}#/p/${b64urlEncode(z)}.${crc32(z).toString(36)}`;
}

/** Accepts a full URL or just its hash. Returns null when it is not a package link. */
export function decodeLink(urlOrHash: string): Paquete | null {
  const hash = urlOrHash.slice(urlOrHash.indexOf('#'));
  const m = /^#\/p\/([A-Za-z0-9_-]+)\.([0-9a-z]+)$/.exec(hash);
  if (!m) return null;
  const z = b64urlDecode(m[1]);
  if (crc32(z) !== parseInt(m[2], 36)) throw new Error('CRC32 mismatch in link');
  return unpackBytes(z);
}
