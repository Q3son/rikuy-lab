import { conectarActualizacion } from './actualizacion.ts';
import type { GrupoDePrecache } from './grupos.ts';

/**
 * Registers the service worker (production, secure context). The registration is relative
 * ("./sw.js") so it works at the server root and in subfolders like GitHub Pages.
 */
export async function registrarServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  const { Workbox } = await import('workbox-window');
  const wb = new Workbox('./sw.js');
  conectarActualizacion(
    {
      addEventListener: (tipo, oyente) => wb.addEventListener(tipo as 'waiting', oyente as never),
      messageSkipWaiting: () => wb.messageSkipWaiting(),
      register: () => wb.register(),
    },
    { recargar: () => window.location.reload() },
  );
  await wb.register();
}

/** Asks the worker to download an optional group (gestos only with the flag, clase on joining). */
export async function pedirGrupo(grupo: Exclude<GrupoDePrecache, 'base'>): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registro = await navigator.serviceWorker.ready;
  registro.active?.postMessage({ type: 'PRECACHE_GRUPO', grupo });
}
