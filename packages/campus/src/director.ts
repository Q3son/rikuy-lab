/**
 * Rikuy's scene director: deterministic rules, no AI (the director pattern of AulaQuipu, paoloose,
 * reduced to pure rules). Expressions are driven only by app events (DESIGN.md 6), never by the camera.
 */

export type Expresion = 'curiosa' | 'piensa' | 'celebra' | 'sin_red';

export interface EntradaDirector {
  escenaId: string;
  primeraVisita: boolean;
  /** Other groups in the same hall (from presence). */
  gruposEnSala: number;
  sinRed: boolean;
  hoy?: { exhibicionId: string; salaId: string; titulo: string; sala: string };
  cerca?: { id: string; etiqueta: string };
  nudoNuevo?: boolean;
}

export interface Direccion {
  expresion: Expresion;
  mensaje: string;
  /** Destination id to highlight and draw the BFS path to. */
  senalar?: string;
}

const otros = (n: number) => (n === 1 ? 'Hay 1 grupo más aquí.' : n > 1 ? `Hay ${n} grupos más aquí.` : '');

export function dirigir(e: EntradaDirector): Direccion {
  if (e.nudoNuevo) return { expresion: 'celebra', mensaje: '¡Un nudo nuevo para el quipu del aula!' };
  if (e.sinRed) return { expresion: 'sin_red', mensaje: 'Sin red, todo guardado. Yo sigo aquí contigo.' };
  if (e.cerca) return { expresion: 'curiosa', mensaje: `¿Qué crees que vas a descubrir en «${e.cerca.etiqueta}»?` };
  const cuenta = otros(e.gruposEnSala);
  const juntar = (...partes: string[]) => partes.filter(Boolean).join(' ');

  if (e.hoy && e.escenaId === 'vestibulo') {
    const saludo = e.primeraVisita ? '¡Hola! Soy Rikuy.' : '';
    return {
      expresion: 'curiosa',
      mensaje: juntar(saludo, `Hoy toca «${e.hoy.titulo}» en la Sala ${e.hoy.sala}. ¿Me sigues? Te marco el camino.`, cuenta),
      senalar: `puerta-${e.hoy.salaId}`,
    };
  }
  if (e.hoy && e.escenaId === e.hoy.salaId) {
    return {
      expresion: 'curiosa',
      mensaje: juntar(`Ahí está «${e.hoy.titulo}». ¿Qué crees que pasará?`, cuenta),
      senalar: `exh-${e.hoy.exhibicionId}`,
    };
  }
  return {
    expresion: 'piensa',
    mensaje: juntar(e.primeraVisita ? '¡Hola! Soy Rikuy.' : '', 'Camina con las flechas o toca el piso. ¿Qué quieres mirar?', cuenta),
  };
}
