/**
 * Persistent outbox (`salida_mensajes`). Rules of FUNCIONES_EXTRA 1.6 and the user priority:
 *  - nothing is sent before the teacher previews and approves it;
 *  - individual (variant B) messages are approved one by one, never in a batch;
 *  - sending waits for the network and flushes on sync, idempotently;
 *  - exponential backoff, at most 5 attempts and 48 h, then "fallido" with the manual path;
 *  - an expired weekly message is dropped, not sent late;
 *  - the record (acta) keeps template, version, content hash, consent and approver, never child text.
 */
import { sha256 } from './sha256.ts';
import type { Canal, Destino, EstadoEntrega, MensajeSaliente, Plantilla, PuertoEntrega } from './puertos.ts';

export type EstadoSalida = 'borrador' | 'descartado' | 'vencido' | EstadoEntrega;

export interface ActaMensaje {
  plantilla: Plantilla;
  version: number;
  hash: string;
  consentimientoRef: string;
  aprobadoPor: string;
}

export interface ItemSalida {
  id: string;
  mensaje: MensajeSaliente;
  destino: Destino;
  estado: EstadoSalida;
  vistaPrevia: boolean;
  intentos: number;
  proximoIntento: number;
  aprobadoEn: number | null;
  acuseId: string | null;
  manual: boolean;
  ultimoFallo: string | null;
  acta: ActaMensaje | null;
}

export interface AlmacenSalida {
  cargar(): Promise<ItemSalida[]>;
  guardar(items: ItemSalida[]): Promise<void>;
}

export interface OpcionesCola {
  almacen: AlmacenSalida;
  ahora(): number;
  /** Minutes east of UTC (Lima is -300). */
  desfaseMin: number;
}

export interface OpcionesDrenaje {
  enLinea: boolean;
  puertos: Partial<Record<Canal, PuertoEntrega>> | Record<string, PuertoEntrega>;
  respetarVentana?: boolean;
}

export interface ResumenDrenaje {
  enviados: number;
  fallidos: number;
  pendientes: number;
  vencidos: number;
}

export const MAX_INTENTOS = 5;
const BASE_REINTENTO_MS = 5 * 60_000;
const MAX_EDAD_MS = 48 * 3_600_000;

/** 17:00-20:00 local time, never on Sundays. */
export function dentroDeVentana(ms: number, desfaseMin: number): boolean {
  const local = new Date(ms + desfaseMin * 60_000);
  const hora = local.getUTCHours() + local.getUTCMinutes() / 60;
  return local.getUTCDay() !== 0 && hora >= 17 && hora < 20;
}

export function crearColaSalida(o: OpcionesCola) {
  let items: ItemSalida[] | null = null;
  let drenando: Promise<ResumenDrenaje> | null = null;

  const cargar = async (): Promise<ItemSalida[]> => (items ??= await o.almacen.cargar());
  const guardar = async () => o.almacen.guardar(items ?? []);
  const buscar = async (id: string): Promise<ItemSalida> => {
    const it = (await cargar()).find((x) => x.id === id);
    if (!it) throw new Error(`Unknown outbox item: ${id}`);
    return it;
  };

  async function drenarUna(op: OpcionesDrenaje): Promise<ResumenDrenaje> {
    const lista = await cargar();
    const ahora = o.ahora();
    const r: ResumenDrenaje = { enviados: 0, fallidos: 0, pendientes: 0, vencidos: 0 };
    for (const it of lista) {
      if (it.estado === 'en_cola' && Date.parse(it.mensaje.vigenteHasta) < ahora) {
        it.estado = 'vencido';
        r.vencidos += 1;
      }
    }
    if (op.enLinea && !(op.respetarVentana && !dentroDeVentana(ahora, o.desfaseMin))) {
      for (const it of lista.filter((x) => x.estado === 'en_cola' && x.proximoIntento <= ahora)) {
        const puerto = (op.puertos as Record<string, PuertoEntrega | undefined>)[it.destino.canal];
        if (!puerto) continue;
        const res = await puerto.enviar(it.mensaje, it.destino);
        if (res.ok) {
          it.estado = 'enviado_proveedor';
          it.acuseId = res.valor.acuseId;
          it.manual = res.valor.manual === true;
          it.ultimoFallo = null;
          r.enviados += 1;
          continue;
        }
        it.ultimoFallo = res.error.detalle;
        if (res.error.tipo === 'rebote') it.estado = 'rebotado';
        else if (res.error.tipo === 'sin_consentimiento') it.estado = 'baja';
        else {
          it.intentos += 1;
          const viejo = it.aprobadoEn !== null && ahora - it.aprobadoEn > MAX_EDAD_MS;
          if (it.intentos >= MAX_INTENTOS || viejo) {
            it.estado = 'fallido';
            r.fallidos += 1;
          } else it.proximoIntento = ahora + BASE_REINTENTO_MS * 2 ** (it.intentos - 1);
        }
      }
    }
    r.pendientes = lista.filter((x) => x.estado === 'en_cola').length;
    await guardar();
    return r;
  }

  return {
    async lista(): Promise<ItemSalida[]> {
      return [...(await cargar())];
    },

    async agregarBorrador(mensaje: MensajeSaliente, destino: Destino): Promise<ItemSalida> {
      const lista = await cargar();
      const previo = lista.find((x) => x.mensaje.claveIdempotencia === mensaje.claveIdempotencia && x.destino.direccion === destino.direccion && x.estado !== 'descartado');
      if (previo) return previo;
      const it: ItemSalida = {
        id: mensaje.id, mensaje, destino, estado: 'borrador', vistaPrevia: false, intentos: 0, proximoIntento: 0, aprobadoEn: null,
        acuseId: null, manual: false, ultimoFallo: null, acta: null,
      };
      lista.push(it);
      await guardar();
      return it;
    },

    async marcarVista(id: string): Promise<void> {
      (await buscar(id)).vistaPrevia = true;
      await guardar();
    },

    async aprobar(id: string, por: string): Promise<void> {
      const it = await buscar(id);
      if (it.estado !== 'borrador') throw new Error(`Only a draft can be approved (state: ${it.estado}).`);
      if (!it.vistaPrevia) throw new Error('The teacher must see the vista previa before approving.');
      it.estado = 'en_cola';
      it.aprobadoEn = o.ahora();
      it.acta = {
        plantilla: it.mensaje.plantilla,
        version: it.mensaje.version,
        hash: sha256(`${it.mensaje.cuerpo.asunto ?? ''}\n${it.mensaje.cuerpo.texto}\n${it.mensaje.cuerpo.html ?? ''}`),
        consentimientoRef: it.mensaje.consentimientoRef,
        aprobadoPor: por,
      };
      await guardar();
    },

    async aprobarLote(ids: string[], por: string): Promise<{ aprobados: string[]; rechazados: { id: string; motivo: string }[] }> {
      const aprobados: string[] = [];
      const rechazados: { id: string; motivo: string }[] = [];
      for (const id of ids) {
        const it = await buscar(id);
        if (it.mensaje.plantilla === 'familia_semanal_b') rechazados.push({ id, motivo: 'individual_uno_por_uno' });
        else if (!it.vistaPrevia) rechazados.push({ id, motivo: 'sin_vista_previa' });
        else if (it.estado !== 'borrador') rechazados.push({ id, motivo: 'ya_procesado' });
        else {
          await this.aprobar(id, por);
          aprobados.push(id);
        }
      }
      return { aprobados, rechazados };
    },

    async descartar(id: string): Promise<void> {
      const it = await buscar(id);
      if (it.estado === 'borrador' || it.estado === 'en_cola') it.estado = 'descartado';
      await guardar();
    },

    /** Called when the hub syncs or the network is back. Concurrent calls share one run. */
    drenar(op: OpcionesDrenaje): Promise<ResumenDrenaje> {
      drenando ??= drenarUna(op).finally(() => {
        drenando = null;
      });
      return drenando;
    },

    async refrescarEstados(puertos: OpcionesDrenaje['puertos']): Promise<void> {
      for (const it of await cargar()) {
        if (it.estado !== 'enviado_proveedor' || !it.acuseId) continue;
        const puerto = (puertos as Record<string, PuertoEntrega | undefined>)[it.destino.canal];
        if (!puerto) continue;
        const e = await puerto.estado(it.acuseId);
        if (e === 'entregado' || e === 'baja' || e === 'rebotado') it.estado = e;
      }
      await guardar();
    },
  };
}

export type ColaSalida = ReturnType<typeof crearColaSalida>;
