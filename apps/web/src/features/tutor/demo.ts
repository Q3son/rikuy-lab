/**
 * Demo content for the tutor page: a pendulum practice and a simulated viewer.
 * Real practices come from content/practicas (F9) and the real viewer from the holo feature (F3);
 * this exists so the tutor can be run and tested on its own. Hints follow the legacy Rikuy Lab catalog.
 */
import type { MemoriaEntrada } from '@rikuy/contracts';
import type { PracticaAgente, ResultadoComando } from '@rikuy/tutor';
import type { Comando } from '@rikuy/contracts';

const periodo = (l: number) => 2 * Math.PI * Math.sqrt(l / 9.8);

export const PRACTICA_DEMO: PracticaAgente = {
  preguntaGuia: 'Si alargas la cuerda, ¿el péndulo irá más rápido o más lento?',
  pistas: [
    'Cambia una sola variable a la vez y mide el tiempo de 10 oscilaciones.',
    '¿Cambió el periodo cuando cambiaste la masa? ¿Y cuando cambiaste la longitud?',
    'Compara las mediciones de dos longitudes distintas. ¿Qué cambió en el tiempo?',
  ],
  limitaciones: ['El modelo supone oscilaciones pequeñas y sin rozamiento del aire.'],
  variables: [
    { id: 'longitud', etiqueta: 'Longitud de la cuerda', unidad: 'm', min: 0.1, max: 2, paso: 0.05, porDefecto: 0.5 },
    { id: 'masa', etiqueta: 'Masa', unidad: 'kg', min: 0.05, max: 2, paso: 0.05, porDefecto: 0.2 },
  ],
  reservados: {
    numeros: [0.3, 0.6, 0.9, 1.2].map((l) => Number(periodo(l).toFixed(2))),
    frases: ['a mayor longitud mayor periodo', 'la masa no cambia el periodo'],
    limitacionesInvertidas: ['el modelo es perfecto y no tiene ninguna limitación'],
  },
};

export const ESCENAS_DEMO = ['pendulo'] as const;

/** Port of the viewer as the tutor sees it: it answers OK or ERROR for each command. */
export interface Visor {
  ejecutar(c: Comando): Promise<Omit<ResultadoComando, 'comando'>>;
}

/** Simulated viewer. `falla` makes the commands of that tool fail, to exercise the honesty policy. */
export function visorSimulado(opciones: { falla?: Comando['tool'] } = {}): Visor {
  return {
    async ejecutar(c) {
      return c.tool === opciones.falla ? { ok: false, motivo: 'el visor no respondió' } : { ok: true };
    },
  };
}

/** One remembered prediction, so the demo shows "La clase pasada...". */
export const RECUERDO_DEMO: MemoriaEntrada = {
  id: '0123456789ABCDEFGHJKMNPQRS',
  estudianteId: '0123456789ABCDEFGHJKMNPQR1',
  aulaId: '0123456789ABCDEFGHJKMNPQR2',
  competencia: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1 },
  conceptos: ['masa', 'periodo'],
  tipo: 'prediccion_refutada',
  resumen: 'Predijo que la masa cambiaba el periodo y su dato lo contradijo',
  evidenciaIds: [],
  hlc: '1762300800000-0000-docente1',
};
