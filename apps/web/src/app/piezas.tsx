/** Small app-level screens and adapters used by the route table (kept apart for fast refresh). */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Ajustes as AjustesDocente } from '../features/docente/vistas/Ajustes.tsx';
import { AjustesGenerales } from '../shell/pantallas/AjustesGenerales.tsx';
import { useSesion } from '../shell/sesion.ts';
import { identidadDeGrupo, type IdentidadDispositivo } from './identidad.ts';
import { mapearUrlVieja } from './urlVieja.ts';

/** `/display.html?sala=X` typed or bookmarked inside the hash router goes to its new home. */
export function RedirigirUrlVieja() {
  const { pathname, search } = useLocation();
  const destino = mapearUrlVieja(new URL(`https://rikuy.local${pathname}${search}`));
  return <Navigate to={destino ? destino.slice(1) : '/'} replace />;
}

/** Hands the pseudonymous ids of this group device to a feature screen. */
export function ConIdentidad({ hijo }: { hijo: (id: IdentidadDispositivo) => ReactNode }) {
  const codigo = useSesion((s) => s.codigoClase);
  const apodo = useSesion((s) => s.apodo);
  return <>{hijo(identidadDeGrupo(codigo, apodo))}</>;
}

/** Teacher Ajustes: the class switches of F6 and the device settings of the shell. */
export function AjustesCompletos() {
  return (
    <>
      <AjustesDocente />
      <AjustesGenerales />
    </>
  );
}

