/**
 * Ayudante del museo on this device. The pure state machine lives in `@rikuy/campus`; here it is wired to
 * mock ports until the hub (F8) relays actions between devices, the Cerebro (F10) gives node states and the
 * judge (F4) evaluates the restated phrase. Peer groups are simulated: they accept offers after a moment.
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
import { create } from 'zustand';
import { registroMuseo } from '../eventos.ts';
import { GRUPO_DEMO } from '../grupo.ts';

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
  grupoId === GRUPO_DEMO.id ? GRUPO_DEMO.apodo : (GRUPOS_SIMULADOS.find((g) => g.id === grupoId)?.apodo ?? 'Otro grupo');

/** Mock of the Cerebro read port: simulated groups reasoned the pendulum length; this group explored it. */
export function estadoNodoSimulado(grupoId: string, nodoId: string): EstadoNodo {
  if (grupoId === GRUPO_DEMO.id) return nodoId === 'medir-oscilaciones' ? 'razonado' : 'explorado';
  return nodoId === 'medir-oscilaciones' ? 'explorado' : 'razonado';
}

/** Mock of the judge (F4): rules only, honest label "evaluado por reglas". */
export function juzgarFrase(frase: string): NivelJuez {
  const palabras = frase.trim().split(/\s+/).filter(Boolean);
  if (palabras.length < 3) return 'no_evaluable';
  const concepto = /\b(longitud|largo|larga|hilo|cuerda|cordel|tiempo|periodo|oscila\w*|tarda\w*|demora\w*|masa|peso|dato)\b/i.test(frase);
  return palabras.length >= 6 && concepto ? 'razonado' : 'explorado';
}

let contador = 0;
const nuevoId = () => `AY${Date.now().toString(36)}${(contador++).toString(36)}`;

function contexto(estadoNodo: ContextoAyudante['estadoNodo'] = estadoNodoSimulado): ContextoAyudante {
  return {
    ahora: Date.now(),
    azar: Math.random,
    gruposClase: [GRUPO_DEMO.id, ...GRUPOS_SIMULADOS.map((g) => g.id)],
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
      const o = p.ofertas.find((x) => x.estado === 'enviada' && x.grupoAyudaId !== GRUPO_DEMO.id);
      if (o) despachar({ tipo: 'responder', ofertaId: o.id, grupoId: o.grupoAyudaId, acepta: true });
    }
  }, 2500);
}

/** Demo for the helper side: a simulated group asks about a concept only THIS group reasoned. */
export function simularPedidoEntrante() {
  const pide = GRUPOS_SIMULADOS[0]!.id;
  useAyudante.getState().despachar(
    { tipo: 'pedir', grupoPideId: pide, exhibicionId: 'exh-pendulo', nodoId: 'medir-oscilaciones', necesidad: 'como_medir' },
    (g, n) => (g === GRUPO_DEMO.id && n === 'medir-oscilaciones' ? 'razonado' : 'explorado'),
  );
}
