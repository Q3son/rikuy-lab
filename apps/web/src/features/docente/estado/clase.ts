/**
 * Teacher-side class state. The truth is an append-only list of contract events
 * (3.1); everything shown is a projection of it (`@rikuy/evidencia`).
 * Persistence goes through a tiny port so tests and F2's Dexie repository can replace it.
 */
import { SCHEMA_VERSION, type Clase, type Estudiante, type Evento, type Practica, type TipoEvento } from '@rikuy/contracts';
import { ejemplos } from '@rikuy/contracts/fixtures';
import { construirEscenario, partirEscenario, proyectar } from '@rikuy/evidencia';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { ServiciosDocente } from '../puertos.ts';
import type { ContextoAula } from './contexto.ts';
import { codigoDeClase, crearGeneradorHlc, crearUlid } from './ids.ts';

export interface AlmacenMemoria {
  leer(): string | null;
  escribir(valor: string): void;
}

export const CATALOGO_PRACTICAS: Practica[] = [ejemplos.practica as Practica];

const AVATARES = ['condor', 'vizcacha', 'puma', 'kantu', 'queuna', 'alpaca', 'taruca', 'vicuna'];

export interface DatosNuevaClase {
  grado: number;
  seccion: string;
  lengua: Clase['lengua'];
  estudiantes: number;
  contexto: ContextoAula | null;
  /** Optional real names, in alias order. They stay on this phone and never enter an event. */
  padron?: string[];
  practica?: Practica;
}

export interface EstadoClase {
  eventos: Evento[];
  dispositivo: string;
  contexto: ContextoAula | null;
  padron: Record<string, string>;
  /** True when the data comes from the built-in example class ("Datos de ejemplo" label). */
  esDemo: boolean;
  practica: Practica | null;
  crearClase(d: DatosNuevaClase): void;
  cargarDemo(): void;
  recibirGrupoDeEjemplo(apodo: string): void;
  ingestar(eventos: Evento[]): { nuevos: number; ignorados: number };
  confirmar(evidenciaId: string, nivel?: 0 | 1 | 2 | 3 | 'NO'): void;
  setTutor(activo: boolean): void;
  guardarContexto(c: ContextoAula | null): void;
  reiniciar(): void;
}

type Guardado = Pick<EstadoClase, 'eventos' | 'dispositivo' | 'contexto' | 'padron' | 'esDemo' | 'practica'>;

function leer(m: AlmacenMemoria): Partial<Guardado> {
  try {
    const crudo = m.leer();
    return crudo ? (JSON.parse(crudo) as Partial<Guardado>) : {};
  } catch {
    return {};
  }
}

export function crearAlmacenClase(srv: ServiciosDocente, memoria: AlmacenMemoria): StoreApi<EstadoClase> {
  const previo = leer(memoria);
  const dispositivo = previo.dispositivo ?? `D${crearUlid(srv.ahora(), srv.azar).slice(-9)}`;
  const hlc = crearGeneradorHlc('docente1', srv.ahora);

  const guardar = (s: Guardado) => {
    try {
      memoria.escribir(JSON.stringify({ eventos: s.eventos, dispositivo: s.dispositivo, contexto: s.contexto, padron: s.padron, esDemo: s.esDemo, practica: s.practica }));
    } catch {
      /* storage may be unavailable (private window): the panel keeps working in memory */
    }
  };

  /** Builds a signed teacher event that follows `lista` (contiguous seq per device). */
  const emitir = (lista: Evento[], disp: string, tipo: TipoEvento, datos: unknown, claseId: string): Evento => {
    const seq = lista.filter((e) => e.dispositivo === disp).reduce((m, e) => Math.max(m, e.seq), 0) + 1;
    return {
      id: crearUlid(srv.ahora(), srv.azar), dispositivo: disp, seq, hlc: hlc(), claseId, sv: SCHEMA_VERSION, tipo, autor: {}, datos,
      firma: srv.cripto.firmar(`${tipo}:${seq}`),
    };
  };

  return createStore<EstadoClase>((set, get) => {
    const aplicar = (parche: Partial<Guardado>) => {
      set(parche);
      const { eventos, dispositivo: d, contexto, padron, esDemo, practica } = get();
      guardar({ eventos, dispositivo: d, contexto, padron, esDemo, practica });
    };
    const claseIdActual = () => proyectar(get().eventos).clase?.id ?? null;

    return {
      eventos: previo.eventos ?? [],
      dispositivo,
      contexto: previo.contexto ?? null,
      padron: previo.padron ?? {},
      esDemo: previo.esDemo ?? false,
      practica: previo.practica ?? null,

      crearClase(d) {
        const practica = d.practica ?? CATALOGO_PRACTICAS[0];
        const claseId = crearUlid(srv.ahora(), srv.azar);
        const aulaId = crearUlid(srv.ahora(), srv.azar);
        const disp = get().dispositivo;
        const nueva: Clase = {
          id: claseId, codigo: codigoDeClase(srv.azar), practicaId: practica.id, practicaVersion: practica.version, grado: d.grado, seccion: d.seccion,
          lengua: d.lengua, docenteDispositivo: disp, claveClasePub: srv.cripto.clavePublica,
          tutor: { activo: true, iaLocal: false, iaNube: false }, abierta: true, creada: hlc(),
        };
        const eventos: Evento[] = [];
        eventos.push(emitir(eventos, disp, 'clase.creada', nueva, claseId));
        const padron: Record<string, string> = {};
        for (let i = 0; i < d.estudiantes; i += 1) {
          const alias = `E${String(i + 1).padStart(2, '0')}`;
          const est: Estudiante = {
            id: crearUlid(srv.ahora(), srv.azar), aulaId, alias, avatar: `${AVATARES[i % AVATARES.length]}-${(Math.floor(i / AVATARES.length) % 3) + 1}`,
            lenguaPreferida: d.lengua, consentimientos: { senalesRostro: false, senalesVoz: false, gestosCamara: false, registradoPor: 'docente', hlc: hlc() },
          };
          eventos.push(emitir(eventos, disp, 'aula.estudiante_alta', est, claseId));
          const nombre = d.padron?.[i]?.trim();
          if (nombre) padron[alias] = nombre;
        }
        aplicar({ eventos, contexto: d.contexto, padron, esDemo: false, practica });
      },

      cargarDemo() {
        const esc = construirEscenario();
        aplicar({
          eventos: partirEscenario(esc).base,
          contexto: { region: 'Arequipa', zona: 'rural', lenguaComunidad: 'quy', festividades: ['Yaku Raymi'], floraFauna: ['llama', 'ichu'], materialesCaseros: ['cuerda', 'piedra'] },
          padron: {},
          esDemo: true,
          practica: esc.practica,
        });
      },

      recibirGrupoDeEjemplo(apodo) {
        get().ingestar(partirEscenario(construirEscenario()).porGrupo[apodo] ?? []);
      },

      ingestar(entrantes) {
        const claseId = claseIdActual();
        const ids = new Set(get().eventos.map((e) => e.id));
        const nuevos: Evento[] = [];
        let ignorados = 0;
        for (const e of entrantes) {
          if (!claseId || e.claseId !== claseId || ids.has(e.id)) {
            ignorados += 1;
            continue;
          }
          ids.add(e.id);
          nuevos.push(e);
        }
        if (nuevos.length) aplicar({ eventos: [...get().eventos, ...nuevos] });
        return { nuevos: nuevos.length, ignorados };
      },

      confirmar(evidenciaId, nivel) {
        const claseId = claseIdActual();
        if (!claseId) return;
        const lista = get().eventos;
        aplicar({ eventos: [...lista, emitir(lista, get().dispositivo, 'evidencia.confirmada', nivel === undefined ? { evidenciaId } : { evidenciaId, nivel }, claseId)] });
      },

      setTutor(activo) {
        const claseId = claseIdActual();
        if (!claseId) return;
        const lista = get().eventos;
        aplicar({ eventos: [...lista, emitir(lista, get().dispositivo, 'tutor.interruptor', { activo }, claseId)] });
      },

      guardarContexto(c) {
        aplicar({ contexto: c });
      },

      reiniciar() {
        aplicar({ eventos: [], contexto: null, padron: {}, esDemo: false, practica: null });
      },
    };
  });
}

/** localStorage-backed memory, tolerant to being unavailable. */
export const memoriaLocal: AlmacenMemoria = {
  leer: () => {
    try {
      return globalThis.localStorage?.getItem('rikuy.docente.v1') ?? null;
    } catch {
      return null;
    }
  },
  escribir: (v) => {
    try {
      globalThis.localStorage?.setItem('rikuy.docente.v1', v);
    } catch {
      /* ignore */
    }
  },
};
