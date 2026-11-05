/**
 * Glossary of Peruvian Sign Language (LSP) for museum signs (FUNCIONES_EXTRA 3.2 #7, 4.4 phase 1).
 * Every video is a placeholder until deaf LSP users and a local association validate it.
 * The schema is strict: entries carry no sign descriptions, so no sign is invented in code.
 */

export const TERMINOS_MIN = 12;
export const TERMINOS_MAX = 20;
export const VIDEO_MAX_BYTES = 2_500_000;
export const VIDEO_DURACION_MIN_S = 5;
export const VIDEO_DURACION_MAX_S = 10;

export type VideoLsp =
  | { estado: 'pendiente'; archivo: null; sha256: null; bytes: null; duracionS: null }
  | {
      estado: 'validado';
      archivo: string;
      sha256: string;
      bytes: number;
      duracionS: number;
      validadoPor: string;
      consentimientoImagenRef: string;
    };

export interface EntradaGlosarioLsp {
  id: string;
  termino: string;
  video: VideoLsp;
}

export interface GlosarioLsp {
  version: 1;
  lengua: 'lsp';
  validacion: { estado: 'pendiente' | 'validado'; nota: string };
  entradas: EntradaGlosarioLsp[];
}

const CLAVES_ENTRADA = ['id', 'termino', 'video'];
const CLAVES_VIDEO_PENDIENTE = ['estado', 'archivo', 'sha256', 'bytes', 'duracionS'];
const CLAVES_VIDEO_VALIDADO = ['estado', 'archivo', 'sha256', 'bytes', 'duracionS', 'validadoPor', 'consentimientoImagenRef'];
const SHA256 = /^[0-9a-f]{64}$/;

function extras(objeto: object, permitidas: string[]): string[] {
  return Object.keys(objeto).filter((k) => !permitidas.includes(k));
}

function errorVideo(p: string, video: VideoLsp): string[] {
  const errores: string[] = [];
  const v = video as unknown as Record<string, unknown>;
  if (video.estado === 'pendiente') {
    for (const k of extras(v, CLAVES_VIDEO_PENDIENTE)) errores.push(`${p}: campo no permitido en video: ${k}`);
    if (video.archivo !== null || video.sha256 !== null || video.bytes !== null || video.duracionS !== null) {
      errores.push(`${p}: un video pendiente no puede tener archivo, sha256, bytes ni duración`);
    }
    return errores;
  }
  if (video.estado !== 'validado') return [`${p}: estado de video desconocido`];
  for (const k of extras(v, CLAVES_VIDEO_VALIDADO)) errores.push(`${p}: campo no permitido en video: ${k}`);
  if (typeof video.archivo !== 'string' || !video.archivo.endsWith('.mp4')) errores.push(`${p}: el video validado debe ser .mp4 (H.264)`);
  if (typeof video.sha256 !== 'string' || !SHA256.test(video.sha256)) errores.push(`${p}: sha256 inválido`);
  if (!Number.isInteger(video.bytes) || video.bytes < 1) errores.push(`${p}: bytes inválidos`);
  else if (video.bytes > VIDEO_MAX_BYTES) errores.push(`${p}: el video pesa más de 2,5 MB`);
  if (typeof video.duracionS !== 'number' || video.duracionS < VIDEO_DURACION_MIN_S || video.duracionS > VIDEO_DURACION_MAX_S) {
    errores.push(`${p}: la duración debe estar entre ${VIDEO_DURACION_MIN_S} y ${VIDEO_DURACION_MAX_S} s`);
  }
  if (typeof video.validadoPor !== 'string' || video.validadoPor.trim() === '') errores.push(`${p}: validadoPor obligatorio (personas sordas y asociación)`);
  if (typeof video.consentimientoImagenRef !== 'string' || video.consentimientoImagenRef.trim() === '') {
    errores.push(`${p}: consentimientoImagenRef obligatorio`);
  }
  return errores;
}

/** Structural checks. An empty list means the glossary is valid. */
export function validarGlosarioLsp(glosario: GlosarioLsp): string[] {
  const errores: string[] = [];
  if (glosario.version !== 1) errores.push('version debe ser 1');
  if (glosario.lengua !== 'lsp') errores.push('lengua debe ser lsp');
  const n = glosario.entradas.length;
  if (n < TERMINOS_MIN || n > TERMINOS_MAX) errores.push(`el glosario debe tener entre ${TERMINOS_MIN} y ${TERMINOS_MAX} términos (tiene ${n})`);

  const ids = new Set<string>();
  glosario.entradas.forEach((entrada, i) => {
    const p = `entradas[${i}] (${String(entrada.id)})`;
    for (const k of extras(entrada, CLAVES_ENTRADA)) errores.push(`${p}: campo no permitido: ${k}`);
    if (typeof entrada.id !== 'string' || entrada.id.trim() === '') errores.push(`${p}: id obligatorio`);
    if (ids.has(entrada.id)) errores.push(`${p}: id duplicado`);
    ids.add(entrada.id);
    if (typeof entrada.termino !== 'string' || entrada.termino.trim() === '') errores.push(`${p}: término obligatorio`);
    errores.push(...errorVideo(p, entrada.video));
  });

  if (glosario.validacion.estado === 'validado' && glosario.entradas.some((e) => e.video.estado !== 'validado')) {
    errores.push('la validación global no puede estar "validado" mientras haya videos pendientes');
  }
  return errores;
}

/** Students see only validated videos. Teachers see every term, pending ones included. */
export function entradasVisibles(glosario: GlosarioLsp, rol: 'alumno' | 'docente'): EntradaGlosarioLsp[] {
  return rol === 'docente' ? glosario.entradas : glosario.entradas.filter((e) => e.video.estado === 'validado');
}
