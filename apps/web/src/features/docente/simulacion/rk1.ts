/**
 * Provisional RK1 QR codec (ARQUITECTURA 3.6) used to mock F2's `@rikuy/sync` codec until it lands.
 * Format: `RK1:<T>:<msg>:<i>:<n>:<crc>:<fragment>`, body = Base45(deflateRaw(JSON)).
 * The teacher panel depends on the small port in `../puertos.ts`, not on this file.
 */
import { deflateRaw, inflateRaw } from 'pako';

const ALFABETO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
export const MAX_FRAGMENTO = 450;

export function base45Encode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      const n = bytes[i] * 256 + bytes[i + 1];
      out += ALFABETO[n % 45] + ALFABETO[Math.floor(n / 45) % 45] + ALFABETO[Math.floor(n / 2025)];
    } else {
      out += ALFABETO[bytes[i] % 45] + ALFABETO[Math.floor(bytes[i] / 45)];
    }
  }
  return out;
}

export function base45Decode(texto: string): Uint8Array {
  const valores = [...texto].map((c) => {
    const v = ALFABETO.indexOf(c);
    if (v < 0) throw new Error(`Invalid Base45 character: ${c}`);
    return v;
  });
  const out: number[] = [];
  for (let i = 0; i < valores.length; i += 3) {
    if (i + 2 < valores.length) {
      const n = valores[i] + valores[i + 1] * 45 + valores[i + 2] * 2025;
      if (n > 0xffff) throw new Error('Invalid Base45 triplet');
      out.push(n >> 8, n & 0xff);
    } else if (i + 1 < valores.length) {
      const n = valores[i] + valores[i + 1] * 45;
      if (n > 0xff) throw new Error('Invalid Base45 pair');
      out.push(n);
    } else throw new Error('Invalid Base45 length');
  }
  return Uint8Array.from(out);
}

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type TipoRk1 = 'E' | 'P' | 'J' | 'A' | 'F';

export function codificarRk1(tipo: TipoRk1, valor: unknown, maxFragmento = MAX_FRAGMENTO): string[] {
  const comprimido = deflateRaw(new TextEncoder().encode(JSON.stringify(valor)));
  const crc = crc32(comprimido).toString(36).toUpperCase();
  const msg = crc.padStart(4, '0').slice(-4);
  const cuerpo = base45Encode(comprimido);
  const n = Math.max(1, Math.ceil(cuerpo.length / maxFragmento));
  return Array.from({ length: n }, (_, i) => `RK1:${tipo}:${msg}:${i + 1}:${n}:${crc}:${cuerpo.slice(i * maxFragmento, (i + 1) * maxFragmento)}`);
}

export type ProgresoRk1 =
  | { estado: 'invalido' }
  | { estado: 'parcial'; tipo: TipoRk1; msg: string; recibidos: number; total: number; faltan: number }
  | { estado: 'completo'; tipo: TipoRk1; msg: string; valor: unknown };

const MARCO = /^RK1:([EPJAF]):([0-9A-Z]{4}):(\d{1,3}):(\d{1,3}):([0-9A-Z]{1,7}):([0-9A-Z $%*+\-./:]*)$/;

interface Parcial {
  tipo: TipoRk1;
  total: number;
  crc: string;
  partes: Map<number, string>;
}

/** Tolerates disorder, duplicates and interleaved messages. A corrupted message is dropped, never half-applied. */
export class ReensambladorRk1 {
  private readonly mensajes = new Map<string, Parcial>();

  agregar(texto: string): ProgresoRk1 {
    const m = MARCO.exec(texto.trim());
    if (!m) return { estado: 'invalido' };
    const tipo = m[1] as TipoRk1;
    const msg = m[2];
    const i = Number(m[3]);
    const n = Number(m[4]);
    if (i < 1 || n < 1 || i > n) return { estado: 'invalido' };
    const previo = this.mensajes.get(msg);
    const actual: Parcial = previo && previo.total === n && previo.crc === m[5] ? previo : { tipo, total: n, crc: m[5], partes: new Map() };
    if (!actual.partes.has(i)) actual.partes.set(i, m[6]);
    this.mensajes.set(msg, actual);
    if (actual.partes.size < n) {
      return { estado: 'parcial', tipo, msg, recibidos: actual.partes.size, total: n, faltan: n - actual.partes.size };
    }
    this.mensajes.delete(msg);
    try {
      const cuerpo = Array.from({ length: n }, (_, k) => actual.partes.get(k + 1) ?? '').join('');
      const comprimido = base45Decode(cuerpo);
      if (crc32(comprimido).toString(36).toUpperCase() !== actual.crc) return { estado: 'invalido' };
      const valor = JSON.parse(new TextDecoder().decode(inflateRaw(comprimido))) as unknown;
      return { estado: 'completo', tipo, msg, valor };
    } catch {
      return { estado: 'invalido' };
    }
  }
}
