import type { RouteObject } from 'react-router';
import { PaginaFamilia } from './PaginaFamilia.tsx';

/** Routes of the "familia" feature. Only its owning front edits this file (5.5). `#/p/<payload>` opens offline. */
export const rutas: RouteObject[] = [{ path: 'p/:carga', Component: PaginaFamilia }];
