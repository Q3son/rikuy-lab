/**
 * Rikuy Guardián (learning-support suite, lives in @rikuy/senales).
 * Non-biometric behaviour events, student self-reports, derived support signals without
 * emotion labels, teacher-only alerts with a human decision, and layered consent.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AlertaDocente,
  AutorreporteMomento,
  CAMPOS_BIOMETRICOS_PROHIBIDOS,
  ConsentimientoGuardian,
  ConsentimientoGuardianEnDespliegue,
  EventoAprendizaje,
  SENAL_APOYO_TTL_MAX_MS,
  SenalApoyo,
  TIPOS_EVENTO_APRENDIZAJE,
} from './index.ts';
import { ids, validos } from '../fixtures/index.ts';

function propertyKeys(schema: z.ZodType): string[] {
  const keys: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node === null || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (obj.properties && typeof obj.properties === 'object') keys.push(...Object.keys(obj.properties));
    Object.values(obj).forEach(walk);
  };
  walk(z.toJSONSchema(schema, { unrepresentable: 'any', io: 'input' }));
  return keys;
}

describe('EventoAprendizaje: fine-grained, non-biometric', () => {
  it('covers every requested behaviour', () => {
    expect([...TIPOS_EVENTO_APRENDIZAJE].sort()).toEqual(
      [
        'autorreporte_enviado', 'ayuda_solicitada', 'exhibicion_abierta', 'exhibicion_cerrada', 'intento',
        'medicion_repetida', 'paso_inactivo', 'pista_solicitada', 'prediccion_enviada', 'respuesta_cambiada',
        'respuesta_rapida', 'turno_tutor',
      ].sort(),
    );
  });

  it.each(CAMPOS_BIOMETRICOS_PROHIBIDOS)('rejects the forbidden field %s on every event type', (campo) => {
    for (const e of validos.EventoAprendizaje as Array<Record<string, unknown>>) {
      expect(EventoAprendizaje.safeParse({ ...e, [campo]: 1 }).success, `${String(e.tipo)} + ${campo}`).toBe(false);
    }
  });

  it('declares no timing, pressure, trajectory, camera or voice field anywhere in the schema', () => {
    const sospechoso = /tecla|keystroke|presion|pressure|trayectoria|trajectory|mouse|raton|camara|camera|rostro|face|voz|voice|audio|ms$/i;
    expect(propertyKeys(EventoAprendizaje).filter((k) => sospechoso.test(k))).toEqual([]);
  });

  it('only reports idle time as a coarse bucket', () => {
    const inactivo = (validos.EventoAprendizaje as Array<Record<string, unknown>>).find((e) => e.tipo === 'paso_inactivo');
    expect(EventoAprendizaje.safeParse({ ...inactivo, duracion: 137 }).success).toBe(false);
  });
});

describe('AutorreporteMomento', () => {
  const base = validos.AutorreporteMomento[0] as Record<string, unknown>;

  it('accepts several emotions with intensity 1-5', () => {
    expect(AutorreporteMomento.safeParse({ ...base, emociones: [{ emocion: 'confusion', intensidad: 5 }, { emocion: 'curiosidad', intensidad: 1 }] }).success).toBe(true);
    expect(AutorreporteMomento.safeParse({ ...base, emociones: [{ emocion: 'confusion', intensidad: 6 }] }).success).toBe(false);
  });

  it('rejects the same emotion twice and words outside the vocabulary', () => {
    expect(AutorreporteMomento.safeParse({ ...base, emociones: [{ emocion: 'calma', intensidad: 2 }, { emocion: 'calma', intensidad: 3 }] }).success).toBe(false);
    expect(AutorreporteMomento.safeParse({ ...base, emociones: [{ emocion: 'depresion', intensidad: 2 }] }).success).toBe(false);
  });

  it('only allows the visibility choices "solo yo" and "mi docente"', () => {
    expect(AutorreporteMomento.safeParse({ ...base, visibilidad: 'clase' }).success).toBe(false);
  });
});

describe('SenalApoyo: behaviour only, short-lived', () => {
  const base = validos.SenalApoyo[0] as Record<string, unknown>;

  it('carries no emotion label', () => {
    expect(SenalApoyo.safeParse({ ...base, emocion: 'frustracion' }).success).toBe(false);
    expect(propertyKeys(SenalApoyo)).not.toContain('emocion');
  });

  it('requires baseline flag, confidence and expiry', () => {
    for (const k of ['relativoALineaBase', 'confianza', 'expiraEn']) {
      const sinCampo = { ...base };
      delete sinCampo[k];
      expect(SenalApoyo.safeParse(sinCampo).success, k).toBe(false);
    }
  });

  it('expires shortly after it is generated', () => {
    const generadoEn = base.generadoEn as number;
    expect(SenalApoyo.safeParse({ ...base, expiraEn: generadoEn }).success).toBe(false);
    expect(SenalApoyo.safeParse({ ...base, expiraEn: generadoEn + SENAL_APOYO_TTL_MAX_MS + 1 }).success).toBe(false);
  });
});

describe('AlertaDocente', () => {
  const base = validos.AlertaDocente[0] as Record<string, unknown>;

  it('is visible to the teacher only', () => {
    expect(AlertaDocente.safeParse({ ...base, visibilidad: 'grupo' }).success).toBe(false);
  });

  it('requires a human decision to close it', () => {
    expect(AlertaDocente.safeParse({ ...base, decision: { estado: 'descartada' } }).success).toBe(false);
    expect(
      AlertaDocente.safeParse({ ...base, decision: { estado: 'descartada', decididoPor: 'reglas', decididoEn: 1 } }).success,
    ).toBe(false);
  });

  it('a SíseVe escalation is individual', () => {
    expect(AlertaDocente.safeParse({ ...base, alcance: { tipo: 'clase' }, escalarSiseVe: true }).success).toBe(false);
    expect(
      AlertaDocente.safeParse({ ...base, alcance: { tipo: 'estudiante', estudianteId: ids.estudiante1 }, escalarSiseVe: true }).success,
    ).toBe(true);
  });
});

describe('ConsentimientoGuardian', () => {
  const base = validos.ConsentimientoGuardian[0] as Record<string, unknown>;

  it('needs guardian consent under 14 and student assent for any active level', () => {
    expect(ConsentimientoGuardian.safeParse({ ...base, nivel: 'nivel1_conducta', menorDe14: true, consentimientoApoderado: false }).success).toBe(false);
    expect(ConsentimientoGuardian.safeParse({ ...base, nivel: 'nivel1_conducta', asentimientoEstudiante: false }).success).toBe(false);
    expect(ConsentimientoGuardian.safeParse({ ...base, nivel: 'apagado', asentimientoEstudiante: false, consentimientoApoderado: false }).success).toBe(true);
  });

  it('level 2 (camera/voice) needs the build flag and is blocked in EU deployments', () => {
    const nivel2 = { ...base, nivel: 'nivel2_camara_voz' };
    const ok = (despliegue: object) => ConsentimientoGuardianEnDespliegue.safeParse({ consentimiento: nivel2, despliegue }).success;
    expect(ok({ flagNivel2: false, regionUE: false })).toBe(false);
    expect(ok({ flagNivel2: true, regionUE: true })).toBe(false);
    expect(ok({ flagNivel2: true, regionUE: false })).toBe(true);
    expect(ConsentimientoGuardianEnDespliegue.parse({ consentimiento: base, despliegue: { regionUE: false } }).despliegue.flagNivel2).toBe(false);
  });
});
