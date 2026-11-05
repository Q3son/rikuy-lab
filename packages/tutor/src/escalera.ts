/**
 * Hint ladder: 1 general .. 3 concrete. A hint never reveals the answer.
 *
 * Pattern from the team's Rikuy Lab agent (hints[] per practice, "una pista, no la respuesta"),
 * RoboLab (up to 3 hints) and Fixazo (anti-answer guard), see ECOSISTEMA 2.4. What is new here:
 *  - the ladder is explicit state (`mostradas`) and can never jump (1 -> 3);
 *  - `pistaNoRevela` (ARQUITECTURA 4.4) rejects hints that contain the numeric result of the model,
 *    the expected conclusion or the inverted limitation, and a leaking hint is replaced by a generic
 *    safe one instead of being shown.
 */
import type { Practica } from '@rikuy/contracts';
import { palabras, extraerNumeros } from './texto.ts';

export const MAX_PELDANOS = 3;

export type PracticaEscalera = Pick<Practica, 'pistas'>;

/** What a hint must never say. Computed by the caller (lab-engine knows the model results). */
export interface Reservados {
  /** Numeric results of the model and any number that is the expected finding. */
  numeros: readonly number[];
  /** Expected conclusion(s) in the words of the teacher. */
  frases: readonly string[];
  /** Phrases that state the limitation backwards (the model is perfect, no friction...). */
  limitacionesInvertidas?: readonly string[];
}

export interface EstadoEscalera {
  /** Highest rung already shown for this group and practice (0 = none). */
  mostradas: number;
  /** First rung allowed when nothing was shown yet (2 if memory says the student struggled here). */
  inicial?: 1 | 2;
}

export interface PistaServida {
  nivel: number;
  texto: string;
  /** True when the 3 rungs were already used: the tutor sends the student to the teacher or the data. */
  agotada: boolean;
  /** True when the authored hint leaked and a generic one was served instead. */
  sustituida: boolean;
}

/** Generic hints, safe for any practice. No digits on purpose. */
export const PISTAS_GENERICAS: readonly [string, string, string] = [
  'Piensa en qué podrías cambiar y qué podrías medir.',
  'Cambia una sola cosa a la vez y compara lo que mides.',
  'Mira tus propias mediciones: ¿qué cambió cuando cambiaste una sola cosa?',
];

const PALABRAS_NUMERO: Readonly<Record<string, number>> = {
  cero: 0, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50,
  cien: 100, doble: 2, duplica: 2, duplican: 2, duplico: 2, triple: 3, triplica: 3, cuadruple: 4, mitad: 0.5,
};

const TOLERANCIA = 0.04;

/** Rungs available for a practice: its hints, capped at the ladder size. */
function peldanosDe(p: PracticaEscalera): number {
  return Math.max(1, Math.min(MAX_PELDANOS, p.pistas.length));
}

/** May the student see rung `nivel` now? Repeating a shown rung is fine; skipping one is not. */
export function nivelPermitido(nivel: number, estado: EstadoEscalera, maxPeldanos: number = MAX_PELDANOS): boolean {
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > Math.min(MAX_PELDANOS, maxPeldanos)) return false;
  const siguiente = Math.max(estado.mostradas + 1, estado.mostradas === 0 ? (estado.inicial ?? 1) : 1);
  return nivel <= siguiente;
}

function cercano(a: number, b: number): boolean {
  if (a === b) return true;
  return Math.abs(a - b) <= TOLERANCIA * Math.max(Math.abs(b), 1e-9);
}

function palabrasDeContenido(texto: string): string[] {
  return [...new Set(palabras(texto).filter((p) => p.length >= 4))];
}

export type MotivoRevela = 'numero' | 'conclusion' | 'limitacion_invertida';

/** Domain validator `pistaNoRevela` (4.4). */
export function pistaNoRevela(pista: string, r: Reservados): { ok: true } | { ok: false; motivo: MotivoRevela } {
  const numeros = [...extraerNumeros(pista), ...palabras(pista).flatMap((p) => (p in PALABRAS_NUMERO ? [PALABRAS_NUMERO[p]!] : []))];
  if (numeros.some((n) => r.numeros.some((x) => cercano(n, x)))) return { ok: false, motivo: 'numero' };

  const contenido = new Set(palabrasDeContenido(pista));
  const solapa = (frase: string): boolean => {
    const f = palabrasDeContenido(frase);
    if (f.length < 3) return palabras(pista).join(' ').includes(palabras(frase).join(' '));
    return f.filter((w) => contenido.has(w)).length / f.length >= 0.75;
  };
  if (r.frases.some(solapa)) return { ok: false, motivo: 'conclusion' };
  if (r.limitacionesInvertidas?.some(solapa)) return { ok: false, motivo: 'limitacion_invertida' };
  return { ok: true };
}

/** Next hint for the group, honoring the ladder and `pistaNoRevela`. */
export function elegirPista(practica: PracticaEscalera, estado: EstadoEscalera, reservados: Reservados): PistaServida {
  const maximo = peldanosDe(practica);
  const agotada = estado.mostradas >= maximo;
  const nivel = agotada ? maximo : Math.min(maximo, Math.max(estado.mostradas + 1, estado.mostradas === 0 ? (estado.inicial ?? 1) : 1));
  const autor = practica.pistas[nivel - 1] ?? PISTAS_GENERICAS[nivel - 1]!;
  if (pistaNoRevela(autor, reservados).ok) return { nivel, texto: autor, agotada, sustituida: false };
  return { nivel, texto: PISTAS_GENERICAS[nivel - 1]!, agotada, sustituida: true };
}
