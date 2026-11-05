/**
 * Literal quote check (5.4 gate): a quote is evidence only if it is an exact, contiguous
 * substring of what the group wrote. No normalization on purpose: "the app never paraphrases".
 */
export function esCitaLiteral(cita: string, texto: string): boolean {
  if (cita.trim().length === 0) return false;
  return texto.includes(cita);
}
