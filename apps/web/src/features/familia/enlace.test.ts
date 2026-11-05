import { PaqueteValidado } from '@rikuy/contracts';
import { ejemplos } from '@rikuy/contracts/fixtures';
import { describe, expect, it } from 'vitest';
import { codificarEnlace, decodificarEnlace, urlDeFamilia } from './enlace.ts';

const paquete = ejemplos.paquetePractica;

describe('family link #/p/<payload>', () => {
  it('round-trips a practice package', () => {
    const carga = codificarEnlace(paquete);
    const r = decodificarEnlace(carga);
    expect(r.ok).toBe(true);
    expect(r.ok && PaqueteValidado.safeParse(r.valor).success).toBe(true);
  });

  it('uses only URL-safe characters and ends with a base36 checksum', () => {
    const carga = codificarEnlace(paquete);
    expect(carga).toMatch(/^[A-Za-z0-9_-]+\.[0-9a-z]{1,7}$/);
  });

  it('is light enough for a basic phone (< 200 KB)', () => {
    expect(codificarEnlace(paquete).length).toBeLessThan(200_000);
  });

  it('rejects a corrupted link instead of showing garbage', () => {
    const carga = codificarEnlace(paquete);
    const roto = `${carga.slice(0, 10)}${carga[10] === 'A' ? 'B' : 'A'}${carga.slice(11)}`;
    expect(decodificarEnlace(roto).ok).toBe(false);
    expect(decodificarEnlace('basura').ok).toBe(false);
    expect(decodificarEnlace('').ok).toBe(false);
  });

  it('keeps the content in the fragment so no server sees it', () => {
    const url = urlDeFamilia('https://rikuy.app/', paquete);
    const u = new URL(url);
    expect(u.search).toBe('');
    expect(u.pathname).toBe('/');
    expect(u.hash.startsWith('#/p/')).toBe(true);
  });

  it('drops any previous hash of the base', () => {
    expect(urlDeFamilia('https://rikuy.app/#/docente', paquete).split('#').length).toBe(2);
  });
});
