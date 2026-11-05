/**
 * Per-student encryption and crypto-erase (primitives for F4's learning memory, 3.10).
 * Each student gets a non-extractable AES-GCM-256 key; `forget` deletes it and leaves a
 * tombstone, so everything encrypted for that student becomes unreadable for good.
 * Blob format: base64url(iv[12] || ciphertext).
 */
import { b64urlDecode, b64urlEncode } from './codec/base64url.ts';

export interface KeyStore {
  get(estudianteId: string): Promise<CryptoKey | 'forgotten' | undefined>;
  put(estudianteId: string, key: CryptoKey | 'forgotten'): Promise<void>;
  delete(estudianteId: string): Promise<void>;
}

export function createMemoryKeyStore(): KeyStore {
  const m = new Map<string, CryptoKey | 'forgotten'>();
  return {
    get: async (id) => (m.get(id) === 'forgotten' ? undefined : m.get(id)),
    put: async (id, k) => void m.set(id, k),
    delete: async (id) => void m.set(id, 'forgotten'),
  };
}

export interface StudentVault {
  encrypt(estudianteId: string, plaintext: string): Promise<string>;
  decrypt(estudianteId: string, blob: string): Promise<string>;
  forget(estudianteId: string): Promise<void>;
}

const AES = { name: 'AES-GCM', length: 256 } as const;
const buf = (b: Uint8Array): ArrayBuffer => b.slice().buffer as ArrayBuffer;

export function createStudentVault(store: KeyStore, subtle: SubtleCrypto = globalThis.crypto.subtle): StudentVault {
  const forgotten = new Set<string>();

  const key = async (id: string, create: boolean): Promise<CryptoKey> => {
    if (forgotten.has(id)) throw new Error(`student ${id} was forgotten`);
    const k = await store.get(id);
    if (k === 'forgotten') throw new Error(`student ${id} was forgotten`);
    if (k) return k;
    if (!create) throw new Error(`student ${id} was forgotten or has no key`);
    const fresh = (await subtle.generateKey(AES, false, ['encrypt', 'decrypt'])) as CryptoKey;
    await store.put(id, fresh);
    return fresh;
  };

  return {
    async encrypt(id, plaintext) {
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, await key(id, true), buf(new TextEncoder().encode(plaintext))));
      const out = new Uint8Array(iv.length + ct.length);
      out.set(iv);
      out.set(ct, iv.length);
      return b64urlEncode(out);
    },
    async decrypt(id, blob) {
      const k = await key(id, false).catch((e: Error) => {
        throw new Error(e.message.includes('forgotten') ? e.message : `student ${id} was forgotten or has no key`);
      });
      const bytes = b64urlDecode(blob);
      const plain = await subtle.decrypt({ name: 'AES-GCM', iv: buf(bytes.slice(0, 12)) }, k, buf(bytes.slice(12)));
      return new TextDecoder().decode(plain);
    },
    async forget(id) {
      forgotten.add(id);
      await store.delete(id);
    },
  };
}
