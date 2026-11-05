/**
 * Locates the ffmpeg binary: FFMPEG_PATH first (an explicit path that must exist), then PATH.
 * No fallback is guessed: when nothing is found the caller gets null and reports it.
 */
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

export interface OpcionesResolver {
  env?: Record<string, string | undefined>;
  existe?: (ruta: string) => boolean;
  plataforma?: NodeJS.Platform;
}

export function resolverFfmpeg(opciones: OpcionesResolver = {}): string | null {
  const env = opciones.env ?? process.env;
  const existe = opciones.existe ?? existsSync;
  const plataforma = opciones.plataforma ?? process.platform;

  const explicito = env['FFMPEG_PATH'];
  if (explicito) {
    if (!existe(explicito)) throw new Error(`FFMPEG_PATH apunta a un archivo que no existe: ${explicito}`);
    return explicito;
  }

  const nombres = plataforma === 'win32' ? ['ffmpeg.exe', 'ffmpeg'] : ['ffmpeg'];
  const directorios = (env['PATH'] ?? env['Path'] ?? '').split(delimiter).filter((d) => d.length > 0);
  for (const directorio of directorios) {
    for (const nombre of nombres) {
      const ruta = join(directorio, nombre);
      if (existe(ruta)) return ruta;
    }
  }
  return null;
}
