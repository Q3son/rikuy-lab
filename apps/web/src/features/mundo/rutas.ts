import { createElement } from 'react';
import { AbrirExhibicion } from './AbrirExhibicion.tsx';
import type { RouteObject } from 'react-router';
import { ListaMuseo } from './ListaMuseo.tsx';
import { MuseoPagina } from './MuseoPagina.tsx';
import { PiedraPagina } from './PiedraPagina.tsx';
import { QuipuPagina } from './QuipuPagina.tsx';

/** Routes of the "mundo" feature (Museo Rikuy). Only its owning front (F5) edits this file (5.5). */
export const rutas: RouteObject[] = [
  { path: 'museo', element: createElement(MuseoPagina) },
  { path: 'museo/lista', element: createElement(ListaMuseo) },
  { path: 'museo/piedra', element: createElement(PiedraPagina) },
  // Quipu tab: the class cord read from the @rikuy/quipu ledger
  { path: 'quipu', element: createElement(QuipuPagina) },
  { path: 'museo/:salaId', element: createElement(MuseoPagina) },
  // An exhibit opens its practice: the lab for the pendulum, the hologram viewer for the others
  { path: 'exhibicion/:exhibicionId', element: createElement(AbrirExhibicion) },
];
