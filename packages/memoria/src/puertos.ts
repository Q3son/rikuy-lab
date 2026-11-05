/** Ports of the memory (ARQUITECTURA 2.2): optional vector index and per-student cryptography. */
import type { MemoriaEntrada } from '@rikuy/contracts';

/** Optional embeddings index. Only the hub provides an adapter (Ollama `nomic-embed-text`); phones never load embedding models. */
export interface IndiceVectorial {
  indexar(entradas: readonly MemoriaEntrada[]): Promise<void>;
  /** Ids of the entries closest to the text, best first. */
  buscar(texto: string, limite: number): Promise<string[]>;
  quitar(ids: readonly string[]): Promise<void>;
}

export interface Cifrado {
  /** base64 */
  iv: string;
  /** base64 ciphertext */
  datos: string;
}

/**
 * Per-student encryption. Students' texts are encrypted with a key of their own; destroying the key
 * (`estudiante.olvidar`) leaves the append-only log intact but unreadable (cryptographic erasure).
 */
export interface Cripto {
  cifrar(estudianteId: string, texto: string): Promise<Cifrado>;
  /** `undefined` when the key no longer exists or does not belong to this student. */
  descifrar(estudianteId: string, c: Cifrado): Promise<string | undefined>;
  destruirClave(estudianteId: string): Promise<void>;
}

/** Where raw keys live (`claves` store of the device). Implemented by the Dexie adapter. */
export interface AlmacenClaves {
  leer(estudianteId: string): Promise<Uint8Array | undefined>;
  guardar(estudianteId: string, clave: Uint8Array): Promise<void>;
  borrar(estudianteId: string): Promise<void>;
}
