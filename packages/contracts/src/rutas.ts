/**
 * App route paths (hash router). Shared so that museum doors (Tiled `destino`) and features
 * agree on the same strings. Fronts add routes here by PR to the sprint 0 owner.
 */
export const RUTAS = {
  inicio: '/',
  clase: '/clase',
  museo: '/museo',
  sala: '/museo/:salaId',
  exhibicion: '/exhibicion/:exhibicionId',
  laboratorio: '/lab/:practicaId',
  holo: '/holo',
  retos: '/retos',
  cerebro: '/cerebro',
  docente: '/docente',
  creador: '/creador',
  relevo: '/relevo',
  familia: '/p/:carga',
  ajustes: '/ajustes',
} as const;

export type Ruta = (typeof RUTAS)[keyof typeof RUTAS];
