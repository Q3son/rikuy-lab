/** Shared test fixtures (not exported from the package). */
import type { BorradorPractica } from './esquemas.ts';

export const CITA = 'Formula preguntas acerca de las variables que influyen en un hecho';
export const TEXTO_OFICIAL = `${CITA}, fenómeno u objeto natural o tecnológico.`;

export const refDesempeno = {
  nivel: 'secundaria' as const,
  grado: 2,
  area: 'ciencia-y-tecnologia' as const,
  competencia: 1,
  desempeno: 1,
  cita: CITA,
};

export function borradorValido(): BorradorPractica {
  return {
    titulo: 'El péndulo: ¿qué cambia el periodo?',
    preguntaGuia: '¿De qué depende el tiempo que tarda un péndulo en ir y volver?',
    citaDesempeno: CITA,
    materiales: [
      { nombre: 'Cuerda', casero: true },
      { nombre: 'Tuerca o piedra', casero: true },
    ],
    variables: [{ id: 'longitud', etiqueta: 'Longitud de la cuerda', unidad: 'm', min: 0.2, max: 1.5, paso: 0.1, porDefecto: 0.5 }],
    protocolo: { repeticiones: 10, valoresIndependiente: [0.3, 0.6, 0.9], magnitud: 'periodo', unidad: 's' },
    modeloId: 'pendulo',
    pistas: [
      '¿Qué podrías cambiar en el péndulo para que vaya y vuelva más rápido?',
      'Prueba con dos cuerdas de distinto largo y la misma tuerca.',
      'Cuenta 10 vueltas con cada largo y divide el tiempo entre 10.',
    ],
    limitaciones: ['El modelo supone oscilaciones pequeñas y sin rozamiento.'],
    resultadoEsperado: {
      valores: [1.1, 1.55, 1.9],
      unidad: 's',
      conclusion: 'El periodo aumenta cuando aumenta la longitud de la cuerda y no depende de la masa.',
    },
    quiz: [
      {
        enunciado: 'Si acortas la cuerda del péndulo, ¿qué pasa con el tiempo de cada vuelta?',
        opciones: ['Aumenta', 'Disminuye', 'No cambia'],
        correcta: 1,
        retro: ['Mide otra vez con una cuerda más corta y compara.'],
      },
    ],
    diagrama: {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><line x1="50" y1="5" x2="50" y2="70" stroke="#333"/><circle cx="50" cy="75" r="6"/></svg>',
      etiquetas: { cuerda: 'Cuerda', masa: 'Tuerca' },
    },
    guionVideo: ['Muestra un péndulo en reposo.', 'Suéltalo y cuenta una vuelta completa.'],
    pictogramas: [{ id: 'cuerda', descripcion: 'Una cuerda atada a una tuerca' }],
  };
}
