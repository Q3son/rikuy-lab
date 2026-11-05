/** AES-GCM adapter of the `Cripto` port with one key per student (Web Crypto, no network). */
import type { AlmacenClaves, Cifrado, Cripto } from './puertos.ts';

export type { AlmacenClaves } from './puertos.ts';

const aBase64 = (b: Uint8Array): string => btoa(String.fromCharCode(...b));
const deBase64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function criptoWebCrypto(almacen: AlmacenClaves): Cripto {
  const subtle = globalThis.crypto.subtle;
  const importar = (raw: Uint8Array<ArrayBuffer>) => subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const aad = (estudianteId: string) => new TextEncoder().encode(estudianteId);

  return {
    async cifrar(estudianteId, texto): Promise<Cifrado> {
      let raw = await almacen.leer(estudianteId);
      if (!raw) {
        raw = globalThis.crypto.getRandomValues(new Uint8Array(32));
        await almacen.guardar(estudianteId, raw);
      }
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
      const clave = await importar(Uint8Array.from(raw));
      const datos = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(estudianteId) }, clave, new TextEncoder().encode(texto));
      return { iv: aBase64(iv), datos: aBase64(new Uint8Array(datos)) };
    },
    async descifrar(estudianteId, c) {
      const raw = await almacen.leer(estudianteId);
      if (!raw) return undefined;
      try {
        const clave = await importar(Uint8Array.from(raw));
        const plano = await subtle.decrypt({ name: 'AES-GCM', iv: deBase64(c.iv), additionalData: aad(estudianteId) }, clave, deBase64(c.datos));
        return new TextDecoder().decode(plano);
      } catch {
        return undefined;
      }
    },
    async destruirClave(estudianteId) {
      await almacen.borrar(estudianteId);
    },
  };
}
