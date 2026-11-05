/**
 * Outgoing queue rules (FUNCIONES_EXTRA 1.6), pure over a repository port:
 * teacher approval of the batch, idempotency, exponential backoff capped at 5 attempts and 48 h,
 * sending window 17:00-20:00 Lima (never Sunday), opt-out, and merging expired weeklies.
 */
import { estadoParaDocente } from './estados.ts';
import { enlaceWame } from './adaptadores/enlace-wame.ts';
import { PLANTILLAS_SEMANALES, type AcuseEnvio, type Canal, type Destino, type EstadoEntrega, type FalloEntrega, type MensajeSaliente, type Plantilla, type PuertoEntrega } from './puertos.ts';

export interface EntradaSalida {
  mensaje: MensajeSaliente;
  destino: Destino;
  estado: EstadoEntrega;
  intentos: number;
  creado: string;
  proximoIntento?: string;
  /** The teacher approved the batch (T-16). Nothing is sent before. */
  aprobado: boolean;
  acuseId?: string;
  fallo?: FalloEntrega;
  /** Manual channel: waiting for the teacher to tap send or print. */
  manual?: boolean;
  enlace?: string;
  html?: string;
}

export interface RepositorioSalida {
  obtener(id: string): EntradaSalida | undefined;
  porClave(clave: string): EntradaSalida | undefined;
  guardar(e: EntradaSalida): void;
  quitar(id: string): void;
  todos(): EntradaSalida[];
}

export class RepositorioSalidaMemoria implements RepositorioSalida {
  private readonly mapa = new Map<string, EntradaSalida>();
  obtener(id: string) {
    return this.mapa.get(id);
  }
  porClave(clave: string) {
    return [...this.mapa.values()].find((e) => e.mensaje.claveIdempotencia === clave);
  }
  guardar(e: EntradaSalida) {
    this.mapa.set(e.mensaje.id, e);
  }
  quitar(id: string) {
    this.mapa.delete(id);
  }
  todos() {
    return [...this.mapa.values()];
  }
}

export const MAX_INTENTOS = 5;
export const MAX_EDAD_MS = 48 * 60 * 60 * 1000;
const BASE_BACKOFF_MS = 5 * 60 * 1000; // 5, 10, 20, 40 min
const OFFSET_LIMA_MS = -5 * 60 * 60 * 1000;

/** hash(period, recipient, template) as lowercase hex SHA-256. */
export async function calcularClaveIdempotencia(periodo: string, destinatarioRef: string, plantilla: Plantilla): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${periodo}|${destinatarioRef}|${plantilla}`)));
  return [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 17:00 to 20:00 Lima time, Monday to Saturday. */
export function dentroDeVentana(ahora: Date, desde = 17, hasta = 20): boolean {
  const lima = new Date(ahora.getTime() + OFFSET_LIMA_MS);
  const h = lima.getUTCHours();
  return lima.getUTCDay() !== 0 && h >= desde && h < hasta;
}

const CANALES_MANUALES: readonly Canal[] = ['enlace_wame', 'pdf'];

export interface DepsCola {
  repo: RepositorioSalida;
  adaptadores: Partial<Record<Canal, PuertoEntrega>>;
  reloj: () => Date;
  /** Opt-out per guardian. */
  esBaja: (ref: string) => boolean;
  nuevoId: () => string;
}

export interface OpcionesDrenar {
  /** A real connection (HEAD /sync/ping), not just `navigator.onLine`. */
  hayRedReal: boolean;
  ignorarVentana?: boolean;
}

export function crearCola(deps: DepsCola) {
  const { repo, reloj } = deps;
  const iso = () => reloj().toISOString();

  return {
    /** Idempotent: the same key returns the existing entry. */
    async encolar(mensaje: MensajeSaliente, destino: Destino): Promise<EntradaSalida> {
      const existente = repo.porClave(mensaje.claveIdempotencia);
      if (existente) return existente;
      const e: EntradaSalida = { mensaje, destino, estado: 'en_cola', intentos: 0, creado: iso(), aprobado: false };
      repo.guardar(e);
      return e;
    },

    aprobarLote(ids: string[]): void {
      for (const id of ids) {
        const e = repo.obtener(id);
        if (e && e.estado === 'en_cola') repo.guardar({ ...e, aprobado: true });
      }
    },

    listar(): EntradaSalida[] {
      return repo.todos();
    },

    async drenar(o: OpcionesDrenar): Promise<{ enviados: number; motivo?: 'sin_red' | 'fuera_de_ventana' }> {
      const ahora = reloj();
      let enviados = 0;
      const ventanaOk = o.ignorarVentana || dentroDeVentana(ahora);
      for (const e of repo.todos()) {
        if (e.estado !== 'en_cola' || !e.aprobado || e.manual) continue;
        const manual = CANALES_MANUALES.includes(e.destino.canal);
        if (!manual && (!o.hayRedReal || !ventanaOk)) continue;
        if (new Date(e.mensaje.vigenteHasta) < ahora) continue; // expired: merged, never sent late
        if (e.proximoIntento && new Date(e.proximoIntento) > ahora) continue;

        if (deps.esBaja(e.destino.ref)) {
          repo.guardar({ ...e, estado: 'baja' });
          continue;
        }
        if (ahora.getTime() - new Date(e.creado).getTime() > MAX_EDAD_MS) {
          repo.guardar({ ...e, estado: 'fallido', fallo: { tipo: 'proveedor', detalle: 'Pasaron más de 48 horas sin poder enviar.' } });
          continue;
        }
        const adaptador = deps.adaptadores[e.destino.canal];
        if (!adaptador) continue;

        const r = await adaptador.enviar(e.mensaje, e.destino);
        if (r.ok) {
          const a: AcuseEnvio = r.valor;
          if (a.manual) repo.guardar({ ...e, intentos: e.intentos + 1, acuseId: a.acuseId, manual: true, ...(a.enlace ? { enlace: a.enlace } : {}), ...(a.html ? { html: a.html } : {}) });
          else {
            repo.guardar({ ...e, intentos: e.intentos + 1, estado: estadoParaDocente(a.estado), acuseId: a.acuseId });
            enviados++;
          }
          continue;
        }
        const intentos = e.intentos + 1;
        const f = r.error;
        if (f.tipo === 'rebote') repo.guardar({ ...e, intentos, estado: 'rebotado', fallo: f });
        else if (f.tipo === 'sin_consentimiento') repo.guardar({ ...e, intentos, estado: 'baja', fallo: f });
        else if (f.tipo === 'plantilla_rechazada' || intentos >= MAX_INTENTOS) repo.guardar({ ...e, intentos, estado: 'fallido', fallo: f });
        else repo.guardar({ ...e, intentos, fallo: f, proximoIntento: new Date(ahora.getTime() + BASE_BACKOFF_MS * 2 ** (intentos - 1)).toISOString() });
      }
      return { enviados, ...(!o.hayRedReal ? { motivo: 'sin_red' as const } : !ventanaOk ? { motivo: 'fuera_de_ventana' as const } : {}) };
    },

    /** Pulls provider states ("entregado"). "leido" is collapsed before it is stored. */
    async actualizarEstados(): Promise<void> {
      for (const e of repo.todos()) {
        if (e.estado !== 'enviado_proveedor' || !e.acuseId) continue;
        const adaptador = deps.adaptadores[e.destino.canal];
        if (!adaptador?.capacidades().estadoEntrega) continue;
        repo.guardar({ ...e, estado: estadoParaDocente(await adaptador.estado(e.acuseId)) });
      }
    },

    marcarEnviadoManual(id: string): void {
      const e = repo.obtener(id);
      if (e?.manual) repo.guardar({ ...e, estado: 'enviado_proveedor', manual: false });
    },

    /** "Enviar yo por WhatsApp": available when the automatic path failed (fallido, rebotado). */
    enlaceManual(id: string): string | undefined {
      const e = repo.obtener(id);
      if (!e || !/^\+?[\d\s-]+$/.test(e.destino.direccion)) return undefined;
      return enlaceWame(e.destino.direccion, e.mensaje.cuerpo.texto);
    },
  };
}

export interface DepsFusion {
  repo: RepositorioSalida;
  reloj: () => Date;
  nuevoId: () => string;
}

const VIGENCIA_FUSION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * An expired weekly is never sent "late" as if it were this week: the two most recent expired weeks per
 * recipient and template become one summary with explicit dates (needs the teacher approval again);
 * older ones are dropped.
 */
export async function fusionarVencidos(deps: DepsFusion): Promise<{ fusionados: number; descartados: number }> {
  const ahora = deps.reloj();
  const vencidos = deps.repo.todos().filter((e) => e.estado === 'en_cola' && PLANTILLAS_SEMANALES.includes(e.mensaje.plantilla) && new Date(e.mensaje.vigenteHasta) < ahora);
  const grupos = new Map<string, EntradaSalida[]>();
  for (const e of vencidos) {
    const k = `${e.destino.ref}|${e.mensaje.plantilla}`;
    grupos.set(k, [...(grupos.get(k) ?? []), e]);
  }
  let fusionados = 0;
  let descartados = 0;
  for (const lista of grupos.values()) {
    const ordenadas = [...lista].sort((a, b) => (a.mensaje.cuerpo.periodo?.desde ?? '').localeCompare(b.mensaje.cuerpo.periodo?.desde ?? ''));
    const ultimas = ordenadas.slice(-2);
    const viejas = ordenadas.slice(0, ordenadas.length - ultimas.length);
    for (const v of [...viejas, ...ultimas]) deps.repo.quitar(v.mensaje.id);
    descartados += viejas.length;

    const desde = ultimas.map((e) => e.mensaje.cuerpo.periodo?.desde ?? '').filter(Boolean).sort()[0];
    const hasta = ultimas.map((e) => e.mensaje.cuerpo.periodo?.hasta ?? '').filter(Boolean).sort().at(-1);
    const lineas = ultimas.flatMap((e) => e.mensaje.cuerpo.lineas ?? [e.mensaje.cuerpo.texto]);
    const base = ultimas[ultimas.length - 1]!;
    const titulo = ultimas.length > 1 ? 'Resumen de dos semanas' : 'Resumen de la semana';
    const fechas = desde && hasta ? ` (del ${desde} al ${hasta})` : '';
    const periodo = desde && hasta ? { desde, hasta } : undefined;
    deps.repo.guardar({
      mensaje: {
        ...base.mensaje,
        id: deps.nuevoId(),
        claveIdempotencia: await calcularClaveIdempotencia(`fusion:${desde ?? ''}:${hasta ?? ''}`, base.destino.ref, base.mensaje.plantilla),
        cuerpo: {
          ...(base.mensaje.cuerpo.asunto ? { asunto: `${titulo}${fechas}` } : {}),
          texto: [`${titulo}${fechas}:`, ...lineas.map((l) => `- ${l}`)].join('\n'),
          lineas,
          ...(periodo ? { periodo } : {}),
        },
        vigenteHasta: new Date(ahora.getTime() + VIGENCIA_FUSION_MS).toISOString(),
      },
      destino: base.destino,
      estado: 'en_cola',
      intentos: 0,
      creado: ahora.toISOString(),
      aprobado: false,
    });
    fusionados++;
  }
  return { fusionados, descartados };
}
