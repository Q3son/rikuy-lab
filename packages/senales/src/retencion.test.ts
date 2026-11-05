import { describe, expect, it } from 'vitest';
import { EventoAprendizaje, type SenalApoyo } from '@rikuy/contracts';
import { ids } from '@rikuy/contracts/fixtures';
import {
  RETENCION_DERIVADOS_DIAS,
  inicioDeSemana,
  purgarDerivados,
  purgarEventosCrudos,
  purgarSenales,
} from './index.ts';

const AHORA = Date.UTC(2026, 10, 5, 15, 0, 0); // Thursday
const DIA = 24 * 3600 * 1000;
const hlcEn = (ms: number) => `${ms}-0000-docente1`;
const evento = (ms: number, n: number): EventoAprendizaje =>
  EventoAprendizaje.parse({
    id: `01JC${'0'.repeat(18)}R${String(n).padStart(3, '0')}`,
    claseId: ids.clase,
    grupoId: ids.grupo1,
    pasoId: 'medir',
    hlc: hlcEn(ms),
    tipo: 'respuesta_rapida',
  });
const senal = (generadoEn: number, ttl: number): SenalApoyo => ({
  id: ids.evidencia,
  claseId: ids.clase,
  grupoId: ids.grupo1,
  estado: 'inactivo',
  relativoALineaBase: false,
  confianza: 0.3,
  generadoEn,
  expiraEn: generadoEn + ttl,
  eventoIds: [ids.evento1],
});

describe('retention', () => {
  it('signals are discarded at expiry (30 minutes at most)', () => {
    const s = [senal(AHORA - 40 * 60_000, 30 * 60_000), senal(AHORA - 5 * 60_000, 10 * 60_000)];
    expect(purgarSenales(s, AHORA)).toHaveLength(1);
  });

  it('raw events are purged when the week closes (fake clock)', () => {
    const lunes = inicioDeSemana(AHORA);
    const eventos = [evento(lunes - DIA, 1), evento(lunes + 1000, 2), evento(AHORA - 1000, 3)];
    expect(purgarEventosCrudos(eventos, AHORA).map((e) => e.id.slice(-3))).toEqual(['002', '003']);
    // one week later every one of them is gone
    expect(purgarEventosCrudos(eventos, AHORA + 7 * DIA)).toHaveLength(0);
  });

  it('derived data lives at most 4-6 weeks (configurable, clamped)', () => {
    expect(RETENCION_DERIVADOS_DIAS).toBeGreaterThanOrEqual(28);
    expect(RETENCION_DERIVADOS_DIAS).toBeLessThanOrEqual(42);
    const items = [{ en: AHORA - 20 * DIA }, { en: AHORA - 30 * DIA }, { en: AHORA - 50 * DIA }];
    expect(purgarDerivados(items, AHORA)).toHaveLength(1);
    expect(purgarDerivados(items, AHORA, 42)).toHaveLength(2);
    expect(purgarDerivados(items, AHORA, 400)).toHaveLength(2); // clamped to 42 days
  });
});
