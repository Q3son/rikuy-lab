/* eslint-disable react-refresh/only-export-components -- provider, hooks and factories live together on purpose */
import {
  crearAdaptadorSimulado,
  crearColaSalida,
  type AlmacenSalida,
  type ColaSalida,
  type ItemSalida,
  type PuertoEntrega,
} from '@rikuy/evidencia';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { enlaceWame } from '../../familia/compartir.ts';
import type { Contactos } from './borradores.ts';

/** "The hub synced": F2/F8 dispatch `rikuy:sync` on `window`; coming back online also counts. */
export interface SenalSync {
  suscribir(cb: () => void): () => void;
}

export const senalSyncDelNavegador: SenalSync = {
  suscribir(cb) {
    window.addEventListener('rikuy:sync', cb);
    window.addEventListener('online', cb);
    return () => {
      window.removeEventListener('rikuy:sync', cb);
      window.removeEventListener('online', cb);
    };
  },
};

function leerJson<T>(clave: string, defecto: T): T {
  try {
    const crudo = globalThis.localStorage?.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : defecto;
  } catch {
    return defecto;
  }
}
function escribirJson(clave: string, valor: unknown): void {
  try {
    globalThis.localStorage?.setItem(clave, JSON.stringify(valor));
  } catch {
    /* storage unavailable: the outbox keeps working in memory */
  }
}

export const almacenSalidaLocal: AlmacenSalida = {
  cargar: async () => leerJson<ItemSalida[]>('rikuy.salida.v1', []),
  guardar: async (items) => escribirJson('rikuy.salida.v1', items),
};

export interface ContactosAlmacen {
  leer(): Contactos;
  escribir(c: Contactos): void;
}
export const contactosLocales: ContactosAlmacen = {
  leer: () => leerJson<Contactos>('rikuy.contactos.v1', { familias: [] }),
  escribir: (c) => escribirJson('rikuy.contactos.v1', c),
};

export interface Entrega {
  cola: ColaSalida;
  puertos: Record<string, PuertoEntrega>;
  senal: SenalSync;
  enLinea(): boolean;
  ahora(): number;
  contactos: ContactosAlmacen;
  /** Simulated adapters carry the "Datos simulados" label until F7 delivers the real ones. */
  simulado: boolean;
}

/** `wa.me` adapter: opens WhatsApp with the text ready. Never claims "delivered". */
export function crearAdaptadorWame(abrir: (url: string) => void): PuertoEntrega {
  return {
    canal: 'enlace_wame',
    capacidades: () => ({ plantillasAprobadas: false, audioAdjunto: false, estadoEntrega: false }),
    async enviar(mensaje, destino) {
      abrir(enlaceWame(mensaje.cuerpo.texto, destino.direccion));
      return { ok: true, valor: { acuseId: `wame-${mensaje.id}`, manual: true } };
    },
    estado: async () => 'enviado_proveedor',
  };
}

export function crearEntregaSimulada(o: { almacen?: AlmacenSalida; contactos?: ContactosAlmacen; enLinea?: () => boolean; ahora?: () => number; senal?: SenalSync } = {}): Entrega {
  const ahora = o.ahora ?? (() => Date.now());
  return {
    cola: crearColaSalida({ almacen: o.almacen ?? almacenSalidaLocal, ahora, desfaseMin: -300 }),
    puertos: { whatsapp: crearAdaptadorSimulado('whatsapp'), correo: crearAdaptadorSimulado('correo') },
    senal: o.senal ?? senalSyncDelNavegador,
    enLinea: o.enLinea ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine)),
    ahora,
    contactos: o.contactos ?? contactosLocales,
    simulado: true,
  };
}

const Ctx = createContext<Entrega | null>(null);
let global: Entrega | null = null;

export function ProveedorEntrega({ valor, children }: { valor?: Entrega; children: ReactNode }) {
  return <Ctx.Provider value={valor ?? (global ??= crearEntregaSimulada())}>{children}</Ctx.Provider>;
}

export function useEntrega(): Entrega {
  return useContext(Ctx) ?? (global ??= crearEntregaSimulada());
}

/** Items of the outbox, reloaded after every change and flushed whenever the hub syncs. */
export function useSalida() {
  const entrega = useEntrega();
  const [items, setItems] = useState<ItemSalida[]>([]);
  const [version, setVersion] = useState(0);
  const refrescar = () => setVersion((v) => v + 1);

  useEffect(() => {
    let vivo = true;
    void entrega.cola.lista().then((l) => vivo && setItems(l));
    return () => {
      vivo = false;
    };
  }, [entrega, version]);

  useEffect(
    () =>
      entrega.senal.suscribir(() => {
        void entrega.cola.drenar({ enLinea: entrega.enLinea(), puertos: entrega.puertos }).then(() => entrega.cola.refrescarEstados(entrega.puertos)).then(refrescar);
      }),
    [entrega],
  );

  return useMemo(() => ({ items, refrescar }), [items]);
}
