/**
 * Upload rules of the plan reader: MIME whitelist checked against the magic bytes, count and size limits.
 * One PDF alone, or up to 10 photos; the total stays under Gemini's 20 MB inline-request limit once in base64. The bytes are only turned into inline parts for the model; nothing is stored.
 */
import { err, ok, type Result } from '../result.ts';
import type { ArchivoPlan } from './esquemas.ts';

export const LIMITES_PLAN = {
  maxArchivos: 10,
  maxBytesArchivo: 7 * 1024 * 1024,
  maxBytesTotal: 14 * 1024 * 1024,
  mimes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const,
};

export type CodigoArchivo = 'sin_archivos' | 'demasiados' | 'tipo_no_permitido' | 'contenido_no_coincide' | 'mezcla' | 'demasiado_grande';
export interface FalloArchivo {
  codigo: CodigoArchivo;
  detalle: string;
}

const empieza = (b: Uint8Array, firma: number[], desde = 0) => firma.every((x, i) => b[desde + i] === x);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

function coincide(mime: string, b: Uint8Array): boolean {
  switch (mime) {
    case 'application/pdf':
      return empieza(b, ascii('%PDF'));
    case 'image/jpeg':
      return empieza(b, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return empieza(b, [0x89, 0x50, 0x4e, 0x47]);
    case 'image/webp':
      return empieza(b, ascii('RIFF')) && empieza(b, ascii('WEBP'), 8);
    case 'image/heic':
    case 'image/heif':
      return empieza(b, ascii('ftyp'), 4);
    default:
      return false;
  }
}

function aBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const MB = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;

export function validarArchivosPlan(archivos: Array<{ mime: string; bytes: Uint8Array }>): Result<ArchivoPlan[], FalloArchivo> {
  if (archivos.length === 0) return err({ codigo: 'sin_archivos', detalle: 'Sube un PDF o fotos de tu planificación.' });
  if (archivos.length > LIMITES_PLAN.maxArchivos) return err({ codigo: 'demasiados', detalle: `Máximo ${LIMITES_PLAN.maxArchivos} fotos por envío.` });
  const pdfs = archivos.filter((a) => a.mime === 'application/pdf').length;
  if (pdfs > 1 || (pdfs === 1 && archivos.length > 1)) return err({ codigo: 'mezcla', detalle: 'Sube un solo PDF, o solo fotos.' });
  let total = 0;
  for (const a of archivos) {
    if (!(LIMITES_PLAN.mimes as readonly string[]).includes(a.mime)) return err({ codigo: 'tipo_no_permitido', detalle: 'Solo se aceptan PDF, JPG, PNG, WEBP o HEIC.' });
    if (a.bytes.length > LIMITES_PLAN.maxBytesArchivo) return err({ codigo: 'demasiado_grande', detalle: `Cada archivo puede pesar hasta ${MB(LIMITES_PLAN.maxBytesArchivo)}.` });
    if (!coincide(a.mime, a.bytes)) return err({ codigo: 'contenido_no_coincide', detalle: 'El contenido del archivo no corresponde a su tipo.' });
    total += a.bytes.length;
  }
  if (total > LIMITES_PLAN.maxBytesTotal) return err({ codigo: 'demasiado_grande', detalle: `El envío completo puede pesar hasta ${MB(LIMITES_PLAN.maxBytesTotal)}.` });
  return ok(archivos.map((a) => ({ mime: a.mime, base64: aBase64(a.bytes) })));
}
