/**
 * Ports declared by @rikuy/sync (2.2). Adapters: store-dexie (browser), apps/hub (SQLite),
 * apps/web (camera and QR).
 */
import type { Capacidad, Evento, Sesion, VectorVersion } from '@rikuy/contracts';

export type { Sesion, Transporte } from '@rikuy/contracts';

/**
 * Append-only event repository of one device. Idempotent by `id`. `(claseId, dispositivo, seq)`
 * is unique; sequences are contiguous per (claseId, dispositivo).
 */
export interface RepositorioEventos {
  /** Stores the events it does not have yet. Returns how many were new. */
  add(events: readonly Evento[]): Promise<number>;
  has(id: string): Promise<boolean>;
  /** Every event of a class (any order). */
  all(claseId: string): Promise<Evento[]>;
  /** Contiguous version vector of a class. */
  vector(claseId: string): Promise<VectorVersion>;
  /** Highest seq written by `dispositivo` in a class (0 when none). */
  lastSeq(claseId: string, dispositivo: string): Promise<number>;
}

/** Opaque private key handle (a non-extractable CryptoKey with WebCrypto). */
export type ClavePrivada = unknown;

/** Cryptographic primitives (WebCrypto in browsers and Node; a fake in property tests). */
export interface Cripto {
  /** HMAC-SHA256 with the class key (base64url, raw 32 bytes). */
  hmac(claveMac: string, data: Uint8Array): Promise<Uint8Array>;
  /** ECDSA P-256 / SHA-256 signature, base64url of r||s. */
  sign(clavePrivada: ClavePrivada, data: Uint8Array): Promise<string>;
  /** Verifies with the class public key (base64url, raw uncompressed point). */
  verify(clavePub: string, data: Uint8Array, firma: string): Promise<boolean>;
}

/**
 * Transport port of 3.7 (`Transporte`/`Sesion` from the contracts), widened with `broadcast`
 * (same-device tabs via BroadcastChannel). The contract `Capacidad` does not list it yet; see
 * PROPUESTAS_CONTRATOS.md.
 */
export type IdTransporte = Capacidad | 'broadcast';

export interface TransporteSync {
  readonly id: IdTransporte;
  abrir(claseId: string): Promise<Sesion>;
}
