import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { audioPara, coincideHash, validarManifiesto, type EntradaAudio, type ManifiestoAudio } from './manifiesto-audio.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const SHA = 'a'.repeat(64);

const entrada = (overrides: Partial<EntradaAudio> = {}): EntradaAudio => ({
  clave: 'pendulo.preguntaGuia',
  archivo: 'pendulo.preguntaGuia.opus',
  sha256: SHA,
  bytes: 24000,
  duracionS: 6.5,
  codec: 'opus',
  tasaKbps: 24,
  canales: 1,
  hablante: { seudonimo: 'Hablante 01', consentimientoRef: 'consentimientos/hablante-01.pdf' },
  variedad: 'Ayacucho-Chanka',
  revisado: true,
  ...overrides,
});

const manifiesto = (entradas: EntradaAudio[]): ManifiestoAudio => ({ version: 1, lengua: 'quy', entradas });

describe('validarManifiesto', () => {
  it('accepts a well-formed Opus 24 kbps entry', () => {
    expect(validarManifiesto(manifiesto([entrada()]))).toEqual([]);
  });

  it('accepts an empty manifest (no recordings yet)', () => {
    expect(validarManifiesto(manifiesto([]))).toEqual([]);
  });

  it('requires Opus at 24 kbps and mono', () => {
    expect(validarManifiesto(manifiesto([entrada({ codec: 'mp3' as never }) ]))).not.toEqual([]);
    expect(validarManifiesto(manifiesto([entrada({ tasaKbps: 64 as never })]))).not.toEqual([]);
    expect(validarManifiesto(manifiesto([entrada({ canales: 2 as never })]))).not.toEqual([]);
  });

  it('requires a lowercase SHA-256 hex digest', () => {
    expect(validarManifiesto(manifiesto([entrada({ sha256: 'ABC' })]))).not.toEqual([]);
    expect(validarManifiesto(manifiesto([entrada({ sha256: 'A'.repeat(64) })]))).not.toEqual([]);
  });

  it('names the file after its key (one file per key)', () => {
    expect(validarManifiesto(manifiesto([entrada({ archivo: 'otro.opus' })]))).not.toEqual([]);
    expect(validarManifiesto(manifiesto([entrada({ archivo: 'pendulo.preguntaGuia.wav' as never })]))).not.toEqual([]);
  });

  it('requires a pseudonym and a consent reference, never the consent itself', () => {
    expect(validarManifiesto(manifiesto([entrada({ hablante: { seudonimo: '', consentimientoRef: 'x' } })]))).not.toEqual([]);
    expect(validarManifiesto(manifiesto([entrada({ hablante: { seudonimo: 'H1', consentimientoRef: '' } })]))).not.toEqual([]);
  });

  it('rejects duplicate keys and keys that do not exist in the Spanish catalog', () => {
    expect(validarManifiesto(manifiesto([entrada(), entrada()]))).not.toEqual([]);
    expect(validarManifiesto(manifiesto([entrada({ clave: 'no.existe', archivo: 'no.existe.opus' })]))).not.toEqual([]);
  });

  it('rejects an unknown manifest version or language', () => {
    expect(validarManifiesto({ version: 2 as never, lengua: 'quy', entradas: [] })).not.toEqual([]);
    expect(validarManifiesto({ version: 1, lengua: 'xyz', entradas: [] })).not.toEqual([]);
  });
});

describe('audioPara', () => {
  const m = manifiesto([entrada(), entrada({ clave: 'pendulo.pista.1', archivo: 'pendulo.pista.1.opus', revisado: false })]);

  it('returns reviewed audio for the alumno role', () => {
    expect(audioPara(m, 'pendulo.preguntaGuia', 'alumno')?.sha256).toBe(SHA);
  });

  it('never returns unreviewed audio for the alumno role', () => {
    expect(audioPara(m, 'pendulo.pista.1', 'alumno')).toBeNull();
  });

  it('lets the docente hear drafts', () => {
    expect(audioPara(m, 'pendulo.pista.1', 'docente')?.revisado).toBe(false);
  });
});

describe('coincideHash', () => {
  it('compares bytes against a SHA-256 digest', async () => {
    const bytes = new TextEncoder().encode('abc');
    const digest = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    expect(await coincideHash(bytes, digest)).toBe(true);
    expect(await coincideHash(bytes, SHA)).toBe(false);
  });
});

describe('content/audio manifests', () => {
  const carpeta = join(aqui, '..', '..', '..', 'content', 'audio');
  it('every shipped manifest validates', () => {
    expect(existsSync(carpeta)).toBe(true);
    for (const lengua of readdirSync(carpeta)) {
      const ruta = join(carpeta, lengua, 'manifiesto.json');
      const contenido = JSON.parse(readFileSync(ruta, 'utf8')) as ManifiestoAudio;
      expect(contenido.lengua, lengua).toBe(lengua);
      expect(validarManifiesto(contenido), lengua).toEqual([]);
    }
  });
});
