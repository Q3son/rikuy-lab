import type { Evento } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { construirEscenario, ulid } from './demo/escenario.ts';
import { INDICADORES, construirVistaEvidencias } from './evidencias.ts';
import { proyectar } from './proyeccion.ts';

const vista = (eventos: Evento[]) => construirVistaEvidencias(proyectar(eventos));

describe('evidence view: literal quotes (gate 5.4)', () => {
  it('every shown quote is an exact substring of what the group wrote', () => {
    const { eventos } = construirEscenario();
    const v = vista(eventos);
    const mostradas = v.grupos.flatMap((g) => g.indicadores).filter((i) => i.cita !== null);
    expect(mostradas.length).toBeGreaterThanOrEqual(8);
    for (const i of mostradas) expect(i.textoOriginal?.includes(i.cita as string)).toBe(true);
  });

  it('refuses a paraphrased quote: the indicator becomes "no evaluable" and nothing is invented', () => {
    const { eventos } = construirEscenario({ citasAlteradas: true });
    const v = vista(eventos);
    const todas = v.grupos.flatMap((g) => g.indicadores);
    expect(todas.every((i) => i.cita === null)).toBe(true);
    expect(todas.every((i) => i.nivel === 'NO')).toBe(true);
    expect(v.citasRechazadas).toBe(8);
  });

  it('refuses a quote that points to a response of another group', () => {
    const { eventos, grupoIds } = construirEscenario();
    const tocados = eventos.map((e) => {
      if (e.tipo !== 'evidencia.calculada') return e;
      const d = e.datos as { grupoId: string };
      return d.grupoId === grupoIds.Condor ? { ...e, datos: { ...d, respuestaId: ulid('RE', 4) } } : e;
    });
    const condor = vista(tocados).grupos.find((g) => g.apodo === 'Condor');
    expect(condor?.indicadores.filter((i) => i.cita !== null)).toHaveLength(0);
  });
});

describe('evidence view: honest levels', () => {
  it('"no evaluable" stays "NO" and never becomes a zero', () => {
    const { eventos } = construirEscenario();
    const viz = vista(eventos).grupos.find((g) => g.apodo === 'Vizcacha');
    const dato = viz?.indicadores.find((i) => i.indicador === 'uso_del_dato');
    expect(dato?.nivel).toBe('NO');
    expect(dato?.estado).toBe('no_observable');
  });

  it('a missing indicator is "sin evidencia aun", not a level', () => {
    const { eventos } = construirEscenario();
    const puma = vista(eventos).grupos.find((g) => g.apodo === 'Puma');
    const justificacion = puma?.indicadores.find((i) => i.indicador === 'justificacion');
    expect(justificacion).toMatchObject({ nivel: 'NO', estado: 'no_observable', cita: null, sinEvidencia: true });
  });

  it('always lists every indicator in the same fixed order', () => {
    const { eventos } = construirEscenario();
    for (const g of vista(eventos).grupos) expect(g.indicadores.map((i) => i.indicador)).toEqual([...INDICADORES]);
  });

  it('keeps "dudoso" for the teacher to decide', () => {
    const { eventos } = construirEscenario();
    const v = vista(eventos);
    const puma = v.grupos.find((g) => g.apodo === 'Puma')?.indicadores.find((i) => i.indicador === 'prediccion');
    expect(puma?.estado).toBe('dudoso');
  });
});

describe('evidence view: teacher confirmation', () => {
  it('marks confirmed indicators and applies the teacher correction level', () => {
    const { eventos } = construirEscenario();
    const v = vista(eventos);
    const condor = v.grupos.find((g) => g.apodo === 'Condor')?.indicadores.find((i) => i.indicador === 'prediccion');
    expect(condor).toMatchObject({ confirmada: true, nivel: 3, corregidaPorDocente: false });
    const puma = v.grupos.find((g) => g.apodo === 'Puma')?.indicadores.find((i) => i.indicador === 'prediccion');
    expect(puma).toMatchObject({ confirmada: true, corregidaPorDocente: true, nivel: 0 });
  });

  it('counts the indicators still waiting for a decision', () => {
    const { eventos } = construirEscenario();
    const v = vista(eventos);
    const condor = v.grupos.find((g) => g.apodo === 'Condor');
    expect(condor?.porConfirmar).toBe(3); // 4 quoted indicators, 1 confirmed
    expect(v.porConfirmar).toBeGreaterThan(0);
  });
});

describe('evidence view: no ordering by score (gate 5.4)', () => {
  it('lists groups in join order whatever their levels are', () => {
    const { eventos } = construirEscenario();
    const orden = vista(eventos).grupos.map((g) => g.apodo);
    expect(orden).toEqual(['Condor', 'Vizcacha', 'Puma', 'Kantu']);
    const invertidos = eventos.map((e) => {
      if (e.tipo !== 'evidencia.calculada') return e;
      const d = e.datos as { nivel: unknown; estado: string };
      return typeof d.nivel === 'number' ? { ...e, datos: { ...d, nivel: 3 - d.nivel } } : e;
    });
    expect(vista(invertidos).grupos.map((g) => g.apodo)).toEqual(orden);
  });

  it('does not depend on the arrival order of the events', () => {
    const { eventos } = construirEscenario();
    const barajados = [...eventos].reverse();
    expect(vista(barajados).grupos.map((g) => g.apodo)).toEqual(vista(eventos).grupos.map((g) => g.apodo));
  });

  it('exposes no score, rank or total on any group', () => {
    const { eventos } = construirEscenario();
    for (const g of vista(eventos).grupos) {
      expect(Object.keys(g).filter((k) => /punt|rank|score|total|promedio|orden/i.test(k))).toEqual([]);
    }
  });

  it('shows the latest evidence of an indicator, not the highest one', () => {
    const { eventos, grupoIds } = construirEscenario();
    const extra: Evento = {
      ...eventos.find((e) => e.tipo === 'evidencia.calculada')!,
      id: ulid('EN', 9000),
      seq: 9000,
      hlc: '1762399999999-0000-docente1',
      datos: {
        id: ulid('EV', 9000),
        respuestaId: ulid('RE', 1),
        grupoId: grupoIds.Condor,
        claseId: eventos[0].claseId,
        indicador: 'prediccion',
        nivel: 1,
        estado: 'ok',
        cita: 'tarda más en volver',
        desempeno: { competencia: 1, desempeno: 1 },
        fuente: 'reglas',
        confirmadaPorDocente: false,
      },
    };
    const condor = vista([...eventos, extra]).grupos.find((g) => g.apodo === 'Condor');
    expect(condor?.indicadores.find((i) => i.indicador === 'prediccion')?.nivel).toBe(1);
  });
});

describe('projection robustness', () => {
  it('ignores duplicated and malformed events but counts them', () => {
    const { eventos } = construirEscenario();
    const roto = { ...eventos[eventos.length - 3], id: ulid('EN', 8000), datos: { basura: true } } as Evento;
    const proy = proyectar([...eventos, eventos[5], roto]);
    expect(proy.diagnostico.invalidos).toBe(1);
    expect(proy.diagnostico.duplicados).toBe(1);
    expect(proy.grupos).toHaveLength(4);
  });
});
