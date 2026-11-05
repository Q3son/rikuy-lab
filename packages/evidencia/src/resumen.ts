/**
 * Three-part class summary (T-11): what we saw, what was hard, three exercises.
 * Built from templates over real counts and real literal quotes, so it works offline.
 */
import { avancePorGrupo } from './avance.ts';
import type { Indicador } from '@rikuy/contracts';
import { ETIQUETA_INDICADOR } from './competencias.ts';
import { INDICADORES, type VistaEvidencias } from './evidencias.ts';
import type { ProyeccionClase } from './proyeccion.ts';

export interface CitaDeGrupo {
  apodo: string;
  texto: string;
}

export interface ResumenClase {
  vimos: { texto: string; cita: CitaDeGrupo | null };
  costo: { texto: string; cita: CitaDeGrupo | null };
  ejercicios: [string, string, string];
}

const EJERCICIO: Record<Indicador, string> = {
  variable: 'Elige una sola cosa para cambiar y di qué mantienes igual.',
  prediccion: 'Antes de medir otra vez, escribe qué crees que pasará y por qué.',
  justificacion: 'Explica con tus palabras por qué crees que pasó.',
  uso_del_dato: 'Usa un número de tu tabla para apoyar lo que concluyes.',
  conclusion_coherente: 'Cuéntale a otro grupo qué encontraste y si tu predicción se cumplió.',
};

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

export function construirResumenClase(p: ProyeccionClase, v: VistaEvidencias, esperadas: number): ResumenClase {
  const total = v.grupos.length;
  const avance = avancePorGrupo(p, esperadas);
  const antes = avance.filter((a) => a.prediccionAntesDeMedir).length;
  const conDato = v.grupos.filter((g) => g.indicadores.some((i) => i.indicador === 'uso_del_dato' && i.nivel !== 'NO' && i.cita !== null)).length;

  // Quote for part 1: first verified quote of the first group that has one (join order, not level).
  let citaVimos: CitaDeGrupo | null = null;
  for (const g of v.grupos) {
    const i = g.indicadores.find((x) => x.cita !== null && x.nivel !== 'NO' && x.estado === 'ok');
    if (i?.cita) {
      citaVimos = { apodo: g.apodo, texto: i.cita };
      break;
    }
  }
  const vimos = total === 0
    ? 'Todavía no hay grupos en esta clase.'
    : `${antes} de ${total} ${plural(total, 'grupo', 'grupos')} ${plural(antes, 'predijo', 'predijeron')} antes de medir. ${conDato} ${plural(conDato, 'citó', 'citaron')} su propio dato.`;

  // Part 2: only observed difficulty (level 0/1 or doubtful). Missing evidence is not difficulty.
  const dificiles = v.grupos.flatMap((g) =>
    g.indicadores.filter((i) => i.cita !== null && (i.estado === 'dudoso' || i.nivel === 0 || i.nivel === 1)).map((i) => ({ g, i })),
  );
  let costo = 'Todavía no hay evidencia para decir qué les costó.';
  let citaCosto: CitaDeGrupo | null = null;
  if (dificiles.length > 0) {
    const porIndicador = new Map<Indicador, number>();
    for (const d of dificiles) porIndicador.set(d.i.indicador, (porIndicador.get(d.i.indicador) ?? 0) + 1);
    const partes = INDICADORES.filter((i) => porIndicador.has(i)).map((i) => {
      const n = new Set(dificiles.filter((d) => d.i.indicador === i).map((d) => d.g.grupoId)).size;
      return `${ETIQUETA_INDICADOR[i]} (${n} ${plural(n, 'grupo', 'grupos')})`;
    });
    const dudosos = dificiles.filter((d) => d.i.estado === 'dudoso');
    costo = `Les costó: ${partes.join('; ')}.${dudosos.length ? ` Hay ${dudosos.length} ${plural(dudosos.length, 'respuesta dudosa', 'respuestas dudosas')} para que decidas.` : ''}`;
    const pick = dudosos[0] ?? dificiles[0];
    if (pick.i.cita) citaCosto = { apodo: pick.g.apodo, texto: pick.i.cita };
  }

  // Part 3: exercises for the most frequent difficulties, completed in fixed indicator order.
  const peso = new Map<Indicador, number>(INDICADORES.map((i) => [i, 0]));
  for (const d of dificiles) peso.set(d.i.indicador, (peso.get(d.i.indicador) ?? 0) + 1);
  const orden = [...INDICADORES].sort((a, b) => (peso.get(b) ?? 0) - (peso.get(a) ?? 0) || INDICADORES.indexOf(a) - INDICADORES.indexOf(b));
  const ejercicios = orden.slice(0, 3).map((i) => EJERCICIO[i]) as [string, string, string];

  return { vimos: { texto: vimos, cita: citaVimos }, costo: { texto: costo, cita: citaCosto }, ejercicios };
}
