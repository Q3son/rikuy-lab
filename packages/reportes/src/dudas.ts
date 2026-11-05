/**
 * Caja de dudas (EIDOS-style mini feature): students send an anonymous doubt tagged by concept; the teacher
 * sees a class-level heatmap by concept and exhibit. Anonymity is honest: in a class of 10-15 it cannot be
 * real, so cells appear only from 3 distinct groups and the screen says so. Guardián data never enters.
 */

/** Proposed contract (PROPUESTAS_CONTRATOS.md): `duda.enviada`. A group doubt counts as one student's. */
export interface DudaConcepto {
  id: string;
  claseId: string;
  grupoId: string;
  exhibicionId: string;
  conceptoId: string;
  /** Optional short phrase. Captured for the teacher's own reading elsewhere; NEVER part of the heatmap. */
  frase?: string;
  hlc: string;
}

export const MIN_GRUPOS_CELDA_DUDAS = 3;

export type CeldaDudas =
  | { conceptoId: string; exhibicionId: string; etiqueta: string; suprimido: true }
  | { conceptoId: string; exhibicionId: string; etiqueta: string; suprimido: false; dudas: number; grupos: number; intensidad: number };

export interface MapaCalorDudas {
  celdas: CeldaDudas[];
  /** Concepts to reinforce, by number of doubts, from visible cells only. */
  temasParaReforzar: { conceptoId: string; etiqueta: string; dudas: number }[];
  aviso: string;
}

export const AVISO_ANONIMATO =
  'En una clase pequeña el anonimato real es imposible: por eso solo se muestran las celdas con 3 o más grupos, sin nombres.';

export function mapaDeCalorDudas(dudas: DudaConcepto[], opts: { nombreConcepto?: (conceptoId: string) => string } = {}): MapaCalorDudas {
  const nombre = opts.nombreConcepto ?? ((c: string) => c);
  const celdas = new Map<string, { conceptoId: string; exhibicionId: string; dudas: number; grupos: Set<string> }>();
  for (const d of dudas) {
    const k = `${d.conceptoId}|${d.exhibicionId}`;
    const c = celdas.get(k) ?? { conceptoId: d.conceptoId, exhibicionId: d.exhibicionId, dudas: 0, grupos: new Set<string>() };
    c.dudas++;
    c.grupos.add(d.grupoId);
    celdas.set(k, c);
  }
  const visibles = [...celdas.values()].filter((c) => c.grupos.size >= MIN_GRUPOS_CELDA_DUDAS);
  const maximo = Math.max(1, ...visibles.map((c) => c.dudas));
  const salida: CeldaDudas[] = [...celdas.values()]
    .sort((a, b) => (a.conceptoId + a.exhibicionId < b.conceptoId + b.exhibicionId ? -1 : 1))
    .map((c) =>
      c.grupos.size >= MIN_GRUPOS_CELDA_DUDAS
        ? { conceptoId: c.conceptoId, exhibicionId: c.exhibicionId, etiqueta: nombre(c.conceptoId), suprimido: false, dudas: c.dudas, grupos: c.grupos.size, intensidad: c.dudas / maximo }
        : { conceptoId: c.conceptoId, exhibicionId: c.exhibicionId, etiqueta: nombre(c.conceptoId), suprimido: true },
    );
  const porConcepto = new Map<string, number>();
  for (const c of visibles) porConcepto.set(c.conceptoId, (porConcepto.get(c.conceptoId) ?? 0) + c.dudas);
  const temas = [...porConcepto]
    .map(([conceptoId, n]) => ({ conceptoId, etiqueta: nombre(conceptoId), dudas: n }))
    .sort((a, b) => b.dudas - a.dudas || a.etiqueta.localeCompare(b.etiqueta, 'es'));
  return { celdas: salida, temasParaReforzar: temas, aviso: AVISO_ANONIMATO };
}
