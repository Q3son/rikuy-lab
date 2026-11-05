import { createElement } from 'react';
import type { RouteObject } from 'react-router';
import { PatioRetos, RetoPagina } from './RetosPaginas.tsx';

/** Routes of the "retos" feature (Patio de juegos). Only its owning front (F5) edits this file (5.5). */
export const rutas: RouteObject[] = [
  { path: 'retos', element: createElement(PatioRetos) },
  { path: 'retos/:retoId', element: createElement(RetoPagina) },
];
