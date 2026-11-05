/**
 * Wires the presence client to the injected realtime port. Today the port is the simulated hub; F8's WS
 * client replaces the simulated hub here without touching the museum. `?sim=N` sets N simulated peer groups per room
 * (performance gate: 40).
 */
import { type AvatarRender, ClientePresencia, type Museo } from '@rikuy/campus';
import type { Reaccion } from '@rikuy/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HubSimulado } from './hubSimulado.ts';

const DEMO: Record<string, number> = { vestibulo: 3, 'sala-fisica': 2 };

export interface Presencia {
  /** Sends the own group's position (rate-limited by the client). */
  actualizar: (x: number, y: number, dir: number) => void;
  reaccionar: (r: Reaccion) => void;
  otros: () => AvatarRender[];
  gruposEnSala: number;
}

interface Conexion {
  cliente: ClientePresencia;
  hub: HubSimulado;
}

export function usePresencia(museo: Museo, salaActual: string, simulados: number | null): Presencia {
  const conexion = useRef<Conexion | null>(null);
  const [gruposEnSala, setGrupos] = useState(0);

  // One connection per room visit; created in the effect so StrictMode mount/unmount stays balanced.
  useEffect(() => {
    const escenas = (sala: string) => (sala === 'vestibulo' ? museo.vestibulo : museo.salas[sala]);
    const hub = new HubSimulado(escenas, (sala) => simulados ?? DEMO[sala] ?? 1);
    const cliente = new ClientePresencia(hub, { hz: 6 });
    conexion.current = { cliente, hub };
    cliente.entrarSala(salaActual);
    const t = setInterval(() => setGrupos(cliente.pares().length), 1000);
    return () => {
      clearInterval(t);
      cliente.cerrar();
      hub.detener();
      conexion.current = null;
    };
  }, [museo, simulados, salaActual]);

  return useMemo(
    () => ({
      gruposEnSala,
      actualizar: (x: number, y: number, dir: number) => conexion.current?.cliente.actualizar(Date.now(), [{ x, y, dir }]),
      reaccionar: (r: Reaccion) => conexion.current?.cliente.reaccionar(r),
      otros: (): AvatarRender[] => {
        const c = conexion.current;
        if (!c) return [];
        return c.cliente.pares().map((par) => {
          const grupo = c.hub.grupos.get(par.g);
          const p = par.p[0]!;
          return {
            id: par.d,
            x: p.x,
            y: p.y,
            dir: p.dir,
            color: grupo?.color ?? '#33494F',
            etiqueta: grupo?.apodo ?? 'Grupo',
            integrantes: 3,
          };
        });
      },
    }),
    [gruposEnSala],
  );
}
