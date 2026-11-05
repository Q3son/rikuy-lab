/**
 * Audio manifest (4.8, step 4 of the pipeline). One Opus file per catalog key, recorded
 * by a native speaker (Quechua and Aymara have no TTS). The manifest carries the
 * SHA-256 of each file; the file name is the key. Consent lives outside the repo: the
 * manifest only holds a reference to it.
 */
import { CATALOGOS } from './catalogos.ts';
import { REGISTRO_LENGUAS } from './registro.ts';

export const TASA_OPUS_KBPS = 24;

export interface EntradaAudio {
  clave: string;
  archivo: string;
  sha256: string;
  bytes: number;
  duracionS: number;
  codec: 'opus';
  tasaKbps: 24;
  canales: 1;
  hablante: { seudonimo: string; consentimientoRef: string };
  variedad: string;
  revisado: boolean;
}

export interface ManifiestoAudio {
  version: 1;
  lengua: string;
  entradas: EntradaAudio[];
}

const SHA256 = /^[0-9a-f]{64}$/;

function errorEntrada(entrada: EntradaAudio, i: number): string[] {
  const p = `entradas[${i}] (${String(entrada.clave)})`;
  const errores: string[] = [];
  if (typeof entrada.clave !== 'string' || entrada.clave.trim() === '') errores.push(`${p}: clave obligatoria`);
  if (entrada.archivo !== `${entrada.clave}.opus`) errores.push(`${p}: el archivo debe llamarse <clave>.opus`);
  if (typeof entrada.sha256 !== 'string' || !SHA256.test(entrada.sha256)) errores.push(`${p}: sha256 debe ser hexadecimal minúscula de 64 caracteres`);
  if (!Number.isInteger(entrada.bytes) || entrada.bytes < 1) errores.push(`${p}: bytes debe ser un entero positivo`);
  if (typeof entrada.duracionS !== 'number' || !(entrada.duracionS > 0)) errores.push(`${p}: duracionS debe ser positiva`);
  if (entrada.codec !== 'opus') errores.push(`${p}: codec debe ser opus`);
  if (entrada.tasaKbps !== TASA_OPUS_KBPS) errores.push(`${p}: tasaKbps debe ser ${TASA_OPUS_KBPS}`);
  if (entrada.canales !== 1) errores.push(`${p}: canales debe ser 1 (mono)`);
  if (!entrada.hablante || typeof entrada.hablante.seudonimo !== 'string' || entrada.hablante.seudonimo.trim() === '') {
    errores.push(`${p}: hablante.seudonimo obligatorio`);
  }
  if (!entrada.hablante || typeof entrada.hablante.consentimientoRef !== 'string' || entrada.hablante.consentimientoRef.trim() === '') {
    errores.push(`${p}: hablante.consentimientoRef obligatorio (el consentimiento vive fuera del repositorio)`);
  }
  if (typeof entrada.variedad !== 'string' || entrada.variedad.trim() === '') errores.push(`${p}: variedad obligatoria`);
  if (typeof entrada.revisado !== 'boolean') errores.push(`${p}: revisado debe ser booleano`);
  return errores;
}

/** Structural and cross-checks for a manifest. An empty list means it is valid. */
export function validarManifiesto(manifiesto: ManifiestoAudio): string[] {
  const errores: string[] = [];
  if (manifiesto.version !== 1) errores.push('version debe ser 1');
  if (!(manifiesto.lengua in REGISTRO_LENGUAS)) errores.push(`lengua desconocida: ${manifiesto.lengua}`);
  if (!Array.isArray(manifiesto.entradas)) return [...errores, 'entradas debe ser una lista'];

  const vistas = new Set<string>();
  manifiesto.entradas.forEach((entrada, i) => {
    errores.push(...errorEntrada(entrada, i));
    if (vistas.has(entrada.clave)) errores.push(`clave duplicada: ${entrada.clave}`);
    vistas.add(entrada.clave);
    if (!(entrada.clave in CATALOGOS.es)) errores.push(`clave inexistente en es: ${entrada.clave}`);
  });
  return errores;
}

/**
 * Audio for a key. The alumno role only gets reviewed recordings; the docente role can hear drafts.
 */
export function audioPara(manifiesto: ManifiestoAudio, clave: string, rol: 'alumno' | 'docente'): EntradaAudio | null {
  const entrada = manifiesto.entradas.find((e) => e.clave === clave);
  if (!entrada) return null;
  if (rol === 'alumno' && entrada.revisado !== true) return null;
  return entrada;
}

/** Compares bytes with a hex SHA-256 digest (Web Crypto, so it runs in the browser and in Node). */
export async function coincideHash(bytes: BufferSource, sha256: string): Promise<boolean> {
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  const hex = Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
  return hex === sha256;
}
