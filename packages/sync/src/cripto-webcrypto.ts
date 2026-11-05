/**
 * WebCrypto adapter of the `Cripto` port (browsers and Node >= 19 expose `crypto.subtle`).
 * - Class MAC key: 32 random bytes, HMAC-SHA256.
 * - Teacher key: ECDSA P-256. The private key is generated non-extractable (it can be stored as a
 *   CryptoKey in IndexedDB but never exported); the public key travels as a raw point in base64url.
 */
import { b64urlDecode, b64urlEncode } from './codec/base64url.ts';
import type { ClavePrivada, Cripto } from './puertos.ts';

const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const ECDSA_SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;
const HMAC = { name: 'HMAC', hash: 'SHA-256' } as const;

const subtle = (): SubtleCrypto => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('WebCrypto is not available (needs a secure context)');
  return s;
};

const buf = (b: Uint8Array): ArrayBuffer => b.slice().buffer as ArrayBuffer;

export function createWebCrypto(): Cripto {
  const macKeys = new Map<string, Promise<CryptoKey>>();
  const pubKeys = new Map<string, Promise<CryptoKey>>();

  const macKey = (k: string) => {
    let p = macKeys.get(k);
    if (!p) macKeys.set(k, (p = subtle().importKey('raw', buf(b64urlDecode(k)), HMAC, false, ['sign'])));
    return p;
  };
  const pubKey = (k: string) => {
    let p = pubKeys.get(k);
    if (!p) pubKeys.set(k, (p = subtle().importKey('raw', buf(b64urlDecode(k)), ECDSA, false, ['verify'])));
    return p;
  };

  return {
    async hmac(claveMac, data) {
      return new Uint8Array(await subtle().sign('HMAC', await macKey(claveMac), buf(data)));
    },
    async sign(clavePrivada: ClavePrivada, data) {
      const sig = await subtle().sign(ECDSA_SIGN, clavePrivada as CryptoKey, buf(data));
      return b64urlEncode(new Uint8Array(sig));
    },
    async verify(clavePub, data, firma) {
      try {
        return await subtle().verify(ECDSA_SIGN, await pubKey(clavePub), buf(b64urlDecode(firma)), buf(data));
      } catch {
        return false;
      }
    },
  };
}

export interface ClassKeys {
  /** HMAC key shared with the groups through the join QR (base64url, 32 bytes). */
  claveMac: string;
  /** Teacher public key (base64url raw P-256 point). Goes into `Clase.claveClasePub`. */
  clavePub: string;
  /** Teacher private key: a non-extractable CryptoKey that never leaves the teacher device. */
  clavePrivada: CryptoKey;
}

export async function generateClassKeys(): Promise<ClassKeys> {
  const pair = (await subtle().generateKey(ECDSA, false, ['sign', 'verify'])) as CryptoKeyPair;
  const pub = new Uint8Array(await subtle().exportKey('raw', pair.publicKey));
  const mac = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return { claveMac: b64urlEncode(mac), clavePub: b64urlEncode(pub), clavePrivada: pair.privateKey };
}
