import { describe, expect, it } from 'vitest';
import { Lengua } from '@rikuy/contracts';
import { REGISTRO_LENGUAS, cadenaRespaldo, sintesisDeVozDisponible, type RegistroLenguas } from './registro.ts';

describe('language registry', () => {
  it('declares Spanish, Ayacucho Quechua and Central Aymara', () => {
    expect(Object.keys(REGISTRO_LENGUAS).sort()).toEqual(['ayr', 'es', 'quy']);
  });

  it('only uses codes that the shared Lengua contract accepts', () => {
    for (const codigo of Object.keys(REGISTRO_LENGUAS)) {
      expect(Lengua.safeParse(codigo).success, codigo).toBe(true);
    }
  });

  it('gives every language a BCP-47 tag, a direction and a variety', () => {
    for (const meta of Object.values(REGISTRO_LENGUAS)) {
      expect(meta.etiquetaBcp47).toMatch(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/);
      expect(meta.direccion).toBe('ltr');
      expect(meta.variedad.length).toBeGreaterThan(0);
    }
  });

  it('makes Spanish the only fallback root: quy and ayr fall back to es, es falls back to nothing', () => {
    expect(REGISTRO_LENGUAS.es.respaldo).toBeNull();
    expect(REGISTRO_LENGUAS.quy.respaldo).toBe('es');
    expect(REGISTRO_LENGUAS.ayr.respaldo).toBe('es');
  });

  it('resolves every fallback chain and ends at Spanish', () => {
    for (const codigo of Object.keys(REGISTRO_LENGUAS) as Array<keyof typeof REGISTRO_LENGUAS>) {
      expect(cadenaRespaldo(codigo).at(-1), codigo).toBe('es');
    }
  });

  it('stops on a fallback cycle instead of looping', () => {
    const ciclo: RegistroLenguas = {
      aa: { etiquetaBcp47: 'aa', nombre: 'A', variedad: 'a', direccion: 'ltr', respaldo: 'bb', sintesisVoz: false },
      bb: { etiquetaBcp47: 'bb', nombre: 'B', variedad: 'b', direccion: 'ltr', respaldo: 'aa', sintesisVoz: false },
    };
    expect(cadenaRespaldo('aa', ciclo)).toEqual(['aa', 'bb']);
  });

  it('allows speech synthesis for Spanish only (4.8: no TTS for Quechua or Aymara)', () => {
    expect(sintesisDeVozDisponible('es')).toBe(true);
    expect(sintesisDeVozDisponible('quy')).toBe(false);
    expect(sintesisDeVozDisponible('ayr')).toBe(false);
  });
});
