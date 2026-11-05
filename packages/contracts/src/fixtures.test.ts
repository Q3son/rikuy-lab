/**
 * Gate of sprint 0 (5.3): every valid fixture passes `safeParse` and every invalid
 * fixture fails it. Every registered schema must ship at least one of each.
 */
import { describe, expect, it } from 'vitest';
import { esquemas } from './index.ts';
import { invalidos, validos } from '../fixtures/index.ts';

const nombres = Object.keys(esquemas) as Array<keyof typeof esquemas>;

describe('contract fixtures', () => {
  it('registers the core v1 schemas', () => {
    for (const n of [
      'Ulid', 'Hlc', 'Lengua', 'Apodo', 'DesempenoRef', 'Competencia', 'Practica', 'Clase', 'Grupo',
      'Consentimientos', 'Estudiante', 'RecursoExhibicion', 'Sala', 'Exhibicion', 'MemoriaEntrada',
      'AsientoQuipu', 'Medicion', 'RespuestaRazonamiento', 'Evidencia', 'EstadoApoyo', 'ConfigSenales',
      'AgregadoSenales', 'Evento', 'EventoValidado', 'Paquete', 'PaqueteValidado', 'MarcoQr',
      'VectorVersion', 'MensajeSync', 'Comando', 'BusMessage', 'MensajeRtCliente', 'MensajeRtHub',
      'EventoAprendizaje', 'AutorreporteMomento', 'SenalApoyo', 'AlertaDocente', 'ConsentimientoGuardian',
    ]) {
      expect(nombres).toContain(n);
    }
  });

  describe.each(nombres)('%s', (nombre) => {
    const esquema = esquemas[nombre];

    it('has valid and invalid fixtures', () => {
      expect(validos[nombre]?.length ?? 0).toBeGreaterThan(0);
      expect(invalidos[nombre]?.length ?? 0).toBeGreaterThan(0);
    });

    it('accepts every valid fixture', () => {
      for (const valor of validos[nombre] ?? []) {
        const r = esquema.safeParse(valor);
        expect(r.success, r.success ? '' : JSON.stringify(r.error.issues, null, 2)).toBe(true);
      }
    });

    it('rejects every invalid fixture', () => {
      for (const { caso, valor } of invalidos[nombre] ?? []) {
        expect(esquema.safeParse(valor).success, `invalid case accepted: ${caso}`).toBe(false);
      }
    });
  });
});
