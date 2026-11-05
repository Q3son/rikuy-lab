/**
 * DeviceMotion adapter of the lab-engine `AccelerationSensor` port (F3, platform/sensores).
 * Readings stay in memory for the estimate; nothing is stored or sent.
 */
import type { AccelReading, AccelerationSensor } from '@rikuy/lab-engine';

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

export class SensorMovimiento implements AccelerationSensor {
  get available(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  /** iOS asks for permission from a tap; elsewhere it is granted. */
  async permitir(): Promise<boolean> {
    const req = (globalThis.DeviceMotionEvent as unknown as MotionPermission | undefined)?.requestPermission;
    if (!req) return this.available;
    try {
      return (await req()) === 'granted';
    } catch {
      return false;
    }
  }

  subscribe(onReading: (r: AccelReading) => void): () => void {
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (a?.x == null || a.y == null || a.z == null) return;
      onReading({ t: performance.now(), x: a.x, y: a.y, z: a.z });
    };
    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }
}
