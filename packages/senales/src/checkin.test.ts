import { describe, expect, it } from 'vitest';
import { AutorreporteMomento } from '@rikuy/contracts';
import { ids, hlcs } from '@rikuy/contracts/fixtures';
import {
  INTENSIDAD,
  TEXTO_CONFIDENCIALIDAD,
  afirmarSinEtiquetasEmocionales,
  construirAutorreporte,
  construirPedidoDeAyuda,
  crearControlCheckIn,
  vistaDocenteDeCheckIn,
} from './index.ts';

const base = { id: ids.respuesta, estudianteId: ids.estudiante1, claseId: ids.clase, pasoId: 'medir', hlc: hlcs.h2 };

describe('construirAutorreporte', () => {
  it('maps poco/medio/mucho to contract intensities and validates', () => {
    const r = construirAutorreporte({ ...base, emociones: [{ emocion: 'curiosidad', intensidad: 'mucho' }], ayuda: 'pista', visibilidad: 'solo_yo' });
    expect(AutorreporteMomento.safeParse(r).success).toBe(true);
    expect(r.emociones[0]?.intensidad).toBe(INTENSIDAD.mucho);
  });
  it('rejects an empty selection and duplicates', () => {
    expect(() => construirAutorreporte({ ...base, emociones: [], visibilidad: 'solo_yo' })).toThrow();
    expect(() =>
      construirAutorreporte({ ...base, emociones: [{ emocion: 'calma', intensidad: 'poco' }, { emocion: 'calma', intensidad: 'mucho' }], visibilidad: 'solo_yo' }),
    ).toThrow();
  });
  it('keeps the free text only up to 280 chars', () => {
    expect(() => construirAutorreporte({ ...base, emociones: [{ emocion: 'calma', intensidad: 'poco' }], texto: 'x'.repeat(281), visibilidad: 'solo_yo' })).toThrow();
  });
});

describe('check-in control (once per session, skippable)', () => {
  it('offers at most one check-in per session', () => {
    const c = crearControlCheckIn({ ventanaMs: 60_000 });
    expect(c.puedeOfrecer('s1', 'medir', 0)).toBe(true);
    c.registrarOfrecido('s1', 'medir', 0);
    expect(c.puedeOfrecer('s1', 'predecir', 1000)).toBe(false);
    expect(c.puedeOfrecer('s2', 'medir', 1000)).toBe(true);
  });
  it('does not come back for a skipped step', () => {
    const c = crearControlCheckIn({ ventanaMs: 60_000 });
    c.registrarOfrecido('s1', 'medir', 0);
    c.registrarResultado('s1', 'medir', { tipo: 'omitido' });
    expect(c.puedeOfrecer('s1', 'medir', 5)).toBe(false);
    expect(c.omitido('s1', 'medir')).toBe(true);
  });
  it('closes the answer window', () => {
    const c = crearControlCheckIn({ ventanaMs: 60_000 });
    c.registrarOfrecido('s1', 'medir', 0);
    expect(c.ventanaAbierta('s1', 'medir', 59_000)).toBe(true);
    expect(c.ventanaAbierta('s1', 'medir', 61_000)).toBe(false);
  });
  it('requires the confidentiality notice until acknowledged', () => {
    const c = crearControlCheckIn({ ventanaMs: 60_000 });
    expect(c.requiereAviso(ids.estudiante1)).toBe(true);
    c.confirmarAviso(ids.estudiante1);
    expect(c.requiereAviso(ids.estudiante1)).toBe(false);
  });
});

describe('confidentiality notice (SíseVe)', () => {
  it('says confidentiality is not absolute and names the exception', () => {
    expect(TEXTO_CONFIDENCIALIDAD).toMatch(/no es absoluta/i);
    expect(TEXTO_CONFIDENCIALIDAD).toMatch(/hace daño|peligro/i);
    expect(TEXTO_CONFIDENCIALIDAD).toMatch(/SíseVe/);
  });
});

describe('vistaDocenteDeCheckIn: no emotion label reaches the teacher', () => {
  const compartido = construirAutorreporte({
    ...base,
    emociones: [
      { emocion: 'frustracion', intensidad: 'mucho' },
      { emocion: 'tristeza', intensidad: 'medio' },
    ],
    ayuda: 'hablar_con_docente',
    texto: 'No me sale contar',
    visibilidad: 'mi_docente',
  });
  it('a private check-in produces no individual view at all', () => {
    expect(vistaDocenteDeCheckIn({ ...compartido, visibilidad: 'solo_yo' })).toBeUndefined();
  });
  it('a shared check-in shows the step, the help asked and the own words, never the emotions', () => {
    const v = vistaDocenteDeCheckIn(compartido);
    expect(v).toBeDefined();
    afirmarSinEtiquetasEmocionales(v);
    expect(JSON.stringify(v)).not.toMatch(/frustraci|tristeza|intensidad/i);
    expect(v?.textoDelEstudiante).toBe('No me sale contar');
    expect(v?.ayudaPedida).toBe('hablar_con_docente');
  });
});

describe('help request ("Necesito hablar")', () => {
  it('lets the student pick the adult and mark urgency explicitly', () => {
    const p = construirPedidoDeAyuda({ id: ids.respuesta, estudianteId: ids.estudiante1, claseId: ids.clase, destino: 'otro_adulto', urgente: true, hlc: hlcs.h2 });
    expect(p).toMatchObject({ destino: 'otro_adulto', urgente: true });
  });
});
