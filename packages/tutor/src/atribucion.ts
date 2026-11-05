/**
 * Attribution on a shared phone (ARQUITECTURA 3.10): before answering, the group may tap the avatars of
 * who speaks. Without it the answer belongs to the group and individual memory does not use it.
 */
export type Atribucion =
  | { tipo: 'estudiantes'; estudianteIds: string[]; usaMemoriaIndividual: true }
  | { tipo: 'grupo'; usaMemoriaIndividual: false };

export function atribuir(estudianteIds: readonly string[] | undefined): Atribucion {
  if (!estudianteIds || estudianteIds.length === 0) return { tipo: 'grupo', usaMemoriaIndividual: false };
  return { tipo: 'estudiantes', estudianteIds: [...estudianteIds], usaMemoriaIndividual: true };
}
