/**
 * "Ayudante del museo" (FUNCIONES_EXTRA.md Part 2): peer help between groups of the same class.
 *
 * - The teacher switch is OFF by default.
 * - A request is closed chips only (concept of the exhibit + one fixed need); no free text, no chat.
 * - Helpers are picked at random among other groups whose Cerebro node for that concept is "razonado".
 *   No ordered list of "best helpers" exists anywhere.
 * - A group gets at most 2 offers per hour and 1 active help at a time; no answer in 3 minutes escalates
 *   to the teacher.
 * - Help happens in person with a 3-step guide; the requesting group closes it and restates the idea
 *   "con tus palabras" (evaluated by the normal judge, F4).
 * - The knot goes to the helper group (+1 to the class quipu): double confirmation ([Nos ayudó] + teacher,
 *   per class rule), max 3 per helper per day and 1 per (helper, requester, concept) per week, revocable by
 *   the teacher as a correction. F10 turns the confirmed event into `AsientoQuipu` entries.
 *
 * Pure state machine: the hub (or the teacher phone without hub) is the authority that applies actions.
 */

export const NECESIDADES = {
  otras_palabras: 'Que me lo expliquen con otras palabras',
  como_medir: 'Que me muestren cómo lo midieron',
  revisar_dato: 'Revisar mi dato',
} as const;
export type Necesidad = keyof typeof NECESIDADES;

export const GUIA_AYUDANTE = [
  'Pregunta qué ven en su dato.',
  'Muestra cómo midieron, no la respuesta.',
  'Pide que lo digan con sus palabras.',
] as const;

export const RESULTADOS = { nos_ayudo: 'Nos ayudó', casi: 'Casi', aun_no: 'Aún no' } as const;
export type ResultadoAyuda = keyof typeof RESULTADOS;

/** Cerebro node state (read-only port to F10's `@rikuy/cerebro`). */
export type EstadoNodo = 'sin_explorar' | 'explorado' | 'en_camino' | 'razonado' | 'pregunta_abierta';
export type NivelJuez = 'razonado' | 'explorado' | 'no_evaluable';

export type EstadoPedido = 'abierto' | 'ofrecido' | 'en_curso' | 'cerrado' | 'escalado' | 'cancelado';

export interface OfertaAyuda {
  id: string;
  pedidoId: string;
  grupoAyudaId: string;
  estado: 'enviada' | 'aceptada' | 'rechazada' | 'vencida';
  ts: number;
}

export interface CierreAyuda {
  resultado: ResultadoAyuda;
  fraseGrupo?: string;
  nivelJuez?: NivelJuez;
  ts: number;
}

export interface PedidoAyuda {
  id: string;
  grupoPideId: string;
  exhibicionId: string;
  nodoId: string;
  necesidad: Necesidad;
  estado: EstadoPedido;
  ts: number;
  ofertas: OfertaAyuda[];
  grupoAyudaId?: string;
  ayudaDocente?: boolean;
  cierre?: CierreAyuda;
}

export interface NudoAyuda {
  id: string;
  pedidoId: string;
  grupoAyudaId: string;
  grupoPideId: string;
  nodoId: string;
  estado: 'por_confirmar' | 'confirmado' | 'revocado';
  ts: number;
}

export interface EstadoAyudante {
  config: { activo: boolean; docenteConfirma: boolean };
  pedidos: PedidoAyuda[];
  nudos: NudoAyuda[];
  silenciados: string[];
}

export type AccionAyudante =
  | { tipo: 'configurar'; activo?: boolean; docenteConfirma?: boolean }
  | { tipo: 'pedir'; grupoPideId: string; exhibicionId: string; nodoId: string; necesidad: Necesidad }
  | { tipo: 'responder'; ofertaId: string; grupoId: string; acepta: boolean }
  | { tipo: 'tick' }
  | { tipo: 'cancelar'; pedidoId: string; grupoId: string }
  | { tipo: 'cerrar'; pedidoId: string; grupoId: string; resultado: ResultadoAyuda; frase?: string; nivelJuez?: NivelJuez }
  | { tipo: 'confirmar'; nudoId: string }
  | { tipo: 'revocar'; nudoId: string }
  | { tipo: 'yo_ayudo'; pedidoId: string }
  | { tipo: 'silenciar'; grupoId: string; silenciado: boolean };

/** Proposed events (PROPUESTAS_CONTRATOS.md, F5): `ayuda.*`, `quipu.nudo.*`. */
export interface EventoAyuda {
  tipo: 'ayuda.pedida' | 'ayuda.ofrecida' | 'ayuda.aceptada' | 'ayuda.cerrada' | 'quipu.nudo.confirmado' | 'quipu.nudo.revocado';
  datos: Record<string, unknown>;
}

export interface ContextoAyudante {
  ahora: number;
  azar: () => number;
  /** Groups of THIS class (same class only). */
  gruposClase: readonly string[];
  estadoNodo: (grupoId: string, nodoId: string) => EstadoNodo;
  nuevoId: () => string;
}

export type ErrorAyudante =
  | 'apagado'
  | 'necesidad_invalida'
  | 'otra_clase'
  | 'silenciado'
  | 'pedido_abierto'
  | 'no_encontrado'
  | 'no_invitado'
  | 'estado_invalido'
  | 'solo_quien_pide';

export interface ResultadoAccion {
  estado: EstadoAyudante;
  eventos: EventoAyuda[];
  error?: ErrorAyudante;
}

const MIN = 60_000;
export const LIMITES_AYUDANTE = {
  ofertasPorGrupo: 2,
  ventanaOfertasMs: 60 * MIN,
  esperaMs: 3 * MIN,
  nudosPorDia: 3,
  ventanaDiaMs: 24 * 60 * MIN,
  ventanaParejaMs: 7 * 24 * 60 * MIN,
  ofertasPorPedido: 2,
} as const;

export function estadoInicialAyudante(): EstadoAyudante {
  return { config: { activo: false, docenteConfirma: true }, pedidos: [], nudos: [], silenciados: [] };
}

const ACTIVOS: EstadoPedido[] = ['abierto', 'ofrecido', 'en_curso', 'escalado'];

function fallo(estado: EstadoAyudante, error: ErrorAyudante): ResultadoAccion {
  return { estado, eventos: [], error };
}

function ayudandoAhora(e: EstadoAyudante, grupo: string): boolean {
  return e.pedidos.some((p) => p.estado === 'en_curso' && p.grupoAyudaId === grupo);
}

function ofertasRecientes(e: EstadoAyudante, grupo: string, ahora: number): number {
  return e.pedidos.flatMap((p) => p.ofertas).filter((o) => o.grupoAyudaId === grupo && ahora - o.ts < LIMITES_AYUDANTE.ventanaOfertasMs).length;
}

function barajar<T>(xs: T[], azar: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(azar() * (i + 1)));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function conPedido(e: EstadoAyudante, p: PedidoAyuda): EstadoAyudante {
  return { ...e, pedidos: e.pedidos.map((x) => (x.id === p.id ? p : x)) };
}

function eventoNudo(tipo: 'quipu.nudo.confirmado' | 'quipu.nudo.revocado', n: NudoAyuda): EventoAyuda {
  return {
    tipo,
    datos: {
      nudoId: n.id,
      pedidoId: n.pedidoId,
      motivo: 'ayudo_a_otro_grupo',
      beneficiarios: [{ tipo: 'grupo', grupoId: n.grupoAyudaId }, { tipo: 'aula' }],
      nodoId: n.nodoId,
    },
  };
}

export function aplicar(e: EstadoAyudante, a: AccionAyudante, ctx: ContextoAyudante): ResultadoAccion {
  const { ahora } = ctx;
  switch (a.tipo) {
    case 'configurar':
      return {
        estado: { ...e, config: { activo: a.activo ?? e.config.activo, docenteConfirma: a.docenteConfirma ?? e.config.docenteConfirma } },
        eventos: [],
      };

    case 'silenciar': {
      const resto = e.silenciados.filter((g) => g !== a.grupoId);
      return { estado: { ...e, silenciados: a.silenciado ? [...resto, a.grupoId] : resto }, eventos: [] };
    }

    case 'pedir': {
      if (!e.config.activo) return fallo(e, 'apagado');
      if (!(a.necesidad in NECESIDADES)) return fallo(e, 'necesidad_invalida');
      if (!ctx.gruposClase.includes(a.grupoPideId)) return fallo(e, 'otra_clase');
      if (e.silenciados.includes(a.grupoPideId)) return fallo(e, 'silenciado');
      if (e.pedidos.some((p) => p.grupoPideId === a.grupoPideId && ACTIVOS.includes(p.estado))) return fallo(e, 'pedido_abierto');
      const id = ctx.nuevoId();
      const elegibles = ctx.gruposClase.filter(
        (g) =>
          g !== a.grupoPideId &&
          !e.silenciados.includes(g) &&
          ctx.estadoNodo(g, a.nodoId) === 'razonado' &&
          !ayudandoAhora(e, g) &&
          ofertasRecientes(e, g, ahora) < LIMITES_AYUDANTE.ofertasPorGrupo,
      );
      const elegidos = barajar(elegibles, ctx.azar).slice(0, LIMITES_AYUDANTE.ofertasPorPedido);
      const ofertas: OfertaAyuda[] = elegidos.map((g) => ({ id: ctx.nuevoId(), pedidoId: id, grupoAyudaId: g, estado: 'enviada', ts: ahora }));
      const pedido: PedidoAyuda = {
        id,
        grupoPideId: a.grupoPideId,
        exhibicionId: a.exhibicionId,
        nodoId: a.nodoId,
        necesidad: a.necesidad,
        estado: ofertas.length ? 'ofrecido' : 'escalado',
        ts: ahora,
        ofertas,
      };
      return {
        estado: { ...e, pedidos: [...e.pedidos, pedido] },
        eventos: [
          { tipo: 'ayuda.pedida', datos: { pedidoId: id, grupoPideId: a.grupoPideId, exhibicionId: a.exhibicionId, nodoId: a.nodoId, necesidad: a.necesidad } },
          ...ofertas.map((o): EventoAyuda => ({ tipo: 'ayuda.ofrecida', datos: { ofertaId: o.id, pedidoId: id, grupoAyudaId: o.grupoAyudaId } })),
        ],
      };
    }

    case 'responder': {
      const p = e.pedidos.find((x) => x.ofertas.some((o) => o.id === a.ofertaId));
      const o = p?.ofertas.find((x) => x.id === a.ofertaId);
      if (!p || !o) return fallo(e, 'no_encontrado');
      if (o.grupoAyudaId !== a.grupoId) return fallo(e, 'no_invitado');
      if (p.estado !== 'ofrecido' || o.estado !== 'enviada') return fallo(e, 'estado_invalido');
      if (a.acepta) {
        const ofertas = p.ofertas.map((x): OfertaAyuda => (x.id === o.id ? { ...x, estado: 'aceptada' } : x.estado === 'enviada' ? { ...x, estado: 'vencida' } : x));
        return {
          estado: conPedido(e, { ...p, estado: 'en_curso', grupoAyudaId: o.grupoAyudaId, ofertas }),
          eventos: [{ tipo: 'ayuda.aceptada', datos: { pedidoId: p.id, ofertaId: o.id, grupoAyudaId: o.grupoAyudaId } }],
        };
      }
      const ofertas = p.ofertas.map((x): OfertaAyuda => (x.id === o.id ? { ...x, estado: 'rechazada' } : x));
      const quedan = ofertas.some((x) => x.estado === 'enviada');
      return { estado: conPedido(e, { ...p, ofertas, estado: quedan ? 'ofrecido' : 'escalado' }), eventos: [] };
    }

    case 'tick': {
      let cambio = false;
      const pedidos = e.pedidos.map((p) => {
        if (p.estado !== 'ofrecido' || ahora - p.ts < LIMITES_AYUDANTE.esperaMs) return p;
        cambio = true;
        return { ...p, estado: 'escalado' as const, ofertas: p.ofertas.map((o): OfertaAyuda => (o.estado === 'enviada' ? { ...o, estado: 'vencida' } : o)) };
      });
      return { estado: cambio ? { ...e, pedidos } : e, eventos: [] };
    }

    case 'cancelar': {
      const p = e.pedidos.find((x) => x.id === a.pedidoId);
      if (!p) return fallo(e, 'no_encontrado');
      if (p.grupoPideId !== a.grupoId) return fallo(e, 'solo_quien_pide');
      if (!ACTIVOS.includes(p.estado)) return fallo(e, 'estado_invalido');
      return { estado: conPedido(e, { ...p, estado: 'cancelado' }), eventos: [] };
    }

    case 'yo_ayudo': {
      const p = e.pedidos.find((x) => x.id === a.pedidoId);
      if (!p) return fallo(e, 'no_encontrado');
      if (!ACTIVOS.includes(p.estado)) return fallo(e, 'estado_invalido');
      const ofertas = p.ofertas.map((o): OfertaAyuda => (o.estado === 'enviada' ? { ...o, estado: 'vencida' } : o));
      return { estado: conPedido(e, { ...p, estado: 'en_curso', ayudaDocente: true, ofertas }), eventos: [] };
    }

    case 'cerrar': {
      const p = e.pedidos.find((x) => x.id === a.pedidoId);
      if (!p) return fallo(e, 'no_encontrado');
      if (p.grupoPideId !== a.grupoId) return fallo(e, 'solo_quien_pide');
      if (p.estado !== 'en_curso') return fallo(e, 'estado_invalido');
      const cierre: CierreAyuda = {
        resultado: a.resultado,
        ts: ahora,
        ...(a.frase ? { fraseGrupo: a.frase.slice(0, 280) } : {}),
        ...(a.nivelJuez ? { nivelJuez: a.nivelJuez } : {}),
      };
      let estado = conPedido(e, { ...p, estado: 'cerrado', cierre });
      const eventos: EventoAyuda[] = [
        { tipo: 'ayuda.cerrada', datos: { pedidoId: p.id, resultado: a.resultado, ...(a.nivelJuez ? { nivelJuez: a.nivelJuez } : {}) } },
      ];
      const ayudante = p.grupoAyudaId;
      const conFrase = !!a.frase?.trim() && !!a.nivelJuez;
      if (a.resultado === 'nos_ayudo' && ayudante && !p.ayudaDocente && conFrase && dentroDeLimites(e, ayudante, p, ahora)) {
        const confirmadoYa = !e.config.docenteConfirma && a.nivelJuez !== 'no_evaluable';
        const nudo: NudoAyuda = {
          id: ctx.nuevoId(),
          pedidoId: p.id,
          grupoAyudaId: ayudante,
          grupoPideId: p.grupoPideId,
          nodoId: p.nodoId,
          estado: confirmadoYa ? 'confirmado' : 'por_confirmar',
          ts: ahora,
        };
        estado = { ...estado, nudos: [...estado.nudos, nudo] };
        if (confirmadoYa) eventos.push(eventoNudo('quipu.nudo.confirmado', nudo));
      }
      return { estado, eventos };
    }

    case 'confirmar':
    case 'revocar': {
      const n = e.nudos.find((x) => x.id === a.nudoId);
      if (!n) return fallo(e, 'no_encontrado');
      const nuevo: NudoAyuda['estado'] = a.tipo === 'confirmar' ? 'confirmado' : 'revocado';
      if (n.estado === nuevo || n.estado === 'revocado') return fallo(e, 'estado_invalido');
      const actualizado = { ...n, estado: nuevo };
      const estado = { ...e, nudos: e.nudos.map((x) => (x.id === n.id ? actualizado : x)) };
      // Revoking a knot that was never confirmed emits nothing to the ledger.
      const eventos =
        a.tipo === 'confirmar'
          ? [eventoNudo('quipu.nudo.confirmado', actualizado)]
          : n.estado === 'confirmado'
            ? [eventoNudo('quipu.nudo.revocado', actualizado)]
            : [];
      return { estado, eventos };
    }
  }
}

function dentroDeLimites(e: EstadoAyudante, ayudante: string, p: PedidoAyuda, ahora: number): boolean {
  const vigentes = e.nudos.filter((n) => n.estado !== 'revocado' && n.grupoAyudaId === ayudante);
  if (vigentes.filter((n) => ahora - n.ts < LIMITES_AYUDANTE.ventanaDiaMs).length >= LIMITES_AYUDANTE.nudosPorDia) return false;
  return !vigentes.some((n) => n.grupoPideId === p.grupoPideId && n.nodoId === p.nodoId && ahora - n.ts < LIMITES_AYUDANTE.ventanaParejaMs);
}

export interface TableroAyudas {
  abiertos: PedidoAyuda[];
  enCurso: PedidoAyuda[];
  escalados: PedidoAyuda[];
  cerrados: PedidoAyuda[];
  porConfirmar: NudoAyuda[];
  /** Concepts with requests, in curriculum order of first appearance (never a ranking of groups). */
  conceptos: { nodoId: string; pedidos: number }[];
  activo: boolean;
}

/** Teacher view (T-23) of the help flows. */
export function tableroAyudas(e: EstadoAyudante): TableroAyudas {
  const conceptos = new Map<string, number>();
  for (const p of e.pedidos) conceptos.set(p.nodoId, (conceptos.get(p.nodoId) ?? 0) + 1);
  return {
    abiertos: e.pedidos.filter((p) => p.estado === 'abierto' || p.estado === 'ofrecido'),
    enCurso: e.pedidos.filter((p) => p.estado === 'en_curso'),
    escalados: e.pedidos.filter((p) => p.estado === 'escalado'),
    cerrados: e.pedidos.filter((p) => p.estado === 'cerrado'),
    porConfirmar: e.nudos.filter((n) => n.estado === 'por_confirmar'),
    conceptos: [...conceptos].map(([nodoId, pedidos]) => ({ nodoId, pedidos })),
    activo: e.config.activo,
  };
}
