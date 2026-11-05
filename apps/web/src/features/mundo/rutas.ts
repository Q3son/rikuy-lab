import { createElement } from 'react';
import type { RouteObject } from 'react-router';
import { TableroAyudas } from './ayudante/TableroAyudas.tsx';
import { ListaMuseo } from './ListaMuseo.tsx';
import { MuseoPagina } from './MuseoPagina.tsx';
import { PiedraPagina } from './PiedraPagina.tsx';

/** Routes of the "mundo" feature (Museo Rikuy). Only its owning front (F5) edits this file (5.5). */
export const rutas: RouteObject[] = [
  { path: 'museo', element: createElement(MuseoPagina) },
  { path: 'museo/lista', element: createElement(ListaMuseo) },
  { path: 'museo/piedra', element: createElement(PiedraPagina) },
  // T-23, teacher view of the help flows (F6 may embed TableroAyudas in its panel)
  { path: 'museo/ayudas', element: createElement(TableroAyudas) },
  { path: 'museo/:salaId', element: createElement(MuseoPagina) },
];
