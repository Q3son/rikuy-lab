import { describe, expect, it } from 'vitest';
import { ids, hlcs, validos } from '@rikuy/contracts/fixtures';
import type { ConsentimientoGuardian } from '@rikuy/contracts';
import { crearGuardian } from './index.ts';

const ahora = 1762300810000;
const consent = (estudianteId: string, extra: Partial<ConsentimientoGuardian> = {}): ConsentimientoGuardian => ({
  estudianteId,
  menorDe14: true,
  consentimientoApoderado: true,
  asentimientoEstudiante: true,
  nivel: 'nivel1_conducta',
  registradoPor: 'docente',
  hlc: hlcs.h1,
  ...extra,
});
const ev = { ...(validos.EventoAprendizaje?.[1] as Record<string, unknown>) };

function nuevo(consentimientos: ConsentimientoGuardian[], integrantes = [ids.estudiante1, ids.estudiante2]) {
  let t = ahora;
  const g = crearGuardian({
    reloj: () => t,
    consentimientos: new Map(consentimientos.map((c) => [c.estudianteId, c])),
    integrantesPorGrupo: new Map([[ids.grupo1, integrantes]]),
  });
  return { g, avanzar: (ms: number) => (t += ms) };
}

describe('crearGuardian: consent gating of recording', () => {
  it('records nothing for a group where one member has not consented', () => {
    const { g } = nuevo([consent(ids.estudiante1)]);
    expect(g.registrar(ev)).toMatchObject({ registrado: false, motivo: 'sin_consentimiento' });
    expect(g.eventosCrudos()).toHaveLength(0);
  });
  it('records when every member has valid consent', () => {
    const { g } = nuevo([consent(ids.estudiante1), consent(ids.estudiante2)]);
    expect(g.registrar(ev).registrado).toBe(true);
    expect(g.eventosCrudos()).toHaveLength(1);
  });
  it('an attributed event only needs the attributed students', () => {
    const { g } = nuevo([consent(ids.estudiante1)]);
    expect(g.registrar({ ...ev, estudianteIds: [ids.estudiante1] }).registrado).toBe(true);
  });
  it('rejects events that carry biometric or timing fields (strict schema)', () => {
    const { g } = nuevo([consent(ids.estudiante1), consent(ids.estudiante2)]);
    expect(g.registrar({ ...ev, dwellMs: 120 })).toMatchObject({ registrado: false, motivo: 'evento_invalido' });
  });
  it('the teacher switch stops recording at once and clears raw buffers', () => {
    const { g } = nuevo([consent(ids.estudiante1), consent(ids.estudiante2)]);
    g.registrar(ev);
    g.interruptorDocente(false);
    expect(g.activo()).toBe(false);
    expect(g.registrar(ev)).toMatchObject({ registrado: false, motivo: 'apagado' });
    expect(g.eventosCrudos()).toHaveLength(0);
  });
  it('is off until the teacher turns it on (off by default)', () => {
    const { g } = nuevo([consent(ids.estudiante1), consent(ids.estudiante2)]);
    expect(g.activo()).toBe(true);
    const sinEncender = crearGuardian({ reloj: () => ahora, consentimientos: new Map(), integrantesPorGrupo: new Map(), encendido: false });
    expect(sinEncender.activo()).toBe(false);
  });
  it('a student can withdraw and their data is erased immediately', () => {
    const { g } = nuevo([consent(ids.estudiante1)]);
    g.registrar({ ...ev, estudianteIds: [ids.estudiante1] });
    g.retirar(ids.estudiante1);
    expect(g.eventosCrudos()).toHaveLength(0);
    expect(g.registrar({ ...ev, estudianteIds: [ids.estudiante1] }).registrado).toBe(false);
  });
});
