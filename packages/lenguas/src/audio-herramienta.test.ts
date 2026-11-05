import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validarManifiesto, type ManifiestoAudio } from './manifiesto-audio.ts';
import { resolverFfmpeg } from '../../../tools/audio/ffmpeg.ts';
import { argumentosProcesado, FILTRO_AUDIO, procesarGrabacion, duracionDeAudio } from '../../../tools/audio/procesar.ts';
import { actualizarManifiesto, entradaDesdeOpus, type DatosGrabacion } from '../../../tools/audio/manifiesto.ts';

const FFMPEG_CANDIDATO = 'C:/Users/marro/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';

function sistemaDeArchivos(existentes: string[]): (ruta: string) => boolean {
  const conjunto = new Set(existentes.map((r) => r.replace(/\\/g, '/')));
  return (ruta) => conjunto.has(ruta.replace(/\\/g, '/'));
}

/** Locates a working ffmpeg for the integration tests; undefined skips them. */
function ffmpegDisponible(): string | undefined {
  const explicito = process.env['FFMPEG_PATH'];
  if (explicito) return explicito;
  try {
    return resolverFfmpeg() ?? undefined;
  } catch {
    return undefined;
  }
}

const ffmpeg = ffmpegDisponible() ?? (sistemaDeArchivos([FFMPEG_CANDIDATO])(FFMPEG_CANDIDATO) ? FFMPEG_CANDIDATO : undefined);
const tieneFfmpeg = ffmpeg !== undefined;

function generarWav(carpeta: string, nombre: string, segundosSilencio: number, segundosTono: number): string {
  const ruta = join(carpeta, nombre);
  const filtro = [
    `aevalsrc=0:d=${segundosSilencio}`,
    `sine=frequency=440:duration=${segundosTono}`,
  ];
  // Concatenate silence, tone and silence so the trimming can be observed.
  execFileSync(ffmpeg!, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', filtro[0]!,
    '-f', 'lavfi', '-i', filtro[1]!,
    '-f', 'lavfi', '-i', `aevalsrc=0:d=${segundosSilencio}`,
    '-filter_complex', '[0][1][2]concat=n=3:v=0:a=1',
    '-ar', '48000', '-ac', '1', ruta,
  ]);
  return ruta;
}

describe('resolverFfmpeg', () => {
  it('uses FFMPEG_PATH when it points at an existing file', () => {
    const ruta = 'C:/herramientas/ffmpeg.exe';
    expect(resolverFfmpeg({ env: { FFMPEG_PATH: ruta }, existe: sistemaDeArchivos([ruta]) })).toBe(ruta);
  });

  it('fails loudly when FFMPEG_PATH is set but missing (no silent fallback)', () => {
    expect(() => resolverFfmpeg({ env: { FFMPEG_PATH: 'C:/nada/ffmpeg.exe' }, existe: sistemaDeArchivos([]) })).toThrow(/FFMPEG_PATH/);
  });

  it('searches PATH when FFMPEG_PATH is not set', () => {
    const env = { PATH: ['C:/uno', 'C:/dos'].join(';') };
    const existe = sistemaDeArchivos(['C:/dos/ffmpeg.exe']);
    const resuelto = resolverFfmpeg({ env, existe, plataforma: 'win32' });
    expect(resuelto?.replace(/\\/g, '/')).toBe('C:/dos/ffmpeg.exe');
  });

  it('returns null when ffmpeg is nowhere to be found', () => {
    expect(resolverFfmpeg({ env: { PATH: 'C:/uno' }, existe: sistemaDeArchivos([]), plataforma: 'win32' })).toBeNull();
  });
});

describe('argumentosProcesado', () => {
  it('encodes mono Opus at 24 kbps after EBU R128 loudness normalization to -16 LUFS', () => {
    const args = argumentosProcesado('in.wav', 'out.opus');
    expect(args).toContain('libopus');
    expect(args[args.indexOf('-b:a') + 1]).toBe('24k');
    expect(args[args.indexOf('-ac') + 1]).toBe('1');
    expect(args).toContain(FILTRO_AUDIO);
    expect(FILTRO_AUDIO).toContain('loudnorm=I=-16');
    expect(FILTRO_AUDIO).toContain('silenceremove');
  });
});

describe('entradaDesdeOpus and actualizarManifiesto', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'rikuy-audio-'));
  const contenido = Buffer.from('OggS-fake-opus-bytes');
  const ruta = join(carpeta, 'pendulo.preguntaGuia.opus');
  writeFileSync(ruta, contenido);
  const sha = createHash('sha256').update(contenido).digest('hex');

  const datos: DatosGrabacion = {
    clave: 'pendulo.preguntaGuia',
    opusPath: ruta,
    duracionS: 6.5,
    seudonimo: 'Hablante 01',
    consentimientoRef: 'consentimientos/hablante-01.pdf',
    variedad: 'Ayacucho-Chanka',
    revisado: true,
  };

  it('builds a manifest entry with the file hash, size and consent reference', () => {
    const entrada = entradaDesdeOpus(datos);
    expect(entrada).toMatchObject({ clave: 'pendulo.preguntaGuia', archivo: 'pendulo.preguntaGuia.opus', sha256: sha, bytes: contenido.length, codec: 'opus', tasaKbps: 24, canales: 1 });
    expect(entrada.hablante.consentimientoRef).toBe('consentimientos/hablante-01.pdf');
  });

  it('replaces an existing entry with the same key and keeps the manifest valid', () => {
    const vacio: ManifiestoAudio = { version: 1, lengua: 'quy', entradas: [] };
    const una = actualizarManifiesto(vacio, entradaDesdeOpus(datos));
    const otra = actualizarManifiesto(una, entradaDesdeOpus({ ...datos, duracionS: 7 }));
    expect(otra.entradas).toHaveLength(1);
    expect(otra.entradas[0]?.duracionS).toBe(7);
    expect(validarManifiesto(otra)).toEqual([]);
  });

  it('refuses to write an entry without a consent reference', () => {
    const vacio: ManifiestoAudio = { version: 1, lengua: 'quy', entradas: [] };
    expect(() => actualizarManifiesto(vacio, entradaDesdeOpus({ ...datos, consentimientoRef: '' }))).toThrow(/consentimientoRef/);
  });
});

describe.skipIf(!tieneFfmpeg)('pipeline with a generated sine fixture (needs ffmpeg)', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'rikuy-audio-ff-'));

  it('trims silence, normalizes loudness and writes mono Opus at about 24 kbps', () => {
    const wav = generarWav(carpeta, 'seno.wav', 1, 1.5);
    const salida = join(carpeta, 'seno.opus');
    procesarGrabacion(ffmpeg!, wav, salida);
    const bytes = readFileSync(salida);
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('OggS');
    const duracion = duracionDeAudio(ffmpeg!, salida);
    // 2.5 s of input with 2 s of silence: the trim must remove most of it.
    expect(duracion).toBeLessThan(2.2);
    expect(duracion).toBeGreaterThan(0.5);
    const kbps = (statSync(salida).size * 8) / duracion / 1000;
    expect(kbps).toBeGreaterThan(8);
    expect(kbps).toBeLessThan(40);
  });

  it('produces a hash that matches the bytes on disk', () => {
    const wav = generarWav(carpeta, 'seno2.wav', 0, 1);
    const salida = join(carpeta, 'seno2.opus');
    procesarGrabacion(ffmpeg!, wav, salida);
    const entrada = entradaDesdeOpus({
      clave: 'seno2',
      opusPath: salida,
      duracionS: duracionDeAudio(ffmpeg!, salida),
      seudonimo: 'Prueba',
      consentimientoRef: 'sin-consentimiento-real-solo-prueba',
      variedad: 'prueba',
      revisado: false,
    });
    const sha = createHash('sha256').update(readFileSync(salida)).digest('hex');
    expect(entrada.sha256).toBe(sha);
  });
});
