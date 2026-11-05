import { ArrowLeftRight, Circle, Equal, Hourglass, Lightbulb, Link2, Minus, Plus, Ruler, Spline, Timer } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Pictograms of the first practice (the pendulum). Spec of the `Pictogramas` port that F7 supplies
 * later: an id, the i18n key of its word and an icon. Icons are single-colour line drawings with no
 * hands and no faces (DESIGN.md 5). The word always travels with the icon.
 */
export interface DefinicionPictograma {
  id: string;
  clave: `pic.${string}`;
  icono: ReactNode;
}

export const PICTOGRAMAS_PENDULO: DefinicionPictograma[] = [
  { id: 'creo', clave: 'pic.creo', icono: <Lightbulb /> },
  { id: 'cuerda', clave: 'pic.cuerda', icono: <Spline /> },
  { id: 'piedra', clave: 'pic.piedra', icono: <Circle /> },
  { id: 'larga', clave: 'pic.larga', icono: <ArrowLeftRight /> },
  { id: 'mas', clave: 'pic.mas', icono: <Plus /> },
  { id: 'menos', clave: 'pic.menos', icono: <Minus /> },
  { id: 'tiempo', clave: 'pic.tiempo', icono: <Timer /> },
  { id: 'tarda', clave: 'pic.tarda', icono: <Hourglass /> },
  { id: 'mide', clave: 'pic.mide', icono: <Ruler /> },
  { id: 'igual', clave: 'pic.igual', icono: <Equal /> },
  { id: 'porque', clave: 'pic.porque', icono: <Link2 /> },
];
