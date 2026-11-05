/**
 * RK1 QR relay format (3.6), adapted from Yaku by agentards (agentards__yaku/src/codec.ts:
 * deflate-raw + CRC32 + Base45 fragments and a reassembler tolerant to disorder, duplicates and
 * interleaved messages), reused with the authors' permission.
 *
 *   RK1:<T>:<msg>:<i>:<n>:<crc>:<fragment>
 *   T = E events | P practice | J join | A ack | F family summary
 *   msg = 4 base36 chars derived from the CRC, i/n from 1 (n <= 999), crc = CRC32 base36,
 *   fragment <= 450 Base45 chars.  Body = Base45(deflateRaw(positional JSON of the package)).
 *
 * Compression uses pako (synchronous and deterministic on every browser); the native
 * CompressionStream would make encoding async for no gain at these sizes.
 */
import { MARCO_QR_REGEX, MAX_CARACTERES_FRAGMENTO, PaqueteValidado, type Paquete, type TipoPaquete } from '@rikuy/contracts';
import { deflateRaw, inflateRaw } from 'pako';
import { base45Decode, base45Encode } from './base45.ts';
import { crc32 } from './crc32.ts';
import { fromPositional, toPositional } from './posicional.ts';

export type FrameType = 'E' | 'P' | 'J' | 'A' | 'F';

export const FRAME_TYPE: Record<TipoPaquete, FrameType> = {
  eventos: 'E',
  practica: 'P',
  union: 'J',
  ack: 'A',
  'resumen-familia': 'F',
};

const MAX_FRAMES = 999;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function packBytes(p: Paquete): Uint8Array {
  return deflateRaw(encoder.encode(JSON.stringify(toPositional(p))), { level: 9 });
}

export function unpackBytes(z: Uint8Array): Paquete {
  return fromPositional(JSON.parse(decoder.decode(inflateRaw(z))));
}

export interface EncodedFrames {
  frames: string[];
  jsonBytes: number;
  deflatedBytes: number;
  crc: number;
}

export function encodeFrames(p: Paquete, o: { fragment?: number } = {}): EncodedFrames {
  const size = Math.min(o.fragment ?? MAX_CARACTERES_FRAGMENTO, MAX_CARACTERES_FRAGMENTO);
  const json = JSON.stringify(toPositional(p));
  const z = packBytes(p);
  const crc = crc32(z);
  const b45 = base45Encode(z);
  const n = Math.max(1, Math.ceil(b45.length / size));
  if (n > MAX_FRAMES) throw new Error(`package too large for RK1: ${n} frames`);
  const msg = (crc % 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  const crcText = crc.toString(36).toUpperCase();
  const tipo = FRAME_TYPE[p.tipo];
  const frames = Array.from({ length: n }, (_, i) => `RK1:${tipo}:${msg}:${i + 1}:${n}:${crcText}:${b45.slice(i * size, (i + 1) * size)}`);
  return { frames, jsonBytes: encoder.encode(json).length, deflatedBytes: z.length, crc };
}

export interface Frame {
  tipo: FrameType;
  msg: string;
  i: number;
  n: number;
  crc: number;
  data: string;
}

export function parseFrame(text: string): Frame | null {
  // Never trim(): a space is a valid Base45 symbol. Only trailing line breaks are dropped.
  const m = MARCO_QR_REGEX.exec(text.replace(/[\r\n]+$/, ''));
  if (!m) return null;
  const i = Number(m[3]);
  const n = Number(m[4]);
  if (i < 1 || i > n || n > MAX_FRAMES) return null;
  return { tipo: m[1] as FrameType, msg: m[2], i, n, crc: parseInt(m[5], 36), data: m[6] };
}

export type AddResult =
  | { status: 'ignored' }
  | { status: 'progress'; tipo: FrameType; msg: string; have: number; n: number; duplicate: boolean }
  | { status: 'complete'; tipo: FrameType; msg: string; n: number; paquete: Paquete }
  | { status: 'error'; tipo: FrameType; msg: string; reason: string };

/** Rebuilds packages from frames read in any order, with repeats, from several messages at once. */
export class Reassembler {
  private readonly parts = new Map<string, { tipo: FrameType; n: number; crc: number; chunks: (string | undefined)[] }>();
  private readonly done = new Set<string>();

  add(text: string): AddResult {
    const f = parseFrame(text);
    if (!f) return { status: 'ignored' };
    const key = `${f.tipo}:${f.msg}:${f.crc}`;
    if (this.done.has(key)) return { status: 'progress', tipo: f.tipo, msg: f.msg, have: f.n, n: f.n, duplicate: true };
    let p = this.parts.get(key);
    if (!p) this.parts.set(key, (p = { tipo: f.tipo, n: f.n, crc: f.crc, chunks: new Array(f.n) }));
    if (p.n !== f.n) return { status: 'error', tipo: f.tipo, msg: f.msg, reason: 'inconsistent frame count' };
    const duplicate = p.chunks[f.i - 1] !== undefined;
    p.chunks[f.i - 1] = f.data;
    const have = p.chunks.filter((c) => c !== undefined).length;
    if (have < p.n) return { status: 'progress', tipo: f.tipo, msg: f.msg, have, n: p.n, duplicate };
    this.parts.delete(key);
    try {
      const z = base45Decode(p.chunks.join(''));
      if (crc32(z) !== p.crc) return { status: 'error', tipo: f.tipo, msg: f.msg, reason: 'CRC32 mismatch' };
      const paquete = unpackBytes(z);
      if (!PaqueteValidado.safeParse(paquete).success || FRAME_TYPE[paquete.tipo] !== f.tipo) {
        return { status: 'error', tipo: f.tipo, msg: f.msg, reason: 'invalid package' };
      }
      this.done.add(key);
      return { status: 'complete', tipo: f.tipo, msg: f.msg, n: p.n, paquete };
    } catch (e) {
      return { status: 'error', tipo: f.tipo, msg: f.msg, reason: (e as Error).message };
    }
  }

  /** Messages still incomplete: how many frames each one has. */
  pending(): { key: string; have: number; n: number }[] {
    return [...this.parts.entries()].map(([key, p]) => ({ key, have: p.chunks.filter((c) => c !== undefined).length, n: p.n }));
  }
}
