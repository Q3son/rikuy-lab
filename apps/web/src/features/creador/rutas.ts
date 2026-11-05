import { RUTAS } from '@rikuy/contracts/rutas';
import type { RouteObject } from 'react-router';

/** Routes of the "creador" feature. Only its owning front edits this file (5.5). */
export const rutas: RouteObject[] = [
  {
    path: RUTAS.creador.slice(1),
    lazy: async () => ({ Component: (await import('./CreadorPage.tsx')).CreadorPage }),
  },
];
