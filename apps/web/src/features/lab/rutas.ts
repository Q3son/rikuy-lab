import type { RouteObject } from 'react-router';

/**
 * Routes of the "lab" feature. Only its owning front edits this file (5.5).
 * `RUTAS.laboratorio` = /lab/:practicaId (e.g. /lab/pendulo). Lazy: the practice chunk loads on demand.
 */
export const rutas: RouteObject[] = [
  { path: 'lab/:practicaId', lazy: async () => ({ Component: (await import('./PaginaPractica.tsx')).PaginaPractica }) },
];
