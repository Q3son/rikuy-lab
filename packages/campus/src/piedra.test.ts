import { describe, expect, it } from 'vitest';
import { CORDONES, MARCOS, PIEDRA_INICIAL, elegirPiedra, opcionesPiedra, validarNombrePiedra } from './piedra.ts';

describe('customisable Rikuy stone (MyLEA mascot echo)', () => {
  it('starts with the brand amber cord and ink frame, free for everyone', () => {
    expect(PIEDRA_INICIAL).toEqual({ nombre: 'Rikuy', cordon: 'sol', marco: 'tinta' });
    expect(CORDONES[0]!.nudos).toBe(0);
    expect(MARCOS[0]!.nudos).toBe(0);
  });

  it('unlocks cosmetic options with the class quipu (collective, never lost)', () => {
    const pocas = opcionesPiedra(0);
    expect(pocas.cordones.filter((c) => c.libre).map((c) => c.id)).toEqual(['sol']);
    const muchas = opcionesPiedra(100);
    expect(muchas.cordones.every((c) => c.libre)).toBe(true);
    expect(muchas.marcos.every((m) => m.libre)).toBe(true);
  });

  it('validates the stone name: short, letters only, no numbers or links', () => {
    expect(validarNombrePiedra('  Rumi  ')).toEqual({ ok: true, nombre: 'Rumi' });
    expect(validarNombrePiedra("Ch'aska")).toEqual({ ok: true, nombre: "Ch'aska" });
    expect(validarNombrePiedra('R').ok).toBe(false);
    expect(validarNombrePiedra('987654321').ok).toBe(false);
    expect(validarNombrePiedra('www.x.com').ok).toBe(false);
    expect(validarNombrePiedra('a'.repeat(17)).ok).toBe(false);
  });

  it('refuses a locked option and accepts an unlocked one', () => {
    expect(elegirPiedra({ nombre: 'Rumi', cordon: 'laguna', marco: 'tinta' }, 0)).toEqual({ ok: false, error: 'bloqueado' });
    expect(elegirPiedra({ nombre: 'Rumi', cordon: 'laguna', marco: 'tinta' }, 50)).toEqual({ ok: true, piedra: { nombre: 'Rumi', cordon: 'laguna', marco: 'tinta' } });
    expect(elegirPiedra({ nombre: '1', cordon: 'sol', marco: 'tinta' }, 50)).toEqual({ ok: false, error: 'nombre' });
  });
});
