/** Text size scale. WCAG 1.4.4: text resizes to 200 % without loss (DESIGN.md 15). */
export const ESCALAS_TEXTO = [1, 1.25, 1.5, 1.75, 2] as const;

export type EscalaTexto = (typeof ESCALAS_TEXTO)[number];

/** Snaps any number to the nearest valid step; non-numbers become 100 %. */
export function normalizarEscala(valor: number): EscalaTexto {
  if (!Number.isFinite(valor)) return 1;
  return ESCALAS_TEXTO.reduce((mejor, paso) => (Math.abs(paso - valor) < Math.abs(mejor - valor) ? paso : mejor), ESCALAS_TEXTO[0]);
}

export function escalaSiguiente(actual: number, direccion: 1 | -1): EscalaTexto {
  const i = ESCALAS_TEXTO.indexOf(normalizarEscala(actual));
  const j = Math.min(ESCALAS_TEXTO.length - 1, Math.max(0, i + direccion));
  return ESCALAS_TEXTO[j]!;
}

export function porcentajeEscala(escala: number): number {
  return Math.round(normalizarEscala(escala) * 100);
}
