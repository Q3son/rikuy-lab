/**
 * Audio-first lab and "Dicta tu dato" (FUNCIONES_EXTRA §3 f.5, §4.1; credit: Dinomate, UTP Panamá).
 * Pure texts: what Rikuy says aloud is always also on screen.
 */
import type { ComparisonTable, MeasurementRow } from '@rikuy/lab-engine';
import { parseSpokenNumber } from '../../platform/voz/parse.ts';
import { formatoNumero } from './formato.ts';

const decimal = (v: number) => new Intl.NumberFormat('es', { maximumFractionDigits: 2 }).format(v);
const centimetros = (m: number) => `${Math.round(m * 100)} centímetros`;

/** Seconds for 10 oscillations: anything outside (0, 600) is not a usable time. */
export function dictado(texto: string): { valor: number; eco: string } | null {
  const valor = parseSpokenNumber(texto);
  if (valor === null || !(valor > 0 && valor < 600)) return null;
  return { valor, eco: `Escuché ${decimal(valor)} segundos. ¿Lo guardo?` };
}

export function leerTabla(filas: readonly MeasurementRow[]): string {
  const validas = filas.filter((f) => !f.annulled);
  if (validas.length === 0) return 'Aún no tienes medidas.';
  const partes = validas.map((f) => `${centimetros(f.lengthM)}: ${formatoNumero(f.periodS)} segundos por oscilación.`);
  return `Tienes ${validas.length} ${validas.length === 1 ? 'medida' : 'medidas'}. ${partes.join(' ')}`;
}

export function leerComparacion(tabla: ComparisonTable): string {
  const filas = tabla.rows.map((r) =>
    r.measuredPeriodS === null
      ? `${centimetros(r.lengthM)}: todavía sin dato.`
      : `${centimetros(r.lengthM)}: tu dato ${formatoNumero(r.measuredPeriodS)} segundos, el modelo ${formatoNumero(r.theoreticalPeriodS)} segundos, error de ${formatoNumero((r.relativeError ?? 0) * 100, 0)} por ciento.`,
  );
  return filas.join(' ');
}
