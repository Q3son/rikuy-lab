/**
 * Pictograms for the take-home sheet, the family page and the family message.
 * One 24x24 stroke grid, no fills that carry meaning, no text: they print in black and white.
 */
export type PictoId = 'cuerda' | 'piedra' | 'regla' | 'reloj' | 'celular' | 'agua' | 'sal' | 'medir' | 'anotar' | 'soltar' | 'generico';

export const PICTOGRAMAS: Record<PictoId, { titulo: string; trazos: string[] }> = {
  cuerda: { titulo: 'Cuerda', trazos: ['M3 20c4-10 6 2 9-6s5-7 9-10', 'M3 20h3', 'M18 4h3'] },
  piedra: { titulo: 'Piedra', trazos: ['M4 17l3-8 6-3 6 4 1 6-4 3H8z'] },
  regla: { titulo: 'Regla', trazos: ['M2 8h20v8H2z', 'M6 8v4', 'M10 8v3', 'M14 8v4', 'M18 8v3'] },
  reloj: { titulo: 'Reloj', trazos: ['M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M12 9v4l3 2', 'M10 2h4'] },
  celular: { titulo: 'Celular', trazos: ['M7 2h10v20H7z', 'M11 19h2'] },
  agua: { titulo: 'Agua', trazos: ['M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z'] },
  sal: { titulo: 'Sal', trazos: ['M8 3h8l1 5H7z', 'M7 8v13h10V8', 'M10 12h.01M14 12h.01M12 16h.01'] },
  medir: { titulo: 'Medir', trazos: ['M3 12h18', 'M3 8v8', 'M21 8v8', 'M8 12v3M12 12v4M16 12v3'] },
  anotar: { titulo: 'Anotar', trazos: ['M5 3h11l3 3v15H5z', 'M8 9h8M8 13h8M8 17h5'] },
  soltar: { titulo: 'Soltar', trazos: ['M12 3v9', 'M12 12a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M5 3h14'] },
  generico: { titulo: 'Material', trazos: ['M4 8l8-4 8 4v8l-8 4-8-4z', 'M4 8l8 4 8-4', 'M12 12v8'] },
};

const PALABRAS: [RegExp, PictoId][] = [
  [/cuerda|hilo|piola|lana/, 'cuerda'],
  [/piedra|tuerca|pesa|masa/, 'piedra'],
  [/cronometro|reloj|temporizador|tiempo/, 'reloj'],
  [/regla|cinta|\bmetro\b|centimetro/, 'regla'],
  [/celular|telefono|movil/, 'celular'],
  [/agua|vaso|botella|liquido/, 'agua'],
  [/\bsal\b|azucar/, 'sal'],
];

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function pictogramaDeMaterial(nombre: string): PictoId {
  const n = sinTildes(nombre);
  for (const [re, id] of PALABRAS) if (re.test(n)) return id;
  return 'generico';
}

export function svgPictograma(id: PictoId): string {
  const p = PICTOGRAMAS[id];
  const trazos = p.trazos.map((d) => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#0D2B33" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${p.titulo}">${trazos}</svg>`;
}
