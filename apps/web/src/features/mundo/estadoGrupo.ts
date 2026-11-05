/**
 * Per-device group state of the museum: the customised stone and the halls whose curator question was
 * answered. Kept in memory with a best-effort localStorage copy (a convenience, not a record).
 * The class quipu balance comes from F10; until then a demo base plus the confirmed help knots.
 */
import { type AparienciaPiedra, PIEDRA_INICIAL } from '@rikuy/campus';
import { create } from 'zustand';
import { useAyudante } from './ayudante/servicio.ts';

const CLAVE = 'rk-museo-grupo';
const NUDOS_AULA_DEMO = 5;

interface Guardado {
  piedra: AparienciaPiedra;
  rejas: string[];
}

function leer(): Guardado {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const g = JSON.parse(crudo) as Partial<Guardado>;
      return { piedra: { ...PIEDRA_INICIAL, ...g.piedra }, rejas: Array.isArray(g.rejas) ? g.rejas.filter((x) => typeof x === 'string') : [] };
    }
  } catch {
    // storage blocked or corrupt: start fresh
  }
  return { piedra: PIEDRA_INICIAL, rejas: [] };
}

function escribir(g: Guardado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g));
  } catch {
    // ignore
  }
}

interface EstadoGrupo extends Guardado {
  guardarPiedra: (p: AparienciaPiedra) => void;
  abrirReja: (salaId: string) => void;
  reiniciar: () => void;
}

export const useEstadoGrupo = create<EstadoGrupo>((set, get) => ({
  ...leer(),
  guardarPiedra: (piedra) => {
    set({ piedra });
    escribir({ piedra, rejas: get().rejas });
  },
  abrirReja: (salaId) => {
    if (get().rejas.includes(salaId)) return;
    const rejas = [...get().rejas, salaId];
    set({ rejas });
    escribir({ piedra: get().piedra, rejas });
  },
  reiniciar: () => set({ piedra: PIEDRA_INICIAL, rejas: [] }),
}));

/** Class quipu knots (mock port of `@rikuy/quipu`): demo base + confirmed help knots. */
export function useNudosAula(): number {
  const nudos = useAyudante((s) => s.estado.nudos);
  return NUDOS_AULA_DEMO + nudos.filter((n) => n.estado === 'confirmado').length;
}
