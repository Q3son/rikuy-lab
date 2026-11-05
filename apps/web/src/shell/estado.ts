import type { Lengua } from '@rikuy/contracts';
import type { EstadoSync } from '@rikuy/ui';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { almacenSeguro } from './almacen.ts';

/** Connectivity and the sync queue, as the chip shows them. F2 feeds `reportar`. */
interface EstadoRed {
  enLinea: boolean;
  pendientes: number;
  enviando: boolean;
  error: boolean;
  reportar: (parcial: Partial<Pick<EstadoRed, 'enLinea' | 'pendientes' | 'enviando' | 'error'>>) => void;
}

export const useRed = create<EstadoRed>((set) => ({
  enLinea: typeof navigator === 'undefined' ? true : navigator.onLine,
  pendientes: 0,
  enviando: false,
  error: false,
  reportar: (parcial) => set(parcial),
}));

export interface ChipDeRed {
  estado: EstadoSync;
  clave: 'red.sinRed' | 'red.conRed' | 'red.porEnviar' | 'red.enviando' | 'red.enviado' | 'red.error';
  conteo?: number;
}

/** Offline is a normal state, never alarm wording: the chip says where the data is. */
export function estadoDeRed(s: { enLinea: boolean; pendientes: number; enviando: boolean; error: boolean }): ChipDeRed {
  if (s.error) return { estado: 'error', clave: 'red.error' };
  if (s.enviando) return { estado: 'enviando', clave: 'red.enviando' };
  if (s.pendientes > 0) return { estado: 'por-enviar', clave: 'red.porEnviar', conteo: s.pendientes };
  if (!s.enLinea) return { estado: 'sin-red', clave: 'red.sinRed' };
  return { estado: 'enviado', clave: 'red.conRed' };
}

export type Tema = 'auto' | 'light' | 'dark' | 'holo';

interface Ui {
  tema: Tema;
  lengua: Lengua;
  fijarTema: (tema: Tema) => void;
  fijarLengua: (lengua: Lengua) => void;
}

export const useUi = create<Ui>()(
  persist(
    (set) => ({
      tema: 'auto',
      lengua: 'es',
      fijarTema: (tema) => set({ tema }),
      fijarLengua: (lengua) => set({ lengua }),
    }),
    { name: 'rikuy.ui', storage: createJSONStorage(() => almacenSeguro()) },
  ),
);

/** Writes the theme to the data-theme attribute of html; "auto" removes it so the system decides. */
export function aplicarTema(raiz: HTMLElement, tema: Tema): void {
  if (tema === 'auto') raiz.removeAttribute('data-theme');
  else raiz.setAttribute('data-theme', tema);
}

/** Camera indicator: whoever opens the camera (F3 gestures, F10 signals) reports it here. */
interface Camara {
  activa: boolean;
  apagar: (() => void) | null;
  reportar: (activa: boolean, apagar?: () => void) => void;
}

export const useCamara = create<Camara>((set) => ({
  activa: false,
  apagar: null,
  reportar: (activa, apagar) => set({ activa, apagar: activa ? (apagar ?? null) : null }),
}));
