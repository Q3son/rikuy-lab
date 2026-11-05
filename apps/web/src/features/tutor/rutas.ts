import type { RouteObject } from 'react-router';

/** Routes of the "tutor" feature. Only its owning front edits this file (5.5). */
export const rutas: RouteObject[] = [
  {
    path: 'tutor',
    lazy: async () => {
      const { TutorPagina } = await import('./TutorPagina.tsx');
      return { Component: TutorPagina };
    },
  },
];
