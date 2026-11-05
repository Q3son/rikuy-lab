import { createElement } from 'react';
import type { RouteObject } from 'react-router';
import { ListaMuseo } from './ListaMuseo.tsx';
import { MuseoPagina } from './MuseoPagina.tsx';

/** Routes of the "mundo" feature (Museo Rikuy). Only its owning front (F5) edits this file (5.5). */
export const rutas: RouteObject[] = [
  { path: 'museo', element: createElement(MuseoPagina) },
  { path: 'museo/lista', element: createElement(ListaMuseo) },
  { path: 'museo/:salaId', element: createElement(MuseoPagina) },
];
