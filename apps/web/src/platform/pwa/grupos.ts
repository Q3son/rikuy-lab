/**
 * Precache groups (ARQUITECTURA 5.4, F1): base, clase, gestos, senales.
 * - base: the shell, styles, icons, manifest and the legacy hologram pages. Installed with the service
 *   worker, so the shell opens in airplane mode after one online visit.
 * - clase: class content and recorded audio, loaded when a group joins a class.
 * - gestos: the hand model and its wasm, only when the gestures flag is on (and the person consents).
 * - senales: the face model, only when the signals flag is on. It must never be part of base: the CI
 *   script that checks "no face_landmarker in the build without the flag" relies on this split.
 */
export const GRUPOS_DE_PRECACHE = ['base', 'clase', 'gestos', 'senales'] as const;
export type GrupoDePrecache = (typeof GRUPOS_DE_PRECACHE)[number];

export interface EntradaPrecache {
  url: string;
  revision: string | null;
}

export function grupoDePrecache(url: string): GrupoDePrecache {
  const ruta = url.replace(/^\.?\//, '');
  if (ruta.startsWith('mediapipe/senales/')) return 'senales';
  if (ruta.startsWith('mediapipe/')) return 'gestos';
  if (ruta.startsWith('content/') || ruta.startsWith('audio/') || ruta.startsWith('paquetes/')) return 'clase';
  return 'base';
}

export function separarPorGrupo(entradas: readonly EntradaPrecache[]): Record<GrupoDePrecache, EntradaPrecache[]> {
  const grupos: Record<GrupoDePrecache, EntradaPrecache[]> = { base: [], clase: [], gestos: [], senales: [] };
  for (const e of entradas) grupos[grupoDePrecache(e.url)].push(e);
  return grupos;
}
