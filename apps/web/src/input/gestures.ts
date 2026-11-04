/**
 * Gestos de mano con MediaPipe Gesture Recognizer, todo en el dispositivo.
 * La cámara solo extrae los 21 puntos de la mano: no se guardan imágenes
 * ni se detectan rostros.
 *
 *  - Palma abierta y mover la mano  → girar el holograma
 *  - Pinza (pulgar e índice)        → acercar / alejar
 *  - Puño                           → pausar
 *  - Pulgar arriba                  → correr la simulación
 *
 * Los archivos del modelo se descargan una vez desde la CDN. Para usar sin
 * internet, copiar el .wasm y el .task a public/mediapipe/ (ver docs).
 */
import type { GestureRecognizer } from '@mediapipe/tasks-vision';

export interface GestureEvents {
  onRotate: (dx: number, dy: number) => void;
  onZoom: (factor: number) => void;
  onGesture: (name: 'pausa' | 'correr') => void;
  onStatus: (text: string) => void;
}

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

export class HandGestures {
  private recognizer: GestureRecognizer | null = null;
  private stream: MediaStream | null = null;
  private running = false;
  private last: { x: number; y: number } | null = null;
  private lastPinch = 0;
  private lastDiscrete = 0;

  constructor(private readonly video: HTMLVideoElement, private readonly ev: GestureEvents) {}

  async start(facingMode: 'user' | 'environment' = 'user') {
    this.ev.onStatus('Cargando modelo de manos…');
    const local = await exists('/mediapipe/gesture_recognizer.task');
    const { FilesetResolver, GestureRecognizer } = await import('@mediapipe/tasks-vision');
    const files = await FilesetResolver.forVisionTasks(local ? '/mediapipe/wasm' : WASM);
    this.recognizer = await GestureRecognizer.createFromOptions(files, {
      baseOptions: { modelAssetPath: local ? '/mediapipe/gesture_recognizer.task' : MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    });
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: 320, height: 240 }, audio: false });
    this.video.srcObject = this.stream;
    await this.video.play();
    this.running = true;
    this.ev.onStatus('Gestos activos');
    this.loop();
  }

  stop() {
    this.running = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.recognizer?.close();
    this.recognizer = null;
    this.ev.onStatus('Gestos apagados');
  }

  private loop = () => {
    if (!this.running || !this.recognizer) return;
    if (this.video.readyState >= 2) {
      const res = this.recognizer.recognizeForVideo(this.video, performance.now());
      const hand = res.landmarks?.[0];
      const gesture = res.gestures?.[0]?.[0]?.categoryName;
      if (hand) {
        const wrist = hand[0];
        const thumb = hand[4];
        const index = hand[8];
        const pinch = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        const now = performance.now();

        if (gesture === 'Open_Palm') {
          if (this.last) this.ev.onRotate(-(wrist.x - this.last.x) * 6, (wrist.y - this.last.y) * 4);
          this.last = { x: wrist.x, y: wrist.y };
        } else {
          this.last = null;
        }
        if (gesture !== 'Open_Palm' && pinch < 0.25) {
          if (this.lastPinch) this.ev.onZoom(Math.max(0.9, Math.min(1.1, pinch / this.lastPinch)));
          this.lastPinch = pinch;
        } else {
          this.lastPinch = 0;
        }
        if (now - this.lastDiscrete > 1500) {
          if (gesture === 'Closed_Fist') {
            this.ev.onGesture('pausa');
            this.lastDiscrete = now;
          } else if (gesture === 'Thumb_Up') {
            this.ev.onGesture('correr');
            this.lastDiscrete = now;
          }
        }
      } else {
        this.last = null;
        this.lastPinch = 0;
      }
    }
    requestAnimationFrame(this.loop);
  };
}

async function exists(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok && !(r.headers.get('content-type') ?? '').includes('text/html');
  } catch {
    return false;
  }
}
