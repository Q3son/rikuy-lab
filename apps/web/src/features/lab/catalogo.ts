/**
 * Demo pendulum practice (the star exhibit). Content belongs to F9 (content/practicas); this copy
 * keeps the lab usable until the catalog lands, and follows the contract `Practica`.
 */
import type { Practica } from '@rikuy/contracts';
import { protocolFromPractice, type PendulumProtocol } from '@rikuy/lab-engine';

export const PRACTICA_PENDULO: Practica = {
  id: '01JF300000000000000000PEND',
  version: 1,
  titulo: 'El péndulo: ¿de qué depende lo que tarda?',
  desempeno: {
    nivel: 'secundaria',
    grado: 2,
    area: 'ciencia-y-tecnologia',
    competencia: 1,
    desempeno: 1,
    cita: 'Formula preguntas acerca de las variables que influyen en un hecho',
  },
  preguntaGuia: '¿De qué depende el tiempo que tarda el péndulo en ir y volver?',
  prediccionRequerida: true,
  materiales: [
    { nombre: 'Cuerda de 1 m', casero: true },
    { nombre: 'Una piedra pequeña', casero: true },
    { nombre: 'Regla o cinta', casero: true },
    { nombre: 'Cronómetro del celular', casero: true },
  ],
  variables: [{ id: 'longitud', etiqueta: 'Largo de la cuerda', unidad: 'm', min: 0.2, max: 1.5, paso: 0.05, porDefecto: 0.5 }],
  protocolo: { repeticiones: 10, valoresIndependiente: [0.25, 0.5, 1], magnitud: 'periodo', unidad: 's' },
  modelo: { id: 'pendulo', version: 1 },
  pistas: [
    '¿Qué cosas del péndulo podrías cambiar?',
    'Prueba con dos cuerdas de distinto largo.',
    'Compara el tiempo de 10 idas y vueltas con cada largo.',
  ],
  limitaciones: ['El modelo supone oscilaciones pequeñas (menos de 15°), cuerda sin peso y sin rozamiento.'],
  escenaHolo: 'pendulo',
  procedencia: { generadoPor: 'catalogo', modelos: [], revisiones: [{ por: 'docente', veredicto: 'ok', notas: [] }] },
  estado: 'aprobada',
};

export const PRACTICAS: Record<string, Practica> = { pendulo: PRACTICA_PENDULO, [PRACTICA_PENDULO.id]: PRACTICA_PENDULO };

export function protocoloPendulo(p: Practica = PRACTICA_PENDULO): PendulumProtocol {
  return protocolFromPractice(p);
}
