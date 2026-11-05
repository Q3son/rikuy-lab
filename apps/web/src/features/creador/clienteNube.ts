/**
 * HTTP client of `apps/cloud` for the Creador. It holds no keys: the keys only exist in the gateway (2.3.3).
 * Everything the teacher sends is a draft request; nothing from a student goes through here.
 */
import type { PropuestaCreador, SalidaCreador, SolicitudPractica } from '@rikuy/ai';
import type { Paquete, Practica, RecursoExhibicion } from '@rikuy/contracts';

export interface HallazgoUI {
  regla: string;
  mensaje: string;
  ruta?: string;
}

export interface DesempenoListado {
  ref: { nivel: 'primaria' | 'secundaria'; grado: number; competencia: number; desempeno: number };
  texto: string;
}

export interface EstadoNube {
  modo: 'simulado' | 'real' | 'mixto';
  restanteUsd: number;
}

export type RespuestaAprobacion = { ok: true; practica: Practica; recursos: RecursoExhibicion[] } | { ok: false; hallazgos: HallazgoUI[] };

export interface ClienteNube {
  estado(): Promise<EstadoNube>;
  desempenos(): Promise<DesempenoListado[]>;
  generar(solicitud: SolicitudPractica): Promise<SalidaCreador>;
  aprobar(propuesta: PropuestaCreador, docente: string): Promise<RespuestaAprobacion>;
  publicar(paquete: Paquete, clavePublica: string): Promise<{ id: string; version: number }>;
}

export class ErrorNube extends Error {}

export function urlNubePorDefecto(): string {
  return (import.meta.env.VITE_CLOUD_URL as string | undefined) ?? 'http://localhost:8788';
}

export function colegioPorDefecto(): string {
  try {
    return localStorage.getItem('rikuy.colegio') ?? 'colegio-demo';
  } catch {
    return 'colegio-demo';
  }
}

export function crearClienteNube(o: { baseUrl?: string; colegioId?: string; fetch?: typeof fetch } = {}): ClienteNube {
  const base = (o.baseUrl ?? urlNubePorDefecto()).replace(/\/+$/, '');
  const colegio = o.colegioId ?? colegioPorDefecto();
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));

  async function llamar(ruta: string, init: { method?: string; cuerpo?: unknown } = {}): Promise<{ status: number; json: unknown }> {
    let r: Response;
    try {
      r = await f(`${base}${ruta}`, {
        method: init.method ?? (init.cuerpo === undefined ? 'GET' : 'POST'),
        headers: { 'content-type': 'application/json', 'x-rikuy-colegio': colegio },
        ...(init.cuerpo === undefined ? {} : { body: JSON.stringify(init.cuerpo) }),
      });
    } catch {
      throw new ErrorNube('No hay conexión con la nube de Rikuy. Puedes usar una práctica del catálogo.');
    }
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }

  return {
    async estado() {
      const { status, json } = await llamar('/ia/estado');
      if (status !== 200) throw new ErrorNube('La nube no respondió.');
      return json as EstadoNube;
    },
    async desempenos() {
      const { json } = await llamar('/ia/desempenos');
      return (json as { desempenos?: DesempenoListado[] }).desempenos ?? [];
    },
    async generar(solicitud) {
      const { status, json } = await llamar('/ia/generar-practica', { cuerpo: { solicitud } });
      if (status === 429) throw new ErrorNube('Demasiadas peticiones seguidas. Espera un momento.');
      if (status !== 200 && status !== 422) throw new ErrorNube('No se pudo generar el borrador.');
      return json as SalidaCreador;
    },
    async aprobar(propuesta, docente) {
      const { status, json } = await llamar('/ia/aprobar-practica', { cuerpo: { propuesta, docente } });
      if (status === 422) return { ok: false, hallazgos: (json as { hallazgos?: HallazgoUI[] }).hallazgos ?? [] };
      if (status !== 200) throw new ErrorNube('No se pudo verificar la práctica.');
      return { ok: true, ...(json as { practica: Practica; recursos: RecursoExhibicion[] }) };
    },
    async publicar(paquete, clavePublica) {
      const { status, json } = await llamar('/paquetes', { cuerpo: { paquete, clavePublica } });
      if (status !== 200 && status !== 201) throw new ErrorNube(`La nube rechazó el paquete (${(json as { error?: string }).error ?? status}).`);
      return json as { id: string; version: number };
    },
  };
}
