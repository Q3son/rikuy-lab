import { describe, expect, it } from 'vitest';
import { ids, hlcs } from '@rikuy/contracts/fixtures';
import type { ConsentimientoGuardian } from '@rikuy/contracts';
import { NIVEL2_POR_DEFECTO, evaluarConsentimiento, nivel2Disponible, nivelEfectivo } from './index.ts';

const ahora = 1762300810000;
const base: ConsentimientoGuardian = {
  estudianteId: ids.estudiante1,
  menorDe14: true,
  consentimientoApoderado: true,
  asentimientoEstudiante: true,
  nivel: 'nivel1_conducta',
  registradoPor: 'docente',
  hlc: hlcs.h1,
};

describe('evaluarConsentimiento (strict default: both)', () => {
  it('allows level 1 only with guardian consent AND student assent', () => {
    expect(evaluarConsentimiento(base, { ahora }).permitido).toBe(true);
  });
  it('denies when there is no consent at all', () => {
    expect(evaluarConsentimiento(undefined, { ahora })).toMatchObject({ permitido: false, motivo: 'sin_consentimiento' });
  });
  it('denies without guardian consent, even for 14+ in the strict default', () => {
    const r = evaluarConsentimiento({ ...base, menorDe14: false, consentimientoApoderado: false }, { ahora });
    expect(r).toMatchObject({ permitido: false, motivo: 'falta_apoderado' });
  });
  it('denies without student assent', () => {
    expect(evaluarConsentimiento({ ...base, asentimientoEstudiante: false }, { ahora })).toMatchObject({ permitido: false, motivo: 'falta_asentimiento' });
  });
  it('age policy (opt-in): a 14+ student may assent alone, an under-14 still needs both', () => {
    const solo = { ...base, menorDe14: false, consentimientoApoderado: false };
    expect(evaluarConsentimiento(solo, { ahora, politica: 'por_edad' }).permitido).toBe(true);
    expect(evaluarConsentimiento({ ...base, consentimientoApoderado: false }, { ahora, politica: 'por_edad' }).permitido).toBe(false);
  });
  it('level off is never permitted to record', () => {
    expect(evaluarConsentimiento({ ...base, nivel: 'apagado' }, { ahora })).toMatchObject({ permitido: false, motivo: 'apagado' });
  });
  it('consent expires after the school term and must be renewed', () => {
    const tarde = ahora + 130 * 24 * 3600 * 1000;
    expect(evaluarConsentimiento(base, { ahora: tarde })).toMatchObject({ permitido: false, motivo: 'vencido' });
  });
});

describe('level 2 (camera and voice) is built off', () => {
  it('is off by default', () => {
    expect(NIVEL2_POR_DEFECTO).toBe(false);
    expect(nivel2Disponible({})).toMatchObject({ disponible: false });
  });
  it('stays closed unless the five gates are open, and the EU always blocks', () => {
    const todas = { flagCompilacion: true, claseFirmada: true, consentimientoTodos: true, interruptorDocente: true, indicadorVisible: true, regionUE: false };
    expect(nivel2Disponible(todas).disponible).toBe(true);
    for (const k of Object.keys(todas) as (keyof typeof todas)[]) {
      if (k === 'regionUE') continue;
      expect(nivel2Disponible({ ...todas, [k]: false }).disponible).toBe(false);
    }
    expect(nivel2Disponible({ ...todas, regionUE: true }).disponible).toBe(false);
  });
  it('a level 2 consent is downgraded to level 1 when level 2 is denied', () => {
    const c = { ...base, nivel: 'nivel2_camara_voz' as const };
    expect(nivelEfectivo(c, {})).toBe('nivel1_conducta');
    expect(nivelEfectivo({ ...base, nivel: 'apagado' }, {})).toBe('apagado');
  });
});
