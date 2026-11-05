/**
 * @rikuy/cerebro: "Mi Cerebro Rikuy" knowledge map model (ARQUITECTURA 3.12, DESIGN 9).
 * Every node state is a pure function of the student's own memory entries, evidence and explorations.
 * A node without evidence is never lit. No percentages, no comparison with other students.
 * Rikuy Guardián never feeds this package (and the dependency rules forbid importing it).
 */
import type { MemoriaEntrada, NivelEvidencia } from '@rikuy/contracts';

export const packageName = '@rikuy/cerebro' as const;

// ---- input (mocks over contracts until F9 / F4 / F6 merge) -------------------------

export type TipoNodo = 'competencia' | 'desempeno' | 'concepto';

export interface NodoCurricular {
  id: string;
  tipo: TipoNodo;
  etiqueta: string;
  /** Parent hub (a competency node id). */
  padre?: string;
  /** Hall used for color/wayfinding only. */
  sala?: string;
}

export interface Arista {
  desde: string;
  hasta: string;
  tipo: 'contiene' | 'depende_de' | 'relaciona';
}

export interface GrafoCurricular {
  nodos: NodoCurricular[];
  aristas: Arista[];
}

/** Precomputed layout shipped by F9 in curriculum-cneb (d3-force at build time). */
export interface PosicionNodo {
  nodeId: string;
  x: number;
  y: number;
}

export interface EvidenciaRef {
  id: string;
  nodoIds: string[];
  nivel: NivelEvidencia;
  confirmadaPorDocente: boolean;
  /** Literal quote linked to the evidence. */
  cita?: string;
  fecha?: string;
}

/** A museum visit or an answer that mentions the concept. */
export interface Exploracion {
  nodoIds: string[];
  fuente: 'visita' | 'respuesta';
  hlc: string;
}

export interface EntradaMapa {
  grafo: GrafoCurricular;
  memoria: MemoriaEntrada[];
  evidencias: EvidenciaRef[];
  exploraciones: Exploracion[];
  layout?: PosicionNodo[];
}

// ---- states ------------------------------------------------------------------

export type EstadoNodo = 'sin_explorar' | 'explorado' | 'en_camino' | 'logrado';

/** Interface names are the IA's, never the code names (ARQUITECTURA 3.12). */
export const ETIQUETA_ESTADO = {
  sin_explorar: 'Sin explorar',
  explorado: 'Explorado',
  en_camino: 'Por revisar',
  logrado: 'Razonado',
  pregunta_abierta: '?',
} as const;

export function idNodoDesempeno(r: { nivel: string; grado: number; competencia: number; desempeno: number }): string {
  return `${r.nivel}-${r.grado}:cyt:c${r.competencia}:d${r.desempeno}`;
}

export interface NodoMapa {
  id: string;
  tipo: TipoNodo;
  etiqueta: string;
  sala?: string;
  estado: EstadoNodo;
  /** A mark, not a color. */
  preguntaAbierta: boolean;
  x: number;
  y: number;
  entradas: { tipo: MemoriaEntrada['tipo']; resumen: string; hlc: string }[];
  citas: string[];
}

export interface MapaCerebro {
  nodos: NodoMapa[];
  aristas: Arista[];
  vacio: boolean;
}

const MAX = (xs: string[]) => xs.reduce((a, b) => (a > b ? a : b), '');

function estadoDesde(entradas: MemoriaEntrada[], exploraciones: Exploracion[], confirmadas: Set<string>): { estado: EstadoNodo; pregunta: boolean } {
  const logro = entradas.filter((e) => e.tipo === 'logro' || (e.tipo === 'prediccion_confirmada' && e.evidenciaIds.some((id) => confirmadas.has(id))));
  const dificultad = entradas.filter((e) => e.tipo === 'dificultad' || e.tipo === 'pista_necesaria' || e.tipo === 'prediccion_refutada');
  const ultimoLogro = MAX(logro.map((e) => e.hlc));
  const ultimaDificultad = MAX(dificultad.map((e) => e.hlc));
  const pregunta = entradas.some((e) => e.tipo === 'pregunta_abierta' && e.hlc > ultimoLogro);
  if (ultimoLogro && (!ultimaDificultad || ultimoLogro > ultimaDificultad)) return { estado: 'logrado', pregunta };
  if (ultimaDificultad) return { estado: 'en_camino', pregunta };
  if (entradas.length > 0 || exploraciones.length > 0) return { estado: 'explorado', pregunta };
  return { estado: 'sin_explorar', pregunta };
}

export function construirMapa(e: EntradaMapa): MapaCerebro {
  const confirmadas = new Set(e.evidencias.filter((v) => v.confirmadaPorDocente).map((v) => v.id));
  const evidenciaPorId = new Map(e.evidencias.map((v) => [v.id, v]));
  const posiciones = new Map(resolverLayout(e.grafo, e.layout).map((p) => [p.nodeId, p]));

  const entradasDe = (id: string) => e.memoria.filter((m) => m.conceptos.includes(id) || idNodoDesempeno(m.competencia) === id);
  const explorDe = (id: string) => e.exploraciones.filter((x) => x.nodoIds.includes(id));

  const base = new Map<string, { estado: EstadoNodo; pregunta: boolean; entradas: MemoriaEntrada[] }>();
  for (const n of e.grafo.nodos) {
    if (n.tipo === 'competencia') continue;
    const entradas = entradasDe(n.id);
    base.set(n.id, { ...estadoDesde(entradas, explorDe(n.id), confirmadas), entradas });
  }

  const nodos: NodoMapa[] = e.grafo.nodos.map((n) => {
    let estado: EstadoNodo;
    let pregunta = false;
    let entradas: MemoriaEntrada[] = [];
    if (n.tipo === 'competencia') {
      const hijos = e.grafo.nodos.filter((h) => h.padre === n.id).map((h) => base.get(h.id)?.estado ?? 'sin_explorar');
      if (hijos.length > 0 && hijos.every((s) => s === 'logrado')) estado = 'logrado';
      else if (hijos.some((s) => s === 'en_camino')) estado = 'en_camino';
      else if (hijos.some((s) => s !== 'sin_explorar')) estado = 'explorado';
      else estado = 'sin_explorar';
    } else {
      const b = base.get(n.id) as { estado: EstadoNodo; pregunta: boolean; entradas: MemoriaEntrada[] };
      estado = b.estado;
      pregunta = b.pregunta;
      entradas = b.entradas;
    }
    const citas = [...new Set(entradas.flatMap((m) => m.evidenciaIds).map((id) => evidenciaPorId.get(id)?.cita).filter((c): c is string => Boolean(c)))];
    const pos = posiciones.get(n.id) ?? { x: 400, y: 300 };
    return {
      id: n.id,
      tipo: n.tipo,
      etiqueta: n.etiqueta,
      ...(n.sala ? { sala: n.sala } : {}),
      estado,
      preguntaAbierta: pregunta,
      x: pos.x,
      y: pos.y,
      entradas: entradas.map((m) => ({ tipo: m.tipo, resumen: m.resumen, hlc: m.hlc })),
      citas,
    };
  });
  return { nodos, aristas: e.grafo.aristas, vacio: nodos.every((n) => n.estado === 'sin_explorar') };
}

// ---- "¿Por qué está así?" ----------------------------------------------------

export interface PorQue {
  nodo: NodoMapa;
  estadoEtiqueta: string;
  entradas: NodoMapa['entradas'];
  citas: string[];
  frase: string;
}

export function porQueEstaAsi(mapa: MapaCerebro, nodoId: string): PorQue {
  const nodo = mapa.nodos.find((n) => n.id === nodoId);
  if (!nodo) throw new Error(`unknown node ${nodoId}`);
  const etiqueta = ETIQUETA_ESTADO[nodo.estado];
  const n = nodo.entradas.length;
  const respaldo = n === 0 ? 'lo respaldan los nodos que contiene' : n === 1 ? '1 registro tuyo lo respalda' : `${n} registros tuyos lo respaldan`;
  const frase =
    nodo.estado === 'sin_explorar'
      ? 'Todavía no hay evidencia en este nodo. Se enciende cuando lo exploras y lo dices con tus palabras.'
      : `${etiqueta}: ${respaldo}.${nodo.preguntaAbierta ? ' Tienes una pregunta abierta aquí.' : ''}`;
  return { nodo, estadoEtiqueta: etiqueta, entradas: nodo.entradas, citas: nodo.citas, frase };
}

// ---- layout ------------------------------------------------------------------

const W = 800;
const H = 600;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const redondear = (v: number) => Math.round(v * 10) / 10;

/** Fallback until F9's precomputed layout is merged: hubs on a circle, children on a small circle around each. */
export function layoutPorDefecto(g: GrafoCurricular): PosicionNodo[] {
  const hubs = g.nodos.filter((n) => n.tipo === 'competencia');
  const pos = new Map<string, PosicionNodo>();
  hubs.forEach((h, i) => {
    const ang = (2 * Math.PI * i) / hubs.length - Math.PI / 2;
    const r = hubs.length === 1 ? 0 : 190;
    const hx = W / 2 + r * Math.cos(ang);
    const hy = H / 2 + r * Math.sin(ang);
    pos.set(h.id, { nodeId: h.id, x: redondear(clamp(hx, 30, W - 30)), y: redondear(clamp(hy, 30, H - 30)) });
    const hijos = g.nodos.filter((n) => n.padre === h.id);
    hijos.forEach((c, k) => {
      const a = ang + (2 * Math.PI * k) / Math.max(1, hijos.length);
      const rr = 95 + (k % 2) * 25;
      pos.set(c.id, { nodeId: c.id, x: redondear(clamp(hx + rr * Math.cos(a), 20, W - 20)), y: redondear(clamp(hy + rr * Math.sin(a), 20, H - 20)) });
    });
  });
  g.nodos.filter((n) => !pos.has(n.id)).forEach((n, i) => pos.set(n.id, { nodeId: n.id, x: 40 + (i % 10) * 70, y: H - 30 - Math.floor(i / 10) * 40 }));
  return g.nodos.map((n) => pos.get(n.id) as PosicionNodo);
}

/** Use F9's precomputed {nodeId, x, y} layout when it covers every node; otherwise the fallback. */
export function resolverLayout(g: GrafoCurricular, precalculado?: PosicionNodo[]): PosicionNodo[] {
  if (precalculado) {
    const m = new Map(precalculado.map((p) => [p.nodeId, p]));
    if (g.nodos.every((n) => Number.isFinite(m.get(n.id)?.x) && Number.isFinite(m.get(n.id)?.y))) {
      return g.nodos.map((n) => m.get(n.id) as PosicionNodo);
    }
  }
  return layoutPorDefecto(g);
}

// ---- views -------------------------------------------------------------------

/** Group view: the union of its members' evidence. */
export function mapaDeGrupo(base: Omit<EntradaMapa, 'memoria'>, memoriaPorIntegrante: MemoriaEntrada[][]): MapaCerebro {
  return construirMapa({ ...base, memoria: memoriaPorIntegrante.flat() });
}

export const MIN_ESTUDIANTES_AGREGADO = 5;

export type ConteosCompetencia =
  | { suprimido: true }
  | { suprimido: false; competencias: { id: string; etiqueta: string; nodosConEvidencia: number; nodosTotal: number }[] };

/** Teacher/report version: only counts of nodes with evidence per competency, from 5 students, never a per-student map. */
export function conteosPorCompetencia(g: GrafoCurricular, memoria: MemoriaEntrada[]): ConteosCompetencia {
  if (new Set(memoria.map((m) => m.estudianteId)).size < MIN_ESTUDIANTES_AGREGADO) return { suprimido: true };
  const tocados = new Set<string>();
  for (const m of memoria) {
    for (const c of m.conceptos) tocados.add(c);
    tocados.add(idNodoDesempeno(m.competencia));
  }
  return {
    suprimido: false,
    competencias: g.nodos
      .filter((n) => n.tipo === 'competencia')
      .map((h) => {
        const hijos = g.nodos.filter((n) => n.padre === h.id);
        return { id: h.id, etiqueta: h.etiqueta, nodosTotal: hijos.length, nodosConEvidencia: hijos.filter((n) => tocados.has(n.id)).length };
      }),
  };
}
