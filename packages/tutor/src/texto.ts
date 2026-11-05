/**
 * Text primitives of the tutor: tokenization with offsets and WORD-BOUNDED matching.
 *
 * The legacy rules agent (packages/core/src/rulesAgent.ts, analytics.ts) matched raw substrings with
 * regexes such as /mas/, so "la masa no cambia" was read as a prediction ("más") and "debe a" matched
 * /ve a/. Everything here compares whole tokens instead (ARQUITECTURA 5.1: "límites de palabra").
 * Offsets point into the ORIGINAL text so that judge quotes can be literal substrings of it.
 */

export interface Token {
  /** Lowercase, accent-free word. */
  t: string;
  /** Start offset in the original text. */
  ini: number;
  /** End offset (exclusive) in the original text. */
  fin: number;
}

const DIACRITICOS = /[̀-ͯ]/g;

/** Base letters of one character: lowercase, accent-free ('ñ' -> 'n'). Empty if not a letter or digit. */
function base(c: string): string {
  const b = c.normalize('NFD').replace(DIACRITICOS, '').toLowerCase();
  return /^[a-z0-9]+$/.test(b) ? b : '';
}

export function tokenizar(texto: string): Token[] {
  const out: Token[] = [];
  let actual: Token | null = null;
  let i = 0;
  for (const c of texto) {
    const b = base(c);
    if (b) {
      if (!actual) actual = { t: '', ini: i, fin: i };
      actual.t += b;
      actual.fin = i + c.length;
    } else if (actual) {
      out.push(actual);
      actual = null;
    }
    i += c.length;
  }
  if (actual) out.push(actual);
  return out;
}

export function palabras(texto: string): string[] {
  return tokenizar(texto).map((x) => x.t);
}

/** Token `t` matches pattern `p`: exact, or word-prefix when `p` ends in `*`. */
function coincide(t: string, p: string): boolean {
  return p.endsWith('*') ? t.startsWith(p.slice(0, -1)) : t === p;
}

function patronDe(frase: string): string[] {
  return frase
    .split(/\s+/)
    .filter(Boolean)
    .map((pieza) => {
      const comodin = pieza.endsWith('*');
      const palabra = palabras(pieza).join('');
      return comodin ? `${palabra}*` : palabra;
    });
}

/** Index of the first token where the phrase (space-separated whole words) starts, or -1. */
export function posicionFrase(tokens: readonly Token[], frase: string): number {
  const patron = patronDe(frase);
  if (patron.length === 0) return -1;
  for (let i = 0; i + patron.length <= tokens.length; i++) {
    if (patron.every((p, j) => coincide(tokens[i + j]!.t, p))) return i;
  }
  return -1;
}

/** Span of the first match of `frase` in the ORIGINAL text, or null. */
export function buscarFrase(tokens: readonly Token[], frase: string): { ini: number; fin: number } | null {
  const i = posicionFrase(tokens, frase);
  if (i < 0) return null;
  const n = patronDe(frase).length;
  return { ini: tokens[i]!.ini, fin: tokens[i + n - 1]!.fin };
}

export function contieneFrase(tokens: readonly Token[], frase: string): boolean {
  return posicionFrase(tokens, frase) >= 0;
}

/** True if any of the phrases is present (whole words). */
export function tieneAlguna(tokens: readonly Token[], frases: readonly string[]): boolean {
  return frases.some((f) => contieneFrase(tokens, f));
}

export function tieneFrase(texto: string, frase: string): boolean {
  return contieneFrase(tokenizar(texto), frase);
}

export function tienePalabra(texto: string, palabra: string): boolean {
  return tieneFrase(texto, palabra);
}

/** Numbers as written by students: 30, 1,4, 0.5, -5. Read from the ORIGINAL text (commas matter). */
export function extraerNumeros(texto: string): number[] {
  return [...texto.matchAll(/-?\d+(?:[.,]\d+)?/g)].map((m) => parseFloat(m[0].replace(',', '.')));
}
