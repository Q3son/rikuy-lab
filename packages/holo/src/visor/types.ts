/** Props and modes of the exhibit viewer (shared by the lazy wrapper and the Three.js half). */
import type { DisplayState, Practica } from '@rikuy/contracts';
import type { ViewerChannel } from '../channel.ts';

/** pantalla = inside the museum (default); piramide = 4 views for the pyramid; cajita = 1 view at 45°. */
export type ModoVisor = 'pantalla' | 'piramide' | 'cajita';

export function rendererModeFor(modo: ModoVisor): 'normal' | 'piramide' | 'cajita' {
  return modo === 'pantalla' ? 'normal' : modo;
}

export interface VisorExhibicionProps {
  /** The practice shown (title, variables and hints); optional for free exploration. */
  practica?: Pick<Practica, 'titulo' | 'pistas' | 'variables'>;
  /** Scene id from the registry (e.g. `pendulo`). */
  escena: string;
  modo?: ModoVisor;
  /** Actions from touch buttons, hand gestures or the remote control. */
  canal?: ViewerChannel;
  /** Scene variables to force (e.g. `{ longitud: 0.5 }` from the lab). */
  variables?: Record<string, number>;
  /** Called when the viewer state changes (scene, running, readout). */
  onEstado?: (estado: DisplayState) => void;
  /** Mirror and flip for the acetate (pyramid and box). */
  espejo?: boolean;
  /** Hides the frame chrome (the display phone under the pyramid). */
  sinMarco?: boolean;
  /** Accessible label of the canvas. */
  etiqueta?: string;
}
