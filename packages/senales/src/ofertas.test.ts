import { describe, expect, it } from 'vitest';
import { AccionApoyo, type SenalApoyo } from '@rikuy/contracts';
import { ids } from '@rikuy/contracts/fixtures';
import { aAccionApoyo, afirmarSinEtiquetasEmocionales, crearLimitadorOfertas, ofertaDeSenal } from './index.ts';

const senal = (estado: SenalApoyo['estado']): SenalApoyo => ({
  id: ids.evidencia, claseId: ids.clase, grupoId: ids.grupo1, estado, relativoALineaBase: false,
  confianza: 0.6, generadoEn: 1, expiraEn: 2, eventoIds: [ids.evento1],
});

describe('ofertas de ayuda (the only output a student sees)', () => {
  it('offers a hint, going slower or a pause, never a label', () => {
    const o = ofertaDeSenal(senal('atascado_en_habilidad'));
    expect(o).toMatchObject({ tipo: 'pista', soloEnEsteCelular: true, grupoId: ids.grupo1 });
    expect(o?.texto).toBe('Esto cuesta un poco. ¿Te doy una pista?');
    expect(['pista', 'mas_despacio', 'pausa']).toContain(ofertaDeSenal(senal('abuso_de_pistas'))?.tipo);
    afirmarSinEtiquetasEmocionales(o);
  });
  it('a discrepancy is for the teacher only: no offer to the group', () => {
    expect(ofertaDeSenal(senal('discrepancia_autorreporte_conducta'))).toBeUndefined();
  });
  it('maps onto the tutor support actions of the contract', () => {
    for (const e of ['atascado_en_habilidad', 'abuso_de_pistas', 'adivinacion_rapida', 'inactivo', 'evita_ayuda'] as const) {
      const o = ofertaDeSenal(senal(e));
      expect(AccionApoyo.safeParse(aAccionApoyo(o!)).success).toBe(true);
    }
  });
  it('at most twice per exhibit and "Ahora no" snoozes for 5 minutes', () => {
    const l = crearLimitadorOfertas();
    expect(l.puedeOfrecer(ids.grupo1, 'exh', 0)).toBe(true);
    l.registrarOfrecida(ids.grupo1, 'exh');
    l.registrarRechazo(ids.grupo1, 1000);
    expect(l.puedeOfrecer(ids.grupo1, 'exh', 1000 + 4 * 60_000)).toBe(false);
    expect(l.puedeOfrecer(ids.grupo1, 'exh', 1000 + 5 * 60_000 + 1)).toBe(true);
    l.registrarOfrecida(ids.grupo1, 'exh');
    expect(l.puedeOfrecer(ids.grupo1, 'exh', 10 * 60_000)).toBe(false);
    expect(l.puedeOfrecer(ids.grupo1, 'otra', 10 * 60_000)).toBe(true);
  });
});
