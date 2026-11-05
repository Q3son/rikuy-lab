/**
 * Local tray of the Guardián (level 1) and the Caja de dudas on this device. The student check-in, the
 * "Necesito hablar" requests and the doubts land here; the teacher views read the same tray (same phone in
 * the demo, or after the hub relays them). Pseudonymous ids only: no names, no free text in the heatmap.
 */
import type { AutorreporteMomento } from '@rikuy/contracts';
import { aleatorioSistema, createUlidFactory, formatHlc, relojSistema } from '@rikuy/core';
import type { DudaConcepto } from '@rikuy/reportes';
import type { EtiquetaDocente, PedidoDeAyuda } from '@rikuy/senales';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface BandejaGuardian {
  autorreportes: AutorreporteMomento[];
  pedidos: PedidoDeAyuda[];
  dudas: DudaConcepto[];
  /** Teacher decisions on "para acercarse" suggestions (id -> label). */
  decisiones: Record<string, EtiquetaDocente>;
  /** Teacher switched the Guardián off for this class. */
  apagado: boolean;
  esDemo: boolean;
}

interface Acciones {
  agregarAutorreporte(a: AutorreporteMomento): void;
  agregarPedido(p: PedidoDeAyuda): void;
  agregarDuda(d: DudaConcepto): void;
  decidir(id: string, etiqueta: EtiquetaDocente): void;
  apagar(): void;
  reemplazar(b: Partial<BandejaGuardian>): void;
  vaciar(): void;
}

const VACIA: BandejaGuardian = { autorreportes: [], pedidos: [], dudas: [], decisiones: {}, apagado: false, esDemo: false };

function almacen(): Storage {
  try {
    return globalThis.localStorage;
  } catch {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 };
  }
}

export const useBandejaGuardian = create<BandejaGuardian & Acciones>()(
  persist(
    (set) => ({
      ...VACIA,
      agregarAutorreporte: (a) => set((s) => ({ autorreportes: [...s.autorreportes, a] })),
      agregarPedido: (p) => set((s) => ({ pedidos: [...s.pedidos, p] })),
      agregarDuda: (d) => set((s) => ({ dudas: [...s.dudas, d] })),
      decidir: (id, etiqueta) => set((s) => ({ decisiones: { ...s.decisiones, [id]: etiqueta } })),
      apagar: () => set({ apagado: true }),
      reemplazar: (b) => set(b),
      vaciar: () => set({ ...VACIA }),
    }),
    {
      name: 'rikuy.guardian.v1',
      storage: createJSONStorage(almacen),
      partialize: ({ autorreportes, pedidos, dudas, decisiones, apagado, esDemo }) => ({ autorreportes, pedidos, dudas, decisiones, apagado, esDemo }),
    },
  ),
);

const ulid = createUlidFactory(relojSistema, aleatorioSistema);
export const nuevoIdGuardian = (): string => ulid();
export const hlcAhora = (nodo = 'grupo001'): string => formatHlc({ ms: relojSistema.ahora(), counter: 0, node: nodo });
