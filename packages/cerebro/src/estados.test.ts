import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { MemoriaEntrada } from '@rikuy/contracts';
import { ids } from '@rikuy/contracts/fixtures';
import {
  ETIQUETA_ESTADO,
  construirMapa,
  idNodoDesempeno,
  porQueEstaAsi,
  type EntradaMapa,
  type GrafoCurricular,
} from './index.ts';

const hlc = (n: number) => `${String(1762300800000 + n * 1000)}-0000-docente1`;
const entrada = (n: number, tipo: MemoriaEntrada['tipo'], conceptos: string[], extra: Partial<MemoriaEntrada> = {}): MemoriaEntrada => ({
  id: `01JC${'0'.repeat(18)}M${String(n).padStart(3, '0')}`,
  estudianteId: ids.estudiante1,
  aulaId: ids.aula,
  competencia: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1 },
  conceptos,
  tipo,
  resumen: 'Resumen de plantilla',
  evidenciaIds: [],
  hlc: hlc(n),
  ...extra,
});

const grafo: GrafoCurricular = {
  nodos: [
    { id: 'c1', tipo: 'competencia', etiqueta: 'Indaga' },
    { id: idNodoDesempeno({ nivel: 'secundaria', grado: 2, competencia: 1, desempeno: 1 }), tipo: 'desempeno', etiqueta: 'Formula preguntas', padre: 'c1' },
    { id: 'longitud', tipo: 'concepto', etiqueta: 'Longitud', padre: 'c1' },
    { id: 'periodo', tipo: 'concepto', etiqueta: 'Periodo', padre: 'c1' },
    { id: 'masa', tipo: 'concepto', etiqueta: 'Masa', padre: 'c1' },
  ],
  aristas: [
    { desde: 'longitud', hasta: 'periodo', tipo: 'depende_de' },
    { desde: 'c1', hasta: 'longitud', tipo: 'contiene' },
  ],
};
const estado = (mapa: ReturnType<typeof construirMapa>, id: string) => mapa.nodos.find((n) => n.id === id);
const mapa = (e: Partial<EntradaMapa>) => construirMapa({ grafo, memoria: [], evidencias: [], exploraciones: [], ...e });

describe('Mi Cerebro Rikuy: node states come only from the student own evidence', () => {
  it('with no evidence every node is "sin explorar" (empty brain)', () => {
    const m = mapa({});
    expect(m.nodos.every((n) => n.estado === 'sin_explorar' && !n.preguntaAbierta)).toBe(true);
    expect(m.vacio).toBe(true);
  });

  it('a museum visit or an answer that mentions the concept makes it "explorado"', () => {
    const m = mapa({ exploraciones: [{ nodoIds: ['longitud'], fuente: 'visita', hlc: hlc(1) }] });
    expect(estado(m, 'longitud')?.estado).toBe('explorado');
    expect(estado(m, 'periodo')?.estado).toBe('sin_explorar');
  });

  it('a difficulty, a needed hint or a refuted prediction without a later achievement is "en camino"', () => {
    for (const tipo of ['dificultad', 'pista_necesaria', 'prediccion_refutada'] as const) {
      expect(estado(mapa({ memoria: [entrada(1, tipo, ['periodo'])] }), 'periodo')?.estado).toBe('en_camino');
    }
  });

  it('a later achievement turns it "logrado"; an earlier one does not hide a newer difficulty', () => {
    const logroDespues = mapa({ memoria: [entrada(1, 'dificultad', ['periodo']), entrada(2, 'logro', ['periodo'])] });
    expect(estado(logroDespues, 'periodo')?.estado).toBe('logrado');
    const dificultadDespues = mapa({ memoria: [entrada(1, 'logro', ['periodo']), entrada(2, 'dificultad', ['periodo'])] });
    expect(estado(dificultadDespues, 'periodo')?.estado).toBe('en_camino');
  });

  it('a confirmed prediction lights the node only with evidence confirmed by the teacher', () => {
    const ev = { id: ids.evidencia, nodoIds: ['periodo'], nivel: 3 as const, confirmadaPorDocente: true, cita: 'Entre más larga la cuerda, más tarda', fecha: hlc(3) };
    const sin = mapa({ memoria: [entrada(1, 'prediccion_confirmada', ['periodo'], { evidenciaIds: [ids.evidencia] })], evidencias: [{ ...ev, confirmadaPorDocente: false }] });
    expect(estado(sin, 'periodo')?.estado).toBe('explorado');
    const con = mapa({ memoria: [entrada(1, 'prediccion_confirmada', ['periodo'], { evidenciaIds: [ids.evidencia] })], evidencias: [ev] });
    expect(estado(con, 'periodo')?.estado).toBe('logrado');
  });

  it('an open question is a mark, not a color, and goes away once answered', () => {
    const abierta = mapa({ memoria: [entrada(1, 'pregunta_abierta', ['masa'])] });
    expect(estado(abierta, 'masa')).toMatchObject({ preguntaAbierta: true, estado: 'explorado' });
    const respondida = mapa({ memoria: [entrada(1, 'pregunta_abierta', ['masa']), entrada(2, 'logro', ['masa'])] });
    expect(estado(respondida, 'masa')).toMatchObject({ preguntaAbierta: false, estado: 'logrado' });
  });

  it('never lights a node without evidence (property): unrelated entries leave other nodes dark', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('logro', 'dificultad', 'pista_necesaria', 'pregunta_abierta', 'prediccion_refutada' as const), { minLength: 1, maxLength: 8 }),
        (tipos) => {
          const m = mapa({ memoria: tipos.map((t, i) => entrada(i, t, ['longitud'])) });
          expect(estado(m, 'periodo')?.estado).toBe('sin_explorar');
          expect(estado(m, 'masa')?.estado).toBe('sin_explorar');
        },
      ),
    );
  });

  it('a competency hub is "logrado" only when every child is, and dark when no child has evidence', () => {
    expect(estado(mapa({}), 'c1')?.estado).toBe('sin_explorar');
    const todos = ['longitud', 'periodo', 'masa', idNodoDesempeno({ nivel: 'secundaria', grado: 2, competencia: 1, desempeno: 1 })];
    const m = mapa({ memoria: todos.map((c, i) => entrada(i, 'logro', [c])) });
    expect(estado(m, 'c1')?.estado).toBe('logrado');
    const parcial = mapa({ memoria: [entrada(1, 'logro', ['longitud'])] });
    expect(estado(parcial, 'c1')?.estado).toBe('explorado');
  });

  it('a desempeño node is lit by an entry of that desempeño', () => {
    const id = idNodoDesempeno({ nivel: 'secundaria', grado: 2, competencia: 1, desempeno: 1 });
    expect(estado(mapa({ memoria: [entrada(1, 'logro', [])] }), id)?.estado).toBe('logrado');
  });
});

describe('honest explanations ("¿Por qué está así?")', () => {
  it('uses the interface names of the IA, never the code names', () => {
    expect(ETIQUETA_ESTADO).toEqual({
      sin_explorar: 'Sin explorar',
      explorado: 'Explorado',
      en_camino: 'Por revisar',
      logrado: 'Razonado',
      pregunta_abierta: '?',
    });
  });
  it('lists the entries and the literal quote linked to the evidence', () => {
    const ev = { id: ids.evidencia, nodoIds: ['periodo'], nivel: 3 as const, confirmadaPorDocente: true, cita: 'Entre más larga la cuerda, más tarda', fecha: hlc(3) };
    const m = mapa({ memoria: [entrada(1, 'logro', ['periodo'], { evidenciaIds: [ids.evidencia] })], evidencias: [ev] });
    const p = porQueEstaAsi(m, 'periodo');
    expect(p.estadoEtiqueta).toBe('Razonado');
    expect(p.entradas).toHaveLength(1);
    expect(p.citas).toEqual(['Entre más larga la cuerda, más tarda']);
    expect(p.frase).toMatch(/Razonado/);
  });
  it('an unlit node explains that there is no evidence yet', () => {
    expect(porQueEstaAsi(mapa({}), 'periodo').frase).toMatch(/Todavía no hay evidencia/);
  });
  it('has no percentage of "brain completed" and no comparison with others', () => {
    const m = mapa({ memoria: [entrada(1, 'logro', ['longitud'])] });
    expect(Object.keys(m).join(' ')).not.toMatch(/porcentaje|completado|ranking|comparaci/i);
  });
});
