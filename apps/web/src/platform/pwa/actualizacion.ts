/**
 * Service worker lifecycle as UI state: the "versión nueva" banner and the "ya funciona sin
 * internet" notice. The new worker waits until the person presses Actualizar, so an update never
 * reloads the page in the middle of a measurement.
 */
import { create } from 'zustand';

/** The subset of workbox-window's Workbox that we use (also easy to fake in tests). */
export interface ServiceWorkerWindow {
  addEventListener: (tipo: string, oyente: (e: { isUpdate?: boolean }) => void) => void;
  messageSkipWaiting: () => void;
  register: () => Promise<unknown>;
}

interface EstadoVersion {
  nueva: boolean;
  descartada: boolean;
  listaOffline: boolean;
  aplicar: (() => void) | null;
  descartar: () => void;
}

export const useVersion = create<EstadoVersion>((set) => ({
  nueva: false,
  descartada: false,
  listaOffline: false,
  aplicar: null,
  descartar: () => set({ descartada: true }),
}));

export function conectarActualizacion(wb: ServiceWorkerWindow, entorno: { recargar: () => void }): void {
  let pedida = false;
  wb.addEventListener('waiting', () => {
    useVersion.setState({
      nueva: true,
      descartada: false,
      aplicar: () => {
        pedida = true;
        wb.messageSkipWaiting();
      },
    });
  });
  wb.addEventListener('controlling', () => {
    if (pedida) entorno.recargar();
  });
  wb.addEventListener('activated', (e) => {
    if (!e.isUpdate) useVersion.setState({ listaOffline: true });
  });
}
