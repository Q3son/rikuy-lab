import type { RouteObject } from 'react-router';

/** Routes of the "cerebro" feature (F10). Mi Cerebro Rikuy lives at /cerebro (RUTAS.cerebro). */
export const rutas: RouteObject[] = [
  {
    path: 'cerebro',
    lazy: async () => ({ Component: (await import('./CerebroPage.tsx')).CerebroPage }),
  },
];
