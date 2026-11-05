/** Desktop layout switch: at 1024 px or more the app uses side panels instead of the bottom tab bar. */
import { useSyncExternalStore } from 'react';

export const CONSULTA_ESCRITORIO = '(min-width: 1024px)';

function lista(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA_ESCRITORIO) : null;
}

function suscribir(aviso: () => void): () => void {
  const mq = lista();
  if (!mq) return () => {};
  mq.addEventListener?.('change', aviso);
  return () => mq.removeEventListener?.('change', aviso);
}

export function esEscritorio(): boolean {
  return lista()?.matches ?? false;
}

export function useEscritorio(): boolean {
  return useSyncExternalStore(suscribir, esEscritorio, () => false);
}
