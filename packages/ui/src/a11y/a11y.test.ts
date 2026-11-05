import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { auditarContraste, contrastRatio, relativeLuminance } from './contraste.ts';
import { crearHaptica, PATRONES_HAPTICOS } from './haptica.ts';
import { ESCALAS_TEXTO, escalaSiguiente, normalizarEscala, porcentajeEscala } from './escala.ts';

type Modo = 'light' | 'dark' | 'holo';
const tokens = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../tokens/tokens.json'), 'utf8')) as {
  themes: Record<Modo, { color: Record<string, string> }>;
  contrast: Record<Modo, { fg: string; bg: string; min: number }[]>;
};

describe('contrast maths (WCAG 2.2)', () => {
  it('computes the reference extremes', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });

  it('accepts 3-digit hex and is symmetric', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#0D2B33', '#F5F6F1')).toBeCloseTo(contrastRatio('#F5F6F1', '#0D2B33'), 6);
  });
});

describe('high-contrast check of the three modes', () => {
  for (const modo of ['light', 'dark', 'holo'] as const) {
    it(`every declared pair of ${modo} reaches its minimum, recomputed from the colours`, () => {
      const colores = tokens.themes[modo].color;
      const informe = auditarContraste(colores, tokens.contrast[modo].map((p) => ({ fg: p.fg, bg: p.bg, min: p.min })));
      expect(informe.pares).toBeGreaterThan(15);
      expect(informe.fallos).toEqual([]);
    });
  }

  it('reports a failing pair instead of hiding it', () => {
    const informe = auditarContraste({ a: '#777777', b: '#888888' }, [{ fg: 'a', bg: 'b', min: 4.5 }]);
    expect(informe.fallos).toHaveLength(1);
    expect(informe.fallos[0]).toMatchObject({ fg: 'a', bg: 'b', min: 4.5 });
  });
});

describe('text scale up to 200 %', () => {
  it('offers steps from 100 % to 200 %', () => {
    expect(ESCALAS_TEXTO[0]).toBe(1);
    expect(ESCALAS_TEXTO.at(-1)).toBe(2);
  });

  it('clamps any value to the nearest valid step and falls back to 100 %', () => {
    expect(normalizarEscala(3)).toBe(2);
    expect(normalizarEscala(0.2)).toBe(1);
    expect(normalizarEscala(Number.NaN)).toBe(1);
    expect(normalizarEscala(1.3)).toBe(1.25);
  });

  it('steps up and down without leaving the range', () => {
    expect(escalaSiguiente(1, 1)).toBe(1.25);
    expect(escalaSiguiente(2, 1)).toBe(2);
    expect(escalaSiguiente(1, -1)).toBe(1);
    expect(escalaSiguiente(1.5, -1)).toBe(1.25);
    expect(porcentajeEscala(1.5)).toBe(150);
  });
});

describe('haptic cue option', () => {
  it('does nothing when the option is off, even if the device can vibrate', () => {
    const vibrate = vi.fn(() => true);
    const h = crearHaptica({ activa: () => false, vibrate });
    h.pulso('exito');
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('vibrates with the named pattern when on', () => {
    const vibrate = vi.fn(() => true);
    const h = crearHaptica({ activa: () => true, vibrate });
    h.pulso('exito');
    expect(vibrate).toHaveBeenCalledWith(PATRONES_HAPTICOS.exito);
  });

  it('is silent and safe on devices without the Vibration API', () => {
    const h = crearHaptica({ activa: () => true, vibrate: undefined });
    expect(h.disponible).toBe(false);
    expect(() => h.pulso('toque')).not.toThrow();
  });

  it('keeps every pattern short and not startling', () => {
    for (const patron of Object.values(PATRONES_HAPTICOS)) {
      const total = [patron].flat().reduce((a, b) => a + b, 0);
      expect(total).toBeLessThanOrEqual(200);
    }
  });
});
