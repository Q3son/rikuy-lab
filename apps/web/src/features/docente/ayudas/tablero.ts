/**
 * Help board data for "Ayudante del museo" (FUNCIONES_EXTRA 2, screen T-23).
 * The contracts `PedidoAyuda`, `OfertaAyuda` and `CierreAyuda` are PROPOSED (PROPUESTAS_CONTRATOS.md);
 * until they land in @rikuy/contracts and travel as `ayuda.*` events, this in-memory source mocks them.
 * The board never ranks groups: lists keep arrival order and there is no count per group.
 */
export type Necesidad = 'otras_palabras' | 'como_medir' | 'revisar_dato';
export type EstadoPedido = 'abierto' | 'ofrecido' | 'en_curso' | 'cerrado' | 'escalado' | 'cancelado';

export interface PedidoAyuda {
  id: string;
  grupoPideId: string;
  exhibicionId: string;
  pasoId: string;
  /** Concept node of the exhibit (closed list, no free text in v1). */
  nodoId: string;
  necesidad: Necesidad;
  estado: EstadoPedido;
  ts: number;
}

export interface OfertaAyuda {
  id: string;
  pedidoId: string;
  grupoAyudaId: string;
  estado: 'enviada' | 'aceptada' | 'rechazada' | 'vencida';
}

export interface CierreAyuda {
  pedidoId: string;
  resultado: 'nos_ayudo' | 'casi' | 'aun_no';
  fraseGrupo?: string;
  ts: number;
}

export type EstadoNudo = 'por_confirmar' | 'confirmado' | 'revocado';

export interface RegistroAyuda {
  pedido: PedidoAyuda;
  ofertas: OfertaAyuda[];
  cierre?: CierreAyuda;
  nudo?: EstadoNudo;
}

export interface Tablero {
  abiertos: RegistroAyuda[];
  enCurso: RegistroAyuda[];
  cerrados: RegistroAyuda[];
  nudosPorConfirmar: number;
}

export interface FuenteAyudas {
  tablero(): Tablero;
  registro(pedidoId: string): RegistroAyuda | undefined;
  estado(): { activo: boolean; silenciados: string[] };
  yoAyudo(pedidoId: string): void;
  confirmarNudo(pedidoId: string): void;
  revocarNudo(pedidoId: string): void;
  activar(activo: boolean): void;
  silenciar(grupoId: string, silenciado: boolean): void;
  suscribir(cb: () => void): () => void;
}

export const ETIQUETA_NECESIDAD: Record<Necesidad, string> = {
  otras_palabras: 'Que se lo expliquen con otras palabras',
  como_medir: 'Que le muestren cómo se midió',
  revisar_dato: 'Revisar su dato',
};

export function crearFuenteAyudas(inicial: RegistroAyuda[]): FuenteAyudas {
  const registros = inicial.map((r) => ({ ...r, ofertas: [...r.ofertas] }));
  let activo = false;
  let silenciados: string[] = [];
  const oyentes = new Set<() => void>();
  const avisar = () => oyentes.forEach((f) => f());
  const por = (id: string) => registros.find((r) => r.pedido.id === id);
  const cronologico = (a: RegistroAyuda, b: RegistroAyuda) => a.pedido.ts - b.pedido.ts;

  return {
    tablero() {
      const orden = [...registros].sort(cronologico);
      return {
        abiertos: orden.filter((r) => r.pedido.estado === 'abierto' || r.pedido.estado === 'ofrecido'),
        enCurso: orden.filter((r) => r.pedido.estado === 'en_curso'),
        cerrados: orden.filter((r) => r.pedido.estado === 'cerrado' || r.pedido.estado === 'escalado' || r.pedido.estado === 'cancelado'),
        nudosPorConfirmar: registros.filter((r) => r.nudo === 'por_confirmar').length,
      };
    },
    registro: (id) => por(id),
    estado: () => ({ activo, silenciados: [...silenciados] }),
    yoAyudo(id) {
      const r = por(id);
      if (r && (r.pedido.estado === 'abierto' || r.pedido.estado === 'ofrecido')) {
        r.pedido = { ...r.pedido, estado: 'escalado' };
        avisar();
      }
    },
    confirmarNudo(id) {
      const r = por(id);
      if (r?.nudo === 'por_confirmar') {
        r.nudo = 'confirmado';
        avisar();
      }
    },
    revocarNudo(id) {
      const r = por(id);
      if (r && (r.nudo === 'por_confirmar' || r.nudo === 'confirmado')) {
        r.nudo = 'revocado'; // a correction in the ledger, not a deletion
        avisar();
      }
    },
    activar(a) {
      activo = a;
      avisar();
    },
    silenciar(grupoId, s) {
      silenciados = s ? [...new Set([...silenciados, grupoId])] : silenciados.filter((g) => g !== grupoId);
      avisar();
    },
    suscribir(cb) {
      oyentes.add(cb);
      return () => void oyentes.delete(cb);
    },
  };
}

/** Example data for the "Datos de ejemplo" class, resolved against the demo group ids. */
export function ayudasDeEjemplo(grupos: { id: string; apodo: string }[]): RegistroAyuda[] {
  const id = (a: string) => grupos.find((g) => g.apodo === a)?.id ?? a;
  const base = { exhibicionId: 'exh-pendulo', pasoId: 'medir', nodoId: 'Longitud → periodo' };
  return [
    { pedido: { id: 'P1', grupoPideId: id('Puma'), ...base, necesidad: 'otras_palabras', estado: 'abierto', ts: 3 }, ofertas: [] },
    { pedido: { id: 'P2', grupoPideId: id('Kantu'), ...base, necesidad: 'como_medir', estado: 'en_curso', ts: 2 }, ofertas: [{ id: 'O2', pedidoId: 'P2', grupoAyudaId: id('Condor'), estado: 'aceptada' }] },
    {
      pedido: { id: 'P3', grupoPideId: id('Vizcacha'), ...base, necesidad: 'revisar_dato', estado: 'cerrado', ts: 1 },
      ofertas: [{ id: 'O3', pedidoId: 'P3', grupoAyudaId: id('Condor'), estado: 'aceptada' }],
      cierre: { pedidoId: 'P3', resultado: 'nos_ayudo', ts: 4 },
      nudo: 'por_confirmar',
    },
  ];
}
