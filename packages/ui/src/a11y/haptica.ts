/**
 * Optional haptic cue (off by default). Short patterns only: it confirms an action and never
 * startles. Where the Vibration API is missing (iOS, desktop) every call is a safe no-op.
 */
export const PATRONES_HAPTICOS = {
  toque: 12,
  exito: [20, 40, 20],
  aviso: [40, 30, 40],
  nudo: [30, 40, 30, 40, 30],
} as const satisfies Record<string, number | readonly number[]>;

export type PatronHaptico = keyof typeof PATRONES_HAPTICOS;

export interface Haptica {
  disponible: boolean;
  pulso: (patron: PatronHaptico) => void;
}

export function crearHaptica(opciones: { activa: () => boolean; vibrate: ((patron: number | number[]) => boolean) | undefined }): Haptica {
  const { activa, vibrate } = opciones;
  return {
    disponible: typeof vibrate === 'function',
    pulso(patron) {
      if (!vibrate || !activa()) return;
      try {
        vibrate(PATRONES_HAPTICOS[patron] as number | number[]);
      } catch {
        // A device that refuses to vibrate must never break the screen.
      }
    },
  };
}
