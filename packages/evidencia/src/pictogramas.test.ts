import { describe, expect, it } from 'vitest';
import { PICTOGRAMAS, pictogramaDeMaterial, svgPictograma } from './pictogramas.ts';

describe('pictograms', () => {
  it('maps common household materials to a pictogram, accent-insensitive', () => {
    expect(pictogramaDeMaterial('Cuerda')).toBe('cuerda');
    expect(pictogramaDeMaterial('Tuerca o piedra')).toBe('piedra');
    expect(pictogramaDeMaterial('Cronómetro del celular')).toBe('reloj');
    expect(pictogramaDeMaterial('Regla o cinta métrica')).toBe('regla');
    expect(pictogramaDeMaterial('Vaso con agua tibia')).toBe('agua');
  });

  it('falls back to a generic pictogram, never to nothing', () => {
    expect(pictogramaDeMaterial('Zapallo')).toBe('generico');
  });

  it('every pictogram has strokes and a Spanish title', () => {
    for (const [id, p] of Object.entries(PICTOGRAMAS)) {
      expect(p.trazos.length, id).toBeGreaterThan(0);
      expect(p.titulo.length, id).toBeGreaterThan(2);
    }
  });

  it('renders a self-contained, accessible SVG string that is light enough for a message', () => {
    const svg = svgPictograma('cuerda');
    expect(svg).toMatch(/^<svg [^>]*role="img"[^>]*aria-label="Cuerda"/);
    expect(svg).not.toMatch(/<script|href=|https?:\/\/(?!www\.w3\.org)/);
    expect(svg.length).toBeLessThan(2000);
  });
});
