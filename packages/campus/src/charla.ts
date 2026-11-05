/**
 * Rules of the hall chat ("charla de cerca"): who reads a message and what can be sent. Pure, so the
 * sender and the receiver apply the same rules (nobody trusts the other side to have filtered).
 *
 * Adapted from AulaQuipu (team project) (https://github.com/paoloose/aulaquipu),
 * `apps/web-app/lib/campus/chat-rules.ts` (hackathon MVP, reuse agreed with its team; credits in
 * docs/ATRIBUCIONES.md). Adapted: Rikuy scenes are one hall each, so "same room" is the scene id;
 * the radius is measured in tiles of our Tiled maps; copy in neutral Spanish; the word list is kept short
 * on purpose (a first client-side barrier, not moderation).
 */
import type { Punto } from './grilla.ts';

export const RADIO_CHARLA = 4; // tiles around the group
export const TOLERANCIA_RADIO = 1; // receiver margin: its copy of the positions arrives late
export const LARGO_MAXIMO = 140;
export const GLOBO_MS = 6000;
export const TAM_HISTORIAL = 20;

const PAUSA_MINIMA_MS = 1500;
const RAFAGA_MAXIMA = 5;
const VENTANA_RAFAGA_MS = 15000;

const PALABRAS_BLOQUEADAS = new Set([
  'mierda', 'puta', 'puto', 'carajo', 'cojudo', 'cojuda', 'huevon', 'huevona', 'concha', 'maricon', 'idiota',
  'estupido', 'estupida', 'imbecil', 'pendejo', 'pendeja', 'verga', 'culo', 'cabron', 'cabrona', 'mongolo',
  'retrasado', 'retrasada', 'zorra', 'perra',
]);

const base = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const ENLACE = /(https?:|www\.|\b[a-z0-9-]+\.(com|net|org|pe|io|me|ly|gg|tv|co|xyz|app|link|info|ru|cl|ar)\b)/i;
const TELEFONO = /\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d[\s.-]?\d/; // 7 digits in a row, or almost
const CORREO = /\S+@\S+/;

/** Replaces blocked words with *** and keeps the rest of the text. */
export function enmascarar(texto: string): string {
  return texto.replace(/\p{L}+/gu, (p) => {
    const b = base(p);
    return PALABRAS_BLOQUEADAS.has(b) || (b.endsWith('s') && PALABRAS_BLOQUEADAS.has(b.slice(0, -1))) ? '***' : p;
  });
}

export type MensajePreparado = { ok: true; texto: string } | { ok: false; motivo: string };

/** Cleans and validates what is about to be sent or shown: the final text or why it was refused. */
export function prepararMensaje(crudo: unknown): MensajePreparado {
  if (typeof crudo !== 'string') return { ok: false, motivo: 'Mensaje no válido' };
  const texto = crudo.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!texto) return { ok: false, motivo: 'Escribe un mensaje' };
  if (texto.length > LARGO_MAXIMO) return { ok: false, motivo: `Máximo ${LARGO_MAXIMO} caracteres` };
  if (ENLACE.test(texto) || CORREO.test(texto)) return { ok: false, motivo: 'No se pueden enviar enlaces ni correos' };
  if (TELEFONO.test(texto)) return { ok: false, motivo: 'No compartas teléfonos ni datos personales' };
  return { ok: true, texto: enmascarar(texto) };
}

/**
 * Send limit: a minimum pause between messages and a cap per burst. Keeps the timestamps in `enviados`
 * (mutated). Returns the reason to wait, or null when the message may go.
 */
export function limitarRitmo(enviados: number[], ahora: number): string | null {
  while (enviados.length && ahora - enviados[0]! > VENTANA_RAFAGA_MS) enviados.shift();
  if (enviados.length && ahora - enviados[enviados.length - 1]! < PAUSA_MINIMA_MS) return 'Espera un momento antes de enviar otro';
  if (enviados.length >= RAFAGA_MAXIMA) return 'Escriben muy rápido, esperen unos segundos';
  enviados.push(ahora);
  return null;
}

/** Same hall and at most `radio` tiles apart. Each Rikuy scene is one hall, so the hall is the scene id. */
export function estanCerca(a: Punto & { salaId: string }, b: Punto & { salaId: string }, radio = RADIO_CHARLA): boolean {
  return a.salaId === b.salaId && Math.hypot(a.x - b.x, a.y - b.y) <= radio;
}

/** Ids of the groups that read a message sent from `desde` (receivers use the tolerance margin). */
export function lectoresCerca<T extends Punto & { id: string }>(desde: Punto, otros: readonly T[], radio = RADIO_CHARLA + TOLERANCIA_RADIO): T[] {
  return otros.filter((o) => Math.hypot(o.x - desde.x, o.y - desde.y) <= radio);
}
