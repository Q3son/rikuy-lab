/**
 * Hall wayfinding (DESIGN.md 2 "Hall colors", 5 "Hall glyphs", 7.1). Colour and glyph orient; they never
 * carry scientific meaning. Taller, Patio and Auditorio have no hall colour in DESIGN.md yet, so they reuse
 * core tokens (open item reported to design).
 */
import { RUTAS, type Sala } from '@rikuy/contracts';

export type Glifo = 'orbita' | 'hoja' | 'matraz' | 'monte' | 'taller' | 'juego' | 'usuarios' | 'museo';

/** Token name without the `--rk-` prefix. */
export type ColorSala =
  | 'hall-fisica'
  | 'hall-bio'
  | 'hall-quim'
  | 'hall-tierra'
  | 'ink-2'
  | 'sol'
  | 'ink'
  | 'primary';

export interface EstiloSala {
  color: ColorSala;
  glifo: Glifo;
  nombre: string;
  /** Secondary-language sublabel (provisional Quechua), if any. */
  sublabel: string | undefined;
}

const ESTILOS: Record<string, { color: ColorSala; glifo: Glifo }> = {
  'sala-fisica': { color: 'hall-fisica', glifo: 'orbita' },
  'sala-biologia': { color: 'hall-bio', glifo: 'hoja' },
  'sala-quimica': { color: 'hall-quim', glifo: 'matraz' },
  'sala-tierra': { color: 'hall-tierra', glifo: 'monte' },
  'sala-taller': { color: 'ink-2', glifo: 'taller' },
  patio: { color: 'sol', glifo: 'juego' },
  auditorio: { color: 'ink', glifo: 'usuarios' },
};

export function estiloSala(sala: Pick<Sala, 'id' | 'titulo'>): EstiloSala {
  const e = ESTILOS[sala.id] ?? { color: 'primary', glifo: 'museo' };
  return { ...e, nombre: sala.titulo.es ?? sala.id, sublabel: sala.titulo.quy };
}

export function rutaDeSala(salaId: string): string {
  return RUTAS.sala.replace(':salaId', encodeURIComponent(salaId));
}

export function rutaDeExhibicion(exhibicionId: string): string {
  return RUTAS.exhibicion.replace(':exhibicionId', encodeURIComponent(exhibicionId));
}

/** Not yet in RUTAS (see PROPUESTAS_CONTRATOS.md, F5): one challenge of the Patio. */
export function rutaDeReto(retoId: string): string {
  return `${RUTAS.retos}/${encodeURIComponent(retoId)}`;
}
