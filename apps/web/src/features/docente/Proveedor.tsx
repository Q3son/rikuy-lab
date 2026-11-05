/* eslint-disable react-refresh/only-export-components -- provider and hooks live together on purpose */
import {
  avancePorGrupo,
  coberturaPorCapacidad,
  construirResumenClase,
  construirVistaEvidencias,
  medicionesEsperadas,
  proyectar,
  type ProyeccionClase,
} from '@rikuy/evidencia';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { crearAlmacenClase, memoriaLocal, type EstadoClase } from './estado/clase.ts';
import type { ServiciosDocente } from './puertos.ts';
import { serviciosSimulados } from './simulacion/receptor.ts';

interface Valor {
  almacen: StoreApi<EstadoClase>;
  servicios: ServiciosDocente;
}

const Ctx = createContext<Valor | null>(null);
let global: Valor | null = null;

function valorGlobal(): Valor {
  global ??= { almacen: crearAlmacenClase(serviciosSimulados, memoriaLocal), servicios: serviciosSimulados };
  return global;
}

/** The class store of this teacher phone (the app's demo loader and the test helper reach it here). */
export function almacenDocente(): StoreApi<EstadoClase> {
  return valorGlobal().almacen;
}

export function ProveedorDocente({ valor, children }: { valor?: Valor; children: ReactNode }) {
  return <Ctx.Provider value={valor ?? valorGlobal()}>{children}</Ctx.Provider>;
}

function useValor(): Valor {
  return useContext(Ctx) ?? valorGlobal();
}

export function useServicios(): ServiciosDocente {
  return useValor().servicios;
}

export function useClase<T>(selector: (s: EstadoClase) => T): T {
  return useStore(useValor().almacen, selector);
}

export function useAcciones(): EstadoClase {
  return useValor().almacen.getState();
}

/** Everything the panel derives from the event log, recomputed only when the log changes. */
export function useProyeccion() {
  const eventos = useClase((s) => s.eventos);
  const practica = useClase((s) => s.practica);
  return useMemo(() => {
    const p: ProyeccionClase = proyectar(eventos);
    const esperadas = practica ? medicionesEsperadas(practica.protocolo) : 0;
    const vista = construirVistaEvidencias(p);
    return {
      p,
      vista,
      avance: avancePorGrupo(p, esperadas),
      cobertura: coberturaPorCapacidad(vista),
      resumen: construirResumenClase(p, vista, esperadas),
    };
  }, [eventos, practica]);
}

/** True while the browser reports a network. Offline is a normal state, never an error. */
export function useEnLinea(): boolean {
  const [en, setEn] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setEn(true);
    const off = () => setEn(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return en;
}
