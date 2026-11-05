import { describe, expect, it } from 'vitest';
import { EventoAprendizaje, SenalApoyo, SENAL_APOYO_TTL_MAX_MS, AutorreporteMomento } from '@rikuy/contracts';
import { ids, hlcs } from '@rikuy/contracts/fixtures';
import { construirAutorreporte, construirLineaBase, detectar, resumirPasos, UMBRALES, type ResumenPaso } from './index.ts';

const AHORA = 1762300810000;
let n = 0;
const ulid = () => `01JC${'0'.repeat(18)}X${String(++n).padStart(3, '0')}`;
const base = (paso = 'medir', clase: string = ids.clase) => ({
  id: ulid(),
  claseId: clase,
  grupoId: ids.grupo1,
  pasoId: paso,
  hlc: hlcs.h2,
});
const intento = (resultado: 'correcto' | 'incorrecto', paso = 'medir', extra = {}) =>
  EventoAprendizaje.parse({ ...base(paso), ...extra, tipo: 'intento', numero: 1, resultado });
const pista = (paso = 'medir', extra = {}) => EventoAprendizaje.parse({ ...base(paso), ...extra, tipo: 'pista_solicitada', nivel: 1 });
const rapida = (paso = 'medir') => EventoAprendizaje.parse({ ...base(paso), tipo: 'respuesta_rapida' });
const inactivo = (duracion: 'lt_30s' | '30s_2m' | '2m_5m' | 'gt_5m', paso = 'medir') =>
  EventoAprendizaje.parse({ ...base(paso), tipo: 'paso_inactivo', duracion });
const estados = (e: ReturnType<typeof detectar>) => e.map((s) => s.estado);
const un = { estudianteIds: [ids.estudiante1] };

describe('detectar (Level 1, rule-based, non-biometric)', () => {
  it('atascado_en_habilidad: no progress after N attempts in the same skill', () => {
    const evs = Array.from({ length: UMBRALES.atascadoIntentos }, () => intento('incorrecto'));
    expect(estados(detectar(evs, { ahora: AHORA }))).toContain('atascado_en_habilidad');
  });
  it('a correct attempt resets the streak', () => {
    const evs = [...Array.from({ length: 3 }, () => intento('incorrecto')), intento('correcto'), intento('incorrecto')];
    expect(estados(detectar(evs, { ahora: AHORA }))).not.toContain('atascado_en_habilidad');
  });
  it('is evaluated per skill (paso), not across skills', () => {
    const evs = [intento('incorrecto', 'a'), intento('incorrecto', 'b'), intento('incorrecto', 'a'), intento('incorrecto', 'b')];
    expect(detectar(evs, { ahora: AHORA })).toEqual([]);
  });
  it('adivinacion_rapida: fast answers that are wrong, repeatedly', () => {
    const evs = [rapida(), intento('incorrecto'), rapida(), intento('incorrecto'), rapida(), intento('incorrecto')];
    expect(estados(detectar(evs, { ahora: AHORA }))).toContain('adivinacion_rapida');
  });
  it('fast correct answers are not guessing', () => {
    const evs = [rapida(), intento('correcto'), rapida(), intento('correcto'), rapida(), intento('correcto')];
    expect(estados(detectar(evs, { ahora: AHORA }))).not.toContain('adivinacion_rapida');
  });
  it('inactivo: two minutes or more, and only while nothing happened since', () => {
    expect(estados(detectar([inactivo('2m_5m')], { ahora: AHORA }))).toContain('inactivo');
    expect(detectar([inactivo('30s_2m')], { ahora: AHORA })).toEqual([]);
    expect(detectar([inactivo('gt_5m'), intento('correcto')], { ahora: AHORA })).toEqual([]);
  });
  it('inactivo is the least reliable signal (shared phones): lowest confidence', () => {
    const a = detectar([inactivo('gt_5m')], { ahora: AHORA })[0];
    const b = detectar(Array.from({ length: 4 }, () => intento('incorrecto')), { ahora: AHORA })[0];
    expect(a?.confianza).toBeLessThan(b?.confianza ?? 0);
  });
  it('abuso_de_pistas: several hints in a row without trying', () => {
    expect(estados(detectar([pista(), pista(), pista()], { ahora: AHORA }))).toContain('abuso_de_pistas');
    expect(estados(detectar([pista(), intento('incorrecto'), pista(), intento('incorrecto'), pista()], { ahora: AHORA }))).not.toContain('abuso_de_pistas');
  });
  it('evita_ayuda: error rate above 80% in 10 attempts without asking for help', () => {
    const evs = [...Array.from({ length: 9 }, () => intento('incorrecto', 'x')), intento('correcto', 'x')];
    const sin = estados(detectar(evs.map((e, i) => ({ ...e, pasoId: `p${i}` })), { ahora: AHORA }));
    expect(sin).toContain('evita_ayuda');
    const con = estados(detectar([pista('x'), ...evs.map((e, i) => ({ ...e, pasoId: `p${i}` }))], { ahora: AHORA }));
    expect(con).not.toContain('evita_ayuda');
  });
  it('exactly 80% errors is not above the threshold', () => {
    const evs = [...Array.from({ length: 8 }, () => intento('incorrecto')), intento('correcto'), intento('correcto')].map((e, i) => ({ ...e, pasoId: `p${i}` }));
    expect(estados(detectar(evs, { ahora: AHORA }))).not.toContain('evita_ayuda');
  });

  it('emits contract-valid signals with a short life and no emotion label', () => {
    const evs = Array.from({ length: 4 }, () => intento('incorrecto'));
    const out = detectar(evs, { ahora: AHORA });
    for (const s of out) {
      expect(SenalApoyo.safeParse(s).success).toBe(true);
      expect(s.expiraEn - s.generadoEn).toBeLessThanOrEqual(SENAL_APOYO_TTL_MAX_MS);
      expect(s.eventoIds.length).toBeGreaterThan(0);
    }
  });
  it('attributes to a student only when exactly one is named; otherwise to the group', () => {
    const evs = Array.from({ length: 4 }, () => intento('incorrecto', 'medir', un));
    expect(detectar(evs, { ahora: AHORA })[0]?.estudianteId).toBe(ids.estudiante1);
    const grupo = Array.from({ length: 4 }, () => intento('incorrecto', 'medir', { estudianteIds: [ids.estudiante1, ids.estudiante2] }));
    expect(detectar(grupo, { ahora: AHORA })[0]?.estudianteId).toBeUndefined();
  });
});

describe('within-student baseline', () => {
  const resumen = (i: number, intentos: number, pistas: number): ResumenPaso => ({
    sujetoId: ids.estudiante1,
    tipo: 'estudiante',
    pasoId: `p${i}`,
    claseId: ids.clase,
    en: AHORA - i * 3600_000,
    intentos,
    incorrectos: Math.floor(intentos / 2),
    pistas,
  });

  it('needs a minimum of steps before it is used', () => {
    const pocos = construirLineaBase(Array.from({ length: 3 }, (_, i) => resumen(i, 6, 0)), ids.estudiante1, AHORA);
    expect(pocos.usable).toBe(false);
    const suficientes = construirLineaBase(Array.from({ length: 8 }, (_, i) => resumen(i, 6, 0)), ids.estudiante1, AHORA);
    expect(suficientes.usable).toBe(true);
    expect(suficientes.medianaIntentos).toBe(6);
  });
  it('drops summaries older than the window (4-6 weeks)', () => {
    const viejos = Array.from({ length: 8 }, (_, i) => ({ ...resumen(i, 6, 0), en: AHORA - 60 * 24 * 3600_000 }));
    expect(construirLineaBase(viejos, ids.estudiante1, AHORA).usable).toBe(false);
  });
  it('a student who normally needs many attempts is not flagged at the absolute threshold, and the signal is relative', () => {
    const lb = construirLineaBase(Array.from({ length: 8 }, (_, i) => resumen(i, 10, 0)), ids.estudiante1, AHORA);
    const cuatro = Array.from({ length: 4 }, () => intento('incorrecto', 'medir', un));
    expect(detectar(cuatro, { ahora: AHORA, lineasBase: new Map([[ids.estudiante1, lb]]) })).toEqual([]);
    const veintiuno = Array.from({ length: 21 }, () => intento('incorrecto', 'medir', un));
    const s = detectar(veintiuno, { ahora: AHORA, lineasBase: new Map([[ids.estudiante1, lb]]) })[0];
    expect(s?.relativoALineaBase).toBe(true);
  });
  it('without baseline the signal is not relative', () => {
    const s = detectar(Array.from({ length: 4 }, () => intento('incorrecto')), { ahora: AHORA })[0];
    expect(s?.relativoALineaBase).toBe(false);
  });
  it('resumirPasos keeps only counts per step (derived, no raw timings)', () => {
    const r = resumirPasos([intento('incorrecto', 'a', un), intento('correcto', 'a', un), pista('a', un)], AHORA);
    expect(r).toEqual([expect.objectContaining({ pasoId: 'a', intentos: 2, incorrectos: 1, pistas: 1, sujetoId: ids.estudiante1 })]);
  });
});

describe('discrepancia_autorreporte_conducta (only with shared check-ins)', () => {
  const ar = (emocion: 'calma' | 'frustracion', intensidad: 'poco' | 'mucho', visibilidad: 'solo_yo' | 'mi_docente'): AutorreporteMomento =>
    construirAutorreporte({
      id: ids.respuesta,
      estudianteId: ids.estudiante1,
      claseId: ids.clase,
      pasoId: 'medir',
      hlc: hlcs.h2,
      emociones: [{ emocion, intensidad }],
      ayuda: 'nada',
      visibilidad,
    });
  const clases = ['01JC0000000000000000000C01', '01JC0000000000000000000C02', '01JC0000000000000000000C03'];
  const atascadoEnTresClases = clases.flatMap((c) =>
    Array.from({ length: 4 }, () => EventoAprendizaje.parse({ ...base('medir', c), ...un, tipo: 'intento', numero: 1, resultado: 'incorrecto' })),
  );

  it('says all is well but has been stuck across 3 sessions', () => {
    const out = detectar(atascadoEnTresClases, { ahora: AHORA, autorreportes: [ar('calma', 'mucho', 'mi_docente')] });
    expect(estados(out)).toContain('discrepancia_autorreporte_conducta');
  });
  it('never uses a private ("solo yo") check-in to build an individual signal', () => {
    const out = detectar(atascadoEnTresClases, { ahora: AHORA, autorreportes: [ar('calma', 'mucho', 'solo_yo')] });
    expect(estados(out)).not.toContain('discrepancia_autorreporte_conducta');
  });
  it('says it is going badly while progressing', () => {
    const avanza = Array.from({ length: 4 }, () => intento('correcto', 'medir', un));
    const out = detectar(avanza, { ahora: AHORA, autorreportes: [ar('frustracion', 'mucho', 'mi_docente')] });
    expect(estados(out)).toContain('discrepancia_autorreporte_conducta');
  });
});
