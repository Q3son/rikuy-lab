import { EventoValidado } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { construirEscenario, GRUPOS_DEMO } from './escenario.ts';

describe('demo scenario', () => {
  it('only emits contract-valid events', () => {
    const { eventos } = construirEscenario();
    const invalidos = eventos.filter((e) => !EventoValidado.safeParse(e).success);
    expect(invalidos.map((e) => e.tipo)).toEqual([]);
  });

  it('has 4 groups and 12 students', () => {
    const { eventos, grupoIds } = construirEscenario();
    expect(Object.keys(grupoIds)).toHaveLength(GRUPOS_DEMO.length);
    expect(eventos.filter((e) => e.tipo === 'aula.estudiante_alta')).toHaveLength(12);
  });

  it('keeps the (device, seq) pairs unique and contiguous', () => {
    const { eventos } = construirEscenario();
    const porDisp = new Map<string, number[]>();
    for (const e of eventos) porDisp.set(e.dispositivo, [...(porDisp.get(e.dispositivo) ?? []), e.seq]);
    for (const seqs of porDisp.values()) expect(seqs).toEqual(seqs.map((_, i) => i + 1));
  });
});
