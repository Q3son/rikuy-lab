/** Text helpers for the verifier and the anonymizer. Pure, no I/O. */

/** Lowercase, strip accents, keep only letters and digits, collapse spaces. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

/** True when `frase` appears in `texto` on word boundaries, ignoring case, accents and punctuation. */
export function contieneFrase(texto: string, frase: string): boolean {
  const f = normalizar(frase);
  if (!f) return false;
  return ` ${normalizar(texto)} `.includes(` ${f} `);
}

/** Distinct words of 4 or more letters (normalized). */
export function palabrasClave(s: string): string[] {
  return [...new Set(normalizar(s).split(' ').filter((w) => w.length >= 4))];
}

export function oraciones(s: string): string[] {
  return s
    .split(/[.!?¿¡\n]+/)
    .map((o) => o.trim())
    .filter(Boolean);
}

export function contarPalabras(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/** Numbers as written by a student or a model: "1,9", "1.9", "10". */
export function extraerNumeros(s: string): number[] {
  const out: number[] = [];
  for (const m of s.matchAll(/\d+(?:[.,]\d+)?/g)) out.push(Number(m[0].replace(',', '.')));
  return out;
}

const NOMBRES_COMUNES = [
  'juan', 'maria', 'jose', 'luis', 'carlos', 'pedro', 'miguel', 'jorge', 'ana', 'rosa', 'carmen', 'luz',
  'sofia', 'valeria', 'diego', 'andrea', 'daniel', 'fernando', 'rocio', 'milagros', 'yuri', 'wilmer',
];

const RE_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const RE_TELEFONO = /(?:\+?51[\s-]?)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}/g;
const RE_DNI = /\b\d{8}\b/g;

export function tieneDatosPersonales(s: string): boolean {
  if (new RegExp(RE_EMAIL.source).test(s) || new RegExp(RE_TELEFONO.source).test(s) || new RegExp(RE_DNI.source).test(s)) return true;
  const palabras = normalizar(s).split(' ');
  return palabras.some((p) => NOMBRES_COMUNES.includes(p));
}

/** Replaces phones, emails, national ids and common first names before text leaves the device (4.4). */
export function anonimizar(s: string): string {
  let out = s.replace(RE_EMAIL, '[dato]').replace(RE_TELEFONO, '[dato]').replace(RE_DNI, '[dato]');
  out = out.replace(/[\p{L}]+/gu, (palabra) => (NOMBRES_COMUNES.includes(normalizar(palabra)) ? '[nombre]' : palabra));
  return out;
}
