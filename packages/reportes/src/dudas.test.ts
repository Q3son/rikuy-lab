import { describe, expect, it } from 'vitest';
import { MIN_GRUPOS_CELDA_DUDAS, mapaDeCalorDudas, validarReporteAgregado, type DudaConcepto } from './index.ts';

const g = (n: number) => `01JC${'0'.repeat(18)}G${String(n).padStart(3, '0')}`;
const duda = (n: number, grupo: number, conceptoId: string, exhibicionId = 'exh-pendulo', frase?: string): DudaConcepto => ({
  id: `01JC${'0'.repeat(18)}D${String(n).padStart(3, '0')}`,
  claseId: '01JC0000000000000000000C01',
  grupoId: g(grupo),
  exhibicionId,
  conceptoId,
  hlc: '1762300800000-0000-grupo001',
  ...(frase ? { frase } : {}),
});

describe('Caja de dudas: topic heatmap at class level (EIDOS)', () => {
  it('counts doubts per concept and exhibit from 3 distinct groups, with no names', () => {
    expect(MIN_GRUPOS_CELDA_DUDAS).toBe(3);
    const dudas = [duda(1, 1, 'periodo'), duda(2, 2, 'periodo'), duda(3, 3, 'periodo'), duda(4, 3, 'periodo'), duda(5, 1, 'masa')];
    const m = mapaDeCalorDudas(dudas, { nombreConcepto: (c) => (c === 'periodo' ? 'Periodo' : c) });
    const celda = m.celdas.find((c) => c.conceptoId === 'periodo');
    expect(celda).toMatchObject({ suprimido: false, dudas: 4, grupos: 3, intensidad: 1 });
    expect(m.celdas.find((c) => c.conceptoId === 'masa')).toMatchObject({ suprimido: true });
  });

  it('a suppressed cell leaks neither counts nor ids', () => {
    const m = mapaDeCalorDudas([duda(1, 1, 'masa'), duda(2, 2, 'masa')]);
    expect(m.celdas[0]).toEqual({ conceptoId: 'masa', exhibicionId: 'exh-pendulo', etiqueta: 'masa', suprimido: true });
  });

  it('is anonymous by construction: no group ids, no phrases, no ids in the output', () => {
    const dudas = [1, 2, 3].map((i) => duda(i, i, 'periodo', 'exh-pendulo', 'no entiendo el periodo'));
    const m = mapaDeCalorDudas(dudas);
    const txt = JSON.stringify(m);
    expect(txt).not.toMatch(/01JC|no entiendo|grupoId/);
    expect(validarReporteAgregado(m)).toEqual([]);
  });

  it('is honest about anonymity in small classes', () => {
    const m = mapaDeCalorDudas([duda(1, 1, 'periodo')]);
    expect(m.aviso).toMatch(/anonimato real es imposible/);
  });

  it('lists the topics to reinforce by number of doubts, only from visible cells', () => {
    const dudas = [...[1, 2, 3].map((i) => duda(i, i, 'periodo')), ...[4, 5, 6, 7].map((i) => duda(i, i - 3, 'longitud', 'exh-otro')), duda(9, 1, 'masa')];
    const m = mapaDeCalorDudas(dudas);
    expect(m.temasParaReforzar.map((t) => t.conceptoId)).toEqual(['longitud', 'periodo']);
  });

  it('is empty without doubts and does not invent a heatmap', () => {
    const m = mapaDeCalorDudas([]);
    expect(m.celdas).toEqual([]);
    expect(m.temasParaReforzar).toEqual([]);
  });
});
