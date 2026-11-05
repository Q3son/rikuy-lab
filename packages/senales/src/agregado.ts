/**
 * Class-level aggregate for the responsible teacher (DESIGN 10.5): only from 5 participants,
 * counts only, no names, no emotion labels. The sentence talks about instruction, not students.
 */
import type { AutorreporteMomento, EventoAprendizaje } from '@rikuy/contracts';
import { hlcMs } from './consentimiento.ts';

export const MIN_PARTICIPANTES = 5;
export const BIN_MINUTOS = 5;
export const MENSAJE_SUPRIMIDO = 'Muy pocos participantes para mostrar un resumen.';

type Ayuda = NonNullable<AutorreporteMomento['ayuda']>;

export interface BinPistas {
  desdeMin: number;
  hastaMin: number;
  pedidos: number;
  grupos: number;
}

export type AgregadoCurso =
  | { estado: 'suprimido'; mensaje: typeof MENSAJE_SUPRIMIDO }
  | {
      estado: 'visible';
      participan: number;
      pistasPorBin: BinPistas[];
      /** What students said would help (counts); undefined with fewer than 5 distinct responses. */
      ayudaDeseada?: Partial<Record<Ayuda, number>>;
      oracion?: string;
    };

export interface EntradaAgregado {
  participantes: string[];
  autorreportes: AutorreporteMomento[];
  eventos: EventoAprendizaje[];
  inicioClaseMs: number;
  gruposTotal: number;
  nombrePaso?: (pasoId: string) => string;
}

export function agregarCurso(e: EntradaAgregado): AgregadoCurso {
  const participan = new Set(e.participantes).size;
  if (participan < MIN_PARTICIPANTES) return { estado: 'suprimido', mensaje: MENSAJE_SUPRIMIDO };

  const bins = new Map<number, { pedidos: number; grupos: Set<string>; pasos: Map<string, number> }>();
  for (const ev of e.eventos) {
    if (ev.tipo !== 'pista_solicitada') continue;
    const minuto = Math.max(0, Math.floor((hlcMs(ev.hlc) - e.inicioClaseMs) / 60_000));
    const k = Math.floor(minuto / BIN_MINUTOS) * BIN_MINUTOS;
    const b = bins.get(k) ?? { pedidos: 0, grupos: new Set<string>(), pasos: new Map<string, number>() };
    b.pedidos++;
    b.grupos.add(ev.grupoId);
    b.pasos.set(ev.pasoId, (b.pasos.get(ev.pasoId) ?? 0) + 1);
    bins.set(k, b);
  }
  const pistasPorBin: BinPistas[] = [...bins]
    .sort(([a], [b]) => a - b)
    .map(([k, b]) => ({ desdeMin: k, hastaMin: k + BIN_MINUTOS, pedidos: b.pedidos, grupos: b.grupos.size }));

  // last check-in per student; private ones feed aggregates too
  const ultimo = new Map<string, AutorreporteMomento>();
  for (const a of e.autorreportes) ultimo.set(a.estudianteId, a);
  let ayudaDeseada: Partial<Record<Ayuda, number>> | undefined;
  if (ultimo.size >= MIN_PARTICIPANTES) {
    ayudaDeseada = {};
    for (const a of ultimo.values()) if (a.ayuda) ayudaDeseada[a.ayuda] = (ayudaDeseada[a.ayuda] ?? 0) + 1;
  }

  let oracion: string | undefined;
  const pico = [...bins].sort(([, a], [, b]) => b.grupos.size - a.grupos.size || b.pedidos - a.pedidos)[0];
  if (pico && pico[1].grupos.size >= 2) {
    const [k, b] = pico;
    const paso = [...b.pasos].sort(([, x], [, y]) => y - x)[0]?.[0] ?? '';
    const nombre = (e.nombrePaso ?? ((p: string) => p))(paso);
    oracion = `Entre los minutos ${k} y ${k + BIN_MINUTOS}, ${b.grupos.size} de ${e.gruposTotal} grupos pidieron pista en «${nombre}». Revisa cómo se explica ese paso.`;
  }

  return { estado: 'visible', participan, pistasPorBin, ...(ayudaDeseada ? { ayudaDeseada } : {}), ...(oracion ? { oracion } : {}) };
}
