/**
 * Port to the 3D hologram museum, so "Mi plan" links topics to scenes without importing Three.js.
 * The default adapter uses the scene ids registered in @rikuy/core and the one-phone viewer route;
 * a richer opener (for example a digestive-system scene with zoom levels) can replace it.
 */
import { escenaParaItem, type CorrespondenciaCneb } from '@rikuy/ai';
import { SCENE_IDS } from '@rikuy/core';

export interface EscenasHolo {
  /** The scene for a plan item, or undefined when none matches. */
  escenaPara(item: { tipo: string; texto: string; correspondencia: CorrespondenciaCneb }): string | undefined;
  /** In-app route that opens the scene. */
  ruta(escena: string): string;
}

export const escenasHoloPorDefecto: EscenasHolo = {
  escenaPara: (item) => escenaParaItem(item, SCENE_IDS),
  ruta: (escena) => `/holo/ver/${encodeURIComponent(escena)}`,
};
