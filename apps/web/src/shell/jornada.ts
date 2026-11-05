import { create } from 'zustand';

/**
 * The teacher day ("Mi clase de hoy"): four stages and where the class is. F6 opens and advances
 * it (creating the class, the QR, the live visit); F1 only reads it to draw the stepper.
 */
export type Tramo = 'preparar' | 'museo' | 'cierre' | 'llevar';
export const TRAMOS: readonly Tramo[] = ['preparar', 'museo', 'cierre', 'llevar'];

export interface ClaseDeHoy {
  titulo: string;
  codigo: string;
  grupos: number;
  /** The stage the class is in now. Earlier stages are done, later ones are pending. */
  tramo: Tramo;
}

interface Jornada {
  clase: ClaseDeHoy | null;
  abrir: (clase: ClaseDeHoy) => void;
  avanzar: (tramo: Tramo) => void;
  cerrar: () => void;
}

export const useJornada = create<Jornada>((set) => ({
  clase: null,
  abrir: (clase) => set({ clase }),
  avanzar: (tramo) => set((s) => (s.clase ? { clase: { ...s.clase, tramo } } : s)),
  cerrar: () => set({ clase: null }),
}));

export type EstadoTramo = 'hecho' | 'ahora' | 'despues';

/** With no class the day starts at "Preparar". */
export function estadoDeTramo(tramo: Tramo, actual: Tramo | null): EstadoTramo {
  const ahora = actual ?? 'preparar';
  const i = TRAMOS.indexOf(tramo);
  const j = TRAMOS.indexOf(ahora);
  return i < j ? 'hecho' : i === j ? 'ahora' : 'despues';
}
