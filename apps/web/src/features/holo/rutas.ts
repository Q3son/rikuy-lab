import type { RouteObject } from 'react-router';

/**
 * Routes of the "holo" feature. Only its owning front edits this file (5.5).
 * Every page is lazy: Three.js and MediaPipe are fetched only when a hologram is opened.
 * Base path `RUTAS.holo` (/holo); the sub-routes are proposed in PROPUESTAS_CONTRATOS.md.
 */
export const rutas: RouteObject[] = [
  { path: 'holo', lazy: async () => ({ Component: (await import('./PaginaHolo.tsx')).PaginaHolo }) },
  { path: 'holo/proyector/:sala?', lazy: async () => ({ Component: (await import('./PaginaProyector.tsx')).PaginaProyector }) },
  { path: 'holo/control/:sala', lazy: async () => ({ Component: (await import('./PaginaControl.tsx')).PaginaControl }) },
  { path: 'holo/ver/:escena?', lazy: async () => ({ Component: (await import('./PaginaUnCelular.tsx')).PaginaUnCelular }) },
];
