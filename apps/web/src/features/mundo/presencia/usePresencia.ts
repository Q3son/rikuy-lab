/**
 * Wires the presence client to a realtime port: the F8 hub (`PresenciaHub`, ReconnectingSocket) when the
 * page is served by the hub, else the simulated hub. `?sim=N` forces N simulated peer groups per room
 * (performance gate: 40) even on the hub.
 */
import { type AvatarRender, ClientePresencia, type Museo } from '@rikuy/campus';
import type { Reaccion } from '@rikuy/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { hubDeEstaPagina, type InfoHub } from '../../../platform/hub.ts';
import { COLORES_GRUPO, grupoActual } from '../grupo.ts';
import { HubSimulado } from './hubSimulado.ts';
import { PresenciaHub } from './hubReal.ts';

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
  /** Only the simulator knows the peers' nicknames and colours; the hub sends ids and positions. */
  hub: HubSimulado | null;
  detener(): void;
}

const colorDe = (id: string) => COLORES_GRUPO[[...id].reduce((h, c) => h + c.charCodeAt(0), 0) % COLORES_GRUPO.length]!;

function wsDelHub(info: InfoHub): string {
  const url = new URL(info.ws.replace(/^\//, ''), location.href.split('#')[0]);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}

export function usePresencia(museo: Museo, salaActual: string, simulados: number | null): Presencia {
  const conexion = useRef<Conexion | null>(null);
  const [gruposEnSala, setGrupos] = useState(0);
  const [hubInfo, setHubInfo] = useState<InfoHub | null>(null);

  useEffect(() => {
    let vivo = true;
    void hubDeEstaPagina().then((h) => vivo && setHubInfo(h));
    return () => {
      vivo = false;
    };
  }, []);

  // One connection per room visit; created in the effect so StrictMode mount/unmount stays balanced.
  useEffect(() => {
    const escenas = (sala: string) => (sala === 'vestibulo' ? museo.vestibulo : museo.salas[sala]);
    const grupo = grupoActual();
    const real = hubInfo && simulados === null && grupo.claseId ? new PresenciaHub(wsDelHub(hubInfo), { claseId: grupo.claseId, grupoId: grupo.id, dispositivo: grupo.dispositivo, nonce: hubInfo.nonce }) : null;
    const hub = real ? null : new HubSimulado(escenas, (sala) => simulados ?? DEMO[sala] ?? 1);
    const cliente = new ClientePresencia((real ?? hub)!, { hz: 6 });
    conexion.current = { cliente, hub, detener: () => (real ? real.detener() : hub?.detener()) };
    cliente.entrarSala(salaActual);
    const t = setInterval(() => setGrupos(cliente.pares().length), 1000);
    return () => {
      clearInterval(t);
      cliente.cerrar();
      conexion.current?.detener();
      conexion.current = null;
    };
  }, [museo, simulados, salaActual, hubInfo]);

  return useMemo(
    () => ({
      gruposEnSala,
      actualizar: (x: number, y: number, dir: number) => conexion.current?.cliente.actualizar(Date.now(), [{ x, y, dir }]),
      reaccionar: (r: Reaccion) => conexion.current?.cliente.reaccionar(r),
      otros: (): AvatarRender[] => {
        const c = conexion.current;
        if (!c) return [];
        return c.cliente.pares().map((par) => {
          const grupo = c.hub?.grupos.get(par.g);
          const p = par.p[0]!;
          return {
            id: par.d,
            x: p.x,
            y: p.y,
            dir: p.dir,
            color: grupo?.color ?? colorDe(par.g),
            etiqueta: grupo?.apodo ?? 'Grupo',
            integrantes: 3,
          };
        });
      },
    }),
    [gruposEnSala],
  );
}
