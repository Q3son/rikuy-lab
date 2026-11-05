/**
 * Judge with a model behind the `ModeloJuez` port: 3 runs, median, "dudoso" on disagreement.
 * A run only counts if its quote is literal ("sin cita literal, el criterio no cuenta"); with fewer than
 * 2 valid runs, or on any failure, the rules decide. The classroom is never left hanging.
 * Aggregation ported from Educacion/web/src/lib/judge/rubric.ts (aggregateRuns).
 */
import { agregarCorridas } from './agregar.ts';
import { citaEsLiteral, sanitizarCita } from './cita.ts';
import { juzgarConReglas } from './reglas.ts';
import type { CorridaModelo, ModeloJuez, SolicitudJuez, VeredictoJuez } from './tipos.ts';

const NIVELES = new Set<unknown>([0, 1, 2, 3, 'NO']);

function valida(c: CorridaModelo, respuesta: string): boolean {
  if (!NIVELES.has(c.nivel)) return false;
  if (c.nivel === 'NO') return true;
  return c.cita.trim() !== '' && citaEsLiteral(c.cita, respuesta);
}

export async function juzgarConModelo(modelo: ModeloJuez, s: SolicitudJuez, opciones: { corridas?: number } = {}): Promise<VeredictoJuez> {
  const n = opciones.corridas ?? 3;
  const intentos = await Promise.all(
    Array.from({ length: n }, async () => {
      try {
        return await modelo.juzgar(s);
      } catch {
        return { ok: false as const, error: { tipo: 'proveedor' as const, detalle: 'excepción' } };
      }
    }),
  );
  const buenas = intentos.flatMap((r) => (r.ok && valida(r.valor, s.respuesta) ? [r.valor] : []));
  if (buenas.length < 2) {
    const motivo = intentos.some((r) => !r.ok) ? 'el modelo falló' : 'menos de 2 corridas con cita literal';
    return { ...juzgarConReglas(s), respaldo: motivo };
  }
  const agg = agregarCorridas(buenas);
  return {
    indicador: s.indicador,
    nivel: agg.nivel,
    estado: agg.estado,
    cita: agg.nivel === 'NO' ? '' : sanitizarCita(agg.cita, s.respuesta),
    fuente: modelo.fuente,
    corridas: agg.corridas,
  };
}
