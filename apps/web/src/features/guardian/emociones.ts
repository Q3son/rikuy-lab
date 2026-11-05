import type { EmocionAutorreporte } from '@rikuy/contracts';

/** Energy (rows) x agrado (columns). Words and shapes are the student's own vocabulary (DESIGN 10.8). */
export type Cuadrante = 'alta_agradable' | 'baja_agradable' | 'alta_desagradable' | 'baja_desagradable';

export interface CeldaEmocion {
  emocion: EmocionAutorreporte;
  palabra: string;
  cuadrante: Cuadrante;
  /** SVG path in a 24x24 box: a distinct shape per cell, so color is never the only cue. */
  forma: string;
}

export const CELDAS: CeldaEmocion[] = [
  { emocion: 'curiosidad', palabra: 'Curiosidad', cuadrante: 'alta_agradable', forma: 'M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.4l6-.8z' },
  { emocion: 'alegria', palabra: 'Alegría', cuadrante: 'alta_agradable', forma: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' },
  { emocion: 'orgullo', palabra: 'Orgullo', cuadrante: 'alta_agradable', forma: 'M12 3l9 9-9 9-9-9z' },
  { emocion: 'calma', palabra: 'Calma', cuadrante: 'baja_agradable', forma: 'M4 8h16v8H4z' },
  { emocion: 'frustracion', palabra: 'Frustración', cuadrante: 'alta_desagradable', forma: 'M12 3l10 18H2z' },
  { emocion: 'enojo', palabra: 'Enojo', cuadrante: 'alta_desagradable', forma: 'M8 3h8l5 5v8l-5 5H8l-5-5V8z' },
  { emocion: 'miedo', palabra: 'Miedo', cuadrante: 'alta_desagradable', forma: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z' },
  { emocion: 'preocupacion', palabra: 'Preocupación', cuadrante: 'alta_desagradable', forma: 'M12 2l9 6.5-3.5 11h-11L3 8.5z' },
  { emocion: 'confusion', palabra: 'Confusión', cuadrante: 'baja_desagradable', forma: 'M12 3c5 5 7 8 7 11a7 7 0 0 1-14 0c0-3 2-6 7-11z' },
  { emocion: 'aburrimiento', palabra: 'Aburrimiento', cuadrante: 'baja_desagradable', forma: 'M3 12h18M12 3v18' },
  { emocion: 'cansancio', palabra: 'Cansancio', cuadrante: 'baja_desagradable', forma: 'M16 3a9 9 0 1 0 5 12 7 7 0 0 1-5-12z' },
  { emocion: 'tristeza', palabra: 'Tristeza', cuadrante: 'baja_desagradable', forma: 'M3 6h18l-9 14z' },
];

export const CUADRANTES: { id: Cuadrante; titulo: string }[] = [
  { id: 'alta_agradable', titulo: 'Con mucha energía · agradable' },
  { id: 'baja_agradable', titulo: 'Con poca energía · agradable' },
  { id: 'alta_desagradable', titulo: 'Con mucha energía · desagradable' },
  { id: 'baja_desagradable', titulo: 'Con poca energía · desagradable' },
];

export const AYUDAS = [
  { valor: 'pista', texto: 'una pista' },
  { valor: 'mas_tiempo', texto: 'ir más despacio' },
  { valor: 'pausa', texto: 'una pausa' },
  { valor: 'hablar_con_docente', texto: 'hablar con alguien' },
  { valor: 'nada', texto: 'nada' },
] as const;
