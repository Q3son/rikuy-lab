import type { Practica } from '@rikuy/contracts';
import { ejemplos } from '@rikuy/contracts/fixtures';
import { describe, expect, it } from 'vitest';
import { construirHoja } from './hoja.ts';

const practica = ejemplos.practica as Practica;
const con = (quy: Partial<NonNullable<Practica['textos']>['quy']>): Practica => ({
  ...practica,
  textos: { quy: { preguntaGuia: '¿Imamantaq péndulo kutimunanpaq unaynin?', pistas: [], revisado: false, ...quy } },
});

describe('take-home sheet model', () => {
  const h = construirHoja(practica, { lengua: 'es', codigoClase: 'PEND42' });

  it('has a title, the guiding question, pictograms for every material and numbered steps', () => {
    expect(h.titulo).toBe(practica.titulo);
    expect(h.preguntaGuia).toBe(practica.preguntaGuia);
    expect(h.materiales.map((m) => m.picto)).toEqual(['cuerda', 'piedra']);
    expect(h.pasos.length).toBeGreaterThanOrEqual(3);
    expect(h.pasos.length).toBeLessThanOrEqual(6);
  });

  it('builds an empty data table from the protocol, capped so it fits one page', () => {
    expect(h.tabla.filas).toHaveLength(practica.protocolo.valoresIndependiente.length);
    expect(h.tabla.encabezados[0]).toMatch(/Longitud/);
    expect(h.tabla.encabezados[1]).toMatch(/periodo \(s\)/);
    const muchos = construirHoja({ ...practica, protocolo: { ...practica.protocolo, valoresIndependiente: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } }, { lengua: 'es', codigoClase: 'X' });
    expect(muchos.tabla.filas.length).toBeLessThanOrEqual(6);
  });

  it('carries the return code the child shows the teacher', () => {
    expect(h.retorno).toBe(`RKR:PEND42:${practica.id}`);
  });

  it('never prints Quechua that has not been reviewed by a speaker', () => {
    const sin = construirHoja(con({ revisado: false }), { lengua: 'quy', codigoClase: 'X' });
    expect(sin.lenguaUsada).toBe('es');
    expect(JSON.stringify(sin)).not.toContain('Imamantaq');
    expect(sin.avisoQuechua).toMatch(/aún no está revisado/);
  });

  it('prints the reviewed Quechua question next to the Spanish text', () => {
    const si = construirHoja(con({ revisado: true, variedad: 'Ayacucho-Chanka' }), { lengua: 'quy', codigoClase: 'X' });
    expect(si.lenguaUsada).toBe('quy');
    expect(si.preguntaQuechua).toContain('Imamantaq');
    expect(si.avisoQuechua).toBeNull();
  });
});
