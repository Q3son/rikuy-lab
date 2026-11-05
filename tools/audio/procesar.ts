/**
 * Processes one recording (4.8, step 3): trims leading and trailing silence, normalizes
 * loudness to EBU R128 -16 LUFS, converts to mono and encodes Opus at 24 kbps.
 * It only processes recordings made by a speaker. It never generates speech.
 */
import { execFileSync } from 'node:child_process';

/** Trim silence at both ends (reverse, trim, reverse), then loudnorm to -16 LUFS. */
export const FILTRO_AUDIO = [
  'silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB',
  'areverse',
  'silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB',
  'areverse',
  'loudnorm=I=-16:TP=-1.5:LRA=11',
].join(',');

export function argumentosProcesado(entrada: string, salida: string): string[] {
  return [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', entrada,
    '-af', FILTRO_AUDIO,
    '-ac', '1',
    '-ar', '48000',
    '-c:a', 'libopus',
    '-b:a', '24k',
    '-application', 'voip',
    salida,
  ];
}

export function procesarGrabacion(ffmpeg: string, entrada: string, salida: string): void {
  execFileSync(ffmpeg, argumentosProcesado(entrada, salida));
}

/** Duration in seconds, read from the "Duration:" line that ffmpeg prints for an input. */
export function duracionDeAudio(ffmpeg: string, ruta: string): number {
  let stderr = '';
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-i', ruta], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (error) {
    // ffmpeg exits non-zero when there is no output file; the information is on stderr.
    stderr = String((error as { stderr?: Buffer | string }).stderr ?? '');
  }
  const coincidencia = /Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(stderr);
  if (!coincidencia) throw new Error(`No se pudo leer la duración de ${ruta}`);
  return Number(coincidencia[1]) * 3600 + Number(coincidencia[2]) * 60 + Number(coincidencia[3]);
}
