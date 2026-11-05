/**
 * Event and package seals (3.3, 3.5):
 * - every event carries `mac`: HMAC-SHA256 with the class key, truncated to 8 bytes, over the
 *   canonical event without `mac` (so it also covers `firma`);
 * - teacher-authority events also carry `firma`: ECDSA P-256 over the canonical event without
 *   `mac` and `firma`, verified with `Clase.claveClasePub`.
 */
import { TIPOS_AUTORIDAD_DOCENTE, type Evento, type Paquete } from '@rikuy/contracts';
import { err, ok, type Result } from '@rikuy/core';
import { canonicalBytes } from './canonico.ts';
import { b64urlEncode } from './codec/base64url.ts';
import type { ClavePrivada, Cripto } from './puertos.ts';

const MAC_BYTES = 8;
const AUTHORITY = new Set<string>(TIPOS_AUTORIDAD_DOCENTE);

export const isAuthorityType = (tipo: string): boolean => AUTHORITY.has(tipo);

const withoutSeals = (e: Evento) => ({ ...e, mac: undefined, firma: undefined });
const withoutMac = (e: Evento) => ({ ...e, mac: undefined });

async function macOf(cripto: Cripto, claveMac: string, e: Evento): Promise<string> {
  const full = await cripto.hmac(claveMac, canonicalBytes(withoutMac(e)));
  return b64urlEncode(full.slice(0, MAC_BYTES));
}

export interface SealOptions {
  cripto: Cripto;
  claveMac: string;
  /** Required for teacher-authority event types. */
  clavePrivada?: ClavePrivada;
  /** Only for tests that need to forge an unsigned authority event. */
  allowUnsignedForTests?: boolean;
}

export async function sealEvent(e: Evento, o: SealOptions): Promise<Evento> {
  let sealed: Evento = withoutSeals(e);
  if (isAuthorityType(e.tipo) && !o.allowUnsignedForTests) {
    if (o.clavePrivada === undefined) throw new Error(`"${e.tipo}" is a teacher-authority event and needs the teacher private key`);
    sealed = { ...sealed, firma: await o.cripto.sign(o.clavePrivada, canonicalBytes(sealed)) };
  }
  return { ...sealed, mac: await macOf(o.cripto, o.claveMac, sealed) };
}

export type SealError = 'mac' | 'firma';

export interface VerifyOptions {
  cripto: Cripto;
  claveMac: string;
  clavePub: string;
}

/** Acceptance rules 2 and 3 of 3.5. */
export async function verifyEventSeal(e: Evento, o: VerifyOptions): Promise<Result<void, SealError>> {
  if (!e.mac || e.mac !== (await macOf(o.cripto, o.claveMac, e))) return err('mac');
  if (isAuthorityType(e.tipo)) {
    if (!e.firma || !(await o.cripto.verify(o.clavePub, canonicalBytes(withoutSeals(e)), e.firma))) return err('firma');
  }
  return ok(undefined);
}

/** Teacher packages (practice, join) are ECDSA-signed over the canonical package without `firma`. */
export async function signPackage<P extends Paquete>(p: P, o: { cripto: Cripto; clavePrivada: ClavePrivada }): Promise<P> {
  const body = { ...p, firma: undefined };
  return { ...body, firma: await o.cripto.sign(o.clavePrivada, canonicalBytes(body)) };
}

export async function verifyPackage(p: Paquete, o: { cripto: Cripto; clavePub: string }): Promise<boolean> {
  if (!p.firma) return false;
  return o.cripto.verify(o.clavePub, canonicalBytes({ ...p, firma: undefined }), p.firma);
}
