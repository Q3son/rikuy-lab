/**
 * Ayudante del museo on this device. The pure state machine lives in `@rikuy/campus`; here it is wired to
 * the F4 rules judge for the restated phrase. Peer groups and their node states are still simulated until the
 * hub (F8) relays the help actions between devices; they accept offers after a moment.
 */
import {
  type AccionAyudante,
  type ContextoAyudante,
  type EstadoAyudante,
  type EstadoNodo,
  type NivelJuez,
  aplicar,
  estadoInicialAyudante,
} from '@rikuy/campus';
import { construirMapa, type EstadoNodo as EstadoCerebro, type MapaCerebro } from '@rikuy/cerebro';
import { PRACTICAS } from '@rikuy/curriculum-cneb';
import { juzgarConReglas, type ContextoJuez } from '@rikuy/tutor';
import { create } from 'zustand';
import { GRAFO_DEMO, memoriaDemo } from '../../cerebro/datosDemo.ts';
import { registroMuseo } from '../eventos.ts';
import { grupoActual } from '../grupo.ts';

/** Concepts (Cerebro nodes) per exhibit, offered as request chips. */
export const NODOS_EXHIBICION: Record<string, { id: string; etiqueta: string }[]> = {
  'exh-pendulo': [
    { id: 'longitud-periodo', etiqueta: 'Longitud y periodo' },
    { id: 'medir-oscilaciones', etiqueta: 'Medir 10 oscilaciones' },
    { id: 'prediccion-dato', etiqueta: 'Comparar predicción y dato' },
  ],
  'exh-lactasa': [{ id: 'enzima-sustrato', etiqueta: 'Enzima y sustrato' }],
  'exh-respiracion': [{ id: 'altura-respiracion', etiqueta: 'Altura y respiración' }],
};

export const etiquetaNodo = (id: string) =>
  Object.values(NODOS_EXHIBICION)
    .flat()
    .find((n) => n.id === id)?.etiqueta ?? id;

/** Simulated peer groups of the same class (apodo for the anonymous-to-the-class emblem). */
export const GRUPOS_SIMULADOS: { id: string; apodo: string }[] = [
  { id: '01JC0000000000000000000G02', apodo: 'Cóndor' },
  { id: '01JC0000000000000000000G03', apodo: 'Puma' },
  { id: '01JC0000000000000000000G04', apodo: 'Kantu' },
];

export const apodoDe = (grupoId: string) =>
  grupoId === grupoActual().id ? grupoActual().apodo : (GRUPOS_SIMULADOS.find((g) => g.id === grupoId)?.apodo ?? 'Otro grupo');

/** Museum help nodes -> nodes of the Cerebro map (F10) that carry the same idea. */
const NODO_CEREBRO: Record<string, string[]> = {
  'longitud-periodo': ['longitud', 'periodo'],
  'medir-oscilaciones': ['periodo'],
  'prediccion-dato': ['longitud'],
};

const CAMPUS_DE_CEREBRO: Record<EstadoCerebro, EstadoNodo> = { sin_explorar: 'sin_explorar', explorado: 'explorado', en_camino: 'en_camino', logrado: 'razonado' };

let mapaPropio: MapaCerebro | null = null;
/** This group's own Cerebro map (@rikuy/cerebro over the same memory as the Cerebro tab). */
const mapaDelGrupo = () => (mapaPropio ??= construirMapa({ grafo: GRAFO_DEMO, ...memoriaDemo() }));

/**
 * Cerebro read port of the helper. Own group: the real @rikuy/cerebro states (`logrado` reads as
 * `razonado`, an open question wins). Peer groups: simulated until the hub relays their maps.
 */
export function estadoNodoDeGrupo(grupoId: string, nodoId: string): EstadoNodo {
  if (grupoId === grupoActual().id) {
    const nodos = mapaDelGrupo().nodos.filter((n) => NODO_CEREBRO[nodoId]?.includes(n.id));
    if (nodos.some((n) => n.preguntaAbierta)) return 'pregunta_abierta';
    const orden: EstadoNodo[] = ['sin_explorar', 'explorado', 'en_camino', 'razonado'];
    return nodos.map((n) => CAMPUS_DE_CEREBRO[n.estado]).reduce<EstadoNodo>((max, e) => (orden.indexOf(e) > orden.indexOf(max) ? e : max), 'sin_explorar');
  }
  return nodoId === 'medir-oscilaciones' ? 'explorado' : 'razonado';
}

const PENDULO = PRACTICAS.pendulo!;
const CONTEXTO_JUEZ: ContextoJuez = {
  variables: PENDULO.variables.map((v) => ({ id: v.id, etiqueta: v.etiqueta, ...(v.id === 'longitud' ? { sinonimos: ['largo', 'larga', 'cuerda', 'hilo', 'cordel'] } : {}) })),
  variableProbada: 'longitud',
  conceptos: ['tiempo', 'periodo', 'oscilacion', 'oscila', 'tarda', 'demora', 'recorre', 'camino'],
};

/**
 * F4 rules judge (`@rikuy/tutor`) on the restated phrase, read as a prediction of the pendulum (variable
 * and effect). "NO", level 0 or nothing observable is "no evaluable"; level 2-3 is "razonado"; level 1 "explorado".
 */
export function juzgarFrase(frase: string): NivelJuez {
  const v = juzgarConReglas({ indicador: 'prediccion', respuesta: frase, contexto: CONTEXTO_JUEZ, datos: [] });
  if (v.nivel === 'NO' || v.nivel === 0 || v.estado === 'no_observable') return 'no_evaluable';
  return v.nivel >= 2 ? 'razonado' : 'explorado';
}

let contador = 0;
const nuevoId = () => `AY${Date.now().toString(36)}${(contador++).toString(36)}`;

function contexto(estadoNodo: ContextoAyudante['estadoNodo'] = estadoNodoDeGrupo): ContextoAyudante {
  return {
    ahora: Date.now(),
    azar: Math.random,
    gruposClase: [grupoActual().id, ...GRUPOS_SIMULADOS.map((g) => g.id)],
    estadoNodo,
    nuevoId,
  };
}

interface Almacen {
  estado: EstadoAyudante;
  ultimoError: string | null;
  despachar: (a: AccionAyudante, estadoNodo?: ContextoAyudante['estadoNodo']) => void;
  reiniciar: () => void;
}

export const useAyudante = create<Almacen>((set, get) => ({
  estado: estadoInicialAyudante(),
  ultimoError: null,
  despachar: (a, estadoNodo) => {
    const r = aplicar(get().estado, a, contexto(estadoNodo));
    for (const ev of r.eventos) registroMuseo.registrar(ev);
    set({ estado: r.estado, ultimoError: r.error ?? null });
    if (a.tipo === 'pedir' && !r.error) simularRespuesta();
  },
  reiniciar: () => set({ estado: estadoInicialAyudante(), ultimoError: null }),
}));

/** Simulated peers: the first invited simulated group accepts after a short moment. */
function simularRespuesta() {
  setTimeout(() => {
    const { estado, despachar } = useAyudante.getState();
    for (const p of estado.pedidos) {
      if (p.estado !== 'ofrecido') continue;
      const o = p.ofertas.find((x) => x.estado === 'enviada' && x.grupoAyudaId !== grupoActual().id);
      if (o) despachar({ tipo: 'responder', ofertaId: o.id, grupoId: o.grupoAyudaId, acepta: true });
    }
  }, 2500);
}

/** Demo for the helper side: a simulated group asks about a concept only THIS group reasoned. */
export function simularPedidoEntrante() {
  const pide = GRUPOS_SIMULADOS[0]!.id;
  useAyudante.getState().despachar(
    { tipo: 'pedir', grupoPideId: pide, exhibicionId: 'exh-pendulo', nodoId: 'medir-oscilaciones', necesidad: 'como_medir' },
    (g, n) => (g === grupoActual().id && n === 'medir-oscilaciones' ? 'razonado' : 'explorado'),
  );
}
