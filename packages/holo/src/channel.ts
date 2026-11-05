/**
 * In-memory channel that feeds viewer actions to a mounted `<VisorExhibicion>`: touch buttons,
 * hand gestures and the remote control all publish here. No Three.js, so it is cheap to import.
 */
import type { ViewerAction } from './control/protocol.ts';

export type ViewerListener = (action: ViewerAction) => void;

export class ViewerChannel {
  private readonly listeners = new Set<ViewerListener>();

  send(action: ViewerAction): void {
    for (const l of this.listeners) l(action);
  }

  subscribe(listener: ViewerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
