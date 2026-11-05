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
import { createContext, useContext, useMemo, type ReactNode } from 'react';
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

export function ProveedorDocente({ valor, children }: { valor?: Valor; children: ReactNode }) {
  return <Ctx.Provider value={valor ?? valorGlobal()}>{children}</Ctx.Provider>;
}

function usarValor(): Valor {
  return useContext(Ctx) ?? valorGlobal();
}

export function useServicios(): ServiciosDocente {
  return usarValor().servicios;
}

export function useClase<T>(selector: (s: EstadoClase) => T): T {
  return useStore(usarValor().almacen, selector);
}

export function useAcciones(): EstadoClase {
  return usarValor().almacen.getState();
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
