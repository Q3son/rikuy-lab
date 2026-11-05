import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createHashRouter } from 'react-router';
import { Proveedores } from './app/Proveedores.tsx';
import { rutas } from './app/rutas.tsx';
import { redirigirSiUrlVieja } from './app/urlVieja.ts';
import { crearI18n } from './platform/i18n/i18n.ts';
import { registrarServiceWorker } from './platform/pwa/registro.ts';
import { useUi } from './shell/estado.ts';
import './index.css';

/** Hash routing: works the same on GitHub Pages, the local hub and the MINEDU kit (1.2). */
async function arrancar() {
  // An old URL served through the SPA (display.html?sala=...) is rewritten before the router reads it.
  redirigirSiUrlVieja();
  const i18n = await crearI18n({ lengua: useUi.getState().lengua });
  const router = createHashRouter(rutas);
  const raiz = document.getElementById('root');
  if (raiz) {
    createRoot(raiz).render(
      <StrictMode>
        <Proveedores i18n={i18n}>
          <RouterProvider router={router} />
        </Proveedores>
      </StrictMode>,
    );
  }
  // The shell must open before the worker: registration never blocks the first paint.
  void registrarServiceWorker().catch(() => {});
}

void arrancar();
