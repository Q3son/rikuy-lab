import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Lets a screen of any front set the title of the top bar and a back target without touching the
 * shell: call `usePantalla({ titulo, volverA })` at the top of the screen component.
 * Without it the top bar shows the title of the tab that owns the route.
 */
interface Marco {
  titulo: string | null;
  volverA: string | null;
  fijar: (datos: { titulo: string | null; volverA: string | null }) => void;
}

export const useMarco = create<Marco>((set) => ({
  titulo: null,
  volverA: null,
  fijar: (datos) => set(datos),
}));

export function usePantalla({ titulo, volverA }: { titulo?: string; volverA?: string } = {}): void {
  useEffect(() => {
    useMarco.getState().fijar({ titulo: titulo ?? null, volverA: volverA ?? null });
    return () => useMarco.getState().fijar({ titulo: null, volverA: null });
  }, [titulo, volverA]);
}
