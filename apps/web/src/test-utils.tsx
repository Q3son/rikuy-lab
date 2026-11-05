import type { Lengua } from '@rikuy/contracts';
import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { Proveedores } from './app/Proveedores.tsx';
import { almacenDocente } from './features/docente/Proveedor.tsx';
import { useBandejaGuardian } from './features/guardian/bandeja.ts';
import { rutas } from './app/rutas.tsx';
import { crearI18n } from './platform/i18n/i18n.ts';
import { AJUSTES_POR_DEFECTO, useAjustesA11y } from './shell/accesibilidad/ajustes.ts';
import { useCamara, useRed, useUi } from './shell/estado.ts';
import type { Rol } from './shell/navegacion.ts';
import { useSesion } from './shell/sesion.ts';
import { useVersion } from './platform/pwa/actualizacion.ts';

export interface OpcionesApp {
  rol?: Rol;
  codigo?: string;
  apodo?: 'Puma';
  lengua?: Lengua;
}

/** Renders the whole app on a memory router with a clean device (empty storage, default settings). */
export async function renderApp(ruta: string, opciones: OpcionesApp = {}) {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  useAjustesA11y.setState({ ...AJUSTES_POR_DEFECTO });
  useUi.setState({ tema: 'auto', lengua: opciones.lengua ?? 'es' });
  useSesion.getState().salir();
  useRed.setState({ enLinea: true, pendientes: 0, enviando: false, error: false });
  useCamara.setState({ activa: false, apagar: null });
  useVersion.setState({ nueva: false, descartada: false, listaOffline: false, aplicar: null });
  almacenDocente().getState().reiniciar();
  useBandejaGuardian.getState().vaciar();
  if (opciones.rol) useSesion.getState().elegirRol(opciones.rol);
  if (opciones.codigo && opciones.apodo) useSesion.getState().unirse({ codigo: opciones.codigo, apodo: opciones.apodo, nivel: 'normal' });

  const i18n = await crearI18n({ lengua: opciones.lengua ?? 'es' });
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] });
  const vista = render(
    <Proveedores i18n={i18n}>
      <RouterProvider router={router} />
    </Proveedores>,
  );
  return { ...vista, router, i18n };
}
