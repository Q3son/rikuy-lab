import { describe, expect, it } from 'vitest';
import { avancePorGrupo } from './avance.ts';
import { construirVistaEvidencias } from './evidencias.ts';
import { construirEscenario } from './demo/escenario.ts';
import { coberturaPorCapacidad, citaRepresentativa } from './cobertura.ts';
import { proyectar } from './proyeccion.ts';
import { construirResumenClase } from './resumen.ts';

const esc = construirEscenario();
const proy = proyectar(esc.eventos);
const vista = construirVistaEvidencias(proy);

describe('group progress', () => {
  const avance = avancePorGrupo(proy, 30);
  it('detects prediction before measuring', () => {
    const por = Object.fromEntries(avance.map((a) => [a.apodo, a]));
    expect(por.Condor.prediccionAntesDeMedir).toBe(true);
    expect(por.Kantu.predijo).toBe(true);
    expect(por.Kantu.prediccionAntesDeMedir).toBe(false);
  });
  it('counts measurements against the protocol and keeps join order', () => {
    expect(avance.map((a) => [a.apodo, a.medicionesHechas])).toEqual([['Condor', 30], ['Vizcacha', 30], ['Puma', 12], ['Kantu', 4]]);
    expect(avance[0].medicionesEsperadas).toBe(30);
  });
  it('ignores voided measurements', () => {
    const anulada = { ...esc.eventos.find((e) => e.tipo === 'medicion.registrada')!, id: '01JC' + 'EN' + '9000'.padStart(20, '0'), seq: 9999, hlc: '1762399999999-0000-grupo001', tipo: 'medicion.anulada' as const };
    const m = esc.eventos.find((e) => e.tipo === 'medicion.registrada')!;
    anulada.datos = { medicionId: (m.datos as { id: string }).id };
    const otra = proyectar([...esc.eventos, anulada]);
    expect(avancePorGrupo(otra, 30)[0].medicionesHechas).toBe(29);
  });
});

describe('competency coverage (T-13)', () => {
  const cob = coberturaPorCapacidad(vista);
  it('lists the five capacities with the group count and the rest as "sin evidencia aun"', () => {
    expect(cob).toHaveLength(5);
    for (const c of cob) expect(c.gruposConEvidencia + c.gruposSinEvidencia).toBe(vista.grupos.length);
  });
  it('does not count "no evaluable" as evidence', () => {
    const genera = cob.find((c) => c.id === 'genera');
    expect(genera?.gruposConEvidencia).toBe(1); // only Condor; Vizcacha is "NO"
  });
  it('picks a representative quote by group order, not by level', () => {
    const q = citaRepresentativa(vista, 'problematiza');
    expect(q).toMatchObject({ apodo: 'Condor' });
    expect(q?.texto).toBe('si la cuerda es más larga tarda más en volver');
  });
  it('exposes no field named like a percentage-of-failure', () => {
    expect(JSON.stringify(cob)).not.toMatch(/fallo|reprob|no_logr/i);
  });
});

describe('three-part class summary (T-11)', () => {
  const r = construirResumenClase(proy, vista, 30);
  it('part 1 counts groups that predicted before measuring and cited their data', () => {
    expect(r.vimos.texto).toContain('3 de 4 grupos predijeron antes de medir');
    expect(r.vimos.texto).toContain('1 citó su propio dato');
  });
  it('part 1 carries a literal quote from the groups', () => {
    expect(r.vimos.cita?.texto).toBeTruthy();
    expect(esc.eventos.some((e) => JSON.stringify(e.datos).includes(r.vimos.cita!.texto))).toBe(true);
  });
  it('part 2 only talks about observed difficulty, with a literal quote for the doubtful one', () => {
    expect(r.costo.texto).toMatch(/Puma|dudos/i);
    expect(r.costo.cita?.texto).toBe('pesa más y por eso tarda más');
  });
  it('part 3 has exactly three exercises', () => {
    expect(r.ejercicios).toHaveLength(3);
    expect(new Set(r.ejercicios).size).toBe(3);
  });
  it('says honestly when there is nothing to say', () => {
    const vacio = proyectar(esc.eventos.filter((e) => e.tipo === 'clase.creada' || e.tipo === 'grupo.unido'));
    const rv = construirResumenClase(vacio, construirVistaEvidencias(vacio), 30);
    expect(rv.costo.texto).toMatch(/Todavía no hay evidencia/);
    expect(rv.ejercicios).toHaveLength(3);
  });
});
