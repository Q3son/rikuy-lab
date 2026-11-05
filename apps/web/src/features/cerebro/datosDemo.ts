import type { MemoriaEntrada } from '@rikuy/contracts';
import { idNodoDesempeno, type EntradaMapa, type GrafoCurricular } from '@rikuy/cerebro';

/** Mock curriculum graph over the cerebro contract, until F9 ships curriculum-cneb + its precomputed layout. */
const D1 = idNodoDesempeno({ nivel: 'secundaria', grado: 2, competencia: 1, desempeno: 1 });

export const GRAFO_DEMO: GrafoCurricular = {
  nodos: [
    { id: 'c1', tipo: 'competencia', etiqueta: 'Indaga', sala: 'fisica' },
    { id: 'c2', tipo: 'competencia', etiqueta: 'Explica', sala: 'fisica' },
    { id: D1, tipo: 'desempeno', etiqueta: 'Formula preguntas', padre: 'c1', sala: 'fisica' },
    { id: 'longitud', tipo: 'concepto', etiqueta: 'Longitud', padre: 'c1', sala: 'fisica' },
    { id: 'periodo', tipo: 'concepto', etiqueta: 'Periodo', padre: 'c1', sala: 'fisica' },
    { id: 'masa', tipo: 'concepto', etiqueta: 'Masa', padre: 'c2', sala: 'fisica' },
    { id: 'gravedad', tipo: 'concepto', etiqueta: 'Gravedad', padre: 'c2', sala: 'fisica' },
  ],
  aristas: [
    { desde: 'c1', hasta: 'longitud', tipo: 'contiene' },
    { desde: 'c1', hasta: 'periodo', tipo: 'contiene' },
    { desde: 'longitud', hasta: 'periodo', tipo: 'depende_de' },
    { desde: 'c2', hasta: 'masa', tipo: 'contiene' },
    { desde: 'c2', hasta: 'gravedad', tipo: 'contiene' },
  ],
};

const hlc = (n: number) => `${1762300800000 + n * 1000}-0000-docente1`;
const entrada = (n: number, tipo: MemoriaEntrada['tipo'], conceptos: string[], evidenciaIds: string[] = []): MemoriaEntrada => ({
  id: `01JC${'0'.repeat(18)}M${String(n).padStart(3, '0')}`,
  estudianteId: '01JC0000000000000000000E01',
  aulaId: '01JC0000000000000000000A01',
  competencia: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1 },
  conceptos,
  tipo,
  resumen: 'Resumen de plantilla',
  evidenciaIds,
  hlc: hlc(n),
});

/** Example evidence: "longitud -> periodo" of the pendulum, with a literal quote. */
export function memoriaDemo(): Pick<EntradaMapa, 'memoria' | 'evidencias' | 'exploraciones'> {
  return {
    memoria: [
      entrada(1, 'logro', ['periodo'], ['01JC0000000000000000000V01']),
      entrada(2, 'dificultad', ['longitud']),
      entrada(3, 'pregunta_abierta', ['masa']),
    ],
    evidencias: [
      { id: '01JC0000000000000000000V01', nodoIds: ['periodo'], nivel: 3, confirmadaPorDocente: true, cita: 'Entre más larga la cuerda, más tarda en ir y volver', fecha: hlc(1) },
    ],
    exploraciones: [{ nodoIds: ['gravedad'], fuente: 'visita', hlc: hlc(4) }],
  };
}
