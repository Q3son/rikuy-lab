/**
 * Processes one speaker recording and records it in the manifest.
 *
 *   node --experimental-strip-types tools/audio/cli.ts <lengua> <clave> <grabacion> \
 *     --seudonimo "Hablante 01" --consentimiento "consentimientos/hablante-01.pdf" \
 *     --variedad "Ayacucho-Chanka" [--revisado] [--sin-procesar]
 *
 * <grabacion> is a WAV or other audio file made by a native speaker. The tool never generates speech.
 * ffmpeg is found through FFMPEG_PATH, then PATH.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolverFfmpeg } from './ffmpeg.ts';
import { duracionDeAudio, procesarGrabacion } from './procesar.ts';
import { actualizarManifiesto, entradaDesdeOpus } from './manifiesto.ts';
import type { ManifiestoAudio } from '../../packages/lenguas/src/manifiesto-audio.ts';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function argumento(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

function main(): void {
  const args = process.argv.slice(2);
  const [lengua, clave, grabacion] = args;
  const seudonimo = argumento(args, '--seudonimo');
  const consentimiento = argumento(args, '--consentimiento');
  const variedad = argumento(args, '--variedad');
  const revisado = args.includes('--revisado');
  const sinProcesar = args.includes('--sin-procesar');

  if (!lengua || !clave || !grabacion || !seudonimo || !consentimiento || !variedad) {
    console.error('Uso: cli.ts <lengua> <clave> <grabacion> --seudonimo S --consentimiento R --variedad V [--revisado] [--sin-procesar]');
    process.exit(2);
  }
  if (!existsSync(grabacion)) {
    console.error(`No existe la grabación: ${grabacion}`);
    process.exit(2);
  }

  const ffmpeg = resolverFfmpeg();
  if (!ffmpeg) {
    console.error('No se encontró ffmpeg. Defina FFMPEG_PATH o agréguelo al PATH.');
    process.exit(2);
  }

  const carpeta = join(raiz, 'content', 'audio', lengua);
  mkdirSync(carpeta, { recursive: true });
  const opus = join(carpeta, `${clave}.opus`);
  if (sinProcesar) {
    writeFileSync(opus, readFileSync(grabacion));
  } else {
    procesarGrabacion(ffmpeg, grabacion, opus);
  }

  const rutaManifiesto = join(carpeta, 'manifiesto.json');
  const manifiesto: ManifiestoAudio = existsSync(rutaManifiesto)
    ? (JSON.parse(readFileSync(rutaManifiesto, 'utf8')) as ManifiestoAudio)
    : { version: 1, lengua, entradas: [] };

  const entrada = entradaDesdeOpus({
    clave,
    opusPath: opus,
    duracionS: duracionDeAudio(ffmpeg, opus),
    seudonimo,
    consentimientoRef: consentimiento,
    variedad,
    revisado,
  });
  const actualizado = actualizarManifiesto(manifiesto, entrada);
  writeFileSync(rutaManifiesto, `${JSON.stringify(actualizado, null, 2)}\n`, 'utf8');
  console.log(`Registrado ${clave} (${entrada.bytes} bytes, sha256 ${entrada.sha256}) en ${rutaManifiesto}`);
}

main();
