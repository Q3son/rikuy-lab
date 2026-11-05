import type { Practica } from '@rikuy/contracts';
import { pictogramaDeMaterial, type EntradaFamilia, type PictoId } from '@rikuy/evidencia';

const DIA = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Monday and Friday (Lima, UTC-5) of the week that contains `ahoraMs`, as ISO dates. */
export function semanaDeLima(ahoraMs: number): { lunes: string; viernes: string; lunesMs: number } {
  const local = ahoraMs - 5 * 3_600_000;
  const lunesMs = Math.floor(local / DIA) * DIA - ((new Date(local).getUTCDay() + 6) % 7) * DIA;
  return { lunes: iso(lunesMs), viernes: iso(lunesMs + 4 * DIA), lunesMs };
}

/** Input of the family template, derived from the approved practice. Variant A: no child name. */
export function entradaFamilia(practica: Practica, enlaceLigero: string, ahoraMs: number, fraseLocal: string | null, lengua: 'es' | 'quy' = 'es'): EntradaFamilia {
  const corto = (practica.titulo.split(':')[0] ?? practica.titulo).trim();
  const semana = semanaDeLima(ahoraMs);
  const pictogramas = [...new Set(practica.materiales.map((m) => pictogramaDeMaterial(m.nombre)))].slice(0, 3) as PictoId[];
  return {
    variante: 'A',
    fechaIni: semana.lunes,
    fechaFin: semana.viernes,
    verbo: 'trabajaron con',
    exhibicionCorta: corto.charAt(0).toLowerCase() + corto.slice(1),
    preguntaCasa: practica.preguntaGuia,
    lengua,
    enlaceLigero,
    pictogramas,
    ...(fraseLocal ? { fraseLocal } : {}),
  };
}
