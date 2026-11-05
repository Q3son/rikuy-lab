/** Small-cell suppression (ARQUITECTURA 4.6/4.7): cells under 5 never leave the classroom. */
export const K_MIN = 5;

export type Celda = { suprimido: true } | { suprimido: false; valor: number };

/** `base` = number of groups/students that contribute to the cell. Zero is shown (nothing to protect). */
export function celda(valor: number, base: number, k: number = K_MIN): Celda {
  if (valor === 0) return { suprimido: false, valor: 0 };
  return base < k ? { suprimido: true } : { suprimido: false, valor };
}

/**
 * A row of counts that add up to `total`. Primary suppression of cells under k; if exactly one cell was
 * hidden and the total is shown, the smallest visible cell is hidden too (complementary suppression),
 * otherwise the hidden value could be recovered by subtraction.
 */
export function suprimirFila<K extends string>(valores: Record<K, number>, total: number, k: number = K_MIN): { total: Celda; celdas: Record<K, Celda> } {
  const claves = Object.keys(valores) as K[];
  if (total < k) {
    return { total: { suprimido: true }, celdas: Object.fromEntries(claves.map((c) => [c, { suprimido: true } as Celda])) as Record<K, Celda> };
  }
  const celdas = Object.fromEntries(claves.map((c) => [c, celda(valores[c], valores[c], k)])) as Record<K, Celda>;
  const ocultas = claves.filter((c) => celdas[c].suprimido);
  if (ocultas.length === 1) {
    const visibles = claves.filter((c) => !celdas[c].suprimido && valores[c] > 0).sort((a, b) => valores[a] - valores[b]);
    const menor = visibles[0];
    if (menor !== undefined) celdas[menor] = { suprimido: true };
  }
  return { total: celda(total, total, k), celdas };
}
