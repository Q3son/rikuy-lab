import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { almacenSeguro } from './almacen.ts';
import type { Rol } from './navegacion.ts';
import type { NivelAcompanamiento } from './nivel.ts';
import type { ApodoGrupo } from './unirse.ts';

/**
 * Who is using this device and in which class. Only what the shell needs to route: role, class code,
 * group nickname and the level of support. No student data lives here (students are pseudonyms
 * inside the event log owned by F2; the roster never leaves the teacher phone).
 */
interface Sesion {
  rol: Rol | null;
  codigoClase: string | null;
  apodo: ApodoGrupo | null;
  nivel: NivelAcompanamiento;
}

interface Acciones {
  elegirRol: (rol: Rol) => void;
  unirse: (datos: { codigo: string; apodo: ApodoGrupo; nivel: NivelAcompanamiento }) => void;
  fijarNivel: (nivel: NivelAcompanamiento) => void;
  salirDeLaClase: () => void;
  salir: () => void;
}

const VACIA: Sesion = { rol: null, codigoClase: null, apodo: null, nivel: 'normal' };

export const useSesion = create<Sesion & Acciones>()(
  persist(
    (set) => ({
      ...VACIA,
      elegirRol: (rol) => set({ rol }),
      unirse: ({ codigo, apodo, nivel }) => set({ codigoClase: codigo, apodo, nivel }),
      fijarNivel: (nivel) => set({ nivel }),
      salirDeLaClase: () => set({ codigoClase: null, apodo: null, nivel: 'normal' }),
      salir: () => set({ ...VACIA }),
    }),
    {
      name: 'rikuy.sesion',
      storage: createJSONStorage(() => almacenSeguro()),
      partialize: (s) => ({ rol: s.rol, codigoClase: s.codigoClase, apodo: s.apodo, nivel: s.nivel }),
    },
  ),
);

/** A group is "in" once it has a class code. */
export const grupoDentro = (s: Pick<Sesion, 'rol' | 'codigoClase'>) => s.rol === 'grupo' && s.codigoClase !== null;
