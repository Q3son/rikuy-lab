import type { RouteObject } from 'react-router';

/**
 * Routes of the "guardian" feature (F10). NOT yet wired in app/rutas.tsx (owned by sprint 0 / F1):
 * see PROPUESTAS_CONTRATOS.md. The check-in, "Necesito hablar" and pulso are overlays that F3/F4 mount
 * inside the exhibit flow; the demo route lets them be reviewed on their own.
 */
export const rutas: RouteObject[] = [
  {
    path: 'guardian',
    lazy: async () => ({ Component: (await import('./GuardianDemo.tsx')).GuardianDemo }),
  },
];
