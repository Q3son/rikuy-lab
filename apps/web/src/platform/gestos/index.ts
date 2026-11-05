/**
 * Hand gestures on the device (1.4), owned by F3. Import this module lazily: MediaPipe and the
 * worker are only fetched when a group turns the camera on.
 */
import { HandGestureController } from './controller.ts';
import { gestureSwitch } from './teacherSwitch.ts';

export { HandGestureController, type GestureStatus } from './controller.ts';
export { GestureSwitch, gestureSwitch } from './teacherSwitch.ts';
export type { HandPose } from './classifier.ts';

/** Pinned assets, see public/mediapipe/manifest.json and scripts/mediapipe-assets.mjs. */
export function mediapipeAssets(base = document.baseURI) {
  return {
    wasmBase: new URL('mediapipe/wasm', base).href,
    modelUrl: new URL('mediapipe/hand_landmarker.task', base).href,
  };
}

/** Builds a controller wired to the real camera, the worker and the device switch. */
export function createHandGestures(): HandGestureController {
  const video = document.createElement('video'); // never attached to the DOM, never drawn
  video.muted = true;
  video.playsInline = true;
  return new HandGestureController({
    gestureSwitch: gestureSwitch(),
    getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
    createWorker: () => new Worker(new URL('./gestos.worker.ts', import.meta.url), { type: 'module' }),
    video,
    grabFrame: (v) => createImageBitmap(v),
    schedule: (cb) => requestAnimationFrame(cb),
    assets: mediapipeAssets(),
  });
}
