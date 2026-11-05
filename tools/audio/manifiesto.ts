/**
 * Builds and updates content/audio/<lengua>/manifiesto.json (4.8, step 4). Each entry hashes
 * the processed Opus file. Consent is referenced by id only; the consent document stays outside the repo.
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { validarManifiesto, TASA_OPUS_KBPS, type EntradaAudio, type ManifiestoAudio } from '../../packages/lenguas/src/manifiesto-audio.ts';

export interface DatosGrabacion {
  clave: string;
  /** Processed Opus file. Its name must be <clave>.opus. */
  opusPath: string;
  duracionS: number;
  seudonimo: string;
  consentimientoRef: string;
  variedad: string;
  revisado: boolean;
}

export function entradaDesdeOpus(datos: DatosGrabacion): EntradaAudio {
  const archivo = basename(datos.opusPath);
  if (archivo !== `${datos.clave}.opus`) throw new Error(`El archivo debe llamarse ${datos.clave}.opus (tiene ${archivo})`);
  const contenido = readFileSync(datos.opusPath);
  const entrada: EntradaAudio = {
    clave: datos.clave,
    archivo,
    sha256: createHash('sha256').update(contenido).digest('hex'),
    bytes: statSync(datos.opusPath).size,
    duracionS: datos.duracionS,
    codec: 'opus',
    tasaKbps: TASA_OPUS_KBPS,
    canales: 1,
    hablante: { seudonimo: datos.seudonimo, consentimientoRef: datos.consentimientoRef },
    variedad: datos.variedad,
    revisado: datos.revisado,
  };
  return entrada;
}

/** Adds or replaces the entry for the key. Throws if the resulting manifest is invalid. */
export function actualizarManifiesto(manifiesto: ManifiestoAudio, entrada: EntradaAudio): ManifiestoAudio {
  const resto = manifiesto.entradas.filter((e) => e.clave !== entrada.clave);
  const actualizado: ManifiestoAudio = { ...manifiesto, entradas: [...resto, entrada].sort((a, b) => a.clave.localeCompare(b.clave)) };
  const errores = validarManifiesto(actualizado);
  if (errores.length > 0) throw new Error(`Manifiesto inválido:\n- ${errores.join('\n- ')}`);
  return actualizado;
}
