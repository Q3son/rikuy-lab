/**
 * Aggregation of several runs of the judge: agreement -> "ok"; disagreement -> median and "dudoso"
 * (the teacher decides). Ported from `aggregateRuns` in Educacion/web/src/lib/judge/rubric.ts
 * (the team's own project). "NO" (not assessable) is ordered below 0 and is never a zero.
 */
import type { CorridaModelo, Nivel, VeredictoJuez } from './tipos.ts';

const ORDEN: Nivel[] = ['NO', 0, 1, 2, 3];

export function agregarCorridas(corridas: readonly CorridaModelo[]): Pick<VeredictoJuez, 'nivel' | 'estado' | 'cita' | 'corridas'> {
  const niveles = corridas.map((c) => c.nivel);
  const acuerdo = niveles.every((n) => n === niveles[0]);
  const ordenados = [...niveles].sort((a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b));
  const nivel = acuerdo ? niveles[0]! : ordenados[Math.floor(ordenados.length / 2)]!;
  const cita = corridas.find((c) => c.nivel === nivel)?.cita ?? '';
  const estado: VeredictoJuez['estado'] = nivel === 'NO' && acuerdo ? 'no_observable' : acuerdo ? 'ok' : 'dudoso';
  return { nivel, estado, cita, corridas: niveles.map(String) };
}
