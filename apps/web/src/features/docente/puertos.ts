/**
 * Ports the teacher panel needs from other fronts. Each has a simulated adapter in ./simulacion
 * so F6 runs end to end before F2 (sync codec), F7 (delivery) and F8 (hub) land.
 */
import type { Evento } from '@rikuy/contracts';

/** What the QR reader reports after each camera frame (T-08). Mirrors F2's reassembler. */
export type ProgresoRelevo =
  | { estado: 'invalido' }
  | { estado: 'otra_clase' }
  | { estado: 'parcial'; recibidos: number; total: number; faltan: number }
  | { estado: 'completo'; emisor: string; eventos: Evento[] };

export interface ReceptorRelevo {
  agregarCuadro(texto: string): ProgresoRelevo;
}

export type TipoRelevo = 'E' | 'P' | 'J' | 'A' | 'F';

export interface CodecQr {
  codificar(tipo: TipoRelevo, valor: unknown): string[];
}

/** Teacher signature (ECDSA P-256 in F2). Simulated here with a visible placeholder. */
export interface CriptoDocente {
  readonly clavePublica: string;
  firmar(texto: string): string;
}

export interface ServiciosDocente {
  crearReceptor(claseId: string): ReceptorRelevo;
  codec: CodecQr;
  cripto: CriptoDocente;
  ahora(): number;
  azar(): number;
}
