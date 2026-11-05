/** Projector phone helpers: whole screen, screen always on, chrome timing. */
/** The settings button fades out after this long without a touch: nothing but the hologram on the acetate. */
export const CHROME_IDLE_MS = 3500;

export type WakeLockNav = Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };

/** One tap: whole screen, portrait locked. Both are best effort (iOS Safari has no fullscreen for pages). */
export async function proyectarPantallaCompleta(doc: Document = document): Promise<void> {
  try {
    if (!doc.fullscreenElement) await doc.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
  } catch {
    /* fullscreen refused: the page is already black, keep going */
  }
  try {
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('portrait');
  } catch {
    /* orientation lock is optional */
  }
}
