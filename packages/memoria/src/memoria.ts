/**
 * Local-first learning memory: projection + MiniSearch keyword index + structured retrieval.
 * Implements the `ConsultaMemoria` port declared in @rikuy/contracts (consumed by tutor, reportes, cerebro).
 *
 * Retrieval (ARQUITECTURA 3.10): 1) structured filter by student/group, competency and performance, then
 * rank by concept (graph, one hop) and recency (HLC); 2) keyword search with MiniSearch over `resumen` and
 * `conceptos`, normalized with the shared `@rikuy/core` normalization (no accents, whole words);
 * 3) embeddings are an optional hub adapter (`IndiceVectorial`) and are not loaded on phones.
 */
import type { ConsultaMemoria, EventoTipado, MemoriaEntrada } from '@rikuy/contracts';
import { normalize } from '@rikuy/core';
import MiniSearch from 'minisearch';
import { proyectarMemoria, type ContextoProyeccion } from './proyeccion.ts';
import type { Cripto } from './puertos.ts';

type Consulta = Parameters<ConsultaMemoria['recuperar']>[0];

export interface OpcionesMemoria {
  /** Concepts one hop away in the CNEB graph. Default: none. */
  vecinos?: (concepto: string) => readonly string[];
  /** Members of a group, to answer `grupoId` queries. */
  integrantes?: (grupoId: string) => readonly string[];
  /** Per-student encryption, whose key is destroyed on `olvidar`. */
  cripto?: Cripto;
}

export interface FiltrosBusqueda {
  estudianteId?: string;
  competencia?: number;
  desempeno?: number;
  limite?: number;
}

const LIMITE_TUTOR = 5;
const CARACTERES_TUTOR = 600;

const tokenizar = (texto: string): string[] => normalize(texto).split(/[^a-z0-9]+/).filter(Boolean);

export class MemoriaLocal implements ConsultaMemoria {
  private entradas = new Map<string, MemoriaEntrada>();
  private readonly olvidados = new Set<string>();
  private readonly borradas = new Set<string>();
  private indice = this.nuevoIndice();

  constructor(private readonly opciones: OpcionesMemoria = {}) {}

  private nuevoIndice(): MiniSearch<{ id: string; resumen: string; conceptos: string }> {
    return new MiniSearch({
      fields: ['resumen', 'conceptos'],
      tokenize: tokenizar,
      processTerm: (t) => t,
      searchOptions: { prefix: true, fuzzy: (t) => (t.length >= 6 ? 1 : false), combineWith: 'OR', tokenize: tokenizar },
    });
  }

  /** Replace the contents with `entradas`, honoring forgotten students and entries the teacher deleted. */
  cargar(entradas: readonly MemoriaEntrada[]): void {
    this.entradas = new Map();
    this.indice = this.nuevoIndice();
    const validas = entradas.filter((e) => !this.olvidados.has(e.estudianteId) && !this.borradas.has(e.id));
    for (const e of validas) this.entradas.set(e.id, e);
    this.indice.addAll(validas.map((e) => ({ id: e.id, resumen: e.resumen, conceptos: e.conceptos.join(' ') })));
  }

  /** Rebuild from the event log (called when the class opens). `estudiante.olvidar` events are honored. */
  reconstruir(eventos: readonly EventoTipado[], ctx: ContextoProyeccion): void {
    for (const e of eventos) if (e.tipo === 'estudiante.olvidar') this.olvidados.add(e.datos.estudianteId);
    this.cargar(proyectarMemoria(eventos, ctx));
  }

  todas(): MemoriaEntrada[] {
    return [...this.entradas.values()];
  }

  async recuperar(q: Consulta): Promise<MemoriaEntrada[]> {
    const miembros = q.grupoId ? new Set(this.opciones.integrantes?.(q.grupoId) ?? []) : undefined;
    const directos = new Set(q.conceptos ?? []);
    const saltos = new Set((q.conceptos ?? []).flatMap((c) => [...(this.opciones.vecinos?.(c) ?? [])]).filter((c) => !directos.has(c)));

    const puntaje = (e: MemoriaEntrada) =>
      e.conceptos.reduce((acc, c) => acc + (directos.has(c) ? 2 : saltos.has(c) ? 1 : 0), 0);

    return this.todas()
      .filter((e) => (q.estudianteId ? e.estudianteId === q.estudianteId : true))
      .filter((e) => (miembros ? miembros.has(e.estudianteId) : true))
      .filter((e) => (q.competencia !== undefined ? e.competencia.competencia === q.competencia : true))
      .filter((e) => (q.desempeno !== undefined ? e.competencia.desempeno === q.desempeno : true))
      .sort((a, b) => puntaje(b) - puntaje(a) || (a.hlc < b.hlc ? 1 : a.hlc > b.hlc ? -1 : 0))
      .slice(0, q.limite ?? LIMITE_TUTOR);
  }

  /** Keyword search (MiniSearch), best match first. */
  buscar(texto: string, filtros: FiltrosBusqueda = {}): MemoriaEntrada[] {
    if (tokenizar(texto).length === 0) return [];
    const hits = this.indice.search(texto, {
      filter: (r) => {
        const e = this.entradas.get(r.id as string);
        if (!e) return false;
        if (filtros.estudianteId && e.estudianteId !== filtros.estudianteId) return false;
        if (filtros.competencia !== undefined && e.competencia.competencia !== filtros.competencia) return false;
        if (filtros.desempeno !== undefined && e.competencia.desempeno !== filtros.desempeno) return false;
        return true;
      },
    });
    return hits.flatMap((h) => this.entradas.get(h.id as string) ?? []).slice(0, filtros.limite ?? LIMITE_TUTOR);
  }

  /** What the tutor receives: at most 5 entries and about 600 characters, as plain template summaries. */
  paraTutor(entradas: readonly MemoriaEntrada[]): { entradas: MemoriaEntrada[]; texto: string } {
    const elegidas: MemoriaEntrada[] = [];
    let texto = '';
    for (const e of entradas.slice(0, LIMITE_TUTOR)) {
      const linea = `- ${e.resumen}`;
      const siguiente = texto ? `${texto}\n${linea}` : linea;
      if (siguiente.length > CARACTERES_TUTOR) break;
      texto = siguiente;
      elegidas.push(e);
    }
    return { entradas: elegidas, texto };
  }

  /** The teacher deletes one entry; it stays deleted after a rebuild. */
  borrarEntrada(id: string): void {
    this.borradas.add(id);
    if (this.entradas.delete(id)) this.indice.discard(id);
  }

  /** `estudiante.olvidar`: removes the student from every path and destroys the encryption key. */
  async olvidar(estudianteId: string): Promise<void> {
    this.olvidados.add(estudianteId);
    for (const e of [...this.entradas.values()]) {
      if (e.estudianteId === estudianteId) {
        this.entradas.delete(e.id);
        this.indice.discard(e.id);
      }
    }
    await this.opciones.cripto?.destruirClave(estudianteId);
  }
}
