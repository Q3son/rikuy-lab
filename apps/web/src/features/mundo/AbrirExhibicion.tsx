import { PRACTICAS } from '@rikuy/curriculum-cneb';
import { Navigate, useParams } from 'react-router';
import { SLUG_DE_EXHIBICION, escenaHoloDeExhibicion } from './catalogo.ts';

/** `/exhibicion/<id>`: the pendulum runs in the lab (F3); the other practices open their hologram scene. */
export function AbrirExhibicion() {
  const exhibicionId = useParams().exhibicionId ?? '';
  const slug = SLUG_DE_EXHIBICION[exhibicionId];
  const practica = slug ? PRACTICAS[slug] : undefined;
  if (!practica) return <Navigate to="/museo" replace />;
  if (practica.modelo?.id === 'pendulo') return <Navigate to={`/lab/${slug}`} replace />;
  return <Navigate to={`/holo/ver/${escenaHoloDeExhibicion(exhibicionId) ?? slug}`} replace state={{ volverA: '/museo' }} />;
}
