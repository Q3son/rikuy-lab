/**
 * Number formatting of the lab. Comma decimals as in the golden wireframes ("10,3", "2,09"):
 * CLDR es-PE uses a point, so 'es' is used for every number on screen (one separator per screen).
 */
export const formatoNumero = (v: number, decimales = 2) =>
  new Intl.NumberFormat('es', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(v);

export const cm = (m: number) => `${Math.round(m * 100)} cm`;
