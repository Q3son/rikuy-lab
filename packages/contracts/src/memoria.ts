/**
 * Learning memory (3.10) and "Mi Cerebro Rikuy" node states (3.12).
 * MemoriaEntrada is a deterministic projection of events; it never stores signals (4.9).
 */
import { z } from 'zod';
import { DesempenoRef, Hlc, Ulid } from './comun.ts';

export const TipoMemoria = z.enum([
  'logro',
  'dificultad',
  'prediccion_confirmada',
  'prediccion_refutada',
  'pregunta_abierta',
  'pista_necesaria',
]);
export type TipoMemoria = z.infer<typeof TipoMemoria>;

export const MemoriaEntrada = z.object({
  id: Ulid,
  estudianteId: Ulid,
  aulaId: Ulid,
  competencia: DesempenoRef.pick({ nivel: true, grado: true, area: true, competencia: true, desempeno: true }),
  conceptos: z.array(z.string()),
  tipo: TipoMemoria,
  resumen: z.string().max(200), // deterministic template, never the student's free text
  evidenciaIds: z.array(Ulid),
  hlc: Hlc,
});
export type MemoriaEntrada = z.infer<typeof MemoriaEntrada>;

/** Node state in "Mi Cerebro Rikuy". `pregunta_abierta` is a mark, not a color. */
export const EstadoNodoCerebro = z.enum(['sin_explorar', 'explorado', 'en_camino', 'logrado', 'pregunta_abierta']);
export type EstadoNodoCerebro = z.infer<typeof EstadoNodoCerebro>;

/**
 * Query port over the memory, consumed by tutor, reportes and cerebro.
 * It lives in contracts so that `tutor` does not depend on `memoria` (that would close a cycle
 * memoria -> evidencia -> tutor -> memoria).
 */
export interface ConsultaMemoria {
  recuperar(q: {
    estudianteId?: Ulid;
    grupoId?: Ulid;
    competencia?: number;
    desempeno?: number;
    conceptos?: string[];
    limite?: number; // the tutor receives at most 5 entries
  }): Promise<MemoriaEntrada[]>;
}
