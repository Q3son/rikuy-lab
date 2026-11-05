/** Small pure text helpers shared by every report template. No Date, no locale: output is deterministic. */

const ENTIDADES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Every dynamic value that enters HTML goes through here (student words, names, URLs). */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function partes(iso: string): { d: number; m: number; a: number } {
  const [a, m, d] = iso.split('-').map(Number);
  return { a, m, d };
}

/** "3 al 7 de noviembre" or "30 de octubre al 3 de noviembre". */
export function rangoDeFechas(ini: string, fin: string): string {
  const i = partes(ini);
  const f = partes(fin);
  if (i.m === f.m && i.a === f.a) return `${i.d} al ${f.d} de ${MESES[f.m - 1]}`;
  return `${i.d} de ${MESES[i.m - 1]} al ${f.d} de ${MESES[f.m - 1]}`;
}

export function nombreDeMes(iso: string): string {
  const { m, a } = partes(iso.length === 7 ? `${iso}-01` : iso);
  return `${MESES[m - 1]} de ${a}`;
}

/** Words of a message, ignoring links and isolated symbols. */
export function contarPalabras(texto: string): number {
  return texto
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/\s+/)
    .filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

export const pluralizar = (n: number, uno: string, varios: string): string => (n === 1 ? uno : varios);

/** Sentence-case a label for a line that continues a sentence. */
export const minuscula = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
