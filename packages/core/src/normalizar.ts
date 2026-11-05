/**
 * Text normalization with word boundaries (2.2). Used by the tutor, the judge and the literal
 * quote checks. Lowercase, accents removed (but ñ kept: "año" is not "ano"), punctuation dropped,
 * numbers with a decimal separator ("0,5", "1.25") kept as a single token.
 */
const ENYE = '\u0000';
const TOKEN_RE = /\d+[.,]\d+|[\p{L}\p{N}]+/gu;

function fold(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/ñ/g, ENYE)
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replaceAll(ENYE, 'ñ');
}

/** Tokens of the folded text, in order. */
export function tokens(texto: string): string[] {
  return Array.from(fold(texto).matchAll(TOKEN_RE), (m) => m[0]);
}

/** Canonical form: folded tokens joined by single spaces. Idempotent. */
export function normalizar(texto: string): string {
  return tokens(texto).join(' ');
}

/** True when `frase` appears in `texto` as whole words (after normalization). */
export function containsWord(texto: string, frase: string): boolean {
  const needle = tokens(frase);
  if (needle.length === 0) return false;
  const hay = tokens(texto);
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}
