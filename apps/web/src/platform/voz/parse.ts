/**
 * Spanish voice parsing (F3 owns platform/voz). Word boundaries and accent folding, no LLM.
 *  - `parseVoiceCommand`: fallback of the control phone ("gíralo", "acércalo", "suelta").
 *  - `parseSpokenNumber`: "Dicta tu dato" ("diez coma tres" → 10.3), FUNCIONES_EXTRA §3 f.5.
 */
import type { ViewerAction } from '@rikuy/holo';

export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¡!¿?.,;:]+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const has = (t: string, re: RegExp) => re.test(t);

export function parseVoiceCommand(text: string): ViewerAction | null {
  const t = fold(text);
  if (has(t, /\b(pausa|pausalo|para|paralo|detente|detenlo|alto|quieto)\b/)) return { type: 'pause' };
  if (has(t, /\b(suelta|sueltalo|sueltala|corre|correr|dale|empieza|inicia)\b/)) return { type: 'release' };
  if (has(t, /\b(centra|centralo|centrar|al centro)\b/)) return { type: 'center' };
  if (has(t, /\b(acerca|acercalo|acercar|mas grande|agranda|zoom)\b/)) return { type: 'zoom', factor: 1.25 };
  if (has(t, /\b(aleja|alejalo|alejar|mas chico|mas pequeno|achica)\b/)) return { type: 'zoom', factor: 0.8 };
  if (has(t, /\b(gira|giralo|girar|voltea|rota|rotalo|da la vuelta)\b/)) {
    return { type: 'rotate', dx: has(t, /\bizquierda\b/) ? -0.6 : 0.6, dy: 0 };
  }
  return null;
}

const UNITS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const TENS: Record<string, number> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100 };
const SEPARATORS = new Set(['coma', 'punto', 'con']);

export function parseSpokenNumber(text: string): number | null {
  const raw = text.toLowerCase().match(/\d+(?:[.,]\d+)?/);
  if (raw) return Number(raw[0].replace(',', '.'));

  const words = fold(text).split(' ');
  let intPart: number | null = null;
  let decimals = '';
  let afterSeparator = false;
  let current = 0;
  let seen = false;
  for (const w of words) {
    if (SEPARATORS.has(w) && seen && !afterSeparator) {
      intPart = current;
      afterSeparator = true;
      continue;
    }
    if (w === 'y') continue;
    const value = UNITS[w] ?? TENS[w];
    if (value === undefined) {
      if (seen && !afterSeparator) break; // "segundos" after the number
      if (afterSeparator && decimals) break;
      continue;
    }
    if (afterSeparator) {
      // "coma cero cinco" → digits; "coma veinticinco" → 25
      decimals += String(value);
    } else {
      current += value;
      seen = true;
    }
  }
  if (!seen) return null;
  if (!afterSeparator) return current;
  return decimals ? Number(`${intPart}.${decimals}`) : intPart;
}
