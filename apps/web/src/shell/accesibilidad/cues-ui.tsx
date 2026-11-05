import { crearHaptica, type Haptica } from '@rikuy/ui';
import { Volume2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { useAjustesA11y } from './ajustes.ts';
import { crearCues, crearSonidoWebAudio, type CueVisible } from './cues.ts';

interface EstadoCue {
  actual: (CueVisible & { id: number }) | null;
  mostrar: (cue: CueVisible) => void;
  ocultar: () => void;
}

let contador = 0;
export const useCueVisible = create<EstadoCue>((set) => ({
  actual: null,
  mostrar: (cue) => set({ actual: { ...cue, id: ++contador } }),
  ocultar: () => set({ actual: null }),
}));

/** Haptic helper tied to the setting; safe where the Vibration API does not exist. */
export function useHaptica(): Haptica {
  return useMemo(
    () =>
      crearHaptica({
        activa: () => useAjustesA11y.getState().haptica,
        vibrate: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' ? navigator.vibrate.bind(navigator) : undefined,
      }),
    [],
  );
}

/** Cues for the whole app: text always, beep when the audio mode is on, vibration when enabled. */
export function useCues() {
  const haptica = useHaptica();
  return useMemo(
    () =>
      crearCues({
        mostrar: (c) => useCueVisible.getState().mostrar(c),
        sonido: crearSonidoWebAudio(),
        sonidoActivo: () => {
          const a = useAjustesA11y.getState();
          return a.modoAudio && !a.soloLectorPantalla;
        },
        haptica,
      }),
    [haptica],
  );
}

/**
 * Visual equivalent of every sound: a short text pill. Not a live region on purpose (screen readers
 * get the announcement through the global regions); it only exists for people who cannot hear.
 */
export function CueVisual() {
  const actual = useCueVisible((s) => s.actual);
  const ocultar = useCueVisible((s) => s.ocultar);
  useEffect(() => {
    if (!actual) return;
    const id = setTimeout(ocultar, 2500);
    return () => clearTimeout(id);
  }, [actual, ocultar]);
  if (!actual) return null;
  return (
    <div
      aria-hidden="true"
      data-cue={actual.tipo}
      className="pointer-events-none fixed inset-x-0 top-20 z-30 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-ctl border-2 border-ink bg-ink px-3 py-2 text-small font-semibold text-bg"
    >
      <Volume2 className="size-5 shrink-0" />
      <span>{actual.texto}</span>
    </div>
  );
}
