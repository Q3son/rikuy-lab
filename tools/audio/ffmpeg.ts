/**
 * Locates the ffmpeg binary: FFMPEG_PATH first (an explicit path that must exist), then PATH.
 * No fallback is guessed: when nothing is found the caller gets null and reports it.
 */
import { existsSync } from 'node:fs';
import { posix, win32 } from 'node:path';

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

  // El separador y la forma de unir rutas dependen de la plataforma pedida,
  // no de la máquina que corre el código (así la prueba de Windows pasa en Linux).
  const rutas = plataforma === 'win32' ? win32 : posix;
  const join = rutas.join;
  const nombres = plataforma === 'win32' ? ['ffmpeg.exe', 'ffmpeg'] : ['ffmpeg'];
  const directorios = (env['PATH'] ?? env['Path'] ?? '').split(rutas.delimiter).filter((d) => d.length > 0);
  for (const directorio of directorios) {
    for (const nombre of nombres) {
      const ruta = join(directorio, nombre);
      if (existe(ruta)) return ruta;
    }
  }
  return null;
}
