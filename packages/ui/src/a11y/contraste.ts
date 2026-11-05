/**
 * WCAG 2.2 contrast maths. Used by the high-contrast check (tests and the settings panel) so the
 * "AAA body text, 3:1 control edges" promise of DESIGN.md 15 is recomputed, never just claimed.
 */

function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export interface ParContraste {
  fg: string;
  bg: string;
  min: number;
}

export interface InformeContraste {
  pares: number;
  fallos: (ParContraste & { ratio: number })[];
}

/** Checks named pairs against a colour map. A pair with an unknown name counts as a failure. */
export function auditarContraste(colores: Record<string, string>, pares: ParContraste[]): InformeContraste {
  const fallos: InformeContraste['fallos'] = [];
  for (const par of pares) {
    const fg = colores[par.fg];
    const bg = colores[par.bg];
    const ratio = fg && bg ? contrastRatio(fg, bg) : 0;
    if (ratio + 1e-9 < par.min) fallos.push({ ...par, ratio });
  }
  return { pares: pares.length, fallos };
}
