/**
 * Demo exhibit catalog for the museum until the approved practices catalog (F9, `content/practicas/`)
 * is wired in. Exhibits follow the `Exhibicion` contract; the museum map is generated from them.
 */
import type { Exhibicion } from '@rikuy/contracts';
import { PLANTILLAS, SALAS_CONTENIDO, generarMuseo, type Museo } from '@rikuy/campus';

const PRACTICA_PENDULO = '01JC0000000000000000000P01';
const PRACTICA_LACTASA = '01JC0000000000000000000P02';
const PRACTICA_RESPIRACION = '01JC0000000000000000000P03';

export const EXHIBICIONES_DEMO: Exhibicion[] = [
  { id: 'exh-pendulo', salaId: 'sala-fisica', practicaId: PRACTICA_PENDULO, pedestal: 'p1', recursos: [] },
  { id: 'exh-lactasa', salaId: 'sala-biologia', practicaId: PRACTICA_LACTASA, pedestal: 'p1', recursos: [] },
  { id: 'exh-respiracion', salaId: 'sala-biologia', practicaId: PRACTICA_RESPIRACION, pedestal: 'p2', recursos: [] },
];

export const TITULOS_DEMO: Record<string, string> = {
  'exh-pendulo': 'El péndulo',
  'exh-lactasa': 'Lactasa: de la leche a la molécula',
  'exh-respiracion': 'Respiración en altura',
};

/** Socratic plaque question per exhibit (one line, DESIGN.md 7.2). */
export const PREGUNTAS_DEMO: Record<string, string> = {
  'exh-pendulo': '¿Qué hace que un péndulo vaya más rápido o más lento?',
  'exh-lactasa': '¿Por qué a algunas personas les cae mal la leche?',
  'exh-respiracion': '¿Respiras igual en la puna que en la costa?',
};

export const EXHIBICION_DEL_DIA = 'exh-pendulo';

export interface RetoResumen {
  id: string;
  titulo: string;
}

export function construirMuseo(opciones: { retos?: RetoResumen[]; rejasAbiertas?: ReadonlySet<string> } = {}): Museo {
  return generarMuseo({
    salas: SALAS_CONTENIDO,
    exhibiciones: EXHIBICIONES_DEMO,
    plantillas: PLANTILLAS,
    titulos: TITULOS_DEMO,
    retos: opciones.retos ?? [],
    ...(opciones.rejasAbiertas ? { rejasAbiertas: opciones.rejasAbiertas } : {}),
  });
}
