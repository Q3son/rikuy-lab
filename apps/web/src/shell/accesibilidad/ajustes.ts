/**
 * Accessibility settings of this device. They live in localStorage (per device, never synced and
 * never part of a student record) and are applied to <html> so the stylesheet can react:
 *   --rk-text-scale (100 % to 200 %), data-motion="reduce", data-contrast="high".
 */
import { escalaSiguiente, normalizarEscala, type EscalaTexto } from '@rikuy/ui';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { almacenSeguro } from '../almacen.ts';

export type VelocidadVoz = 0.75 | 1 | 1.25;
export const VELOCIDADES_VOZ: readonly VelocidadVoz[] = [0.75, 1, 1.25];
/** Step of the single-tap scanning mode, in milliseconds. */
export const VELOCIDADES_BARRIDO = [4000, 2500, 1500] as const;

export interface AjustesA11y {
  /** Rikuy reads every screen and exhibit aloud. */
  modoAudio: boolean;
  /** Turns Rikuy's voice off to avoid a double voice with TalkBack (cannot be detected reliably). */
  soloLectorPantalla: boolean;
  velocidadVoz: VelocidadVoz;
  escalaTexto: EscalaTexto;
  movimiento: 'auto' | 'reducido';
  contraste: 'normal' | 'alto';
  /** Optional haptic cue, off by default. */
  haptica: boolean;
  /** Single-tap scanning (switch access). */
  barrido: boolean;
  barridoMs: number;
}

export const AJUSTES_POR_DEFECTO: AjustesA11y = {
  modoAudio: false,
  soloLectorPantalla: false,
  velocidadVoz: 1,
  escalaTexto: 1,
  movimiento: 'auto',
  contraste: 'normal',
  haptica: false,
  barrido: false,
  barridoMs: 2500,
};

interface Acciones {
  fijar: (parcial: Partial<AjustesA11y>) => void;
  fijarEscala: (valor: number) => void;
  cambiarEscala: (direccion: 1 | -1) => void;
  restablecer: () => void;
}

export const useAjustesA11y = create<AjustesA11y & Acciones>()(
  persist(
    (set, get) => ({
      ...AJUSTES_POR_DEFECTO,
      fijar: (parcial) => set(parcial),
      fijarEscala: (valor) => set({ escalaTexto: normalizarEscala(valor) }),
      cambiarEscala: (direccion) => set({ escalaTexto: escalaSiguiente(get().escalaTexto, direccion) }),
      restablecer: () => set({ ...AJUSTES_POR_DEFECTO }),
    }),
    {
      name: 'rikuy.a11y',
      storage: createJSONStorage(() => almacenSeguro()),
      partialize: (s) => ({
        modoAudio: s.modoAudio,
        soloLectorPantalla: s.soloLectorPantalla,
        velocidadVoz: s.velocidadVoz,
        escalaTexto: s.escalaTexto,
        movimiento: s.movimiento,
        contraste: s.contraste,
        haptica: s.haptica,
        barrido: s.barrido,
        barridoMs: s.barridoMs,
      }),
    },
  ),
);

/** Writes the settings the stylesheet reads onto an element (normally <html>). */
export function aplicarAjustes(raiz: HTMLElement, a: Pick<AjustesA11y, 'escalaTexto' | 'movimiento' | 'contraste' | 'modoAudio' | 'barrido'>): void {
  raiz.style.setProperty('--rk-text-scale', String(normalizarEscala(a.escalaTexto)));
  if (a.movimiento === 'reducido') raiz.setAttribute('data-motion', 'reduce');
  else raiz.removeAttribute('data-motion');
  if (a.contraste === 'alto') raiz.setAttribute('data-contrast', 'high');
  else raiz.removeAttribute('data-contrast');
  if (a.modoAudio) raiz.setAttribute('data-modo-audio', '');
  else raiz.removeAttribute('data-modo-audio');
  if (a.barrido) raiz.setAttribute('data-barrido', '');
  else raiz.removeAttribute('data-barrido');
}
